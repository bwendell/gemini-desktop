import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { app, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import UpdateManager from './updateManager';
import type SettingsStore from '../store';

// Mock dependencies
vi.mock('electron', () => ({
    app: {
        isPackaged: true
    },
    BrowserWindow: {
        getAllWindows: vi.fn(),
    }
}));

vi.mock('electron-updater', () => ({
    autoUpdater: {
        autoDownload: false,
        autoInstallOnAppQuit: false,
        logger: null,
        checkForUpdatesAndNotify: vi.fn(),
        quitAndInstall: vi.fn(),
        on: vi.fn(),
        removeAllListeners: vi.fn(),
    }
}));

vi.mock('electron-log', () => ({
    default: {
        transports: {
            file: {
                level: 'info'
            }
        },
        info: vi.fn(),
        error: vi.fn(),
    }
}));

vi.mock('../utils/logger', () => ({
    createLogger: () => ({
        log: vi.fn(),
        error: vi.fn()
    })
}));

describe('UpdateManager', () => {
    let updateManager: UpdateManager;
    let mockSettingsStore: SettingsStore<any>;
    let mockWindows: any[];
    let originalPlatform: PropertyDescriptor | undefined;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        // Mock platform to win32 to avoid Linux-specific update disabling in CI
        originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
        Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });

        // Setup mock settings
        mockSettingsStore = {
            get: vi.fn().mockReturnValue(true),
            set: vi.fn(),
        } as any;

        // Setup mock windows
        mockWindows = [
            {
                isDestroyed: () => false,
                webContents: {
                    send: vi.fn()
                }
            }
        ];
        (BrowserWindow.getAllWindows as any).mockReturnValue(mockWindows);
    });

    afterEach(() => {
        if (updateManager) {
            updateManager.destroy();
        }
        vi.useRealTimers();
        // Restore original platform
        if (originalPlatform) {
            Object.defineProperty(process, 'platform', originalPlatform);
        }
    });

    it('initializes with default settings', () => {
        (app as any).isPackaged = true;
        updateManager = new UpdateManager(mockSettingsStore);
        expect(updateManager.isEnabled()).toBe(true);
        expect(mockSettingsStore.get).toHaveBeenCalledWith('autoUpdateEnabled');
    });

    it('uses default enabled=true if settings.get returns undefined', () => {
        (app as any).isPackaged = true;
        mockSettingsStore.get = vi.fn().mockReturnValue(undefined);
        updateManager = new UpdateManager(mockSettingsStore);
        expect(updateManager.isEnabled()).toBe(true);
    });


    it('disables updates in development mode', () => {
        (app as any).isPackaged = false;
        updateManager = new UpdateManager(mockSettingsStore);
        // Even if settings say true, shouldDisableUpdates logic might be internal
        // The manager internal logic disables it but 'enabled' property might reflect the setting or effective state.
        // Looking at code: this.enabled = false if shouldDisableUpdates() returns true

        // Wait, the constructor initializes this.enabled from settings first, then overrides if shouldDisableUpdates is true.
        expect(updateManager.isEnabled()).toBe(false);
    });

    it('starts periodic checks if enabled', () => {
        (app as any).isPackaged = true;
        const setIntervalSpy = vi.spyOn(global, 'setInterval');
        const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

        updateManager = new UpdateManager(mockSettingsStore);
        updateManager.startPeriodicChecks();

        // Should start check interval
        expect(setIntervalSpy).toHaveBeenCalled();

        // Should also schedule immediate check
        expect(setTimeoutSpy).toHaveBeenCalled();

        setIntervalSpy.mockRestore();
        setTimeoutSpy.mockRestore();
    });

    it('does not start periodic checks if disabled via settings', () => {
        (app as any).isPackaged = true;
        mockSettingsStore.get = vi.fn().mockReturnValue(false);
        const setIntervalSpy = vi.spyOn(global, 'setInterval');

        updateManager = new UpdateManager(mockSettingsStore);

        expect(setIntervalSpy).not.toHaveBeenCalled();

        setIntervalSpy.mockRestore();
    });

    it('checkForUpdates calls autoUpdater.checkForUpdatesAndNotify', async () => {
        (app as any).isPackaged = true;
        updateManager = new UpdateManager(mockSettingsStore);

        await updateManager.checkForUpdates();
        expect(autoUpdater.checkForUpdatesAndNotify).toHaveBeenCalled();
    });

    it('broadcasts updates to windows', () => {
        (app as any).isPackaged = true;
        updateManager = new UpdateManager(mockSettingsStore);

        // Simulate update-available event
        const onHandler = (autoUpdater.on as any).mock.calls.find((call: any) => call[0] === 'update-available')[1];
        const updateInfo = { version: '1.0.1' };
        onHandler(updateInfo);

        expect(mockWindows[0].webContents.send).toHaveBeenCalledWith('auto-update:available', updateInfo);
    });

    it('handles initialization when updates are disabled by platform (Linux non-AppImage)', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        process.env.APPIMAGE = ''; // Not an AppImage
        (app as any).isPackaged = true;

        updateManager = new UpdateManager(mockSettingsStore);
        expect(updateManager.isEnabled()).toBe(false);

        // Restore platform
        Object.defineProperty(process, 'platform', { value: 'win32' });
    });

    it('enables updates on Linux if APPIMAGE is present', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        process.env.APPIMAGE = '/path/to/app.AppImage';
        (app as any).isPackaged = true;

        updateManager = new UpdateManager(mockSettingsStore);
        expect(updateManager.isEnabled()).toBe(true);

        // Restore platform
        Object.defineProperty(process, 'platform', { value: 'win32' });
        delete process.env.APPIMAGE;
    });


    describe('setEnabled', () => {
        it('enables and disables correctly', () => {
            updateManager = new UpdateManager(mockSettingsStore);
            updateManager.setEnabled(false);
            expect(updateManager.isEnabled()).toBe(false);
            expect(mockSettingsStore.set).toHaveBeenCalledWith('autoUpdateEnabled', false);

            updateManager.setEnabled(true);
            expect(updateManager.isEnabled()).toBe(true);
            expect(mockSettingsStore.set).toHaveBeenCalledWith('autoUpdateEnabled', true);
        });

        it('starts periodic checks when enabling', () => {
            updateManager = new UpdateManager(mockSettingsStore);
            updateManager.setEnabled(false);
            const setIntervalSpy = vi.spyOn(global, 'setInterval');
            updateManager.setEnabled(true);
            expect(setIntervalSpy).toHaveBeenCalled();
            setIntervalSpy.mockRestore();
        });

        it('stops periodic checks when disabling', () => {
            updateManager = new UpdateManager(mockSettingsStore);
            updateManager.setEnabled(true);
            const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
            updateManager.setEnabled(false);
            expect(clearIntervalSpy).toHaveBeenCalled();
            clearIntervalSpy.mockRestore();
        });

        it('does nothing when enabling already enabled manager', () => {
            updateManager = new UpdateManager(mockSettingsStore);
            updateManager.setEnabled(true);
            const setIntervalSpy = vi.spyOn(global, 'setInterval');
            updateManager.setEnabled(true);
            expect(setIntervalSpy).not.toHaveBeenCalled();
            setIntervalSpy.mockRestore();
        });

        it('does nothing when disabling already disabled manager', () => {
            updateManager = new UpdateManager(mockSettingsStore);
            updateManager.setEnabled(false);
            const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
            updateManager.setEnabled(false);
            expect(clearIntervalSpy).not.toHaveBeenCalled();
            clearIntervalSpy.mockRestore();
        });
    });


    describe('checkForUpdates scenarios', () => {
        it('skips if disabled', async () => {
            updateManager = new UpdateManager(mockSettingsStore);
            updateManager.setEnabled(false);
            await updateManager.checkForUpdates();
            expect(autoUpdater.checkForUpdatesAndNotify).not.toHaveBeenCalled();
        });

        it('skips if not packaged', async () => {
            (app as any).isPackaged = false;
            updateManager = new UpdateManager(mockSettingsStore);
            // Re-enable for the test (constructor might have disabled it)
            updateManager.setEnabled(true);
            await updateManager.checkForUpdates();
            expect(autoUpdater.checkForUpdatesAndNotify).not.toHaveBeenCalled();
        });

        it('handles update check error with non-Error object', async () => {
            (app as any).isPackaged = true;
            updateManager = new UpdateManager(mockSettingsStore);
            const error = 'Something went wrong';
            (autoUpdater.checkForUpdatesAndNotify as any).mockRejectedValue(error);

            await updateManager.checkForUpdates();
            expect(mockWindows[0].webContents.send).toHaveBeenCalledWith('update-error', 'Something went wrong');
        });
    });


    describe('periodic checks', () => {
        it('clears existing interval before starting new one', () => {
            updateManager = new UpdateManager(mockSettingsStore);
            const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
            updateManager.startPeriodicChecks();
            updateManager.startPeriodicChecks(); // Call twice to trigger clear
            expect(clearIntervalSpy).toHaveBeenCalled();
            clearIntervalSpy.mockRestore();
        });

        it('does not start if disabled', () => {
            updateManager = new UpdateManager(mockSettingsStore);
            updateManager.setEnabled(false);
            const setIntervalSpy = vi.spyOn(global, 'setInterval');
            updateManager.startPeriodicChecks();
            expect(setIntervalSpy).not.toHaveBeenCalled();
            setIntervalSpy.mockRestore();
        });

        it('triggers check in setInterval callback', () => {
            vi.useFakeTimers();
            updateManager = new UpdateManager(mockSettingsStore);
            updateManager.startPeriodicChecks(60 * 60 * 1000);
            (autoUpdater.checkForUpdatesAndNotify as any).mockResolvedValue(undefined);

            // Fast-forward 1 hour
            vi.advanceTimersByTime(60 * 60 * 1000);
            expect(autoUpdater.checkForUpdatesAndNotify).toHaveBeenCalled();
        });

        it('triggers check in initial startup setTimeout callback', () => {
            vi.useFakeTimers();
            updateManager = new UpdateManager(mockSettingsStore);
            updateManager.startPeriodicChecks();
            (autoUpdater.checkForUpdatesAndNotify as any).mockResolvedValue(undefined);

            // Fast-forward 10 seconds
            vi.advanceTimersByTime(10000);
            expect(autoUpdater.checkForUpdatesAndNotify).toHaveBeenCalled();
        });
    });


    describe('events', () => {
        beforeEach(() => {
            updateManager = new UpdateManager(mockSettingsStore);
        });

        it('broadcasts auto-update:error', () => {
            const errorHandler = (autoUpdater.on as any).mock.calls.find((call: any) => call[0] === 'error')[1];
            errorHandler({ message: 'Sync error' });
            expect(mockWindows[0].webContents.send).toHaveBeenCalledWith('auto-update:error', 'Sync error');
        });

        it('logs checking-for-update', () => {
            const handler = (autoUpdater.on as any).mock.calls.find((call: any) => call[0] === 'checking-for-update')[1];
            handler();
            // Verify no crash
        });

        it('logs update-not-available', () => {
            const handler = (autoUpdater.on as any).mock.calls.find((call: any) => call[0] === 'update-not-available')[1];
            handler({ version: '1.0.0' });
            // Verify no crash
        });

        it('logs download-progress', () => {
            const handler = (autoUpdater.on as any).mock.calls.find((call: any) => call[0] === 'download-progress')[1];
            handler({ percent: 50.5 });
            // Verify no crash
        });

        it('broadcasts auto-update:downloaded', () => {
            const handler = (autoUpdater.on as any).mock.calls.find((call: any) => call[0] === 'update-downloaded')[1];
            const info = { version: '1.0.1' };
            handler(info);
            expect(mockWindows[0].webContents.send).toHaveBeenCalledWith('auto-update:downloaded', info);
        });
    });

    it('quitAndInstall calls autoUpdater.quitAndInstall', () => {
        updateManager = new UpdateManager(mockSettingsStore);
        updateManager.quitAndInstall();
        expect(autoUpdater.quitAndInstall).toHaveBeenCalledWith(false, true);
    });

    it('destroy cleans up listeners and intervals', () => {
        updateManager = new UpdateManager(mockSettingsStore);
        const stopSpy = vi.spyOn(updateManager, 'stopPeriodicChecks');
        updateManager.destroy();
        expect(stopSpy).toHaveBeenCalled();
        expect(autoUpdater.removeAllListeners).toHaveBeenCalled();
    });
});

