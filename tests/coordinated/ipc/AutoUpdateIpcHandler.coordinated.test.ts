/**
 * Coordinated tests for AutoUpdateIpcHandler.
 *
 * Tests persistence of enabled state across handler instances (4.1.16).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain } from 'electron';
import IpcManager from '../../../src/main/managers/ipcManager';
import WindowManager from '../../../src/main/managers/windowManager';

// Use the centralized logger mock
vi.mock('../../../src/main/utils/logger');
import { mockLogger } from '../../../src/main/utils/logger';

// Mock electron-updater
vi.mock('electron-updater', () => ({
    autoUpdater: {
        on: vi.fn(),
        checkForUpdates: vi.fn().mockResolvedValue(undefined),
        quitAndInstall: vi.fn(),
        autoDownload: true,
        autoInstallOnAppQuit: true,
    },
}));

describe('AutoUpdateIpcHandler Coordinated Tests', () => {
    let sharedStoreData: Record<string, any>;
    let mockStore: any;

    beforeEach(() => {
        vi.clearAllMocks();
        if ((ipcMain as any)._reset) (ipcMain as any)._reset();

        // Shared store data to simulate persistence
        sharedStoreData = {
            autoUpdateEnabled: true,
        };

        mockStore = {
            get: vi.fn((key: string) => sharedStoreData[key]),
            set: vi.fn((key: string, value: any) => {
                sharedStoreData[key] = value;
            }),
            getAll: vi.fn(() => ({ ...sharedStoreData })),
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Enabled State Persistence (4.1.16)', () => {
        it('should persist enabled state across handler initialization', async () => {
            const windowManager = new WindowManager(false);
            const mockUpdateManager = {
                isEnabled: vi.fn(() => sharedStoreData.autoUpdateEnabled),
                setEnabled: vi.fn((enabled: boolean) => {
                    sharedStoreData.autoUpdateEnabled = enabled;
                }),
                checkForUpdates: vi.fn(),
                quitAndInstall: vi.fn(),
                devShowBadge: vi.fn(),
                devClearBadge: vi.fn(),
                devEmitUpdateEvent: vi.fn(),
                devMockPlatform: vi.fn(),
                devMockEnv: vi.fn(),
            };

            // First IpcManager instance
            const ipcManager1 = new IpcManager(
                windowManager,
                null,
                mockUpdateManager as any,
                null,
                null,
                mockStore,
                mockLogger
            );
            ipcManager1.setupIpcHandlers();

            // Get the set-enabled listener
            const setEnabledListener = (ipcMain as any)._listeners.get('auto-update:set-enabled');
            expect(setEnabledListener).toBeDefined();

            // Disable auto-update
            setEnabledListener({}, false);

            // Verify store was updated
            expect(mockStore.set).toHaveBeenCalledWith('autoUpdateEnabled', false);
            expect(sharedStoreData.autoUpdateEnabled).toBe(false);

            // Reset IPC handlers to simulate app restart
            if ((ipcMain as any)._reset) (ipcMain as any)._reset();

            // Second IpcManager instance (simulating restart)
            const ipcManager2 = new IpcManager(
                windowManager,
                null,
                mockUpdateManager as any,
                null,
                null,
                mockStore,
                mockLogger
            );
            ipcManager2.setupIpcHandlers();

            // Get the get-enabled handler
            const getEnabledHandler = (ipcMain as any)._handlers.get('auto-update:get-enabled');
            expect(getEnabledHandler).toBeDefined();

            // Should return the persisted value (false)
            const result = await getEnabledHandler();
            expect(result).toBe(false);
        });

        it('should use default true when store has no value', async () => {
            // Clear store data
            sharedStoreData = {};

            const windowManager = new WindowManager(false);

            // Create IpcManager without updateManager to test store fallback
            const ipcManager = new IpcManager(
                windowManager,
                null,
                null, // No updateManager
                null,
                null,
                mockStore,
                mockLogger
            );
            ipcManager.setupIpcHandlers();

            // Get the get-enabled handler
            const getEnabledHandler = (ipcMain as any)._handlers.get('auto-update:get-enabled');

            // Should return default true
            const result = await getEnabledHandler();
            expect(result).toBe(true);
        });

        it('should delegate to updateManager.isEnabled when available', async () => {
            const windowManager = new WindowManager(false);
            const mockUpdateManager = {
                isEnabled: vi.fn().mockReturnValue(false), // Returns false from updateManager
                setEnabled: vi.fn(),
                checkForUpdates: vi.fn(),
                quitAndInstall: vi.fn(),
                devShowBadge: vi.fn(),
                devClearBadge: vi.fn(),
                devEmitUpdateEvent: vi.fn(),
                devMockPlatform: vi.fn(),
                devMockEnv: vi.fn(),
            };

            const ipcManager = new IpcManager(
                windowManager,
                null,
                mockUpdateManager as any,
                null,
                null,
                mockStore,
                mockLogger
            );
            ipcManager.setupIpcHandlers();

            const getEnabledHandler = (ipcMain as any)._handlers.get('auto-update:get-enabled');
            const result = await getEnabledHandler();

            expect(mockUpdateManager.isEnabled).toHaveBeenCalled();
            expect(result).toBe(false);
        });
    });

    describe('Check and Install Coordination', () => {
        it('should coordinate check -> install flow', async () => {
            const windowManager = new WindowManager(false);
            const mockUpdateManager = {
                isEnabled: vi.fn().mockReturnValue(true),
                setEnabled: vi.fn(),
                checkForUpdates: vi.fn(),
                quitAndInstall: vi.fn(),
                devShowBadge: vi.fn(),
                devClearBadge: vi.fn(),
                devEmitUpdateEvent: vi.fn(),
                devMockPlatform: vi.fn(),
                devMockEnv: vi.fn(),
            };

            const ipcManager = new IpcManager(
                windowManager,
                null,
                mockUpdateManager as any,
                null,
                null,
                mockStore,
                mockLogger
            );
            ipcManager.setupIpcHandlers();

            // Trigger check
            const checkListener = (ipcMain as any)._listeners.get('auto-update:check');
            checkListener();
            expect(mockUpdateManager.checkForUpdates).toHaveBeenCalledWith(true);

            // Trigger install
            const installListener = (ipcMain as any)._listeners.get('auto-update:install');
            installListener();
            expect(mockUpdateManager.quitAndInstall).toHaveBeenCalled();
        });
    });
});
