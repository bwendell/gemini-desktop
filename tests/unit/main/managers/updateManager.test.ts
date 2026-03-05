import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { app, BrowserWindow, net } from 'electron';
import UpdateManager from '../../../../src/main/managers/updateManager';
import { IPC_CHANNELS } from '../../../../src/shared/constants/ipc-channels';
import SettingsStore from '../../../../src/main/store';
import {
    createMockPlatformAdapter,
    resetPlatformAdapterForTests,
    useMockPlatformAdapter,
} from '../../../helpers/mocks';

vi.mock('electron', async (importOriginal) => {
    const original = await importOriginal<typeof import('electron')>();
    return {
        ...original,
        net: {
            fetch: vi.fn(),
        },
    };
});

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

// Mock electron-updater using vi.hoisted to avoid reference errors
const { mockAutoUpdater } = vi.hoisted(() => {
    const EventEmitter = require('events');
    const mock: any = new EventEmitter();
    mock.checkForUpdatesAndNotify = vi.fn().mockResolvedValue(null);
    mock.logger = {};
    mock.autoDownload = true;
    mock.autoInstallOnAppQuit = true;
    mock.forceDevUpdateConfig = false;
    mock.channel = null;
    mock.allowDowngrade = false;
    mock.removeAllListeners = vi.fn();
    return { mockAutoUpdater: mock };
});

vi.mock('electron-updater', () => ({
    autoUpdater: mockAutoUpdater,
}));

// Mock SettingsStore
const mockSettings = {
    get: vi.fn(),
    set: vi.fn(),
} as unknown as SettingsStore<any>;

