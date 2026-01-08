/**
 * Unit tests for IpcManager.setNotificationManager().
 * Tests late injection of NotificationManager after IpcManager construction.
 *
 * @module ipcManager.setNotificationManager.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import IpcManager from '../../../../src/main/managers/ipcManager';
import { createMockWindowManager, createMockStore } from '../../../helpers/mocks';
import { IPC_CHANNELS } from '../../../../src/shared/constants/ipc-channels';

// Mock Electron
const { mockIpcMain } = vi.hoisted(() => {
    const mockIpcMain = {
        on: vi.fn((channel, listener) => {
            mockIpcMain._listeners.set(channel, listener);
        }),
        handle: vi.fn((channel, handler) => {
            mockIpcMain._handlers.set(channel, handler);
        }),
        _listeners: new Map<string, Function>(),
        _handlers: new Map<string, Function>(),
        _reset: () => {
            mockIpcMain._listeners.clear();
            mockIpcMain._handlers.clear();
        },
    };

    return { mockIpcMain };
});

vi.mock('electron', () => ({
    ipcMain: mockIpcMain,
    nativeTheme: {
        themeSource: 'system',
        shouldUseDarkColors: false,
    },
    BrowserWindow: {
        fromWebContents: vi.fn(),
        getAllWindows: vi.fn().mockReturnValue([]),
    },
    shell: {
        showItemInFolder: vi.fn(),
    },
}));

// Mock SettingsStore
vi.mock('../../../../src/main/store', () => ({
    default: vi.fn(),
}));

// Mock fs
vi.mock('fs', () => ({
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn(),
}));

// Mock logger
vi.mock('../../../../src/main/utils/logger');
import { mockLogger } from '../../../../src/main/utils/__mocks__/logger';

describe('IpcManager.setNotificationManager', () => {
    let ipcManager: IpcManager;
    let mockWindowManager: ReturnType<typeof createMockWindowManager>;
    let mockStore: ReturnType<typeof createMockStore>;
    let mockNotificationManager: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockIpcMain._reset();

        mockWindowManager = createMockWindowManager();
        mockStore = createMockStore({ responseNotificationsEnabled: true });

        // Create IpcManager WITHOUT NotificationManager (simulating startup)
        ipcManager = new IpcManager(
            mockWindowManager,
            null, // hotkeyManager
            null, // updateManager
            null, // printManager
            null, // llmManager
            null, // notificationManager - deliberately null to test late injection
            mockStore as any,
            mockLogger
        );

        // Setup IPC handlers
        ipcManager.setupIpcHandlers();

        // Create mock NotificationManager for late injection
        mockNotificationManager = {
            isEnabled: vi.fn().mockReturnValue(false), // Return false to distinguish from default
            setEnabled: vi.fn(),
            onResponseComplete: vi.fn(),
        };
    });

    describe('setNotificationManager(null)', () => {
        it('does not throw when called with null', () => {
            expect(() => ipcManager.setNotificationManager(null)).not.toThrow();
        });

        it('logs when manager is cleared', () => {
            ipcManager.setNotificationManager(null);
            expect(mockLogger.log).toHaveBeenCalledWith('NotificationManager cleared');
        });
    });

    describe('setNotificationManager(mockManager)', () => {
        it('does not throw when called with a manager', () => {
            expect(() => ipcManager.setNotificationManager(mockNotificationManager)).not.toThrow();
        });

        it('logs when manager is injected', () => {
            ipcManager.setNotificationManager(mockNotificationManager);
            expect(mockLogger.log).toHaveBeenCalledWith('NotificationManager injected');
        });

        it('updates internal reference so IPC handlers use the manager', () => {
            // Before injection: get-enabled should return true (default)
            const getHandler = mockIpcMain._handlers.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_GET_ENABLED);
            const beforeResult = getHandler!();
            expect(beforeResult).toBe(true); // Default when no manager

            // Inject the manager
            ipcManager.setNotificationManager(mockNotificationManager);

            // After injection: get-enabled should call the manager
            const afterResult = getHandler!();
            expect(afterResult).toBe(false); // From mockNotificationManager.isEnabled()
            expect(mockNotificationManager.isEnabled).toHaveBeenCalled();
        });

        it('allows set-enabled to call the injected manager', () => {
            // Inject the manager
            ipcManager.setNotificationManager(mockNotificationManager);

            // Call set-enabled
            const setListener = mockIpcMain._listeners.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_SET_ENABLED);
            setListener!({}, false);

            expect(mockNotificationManager.setEnabled).toHaveBeenCalledWith(false);
        });
    });

    describe('multiple calls (idempotent)', () => {
        it('can be called multiple times with different managers', () => {
            const mockManager1 = {
                isEnabled: vi.fn().mockReturnValue(true),
                setEnabled: vi.fn(),
                onResponseComplete: vi.fn(),
            };
            const mockManager2 = {
                isEnabled: vi.fn().mockReturnValue(false),
                setEnabled: vi.fn(),
                onResponseComplete: vi.fn(),
            };

            // Inject first manager
            ipcManager.setNotificationManager(mockManager1);
            const getHandler = mockIpcMain._handlers.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_GET_ENABLED);
            expect(getHandler!()).toBe(true);

            // Inject second manager
            ipcManager.setNotificationManager(mockManager2);
            expect(getHandler!()).toBe(false);

            // First manager should not be called anymore
            mockManager1.isEnabled.mockClear();
            getHandler!();
            expect(mockManager1.isEnabled).not.toHaveBeenCalled();
            expect(mockManager2.isEnabled).toHaveBeenCalled();
        });

        it('can switch from manager to null and back', () => {
            const getHandler = mockIpcMain._handlers.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_GET_ENABLED);

            // Inject manager
            ipcManager.setNotificationManager(mockNotificationManager);
            expect(getHandler!()).toBe(false);

            // Clear to null
            ipcManager.setNotificationManager(null);
            expect(getHandler!()).toBe(true); // Default when no manager

            // Re-inject manager
            ipcManager.setNotificationManager(mockNotificationManager);
            expect(getHandler!()).toBe(false);
        });
    });
});
