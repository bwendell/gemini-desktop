import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserWindow, ipcMain } from 'electron';
import WindowManager from '../../src/main/managers/windowManager';
import { platformAdapterPresets, useMockPlatformAdapter, resetPlatformAdapterForTests } from '../helpers/mocks';

vi.mock('../../src/main/utils/logger');

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

describe('Multi-Window Coordination Integration', () => {
    let windowManager: WindowManager;

    beforeEach(() => {
        vi.clearAllMocks();
        if ((ipcMain as any)._reset) (ipcMain as any)._reset();
        if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        resetPlatformAdapterForTests();
    });

    describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
        beforeEach(() => {
            useMockPlatformAdapter(adapterForPlatform[platform]());
            windowManager = new WindowManager(false);
        });

        describe('Dependent Window Auto-Close', () => {
            it('should close Options and Auth windows when Main window is closed', () => {
                const mainWindow = windowManager.createMainWindow();
                const optionsWindow = windowManager.createOptionsWindow();
                const authWindow = windowManager.createAuthWindow('https://auth.google.com');

                const closedHandler = (mainWindow as any)._listeners.get('closed');
                expect(closedHandler).toBeDefined();

                closedHandler();

                expect(optionsWindow.close).toHaveBeenCalled();
                expect(authWindow.close).toHaveBeenCalled();

                expect(windowManager.getMainWindow()).toBeNull();
            });

            it('should close auxiliary windows when Main window is hidden to tray', () => {
                windowManager.createMainWindow();
                const optionsWindow = windowManager.createOptionsWindow();
                const authWindow = windowManager.createAuthWindow('https://auth.google.com');

                windowManager.hideToTray();

                expect(optionsWindow.close).toHaveBeenCalled();
                expect(authWindow.close).toHaveBeenCalled();
            });
        });

        describe('Single Instance Enforcement (Options Window)', () => {
            it('should focus existing Options window instead of creating a new one', () => {
                const optionsWin1 = windowManager.createOptionsWindow('settings');

                const optionsWin2 = windowManager.createOptionsWindow('about');

                expect(optionsWin2).toBe(optionsWin1);

                expect(optionsWin1.focus).toHaveBeenCalled();

                expect(optionsWin1.loadURL).toHaveBeenCalledWith(expect.stringContaining('#about'));
            });
        });

        describe('Quitting State Management', () => {
            it('should propagate quitting state to MainWindow', () => {
                const mainWindow = windowManager.createMainWindow();

                windowManager.setQuitting(true);

                const closeHandler = (mainWindow as any)._listeners.get('close');
                const mockEvent = { preventDefault: vi.fn() };

                closeHandler(mockEvent);

                expect(mockEvent.preventDefault).not.toHaveBeenCalled();
            });

            it('should allow "Close to Tray" when NOT quitting', () => {
                const mainWindow = windowManager.createMainWindow();

                windowManager.setQuitting(false);

                const closeHandler = (mainWindow as any)._listeners.get('close');
                const mockEvent = { preventDefault: vi.fn() };

                closeHandler(mockEvent);

                expect(mockEvent.preventDefault).toHaveBeenCalled();
                expect(mainWindow.hide).toHaveBeenCalled();
            });
        });
    });
});
