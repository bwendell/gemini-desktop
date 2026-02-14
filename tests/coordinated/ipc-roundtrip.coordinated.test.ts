import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, nativeTheme, BrowserWindow } from 'electron';
import IpcManager from '../../src/main/managers/ipcManager';
import WindowManager from '../../src/main/managers/windowManager';
import HotkeyManager from '../../src/main/managers/hotkeyManager';
import UpdateManager from '../../src/main/managers/updateManager';
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

const invokeHandler = async (channel: string, ...args: any[]) => {
    const handler = (ipcMain as any)._handlers.get(channel);
    if (!handler) throw new Error(`No handler for channel: ${channel}`);
    return await handler({}, ...args);
};

const sendMessage = (channel: string, ...args: any[]) => {
    const listener = (ipcMain as any)._listeners.get(channel);
    if (!listener) throw new Error(`No listener for channel: ${channel}`);
    listener({}, ...args);
};

const adapterForPlatform = {
    darwin: platformAdapterPresets.mac,
    win32: platformAdapterPresets.windows,
    linux: platformAdapterPresets.linuxX11,
} as const;

describe('IPC Round-Trip Integration', () => {
    let ipcManager: IpcManager;
    let windowManager: WindowManager;
    let hotkeyManager: HotkeyManager;
    let updateManager: UpdateManager;
    let mockStore: any;
    let sharedStoreData: Record<string, any>;

    beforeEach(() => {
        vi.clearAllMocks();
        if ((ipcMain as any)._reset) (ipcMain as any)._reset();
        if ((nativeTheme as any)._reset) (nativeTheme as any)._reset();
        if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();

        sharedStoreData = {
            theme: 'system',
            alwaysOnTop: false,
            hotkeyAlwaysOnTop: true,
            hotkeyBossKey: true,
            hotkeyQuickChat: true,
            hotkeyPrintToPdf: true,
            autoUpdateEnabled: true,
        };

        mockStore = {
            get: vi.fn((key: string) => sharedStoreData[key]),
            set: vi.fn((key: string, value: any) => {
                sharedStoreData[key] = value;
            }),
        };

        windowManager = new WindowManager(false);
        hotkeyManager = new HotkeyManager(windowManager);
        updateManager = new UpdateManager(mockStore as any);

        ipcManager = new IpcManager(
            windowManager,
            hotkeyManager,
            updateManager,
            null,
            null,
            null,
            mockStore,
            mockLogger
        );
        ipcManager.setupIpcHandlers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        resetPlatformAdapterForTests();
    });

    describe('Theme IPC Round-Trip', () => {
        it('should complete round-trip: get current theme', async () => {
            const result = await invokeHandler('theme:get');

            expect(result).toEqual({
                preference: 'system',
                effectiveTheme: expect.any(String),
            });
            expect(mockStore.get).toHaveBeenCalledWith('theme');
        });

        it('should complete round-trip: set theme and receive broadcast', () => {
            const mockWindow = {
                isDestroyed: () => false,
                webContents: { send: vi.fn() },
            };
            (BrowserWindow.getAllWindows as any).mockReturnValue([mockWindow]);

            sendMessage('theme:set', 'dark');

            expect(nativeTheme.themeSource).toBe('dark');
            expect(mockStore.set).toHaveBeenCalledWith('theme', 'dark');

            expect(mockWindow.webContents.send).toHaveBeenCalledWith(
                'theme:changed',
                expect.objectContaining({
                    preference: 'dark',
                })
            );
        });

        it('should reject invalid theme values', () => {
            sendMessage('theme:set', 'invalid-theme');

            expect(mockStore.set).not.toHaveBeenCalledWith('theme', 'invalid-theme');
        });

        it('should handle main process errors gracefully', async () => {
            mockStore.get.mockImplementation(() => {
                throw new Error('Store read failed');
            });

            const result = await invokeHandler('theme:get');

            expect(result).toEqual({
                preference: 'system',
                effectiveTheme: expect.any(String),
            });
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('Always-On-Top IPC Round-Trip', () => {
        it('should complete round-trip: get always-on-top state', async () => {
            sharedStoreData.alwaysOnTop = true;

            const result = await invokeHandler('always-on-top:get');

            expect(result).toEqual({ enabled: true });
        });

        it('should complete round-trip: set always-on-top and receive broadcast', () => {
            windowManager.createMainWindow();
            const mockWindow = {
                isDestroyed: () => false,
                webContents: { send: vi.fn() },
            };
            (BrowserWindow.getAllWindows as any).mockReturnValue([mockWindow]);

            sendMessage('always-on-top:set', true);

            windowManager.emit('always-on-top-changed', true);

            expect(mockStore.set).toHaveBeenCalledWith('alwaysOnTop', true);

            expect(mockWindow.webContents.send).toHaveBeenCalledWith('always-on-top:changed', {
                enabled: true,
            });
        });

        it('should handle store errors gracefully', async () => {
            mockStore.get.mockImplementation(() => {
                throw new Error('Store error');
            });

            const result = await invokeHandler('always-on-top:get');

            expect(result).toEqual({ enabled: false });
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('Individual Hotkeys IPC Round-Trip', () => {
        it('should complete round-trip: get hotkey settings', async () => {
            const result = await invokeHandler('hotkeys:individual:get');

            expect(result).toEqual({
                alwaysOnTop: true,
                bossKey: true,
                quickChat: true,
                printToPdf: true,
            });
        });

        it('should complete round-trip: set hotkey and receive broadcast', () => {
            const mockWindow = {
                isDestroyed: () => false,
                webContents: { send: vi.fn() },
            };
            (BrowserWindow.getAllWindows as any).mockReturnValue([mockWindow]);

            sendMessage('hotkeys:individual:set', 'quickChat', false);

            expect(hotkeyManager.isIndividualEnabled('quickChat')).toBe(false);

            expect(mockStore.set).toHaveBeenCalledWith('hotkeyQuickChat', false);

            expect(mockWindow.webContents.send).toHaveBeenCalledWith(
                'hotkeys:individual:changed',
                expect.objectContaining({
                    quickChat: false,
                })
            );
        });

        it('should reject invalid hotkey IDs', () => {
            const mockWindow = {
                isDestroyed: () => false,
                webContents: { send: vi.fn() },
            };
            (BrowserWindow.getAllWindows as any).mockReturnValue([mockWindow]);

            sendMessage('hotkeys:individual:set', 'invalid', false);

            expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('invalid'));
            expect(mockWindow.webContents.send).not.toHaveBeenCalled();
        });
    });

    describe('Window Controls IPC Round-Trip', () => {
        let mockWindow: any;
        beforeEach(() => {
            mockWindow = {
                id: 1,
                minimize: vi.fn(),
                maximize: vi.fn(),
                unmaximize: vi.fn(),
                close: vi.fn(),
                isMaximized: vi.fn().mockReturnValue(false),
                isDestroyed: vi.fn().mockReturnValue(false),
                webContents: { send: vi.fn() },
            };
            (BrowserWindow as any).fromWebContents = vi.fn().mockReturnValue(mockWindow);
        });

        it('should handle minimize window request', () => {
            sendMessage('window-minimize');

            expect(mockWindow.minimize).toHaveBeenCalled();
        });

        it('should handle maximize window request', () => {
            mockWindow.isMaximized.mockReturnValue(false);

            sendMessage('window-maximize');

            expect(mockWindow.maximize).toHaveBeenCalled();
        });

        it('should handle unmaximize when window is maximized', () => {
            mockWindow.isMaximized.mockReturnValue(true);

            sendMessage('window-maximize');

            expect(mockWindow.unmaximize).toHaveBeenCalled();
        });

        it('should handle close window request', () => {
            sendMessage('window-close');

            expect(mockWindow.close).toHaveBeenCalled();
        });

        it('should complete round-trip: isMaximized query', async () => {
            mockWindow.isMaximized.mockReturnValue(true);

            const result = await invokeHandler('window-is-maximized');

            expect(result).toBe(true);
        });

        it('should handle errors in window operations', () => {
            mockWindow.minimize.mockImplementation(() => {
                throw new Error('Window minimize failed');
            });

            sendMessage('window-minimize');

            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('Auto-Update IPC Round-Trip', () => {
        it('should complete round-trip: get auto-update enabled state', async () => {
            const result = await invokeHandler('auto-update:get-enabled');

            expect(result).toBe(true);
        });

        it('should complete round-trip: set auto-update enabled', () => {
            sendMessage('auto-update:set-enabled', false);

            expect(sharedStoreData.autoUpdateEnabled).toBe(false);
        });

        it('should handle manual update check', () => {
            sendMessage('auto-update:check');

            expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('check'));
        });

        it('should validate boolean input for setAutoUpdateEnabled', () => {
            sendMessage('auto-update:set-enabled', 'invalid');

            expect(mockLogger.warn).toHaveBeenCalled();
        });
    });

    describe('Multi-Window Broadcast Integrity', () => {
        it('should broadcast theme changes to all windows', () => {
            const mockWin1 = {
                id: 1,
                isDestroyed: () => false,
                webContents: { send: vi.fn() },
            };
            const mockWin2 = {
                id: 2,
                isDestroyed: () => false,
                webContents: { send: vi.fn() },
            };
            const mockWin3 = {
                id: 3,
                isDestroyed: () => false,
                webContents: { send: vi.fn() },
            };
            (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin1, mockWin2, mockWin3]);

            sendMessage('theme:set', 'light');

            expect(mockWin1.webContents.send).toHaveBeenCalledWith(
                'theme:changed',
                expect.objectContaining({ preference: 'light' })
            );
            expect(mockWin2.webContents.send).toHaveBeenCalledWith(
                'theme:changed',
                expect.objectContaining({ preference: 'light' })
            );
            expect(mockWin3.webContents.send).toHaveBeenCalledWith(
                'theme:changed',
                expect.objectContaining({ preference: 'light' })
            );
        });

        it('should skip destroyed windows in broadcast', () => {
            const mockWin1 = {
                id: 1,
                isDestroyed: () => false,
                webContents: { send: vi.fn() },
            };
            const mockWin2 = {
                id: 2,
                isDestroyed: () => true,
                webContents: { send: vi.fn() },
            };
            (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin1, mockWin2]);

            sendMessage('theme:set', 'dark');

            expect(mockWin1.webContents.send).toHaveBeenCalled();
            expect(mockWin2.webContents.send).not.toHaveBeenCalled();
        });

        it('should handle broadcast errors without crashing', () => {
            const mockWin1 = {
                id: 1,
                isDestroyed: () => false,
                webContents: {
                    send: vi.fn(() => {
                        throw new Error('Send failed');
                    }),
                },
            };
            const mockWin2 = {
                id: 2,
                isDestroyed: () => false,
                webContents: { send: vi.fn() },
            };
            (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin1, mockWin2]);

            sendMessage('theme:set', 'dark');

            expect(mockLogger.error).toHaveBeenCalled();
            expect(mockWin2.webContents.send).toHaveBeenCalled();
        });
    });

    describe('Cross-Platform IPC Behavior', () => {
        it.each(['darwin', 'win32', 'linux'] as const)('should handle IPC on %s', async (platform) => {
            useMockPlatformAdapter(adapterForPlatform[platform]());

            const result = invokeHandler('theme:get');
            await expect(result).resolves.toBeDefined();

            resetPlatformAdapterForTests();
        });
    });
});
