/**
 * Unit tests for AutoUpdateIpcHandler.
 *
 * Tests auto-update IPC handlers including:
 * - get-enabled / set-enabled with validation
 * - check, install operations
 * - Dev test channels
 * - Tray tooltip
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutoUpdateIpcHandler } from '../../../../src/main/managers/ipc/AutoUpdateIpcHandler';
import type { IpcHandlerDependencies } from '../../../../src/main/managers/ipc/types';
import { createMockLogger, createMockWindowManager, createMockStore } from '../../../helpers/mocks';
import { IPC_CHANNELS } from '../../../../src/shared/constants/ipc-channels';

// Mock Electron
const { mockIpcMain } = vi.hoisted(() => {
    const mockIpcMain = {
        on: vi.fn((channel: string, listener: (...args: unknown[]) => void) => {
            mockIpcMain._listeners.set(channel, listener);
        }),
        handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
            mockIpcMain._handlers.set(channel, handler);
        }),
        _listeners: new Map<string, (...args: unknown[]) => void>(),
        _handlers: new Map<string, (...args: unknown[]) => unknown>(),
        _reset: () => {
            mockIpcMain._listeners.clear();
            mockIpcMain._handlers.clear();
        },
    };

    return { mockIpcMain };
});

vi.mock('electron', () => ({
    ipcMain: mockIpcMain,
}));

describe('AutoUpdateIpcHandler', () => {
    let handler: AutoUpdateIpcHandler;
    let mockDeps: IpcHandlerDependencies;
    let mockLogger: ReturnType<typeof createMockLogger>;
    let mockStore: ReturnType<typeof createMockStore>;
    let mockUpdateManager: {
        isEnabled: ReturnType<typeof vi.fn>;
        setEnabled: ReturnType<typeof vi.fn>;
        checkForUpdates: ReturnType<typeof vi.fn>;
        quitAndInstall: ReturnType<typeof vi.fn>;
        devShowBadge: ReturnType<typeof vi.fn>;
        devClearBadge: ReturnType<typeof vi.fn>;
        devEmitUpdateEvent: ReturnType<typeof vi.fn>;
        devMockPlatform: ReturnType<typeof vi.fn>;
        devMockEnv: ReturnType<typeof vi.fn>;
        getLastCheckTime?: ReturnType<typeof vi.fn>;
        getTrayTooltip?: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockIpcMain._reset();

        mockLogger = createMockLogger();
        mockStore = createMockStore({
            autoUpdateEnabled: true,
        });
        mockUpdateManager = {
            isEnabled: vi.fn().mockReturnValue(true),
            setEnabled: vi.fn(),
            checkForUpdates: vi.fn(),
            quitAndInstall: vi.fn(),
            devShowBadge: vi.fn(),
            devClearBadge: vi.fn(),
            devEmitUpdateEvent: vi.fn(),
            devMockPlatform: vi.fn(),
            devMockEnv: vi.fn(),
            getLastCheckTime: vi.fn().mockReturnValue(1234567890),
            getTrayTooltip: vi.fn().mockReturnValue('Gemini Desktop'),
        };

        mockDeps = {
            store: mockStore,
            logger: mockLogger,
            windowManager: createMockWindowManager(),
            updateManager: mockUpdateManager as any,
        };

        handler = new AutoUpdateIpcHandler(mockDeps);
    });

    describe('register', () => {
        it('registers all expected IPC handlers', () => {
            handler.register();

            // Handle channels
            expect(mockIpcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.AUTO_UPDATE_GET_ENABLED, expect.any(Function));
            expect(mockIpcMain.handle).toHaveBeenCalledWith(
                IPC_CHANNELS.AUTO_UPDATE_GET_LAST_CHECK,
                expect.any(Function)
            );
            expect(mockIpcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.TRAY_GET_TOOLTIP, expect.any(Function));

            // On channels
            expect(mockIpcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.AUTO_UPDATE_SET_ENABLED, expect.any(Function));
            expect(mockIpcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.AUTO_UPDATE_CHECK, expect.any(Function));
            expect(mockIpcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.AUTO_UPDATE_INSTALL, expect.any(Function));
            expect(mockIpcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.DEV_TEST_SHOW_BADGE, expect.any(Function));
            expect(mockIpcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.DEV_TEST_CLEAR_BADGE, expect.any(Function));
            expect(mockIpcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.DEV_TEST_SET_UPDATE_ENABLED, expect.any(Function));
            expect(mockIpcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.DEV_TEST_EMIT_UPDATE_EVENT, expect.any(Function));
            expect(mockIpcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.DEV_TEST_MOCK_PLATFORM, expect.any(Function));
        });
    });

    describe('auto-update:get-enabled handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('returns enabled state from updateManager when available (4.1.10)', async () => {
            mockUpdateManager.isEnabled.mockReturnValue(true);

            const handlerFn = mockIpcMain._handlers.get(IPC_CHANNELS.AUTO_UPDATE_GET_ENABLED);
            const result = await handlerFn!();

            expect(mockUpdateManager.isEnabled).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('returns enabled state from store when updateManager is null (4.1.9)', async () => {
            const handlerWithoutUpdateManager = new AutoUpdateIpcHandler({
                ...mockDeps,
                updateManager: null,
            });
            handlerWithoutUpdateManager.register();

            const handlerFn = mockIpcMain._handlers.get(IPC_CHANNELS.AUTO_UPDATE_GET_ENABLED);
            const result = await handlerFn!();

            expect(mockStore.get).toHaveBeenCalledWith('autoUpdateEnabled');
            expect(result).toBe(true);
        });

        it('returns true as default when store returns undefined', async () => {
            const emptyStore = createMockStore({});
            const handlerWithEmptyStore = new AutoUpdateIpcHandler({
                ...mockDeps,
                store: emptyStore,
                updateManager: null,
            });
            handlerWithEmptyStore.register();

            const handlerFn = mockIpcMain._handlers.get(IPC_CHANNELS.AUTO_UPDATE_GET_ENABLED);
            const result = await handlerFn!();

            expect(result).toBe(true);
        });

        it('returns true and logs error on exception', async () => {
            mockUpdateManager.isEnabled.mockImplementation(() => {
                throw new Error('Test error');
            });

            const handlerFn = mockIpcMain._handlers.get(IPC_CHANNELS.AUTO_UPDATE_GET_ENABLED);
            const result = await handlerFn!();

            expect(result).toBe(true);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error during getting auto-update state:',
                expect.objectContaining({ error: 'Test error' })
            );
        });
    });

    describe('auto-update:set-enabled handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('validates boolean input (4.1.11)', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.AUTO_UPDATE_SET_ENABLED);
            listener!({}, 'not-a-boolean' as any);

            expect(mockLogger.warn).toHaveBeenCalledWith('Invalid autoUpdateEnabled value: not-a-boolean');
            expect(mockStore.set).not.toHaveBeenCalled();
        });

        it('persists enabled state to store (4.1.12)', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.AUTO_UPDATE_SET_ENABLED);
            listener!({}, false);

            expect(mockStore.set).toHaveBeenCalledWith('autoUpdateEnabled', false);
            expect(mockLogger.log).toHaveBeenCalledWith('Auto-update set to: false');
        });

        it('delegates to updateManager when available', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.AUTO_UPDATE_SET_ENABLED);
            listener!({}, true);

            expect(mockUpdateManager.setEnabled).toHaveBeenCalledWith(true);
        });

        it('handles null updateManager gracefully (4.1.15)', () => {
            const handlerWithoutUpdateManager = new AutoUpdateIpcHandler({
                ...mockDeps,
                updateManager: null,
            });
            handlerWithoutUpdateManager.register();

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.AUTO_UPDATE_SET_ENABLED);

            // Should not throw
            expect(() => listener!({}, true)).not.toThrow();
            expect(mockStore.set).toHaveBeenCalledWith('autoUpdateEnabled', true);
        });

        it('logs error on exception', () => {
            mockStore.set.mockImplementation(() => {
                throw new Error('Store error');
            });

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.AUTO_UPDATE_SET_ENABLED);
            listener!({}, true);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error during setting auto-update state:',
                expect.objectContaining({
                    error: 'Store error',
                    enabled: true,
                })
            );
        });
    });

    describe('auto-update:check handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('calls updateManager.checkForUpdates with manual=true (4.1.13)', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.AUTO_UPDATE_CHECK);
            listener!();

            expect(mockUpdateManager.checkForUpdates).toHaveBeenCalledWith(true);
        });

        it('handles null updateManager gracefully (4.1.15)', () => {
            const handlerWithoutUpdateManager = new AutoUpdateIpcHandler({
                ...mockDeps,
                updateManager: null,
            });
            handlerWithoutUpdateManager.register();

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.AUTO_UPDATE_CHECK);

            // Should not throw
            expect(() => listener!()).not.toThrow();
        });

        it('logs error on exception', () => {
            mockUpdateManager.checkForUpdates.mockImplementation(() => {
                throw new Error('Check error');
            });

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.AUTO_UPDATE_CHECK);
            listener!();

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error during checking for updates:',
                expect.objectContaining({ error: 'Check error' })
            );
        });
    });

    describe('auto-update:get-last-check handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('returns last check time from updateManager', async () => {
            const handlerFn = mockIpcMain._handlers.get(IPC_CHANNELS.AUTO_UPDATE_GET_LAST_CHECK);
            const result = await handlerFn!();

            expect(result).toBe(1234567890);
        });

        it('returns 0 when updateManager is null', async () => {
            const handlerWithoutUpdateManager = new AutoUpdateIpcHandler({
                ...mockDeps,
                updateManager: null,
            });
            handlerWithoutUpdateManager.register();

            const handlerFn = mockIpcMain._handlers.get(IPC_CHANNELS.AUTO_UPDATE_GET_LAST_CHECK);
            const result = await handlerFn!();

            expect(result).toBe(0);
        });

        it('returns 0 when getLastCheckTime is not available', async () => {
            delete mockUpdateManager.getLastCheckTime;

            const handlerFn = mockIpcMain._handlers.get(IPC_CHANNELS.AUTO_UPDATE_GET_LAST_CHECK);
            const result = await handlerFn!();

            expect(result).toBe(0);
        });
    });

    describe('auto-update:install handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('calls updateManager.quitAndInstall (4.1.14)', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.AUTO_UPDATE_INSTALL);
            listener!();

            expect(mockUpdateManager.quitAndInstall).toHaveBeenCalled();
        });

        it('handles null updateManager gracefully (4.1.15)', () => {
            const handlerWithoutUpdateManager = new AutoUpdateIpcHandler({
                ...mockDeps,
                updateManager: null,
            });
            handlerWithoutUpdateManager.register();

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.AUTO_UPDATE_INSTALL);

            // Should not throw
            expect(() => listener!()).not.toThrow();
        });

        it('logs error on exception', () => {
            mockUpdateManager.quitAndInstall.mockImplementation(() => {
                throw new Error('Install error');
            });

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.AUTO_UPDATE_INSTALL);
            listener!();

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error during installing update:',
                expect.objectContaining({ error: 'Install error' })
            );
        });
    });

    describe('dev test handlers', () => {
        beforeEach(() => {
            handler.register();
        });

        it('handles dev:test:show-badge', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.DEV_TEST_SHOW_BADGE);
            listener!({}, '2.0.0');

            expect(mockUpdateManager.devShowBadge).toHaveBeenCalledWith('2.0.0');
        });

        it('handles dev:test:clear-badge', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.DEV_TEST_CLEAR_BADGE);
            listener!();

            expect(mockUpdateManager.devClearBadge).toHaveBeenCalled();
        });

        it('handles dev:test:set-update-enabled', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.DEV_TEST_SET_UPDATE_ENABLED);
            listener!({}, true);

            expect(mockUpdateManager.setEnabled).toHaveBeenCalledWith(true);
        });

        it('handles dev:test:emit-update-event', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.DEV_TEST_EMIT_UPDATE_EVENT);
            listener!({}, 'update-available', { version: '2.0.0' });

            expect(mockUpdateManager.devEmitUpdateEvent).toHaveBeenCalledWith('update-available', {
                version: '2.0.0',
            });
        });

        it('handles dev:test:mock-platform', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.DEV_TEST_MOCK_PLATFORM);
            listener!({}, 'darwin', { CI: 'true' });

            expect(mockUpdateManager.devMockPlatform).toHaveBeenCalledWith('darwin');
            expect(mockUpdateManager.devMockEnv).toHaveBeenCalledWith({ CI: 'true' });
        });

        it('handles null updateManager in dev handlers', () => {
            const handlerWithoutUpdateManager = new AutoUpdateIpcHandler({
                ...mockDeps,
                updateManager: null,
            });
            handlerWithoutUpdateManager.register();

            // None of these should throw
            const showBadge = mockIpcMain._listeners.get(IPC_CHANNELS.DEV_TEST_SHOW_BADGE);
            expect(() => showBadge!({}, '1.0.0')).not.toThrow();

            const clearBadge = mockIpcMain._listeners.get(IPC_CHANNELS.DEV_TEST_CLEAR_BADGE);
            expect(() => clearBadge!()).not.toThrow();

            const setEnabled = mockIpcMain._listeners.get(IPC_CHANNELS.DEV_TEST_SET_UPDATE_ENABLED);
            expect(() => setEnabled!({}, true)).not.toThrow();

            const emitEvent = mockIpcMain._listeners.get(IPC_CHANNELS.DEV_TEST_EMIT_UPDATE_EVENT);
            expect(() => emitEvent!({}, 'test', {})).not.toThrow();

            const mockPlatform = mockIpcMain._listeners.get(IPC_CHANNELS.DEV_TEST_MOCK_PLATFORM);
            expect(() => mockPlatform!({}, 'linux', {})).not.toThrow();
        });
    });

    describe('tray:get-tooltip handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('returns tooltip from updateManager', async () => {
            const handlerFn = mockIpcMain._handlers.get(IPC_CHANNELS.TRAY_GET_TOOLTIP);
            const result = await handlerFn!();

            expect(result).toBe('Gemini Desktop');
        });

        it('returns empty string when updateManager is null', async () => {
            const handlerWithoutUpdateManager = new AutoUpdateIpcHandler({
                ...mockDeps,
                updateManager: null,
            });
            handlerWithoutUpdateManager.register();

            const handlerFn = mockIpcMain._handlers.get(IPC_CHANNELS.TRAY_GET_TOOLTIP);
            const result = await handlerFn!();

            expect(result).toBe('');
        });

        it('returns empty string when getTrayTooltip is not available', async () => {
            delete mockUpdateManager.getTrayTooltip;

            const handlerFn = mockIpcMain._handlers.get(IPC_CHANNELS.TRAY_GET_TOOLTIP);
            const result = await handlerFn!();

            expect(result).toBe('');
        });

        it('returns empty string and logs error on exception', async () => {
            mockUpdateManager.getTrayTooltip = vi.fn().mockImplementation(() => {
                throw new Error('Tooltip error');
            });

            const handlerFn = mockIpcMain._handlers.get(IPC_CHANNELS.TRAY_GET_TOOLTIP);
            const result = await handlerFn!();

            expect(result).toBe('');
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error during getting tray tooltip:',
                expect.objectContaining({ error: 'Tooltip error' })
            );
        });
    });
});
