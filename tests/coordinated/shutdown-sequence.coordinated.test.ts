/**
 * Integration tests for application shutdown sequence.
 * Verifies that all managers coordinate their destruction and cleanup correctly.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { globalShortcut, Tray, BrowserWindow } from 'electron';
import WindowManager from '../../src/main/managers/windowManager';
import HotkeyManager from '../../src/main/managers/hotkeyManager';
import TrayManager from '../../src/main/managers/trayManager';
import UpdateManager from '../../src/main/managers/updateManager';

// Mock electron-updater
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

// Use the centralized logger mock from __mocks__ directory
vi.mock('../../src/main/utils/logger');

// Mock fs
vi.mock('fs', () => ({
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn().mockReturnValue(Buffer.from('mock')),
    writeFileSync: vi.fn(),
}));

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
    });

    describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
        beforeEach(() => {
            // Mock platform
            vi.stubGlobal('process', { ...process, platform });

            // Create REAL managers after platform stub
            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager);
            trayManager = new TrayManager(windowManager);
            updateManager = new UpdateManager(mockStore);
        });

        afterEach(() => {
            vi.unstubAllGlobals();
        });

        it('should perform coordinated cleanup on app shutdown', () => {
            // Setup some state
            windowManager.createMainWindow();
            hotkeyManager.registerShortcuts();
            trayManager.createTray();

            // Simulate "will-quit" sequence (as seen in main.ts)
            hotkeyManager.unregisterAll();
            trayManager.destroyTray();
            updateManager.destroy();
            windowManager.setQuitting(true);

            // Verify Hotkeys unregistration
            expect(globalShortcut.unregisterAll).toHaveBeenCalled();

            // Verify Tray destruction
            const instances = (Tray as any)._instances;
            expect(instances.length).toBeGreaterThan(0);
            expect(instances[0].destroy).toHaveBeenCalled();

            // Verify WindowManager is in quitting state (prevents hiding to tray)
            const mainWindow = windowManager.getMainWindow() as any;
            const closeEvent = { preventDefault: vi.fn() };
            mainWindow._listeners.get('close')(closeEvent);
            expect(closeEvent.preventDefault).not.toHaveBeenCalled();
        });

        it('should handle shutdown even if some managers are not initialized', () => {
            // Simulate missing tray manager or failed initialization
            // (We've already initialized them in beforeEach, but we can test partial cleanup)

            // This should not throw
            expect(() => {
                hotkeyManager.unregisterAll();
                windowManager.setQuitting(true);
            }).not.toThrow();
        });
    });
});