describe('UpdateManager', () => {
    let updateManager: UpdateManager;
    let mockWebContents: any;
    let mockWindow: any;
    const originalAppImage = process.env.APPIMAGE;

    beforeEach(() => {
        vi.clearAllMocks();
        (mockAutoUpdater as any).removeAllListeners.mockClear();

        process.env.APPIMAGE = '/tmp/test.AppImage';

        // Mock app.isPackaged to be true so checkForUpdates runs
        (app as any).isPackaged = true;

        // Setup mock window and webContents using the electron-mock structure
        // We need to instantiate a BrowserWindow so it appears in getAllWindows()
        mockWindow = new BrowserWindow();
        mockWebContents = mockWindow.webContents;

        // Default settings
        (mockSettings.get as any).mockReturnValue(true);

        updateManager = new UpdateManager(mockSettings);
    });

    afterEach(() => {
        updateManager.destroy();
        // Clean up mock windows
        (BrowserWindow as any)._reset();
        if (originalAppImage) {
            process.env.APPIMAGE = originalAppImage;
        } else {
            delete process.env.APPIMAGE;
        }
    });

    it('should mask raw error messages when broadcasting to windows', async () => {
        const rawError = new Error('<div>Massive HTML Error</div> with stack trace...');

        (net.fetch as any).mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({ tag_name: 'v1.0.0' }),
        });

        // First trigger a successful update check to ensure autoUpdater is lazily loaded
        // and event listeners are set up
        await updateManager.checkForUpdates(false);

        // Emit error from autoUpdater
        mockAutoUpdater.emit('error', rawError);

        // Verify valid generic message was sent
        expect(mockWebContents.send).toHaveBeenCalledWith(
            'auto-update:error',
            'The auto-update service encountered an error. Please try again later.'
        );

        // Verify raw message was NOT sent
        expect(mockWebContents.send).not.toHaveBeenCalledWith('auto-update:error', expect.stringContaining('<div>'));
    });

    it('should mask raw error messages when checkForUpdates fails', async () => {
        const rawError = new Error('Network Connection Refused: <details>...');
        (net.fetch as any).mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({ tag_name: 'v1.0.0' }),
        });
        (mockAutoUpdater.checkForUpdatesAndNotify as any).mockRejectedValueOnce(rawError);

        await updateManager.checkForUpdates(true);

        // Verify valid generic message was sent
        expect(mockWebContents.send).toHaveBeenCalledWith(
            IPC_CHANNELS.AUTO_UPDATE_ERROR,
            'The auto-update service encountered an error. Please try again later.'
        );
        expect(mockWebContents.send).not.toHaveBeenCalledWith(
            IPC_CHANNELS.AUTO_UPDATE_ERROR,
            expect.stringContaining('Refused')
        );
    });

    it('should suppress error and treat as "not-available" when 404/unreachable', async () => {
        // Simulate a 404 error from electron-updater (e.g. repo has no releases)
        const error404 = new Error('HttpError: 404 Not Found"');
        (net.fetch as any).mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({ tag_name: 'v1.0.0' }),
        });
        (mockAutoUpdater.checkForUpdatesAndNotify as any).mockRejectedValueOnce(error404);

        // Call with manual=false (background check) - this is the key scenario to suppress
        await updateManager.checkForUpdates(false);

        // Should NOT broadcast update-error
        expect(mockWebContents.send).not.toHaveBeenCalledWith(IPC_CHANNELS.AUTO_UPDATE_ERROR, expect.any(String));
    });

    it('should SHOW error when manual check fails with 404/unreachable', async () => {
        const error404 = new Error('HttpError: 404 Not Found"');
        (net.fetch as any).mockRejectedValueOnce(error404);
        (mockAutoUpdater.checkForUpdatesAndNotify as any).mockRejectedValueOnce(error404);

        // Call with manual=true
        await updateManager.checkForUpdates(true);

        // Should broadcast update-error because it's manual
        expect(mockWebContents.send).toHaveBeenCalledWith(
            IPC_CHANNELS.AUTO_UPDATE_ERROR,
            'The auto-update service encountered an error. Please try again later.'
        );
    });

    describe('update-not-available toast suppression', () => {
        it('should broadcast not-available on the first check (startup)', async () => {
            (net.fetch as any).mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({ tag_name: 'v1.0.0' }),
            });
            await updateManager.checkForUpdates(false);

            // Simulate electron-updater emitting update-not-available
            mockAutoUpdater.emit('update-not-available', { version: '1.0.0' });

            expect(mockWebContents.send).toHaveBeenCalledWith('auto-update:not-available', { version: '1.0.0' });
        });

        it('should suppress not-available on subsequent periodic checks', async () => {
            (net.fetch as any).mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({ tag_name: 'v1.0.0' }),
            });
            // First check (startup) - triggers lazy init
            await updateManager.checkForUpdates(false);
            mockAutoUpdater.emit('update-not-available', { version: '1.0.0' });

            // Clear call history from first check
            mockWebContents.send.mockClear();

            // Second periodic check
            await updateManager.checkForUpdates(false);
            mockAutoUpdater.emit('update-not-available', { version: '1.0.0' });

            // Should NOT have broadcast not-available
            expect(mockWebContents.send).not.toHaveBeenCalledWith('auto-update:not-available', expect.anything());
        });

        it('should broadcast not-available on manual check (even after first check)', async () => {
            (net.fetch as any).mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({ tag_name: 'v1.0.0' }),
            });
            // First check
            await updateManager.checkForUpdates(false);
            mockAutoUpdater.emit('update-not-available', { version: '1.0.0' });
            mockWebContents.send.mockClear();

            // Manual check via Help > Check for Updates
            await updateManager.checkForUpdates(true);
            mockAutoUpdater.emit('update-not-available', { version: '1.0.0' });

            expect(mockWebContents.send).toHaveBeenCalledWith('auto-update:not-available', { version: '1.0.0' });
        });

        it('should always broadcast update-available regardless of check type', async () => {
            (net.fetch as any).mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({ tag_name: 'v2.0.0' }),
            });
            // First check - consume isFirstCheck
            await updateManager.checkForUpdates(false);
            mockAutoUpdater.emit('update-not-available', { version: '1.0.0' });
            mockWebContents.send.mockClear();

            // Periodic check finds an update
            await updateManager.checkForUpdates(false);
            mockAutoUpdater.emit('update-available', { version: '2.0.0' });

            expect(mockWebContents.send).toHaveBeenCalledWith('auto-update:available', { version: '2.0.0' });
        });
    });
});

