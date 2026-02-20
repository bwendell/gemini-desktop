import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, nativeTheme, BrowserWindow } from 'electron';
import IpcManager from '../../src/main/managers/ipcManager';
import WindowManager from '../../src/main/managers/windowManager';
import { platformAdapterPresets, useMockPlatformAdapter, resetPlatformAdapterForTests } from '../helpers/mocks';

vi.mock('../../src/main/utils/logger');
import { mockLogger } from '../../src/main/utils/__mocks__/logger';

const getListener = (channel: string) => (ipcMain as any)._listeners.get(channel);

const adapterForPlatform = {
    darwin: platformAdapterPresets.mac,
    win32: platformAdapterPresets.windows,
    linux: platformAdapterPresets.linuxX11,
} as const;

describe('IPC Manager Coordination', () => {
    let ipcManager: IpcManager;
    let windowManager: WindowManager;
    let mockStore: any;
    let mockHotkeyManager: any;
    let mockUpdateManager: any;

    beforeEach(() => {
        vi.clearAllMocks();
        if ((ipcMain as any)._reset) (ipcMain as any)._reset();
        if ((nativeTheme as any)._reset) (nativeTheme as any)._reset();
        if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();

        const storeData: Record<string, any> = {
            theme: 'system',
            alwaysOnTop: false,
            hotkeyAlwaysOnTop: true,
            hotkeyBossKey: true,
            hotkeyQuickChat: true,
            hotkeyPrintToPdf: true,
            acceleratorAlwaysOnTop: 'Ctrl+Shift+T',
            acceleratorBossKey: 'Ctrl+Shift+B',
            acceleratorQuickChat: 'Ctrl+Shift+X',
            acceleratorPrintToPdf: 'Ctrl+Shift+P',
            autoUpdateEnabled: true,
        };
        mockStore = {
            get: vi.fn((key: string) => storeData[key]),
            set: vi.fn((key: string, value: any) => {
                storeData[key] = value;
            }),
            _data: storeData,
        };

        mockHotkeyManager = {
            setIndividualEnabled: vi.fn(),
            setAccelerator: vi.fn(),
            registerAll: vi.fn(),
            registerShortcuts: vi.fn(),
            unregisterAll: vi.fn(),
            updateAllSettings: vi.fn(),
            updateAllAccelerators: vi.fn(),
            getIndividualSettings: vi.fn().mockReturnValue({
                alwaysOnTop: true,
                peekAndHide: true,
                quickChat: true,
                printToPdf: true,
            }),
            getHotkeyAccelerators: vi.fn().mockReturnValue({
                alwaysOnTop: 'Ctrl+Shift+T',
                peekAndHide: 'Ctrl+Shift+B',
                quickChat: 'Ctrl+Shift+X',
                printToPdf: 'Ctrl+Shift+P',
            }),
        };

        mockUpdateManager = {
            isEnabled: vi.fn().mockReturnValue(true),
            setEnabled: vi.fn(),
            checkForUpdates: vi.fn(),
            quitAndInstall: vi.fn(),
            devShowBadge: vi.fn(),
            devClearBadge: vi.fn(),
        };

        windowManager = new WindowManager(false);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        resetPlatformAdapterForTests();
    });

    describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
        beforeEach(() => {
            useMockPlatformAdapter(adapterForPlatform[platform]());

            ipcManager = new IpcManager(
                windowManager,
                mockHotkeyManager,
                mockUpdateManager,
                null,
                null,
                null,
                mockStore,
                mockLogger
            );
            ipcManager.setupIpcHandlers();
        });

        afterEach(() => {
            vi.unstubAllGlobals();
        });

        describe('Always-On-Top Coordination', () => {
            it('should persist always-on-top state and broadcast to all windows', () => {
                const mockWin1 = { isDestroyed: () => false, webContents: { send: vi.fn() } };
                const mockWin2 = { isDestroyed: () => false, webContents: { send: vi.fn() } };
                (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin1, mockWin2]);

                const handler = getListener('always-on-top:set');
                expect(handler).toBeDefined();
                handler({}, true);

                windowManager.emit('always-on-top-changed', true);

                expect(mockStore.set).toHaveBeenCalledWith('alwaysOnTop', true);

                expect(mockWin1.webContents.send).toHaveBeenCalledWith('always-on-top:changed', {
                    enabled: true,
                });
                expect(mockWin2.webContents.send).toHaveBeenCalledWith('always-on-top:changed', {
                    enabled: true,
                });
            });
        });

        describe('Individual Hotkey Settings Coordination', () => {
            it('should update HotkeyManager when individual hotkey is disabled', () => {
                const handler = getListener('hotkeys:individual:set');
                expect(handler).toBeDefined();
                handler({}, 'alwaysOnTop', false);

                expect(mockHotkeyManager.setIndividualEnabled).toHaveBeenCalledWith('alwaysOnTop', false);

                expect(mockStore.set).toHaveBeenCalledWith('hotkeyAlwaysOnTop', false);
            });

            it('should broadcast individual hotkey changes to all windows', () => {
                const mockWin = { isDestroyed: () => false, webContents: { send: vi.fn() } };
                (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin]);

                const handler = getListener('hotkeys:individual:set');
                handler({}, 'peekAndHide', false);

                expect(mockWin.webContents.send).toHaveBeenCalledWith(
                    'hotkeys:individual:changed',
                    expect.objectContaining({
                        alwaysOnTop: true,
                        peekAndHide: false,
                        quickChat: true,
                    })
                );
            });
        });

        describe('Theme Change Coordination', () => {
            it('should update nativeTheme and broadcast to all windows', () => {
                const mockWin = { isDestroyed: () => false, webContents: { send: vi.fn() } };
                (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin]);

                const handler = getListener('theme:set');
                expect(handler).toBeDefined();
                handler({}, 'dark');

                expect(nativeTheme.themeSource).toBe('dark');

                expect(mockStore.set).toHaveBeenCalledWith('theme', 'dark');

                expect(mockWin.webContents.send).toHaveBeenCalledWith(
                    'theme:changed',
                    expect.objectContaining({
                        preference: 'dark',
                    })
                );
            });
        });

        describe('Auto-Update IPC Coordination', () => {
            it('should delegate auto-update enable/disable to UpdateManager', () => {
                const handler = getListener('auto-update:set-enabled');
                expect(handler).toBeDefined();
                handler({}, false);

                expect(mockUpdateManager.setEnabled).toHaveBeenCalledWith(false);
            });

            it('should trigger update check via UpdateManager', () => {
                const handler = getListener('auto-update:check');
                expect(handler).toBeDefined();
                handler({});

                expect(mockUpdateManager.checkForUpdates).toHaveBeenCalledWith(true);
            });
        });
    });
});
