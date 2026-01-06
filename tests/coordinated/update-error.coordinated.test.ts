import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { app, BrowserWindow } from 'electron';
import UpdateManager from '../../src/main/managers/updateManager';

// Mock electron-log
vi.mock('electron-log', () => ({
    default: {
        transports: {
            file: { level: 'info' },
        },
        scope: vi.fn().mockReturnThis(),
        log: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock electron-updater using vi.hoisted
const { mockAutoUpdater } = vi.hoisted(() => {
    const EventEmitter = require('events');
    const mock: any = new EventEmitter();
    mock.checkForUpdatesAndNotify = vi.fn().mockResolvedValue(null);
    mock.logger = {};
    mock.autoDownload = true;
    mock.autoInstallOnAppQuit = true;
    mock.forceDevUpdateConfig = false;
    mock.removeAllListeners = vi.fn();
    return { mockAutoUpdater: mock };
});

vi.mock('electron-updater', () => ({
    autoUpdater: mockAutoUpdater,
}));

describe('UpdateManager Error Coordination', () => {
    let updateManager: UpdateManager;
    let mockSettings: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        (app as any).isPackaged = true;

        // Reset window mocks
        if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();
        (mockAutoUpdater as any).removeAllListeners.mockClear();

        mockSettings = {
            get: vi.fn().mockReturnValue(true),
            set: vi.fn(),
        };

        updateManager = new UpdateManager(mockSettings as any);

        // IMPORTANT: Trigger lazy loading of autoUpdater to register event handlers
        // This is necessary because autoUpdater is now lazily loaded
        await updateManager.checkForUpdates(false);
    });

    afterEach(() => {
        updateManager.destroy();
    });

    it('should broadcast masked error to ALL open windows', () => {
        // Create multiple windows
        const win1 = new BrowserWindow();
        const win2 = new BrowserWindow();

        // Trigger error
        const rawError = new Error('Raw Sensitive Error Data');
        mockAutoUpdater.emit('error', rawError);

        // Verify all windows received the masked message
        [win1, win2].forEach((win, _index) => {
            expect(win.webContents.send).toHaveBeenCalledWith(
                'auto-update:error',
                'The auto-update service encountered an error. Please try again later.'
            );

            // Ensure raw error was not sent
            expect(win.webContents.send).not.toHaveBeenCalledWith(
                'auto-update:error',
                expect.stringContaining('Raw Sensitive')
            );
        });
    });
});