describe('UpdateManager manual-update-only mode', () => {
    let manualUpdateManager: UpdateManager;
    let mockWebContents: any;
    let mockWindow: any;
    const originalAppImage = process.env.APPIMAGE;

    beforeEach(() => {
        vi.clearAllMocks();
        (mockSettings.get as any).mockReturnValue(true);
        (app as any).isPackaged = true;
        (app as any).getVersion = vi.fn().mockReturnValue('1.0.0');

        delete process.env.APPIMAGE;

        useMockPlatformAdapter(
            createMockPlatformAdapter({
                shouldDisableUpdates: vi.fn().mockReturnValue(true),
                supportsAutoUpdate: vi.fn().mockReturnValue(false),
            })
        );

        mockWindow = new BrowserWindow();
        mockWebContents = mockWindow.webContents;

        manualUpdateManager = new UpdateManager(mockSettings);
    });

    afterEach(() => {
        manualUpdateManager.destroy();
        (BrowserWindow as any)._reset();
        resetPlatformAdapterForTests({ resetModules: true });

        if (originalAppImage) {
            process.env.APPIMAGE = originalAppImage;
        } else {
            delete process.env.APPIMAGE;
        }
    });

    it('does not load electron-updater in manual-update-only mode', async () => {
        await manualUpdateManager.checkForUpdates(true);

        expect(mockAutoUpdater.checkForUpdatesAndNotify).not.toHaveBeenCalled();
    });

    it('respects auto-update preference in manual-update-only mode', () => {
        (mockSettings.get as any).mockReturnValue(false);
        manualUpdateManager.destroy();
        manualUpdateManager = new UpdateManager(mockSettings);

        expect(manualUpdateManager.isEnabled()).toBe(false);
    });

    it('broadcasts manual-update-available when GitHub has newer version', async () => {
        const mockResponse = {
            ok: true,
            json: vi.fn().mockResolvedValue({
                tag_name: 'v2.0.0',
                name: 'Release 2.0.0',
                body: 'Release notes',
            }),
        };
        (net.fetch as any).mockResolvedValue(mockResponse);

        await manualUpdateManager.checkForUpdates(true);

        expect(mockWebContents.send).toHaveBeenCalledWith(
            IPC_CHANNELS.AUTO_UPDATE_MANUAL_UPDATE_AVAILABLE,
            expect.objectContaining({ version: '2.0.0' })
        );
    });

    it('broadcasts not-available when GitHub version is current', async () => {
        const mockResponse = {
            ok: true,
            json: vi.fn().mockResolvedValue({ tag_name: 'v1.0.0' }),
        };
        (net.fetch as any).mockResolvedValue(mockResponse);

        await manualUpdateManager.checkForUpdates(true);

        expect(mockWebContents.send).toHaveBeenCalledWith(
            IPC_CHANNELS.AUTO_UPDATE_NOT_AVAILABLE,
            expect.objectContaining({ version: '1.0.0' })
        );
    });

    it('suppresses error toasts on background GitHub failures', async () => {
        (net.fetch as any).mockRejectedValue(new Error('Network error'));

        await manualUpdateManager.checkForUpdates(false);

        expect(mockWebContents.send).not.toHaveBeenCalledWith(IPC_CHANNELS.AUTO_UPDATE_ERROR, expect.any(String));
    });

    it('shows friendly error on manual GitHub failure', async () => {
        (net.fetch as any).mockRejectedValueOnce(new Error('Network error'));

        await manualUpdateManager.checkForUpdates(true);

        expect(mockWebContents.send).toHaveBeenCalledWith(
            IPC_CHANNELS.AUTO_UPDATE_ERROR,
            'Could not check for updates. Please check your internet connection.'
        );
    });

    it('does not use old generic error message on manual GitHub failure', async () => {
        (net.fetch as any).mockRejectedValue(new Error('Network error'));

        await manualUpdateManager.checkForUpdates(true);

        expect(mockWebContents.send).not.toHaveBeenCalledWith(
            IPC_CHANNELS.AUTO_UPDATE_ERROR,
            'The auto-update service encountered an error. Please try again later.'
        );
    });

    it('shows friendly error on manual GitHub non-ok response', async () => {
        (net.fetch as any).mockResolvedValue({ ok: false, status: 403 });

        await manualUpdateManager.checkForUpdates(true);

        expect(mockWebContents.send).toHaveBeenCalledWith(
            IPC_CHANNELS.AUTO_UPDATE_ERROR,
            'Could not check for updates. Please check your internet connection.'
        );
    });

    it('suppresses error toasts on background GitHub non-ok response', async () => {
        (net.fetch as any).mockResolvedValue({ ok: false, status: 403 });

        await manualUpdateManager.checkForUpdates(false);

        expect(mockWebContents.send).not.toHaveBeenCalledWith(IPC_CHANNELS.AUTO_UPDATE_ERROR, expect.any(String));
        expect(mockWebContents.send).not.toHaveBeenCalledWith(
            IPC_CHANNELS.AUTO_UPDATE_NOT_AVAILABLE,
            expect.anything()
        );
    });
});
