import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { globalShortcut, Tray, BrowserWindow } from 'electron';
import WindowManager from '../../src/main/managers/windowManager';
import HotkeyManager from '../../src/main/managers/hotkeyManager';
import TrayManager from '../../src/main/managers/trayManager';
import UpdateManager from '../../src/main/managers/updateManager';
import { platformAdapterPresets, useMockPlatformAdapter, resetPlatformAdapterForTests } from '../helpers/mocks';

vi.mock('electron-updater', () => ({
    autoUpdater: {
        on: vi.fn(),
        checkForUpdates: vi.fn(),
        checkForUpdatesAndNotify: vi.fn(),
        downloadUpdate: vi.fn(),
        quitAndInstall: vi.fn(),
        removeAllListeners: vi.fn(),
    },
}));

vi.mock('../../src/main/utils/logger');

vi.mock('fs', () => ({
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn().mockReturnValue(Buffer.from('mock')),
    writeFileSync: vi.fn(),
}));

const adapterForPlatform = {
    darwin: platformAdapterPresets.mac,
    win32: platformAdapterPresets.windows,
    linux: platformAdapterPresets.linuxX11,
} as const;

describe('Shutdown Sequence Integration', () => {
    let windowManager: WindowManager;
    let hotkeyManager: HotkeyManager;
    let trayManager: TrayManager;
    let updateManager: UpdateManager;
    let mockStore: any;

    beforeEach(() => {
        vi.clearAllMocks();
        if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();
        if ((Tray as any)._reset) (Tray as any)._reset();

        mockStore = {
            get: vi.fn().mockReturnValue(true),
            set: vi.fn(),
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
        resetPlatformAdapterForTests();
    });

    describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
        beforeEach(() => {
            useMockPlatformAdapter(adapterForPlatform[platform]());

            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager);
            trayManager = new TrayManager(windowManager);
            updateManager = new UpdateManager(mockStore);
        });

        it('should perform coordinated cleanup on app shutdown', () => {
            windowManager.createMainWindow();
            hotkeyManager.registerShortcuts();
            trayManager.createTray();

            hotkeyManager.unregisterAll();
            trayManager.destroyTray();
            updateManager.destroy();
            windowManager.setQuitting(true);

            expect(globalShortcut.unregisterAll).toHaveBeenCalled();

            const instances = (Tray as any)._instances;
            expect(instances.length).toBeGreaterThan(0);
            expect(instances[0].destroy).toHaveBeenCalled();

            const mainWindow = windowManager.getMainWindow() as any;
            const closeEvent = { preventDefault: vi.fn() };
            mainWindow._listeners.get('close')(closeEvent);
            expect(closeEvent.preventDefault).not.toHaveBeenCalled();
        });

        it('should handle shutdown even if some managers are not initialized', () => {
            expect(() => {
                hotkeyManager.unregisterAll();
                windowManager.setQuitting(true);
            }).not.toThrow();
        });
    });
});
