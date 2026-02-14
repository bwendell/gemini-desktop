import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain } from 'electron';
import IpcManager from '../../src/main/managers/ipcManager';
import WindowManager from '../../src/main/managers/windowManager';
import { GOOGLE_ACCOUNTS_URL, IPC_CHANNELS } from '../../src/main/utils/constants';
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

describe('Auth Coordination Integration', () => {
    let ipcManager: IpcManager;
    let windowManager: WindowManager;
    let mockStore: any;

    describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
        beforeEach(() => {
            vi.clearAllMocks();
            useMockPlatformAdapter(adapterForPlatform[platform]());

            if ((ipcMain as any)._reset) (ipcMain as any)._reset();

            mockStore = {
                get: vi.fn(),
                set: vi.fn(),
            };

            windowManager = new WindowManager(false);
            vi.spyOn(windowManager, 'createAuthWindow');

            ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();
        });

        afterEach(() => {
            resetPlatformAdapterForTests();
        });

        it('should create auth window when requested via IPC', async () => {
            const mockAuthWindow = {
                on: vi.fn((event, cb) => {
                    if (event === 'closed') {
                        setTimeout(cb, 10);
                    }
                }),
            };
            (windowManager.createAuthWindow as any).mockReturnValue(mockAuthWindow);

            const handler = (ipcMain as any)._handlers.get(IPC_CHANNELS.OPEN_GOOGLE_SIGNIN);

            await handler();

            expect(windowManager.createAuthWindow).toHaveBeenCalledWith(GOOGLE_ACCOUNTS_URL);
        });

        it('should trigger auth window creation from Main Window callback', () => {
            const mainWindow = (windowManager as any).mainWindow;

            const callback = (mainWindow as any).createAuthWindowCallback;
            expect(callback).toBeDefined();

            callback('https://accounts.google.com/o/oauth2/v2/auth');

            expect(windowManager.createAuthWindow).toHaveBeenCalledWith('https://accounts.google.com/o/oauth2/v2/auth');
        });

        it('should close auth window when main window closes', () => {
            const mockAuthWindow = {
                close: vi.fn(),
                create: vi.fn(),
            };
            (windowManager as any).authWindow = mockAuthWindow;

            const mainWindow = (windowManager as any).mainWindow;
            const closeCallback = (mainWindow as any).closeAuthWindowCallback;

            expect(closeCallback).toBeDefined();
            closeCallback();

            expect(mockAuthWindow.close).toHaveBeenCalled();
        });
    });
});
