import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, BrowserWindow, nativeTheme } from 'electron';
import IpcManager from '../../src/main/managers/ipcManager';
import WindowManager from '../../src/main/managers/windowManager';
import { platformAdapterPresets, useMockPlatformAdapter, resetPlatformAdapterForTests } from '../helpers/mocks';

vi.mock('../../src/main/utils/logger');
import { mockLogger } from '../../src/main/utils/__mocks__/logger';

vi.mock('electron-updater', () => ({
    autoUpdater: {
        on: vi.fn(),
        checkForUpdates: vi.fn().mockResolvedValue(undefined),
        quitAndInstall: vi.fn(),
        autoDownload: true,
        autoInstallOnAppQuit: true,
    },
}));

vi.mock('fs', () => ({
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn().mockReturnValue('{}'),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
}));

const adapterForPlatform = {
    darwin: platformAdapterPresets.mac,
    win32: platformAdapterPresets.windows,
    linux: platformAdapterPresets.linuxX11,
} as const;

const getHandler = (channel: string) => (ipcMain as any)._handlers.get(channel);
const getListener = (channel: string) => (ipcMain as any)._listeners.get(channel);

describe('Manager Initialization Integration', () => {
    let mockStore: any;
    let storeData: Record<string, any>;

    beforeEach(() => {
        vi.clearAllMocks();
        if ((ipcMain as any)._reset) (ipcMain as any)._reset();
        if ((nativeTheme as any)._reset) (nativeTheme as any)._reset();
        if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();

        storeData = {
            theme: 'system',
            alwaysOnTop: false,
            hotkeyAlwaysOnTop: true,
            hotkeyBossKey: true,
            hotkeyQuickChat: true,
            autoUpdateEnabled: true,
        };
        mockStore = {
            get: vi.fn((key: string) => storeData[key]),
            set: vi.fn((key: string, value: any) => {
                storeData[key] = value;
            }),
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
        resetPlatformAdapterForTests();
    });

    describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
        beforeEach(() => {
            useMockPlatformAdapter(adapterForPlatform[platform]());
        });

        describe('IpcManager with null HotkeyManager', () => {
            it('should handle hotkey IPC calls gracefully without HotkeyManager', () => {
                const windowManager = new WindowManager(false);

                const ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
                ipcManager.setupIpcHandlers();

                const handler = getListener('hotkeys:individual:set');
                expect(handler).toBeDefined();

                expect(() => handler({}, 'alwaysOnTop', false)).not.toThrow();

                expect(mockStore.set).toHaveBeenCalledWith('hotkeyAlwaysOnTop', false);
            });

            it('should return hotkey settings even without HotkeyManager', async () => {
                const windowManager = new WindowManager(false);
                const ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
                ipcManager.setupIpcHandlers();

                const handler = getHandler('hotkeys:individual:get');
                const result = await handler({});

                expect(result).toEqual({
                    alwaysOnTop: true,
                    bossKey: true,
                    quickChat: true,
                    printToPdf: true,
                });
            });
        });

        describe('IpcManager with null UpdateManager', () => {
            it('should handle auto-update IPC calls gracefully without UpdateManager', () => {
                const windowManager = new WindowManager(false);

                const ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
                ipcManager.setupIpcHandlers();

                const setHandler = getListener('auto-update:set-enabled');
                expect(() => setHandler({}, false)).not.toThrow();

                expect(mockStore.set).toHaveBeenCalledWith('autoUpdateEnabled', false);
            });

            it('should handle auto-update check gracefully without UpdateManager', () => {
                const windowManager = new WindowManager(false);

                const ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
                ipcManager.setupIpcHandlers();

                const checkHandler = getListener('auto-update:check');
                expect(() => checkHandler({})).not.toThrow();

                expect(mockLogger.error).not.toHaveBeenCalled();
            });
        });

        describe('Manager State Tracking', () => {
            it('should track IPC handler registration without errors', () => {
                const windowManager = new WindowManager(false);

                const mockUpdateManager = {
                    isEnabled: vi.fn().mockReturnValue(true),
                    setEnabled: vi.fn(),
                    checkForUpdates: vi.fn(),
                    destroy: vi.fn(),
                };

                const ipcManager = new IpcManager(
                    windowManager,
                    null,
                    mockUpdateManager as any,
                    null,
                    null,
                    null,
                    mockStore,
                    mockLogger
                );
                ipcManager.setupIpcHandlers();

                expect((ipcMain as any)._handlers.size).toBeGreaterThan(0);
                expect((ipcMain as any)._listeners.size).toBeGreaterThan(0);
                expect(mockLogger.error).not.toHaveBeenCalled();
            });
        });

        describe('Manager Creation Order', () => {
            it('should create managers in correct dependency order without errors', () => {
                const windowManager = new WindowManager(false);
                expect(windowManager).toBeDefined();

                const mockUpdateManager = {
                    isEnabled: vi.fn().mockReturnValue(true),
                    setEnabled: vi.fn(),
                    checkForUpdates: vi.fn(),
                    destroy: vi.fn(),
                };
                expect(mockUpdateManager).toBeDefined();

                const ipcManager = new IpcManager(
                    windowManager,
                    null,
                    mockUpdateManager as any,
                    null,
                    null,
                    null,
                    mockStore,
                    mockLogger
                );
                expect(ipcManager).toBeDefined();

                ipcManager.setupIpcHandlers();

                expect(mockLogger.error).not.toHaveBeenCalled();
            });
        });
    });
});
