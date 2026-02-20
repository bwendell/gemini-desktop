import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';
import IpcManager from '../../src/main/managers/ipcManager';
import WindowManager from '../../src/main/managers/windowManager';
import HotkeyManager from '../../src/main/managers/hotkeyManager';
import { platformAdapterPresets, useMockPlatformAdapter, resetPlatformAdapterForTests } from '../helpers/mocks';

vi.mock('../../src/main/utils/logger');
import { mockLogger } from '../../src/main/utils/__mocks__/logger';

vi.mock('electron-updater', () => ({
    autoUpdater: {
        on: vi.fn(),
        checkForUpdates: vi.fn().mockResolvedValue(undefined),
    },
}));

const adapterForPlatform = {
    darwin: platformAdapterPresets.mac,
    win32: platformAdapterPresets.windows,
    linux: platformAdapterPresets.linuxX11,
} as const;

describe('Cross-Window Sync Integration', () => {
    let ipcManager: IpcManager;
    let windowManager: WindowManager;
    let hotkeyManager: HotkeyManager;
    let mockStore: any;
    let storeData: Record<string, any>;

    describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
        beforeEach(() => {
            vi.clearAllMocks();
            if ((ipcMain as any)._reset) (ipcMain as any)._reset();
            if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();
            useMockPlatformAdapter(adapterForPlatform[platform]());

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

            windowManager = new WindowManager(false);
            windowManager.createMainWindow();

            hotkeyManager = new HotkeyManager(windowManager);
            ipcManager = new IpcManager(windowManager, hotkeyManager, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();
        });

        afterEach(() => {
            resetPlatformAdapterForTests();
        });

        it('should broadcast theme changes to all windows', () => {
            const win1 = { id: 1, isDestroyed: () => false, webContents: { send: vi.fn() } };
            const win2 = { id: 2, isDestroyed: () => false, webContents: { send: vi.fn() } };
            (BrowserWindow.getAllWindows as any).mockReturnValue([win1, win2]);

            const listener = (ipcMain as any)._listeners.get('theme:set');
            listener({}, 'light');

            expect(win1.webContents.send).toHaveBeenCalledWith(
                'theme:changed',
                expect.objectContaining({ preference: 'light' })
            );
            expect(win2.webContents.send).toHaveBeenCalledWith(
                'theme:changed',
                expect.objectContaining({ preference: 'light' })
            );

            expect(storeData.theme).toBe('light');
        });

        it('should broadcast always-on-top changes triggered via IPC', () => {
            const win1 = { id: 1, isDestroyed: () => false, webContents: { send: vi.fn() } };
            (BrowserWindow.getAllWindows as any).mockReturnValue([win1]);

            const listener = (ipcMain as any)._listeners.get('always-on-top:set');
            listener({}, true);

            expect(win1.webContents.send).toHaveBeenCalledWith('always-on-top:changed', {
                enabled: true,
            });

            expect(mockStore.set).toHaveBeenCalledWith('alwaysOnTop', true);
        });

        it('should broadcast individual hotkey changes to all windows', () => {
            const win1 = { id: 1, isDestroyed: () => false, webContents: { send: vi.fn() } };
            const win2 = { id: 2, isDestroyed: () => false, webContents: { send: vi.fn() } };
            (BrowserWindow.getAllWindows as any).mockReturnValue([win1, win2]);

            const listener = (ipcMain as any)._listeners.get('hotkeys:individual:set');
            listener({}, 'peekAndHide', false);

            const expectedSettings = expect.objectContaining({
                peekAndHide: false,
                quickChat: true,
                alwaysOnTop: true,
            });

            expect(win1.webContents.send).toHaveBeenCalledWith('hotkeys:individual:changed', expectedSettings);
            expect(win2.webContents.send).toHaveBeenCalledWith('hotkeys:individual:changed', expectedSettings);

            expect(hotkeyManager.isIndividualEnabled('peekAndHide')).toBe(false);
        });
    });
});
