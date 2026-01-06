/**
 * Integration tests for multi-window coordination.
 * Tests how WindowManager coordinates between different window types (Main, Options, Auth).
 *
 * Scenarios:
 * - Closing Main window closes dependent windows (Options, Auth)
 * - Hiding Main window to tray closes dependent windows
 * - Re-opening Options window focuses existing instance
 * - WindowManager handles "quitting" state to prevent infinite loops or unwanted behavior
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserWindow, ipcMain } from 'electron';
import WindowManager from '../../src/main/managers/windowManager';

// Use the centralized logger mock from __mocks__ directory
vi.mock('../../src/main/utils/logger');

// Mock fs
vi.mock('fs', () => ({
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn().mockReturnValue('{}'),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
}));

describe('Multi-Window Coordination Integration', () => {
    let windowManager: WindowManager;

    beforeEach(() => {
        vi.clearAllMocks();
        if ((ipcMain as any)._reset) (ipcMain as any)._reset();
        if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
        beforeEach(() => {
            // Mock platform
            vi.stubGlobal('process', { ...process, platform });

            // Create REAL WindowManager after platform stub
            windowManager = new WindowManager(false);
        });

        afterEach(() => {
            vi.unstubAllGlobals();
        });

        describe('Dependent Window Auto-Close', () => {
            it('should close Options and Auth windows when Main window is closed', () => {
                const mainWindow = windowManager.createMainWindow();
                const optionsWindow = windowManager.createOptionsWindow();
                const authWindow = windowManager.createAuthWindow('https://auth.google.com');

                // Find the "closed" listener on Main window
                const closedHandler = (mainWindow as any)._listeners.get('closed');
                expect(closedHandler).toBeDefined();

                // Simulate Main window closing
                closedHandler();

                // Verify dependent windows handles close calls
                expect(optionsWindow.close).toHaveBeenCalled();
                expect(authWindow.close).toHaveBeenCalled();

                // Verify main window reference is cleared internally
                expect(windowManager.getMainWindow()).toBeNull();
            });

            it('should close auxiliary windows when Main window is hidden to tray', () => {
                windowManager.createMainWindow();
                const optionsWindow = windowManager.createOptionsWindow();
                const authWindow = windowManager.createAuthWindow('https://auth.google.com');

                // Hide to tray
                windowManager.hideToTray();

                // Options and Auth windows should be closed (not just hidden)
                expect(optionsWindow.close).toHaveBeenCalled();
                expect(authWindow.close).toHaveBeenCalled();
            });
        });

        describe('Single Instance Enforcement (Options Window)', () => {
            it('should focus existing Options window instead of creating a new one', () => {
                const optionsWin1 = windowManager.createOptionsWindow('settings');

                // Re-call createOptionsWindow
                const optionsWin2 = windowManager.createOptionsWindow('about');

                // Should be the same instance
                expect(optionsWin2).toBe(optionsWin1);

                // Should have called focus
                expect(optionsWin1.focus).toHaveBeenCalled();

                // Should have navigated to the new tab (via loadURL or loadFile)
                // Note: OptionsWindow.create handles this internally
                expect(optionsWin1.loadURL).toHaveBeenCalledWith(expect.stringContaining('#about'));
            });
        });

        describe('Quitting State Management', () => {
            it('should propagate quitting state to MainWindow', () => {
                const mainWindow = windowManager.createMainWindow();

                windowManager.setQuitting(true);

                // Internal state of MainWindow should be updated
                // (We can't check private field easily, but we can check if it prevents default on 'close')
                const closeHandler = (mainWindow as any)._listeners.get('close');
                const mockEvent = { preventDefault: vi.fn() };

                closeHandler(mockEvent);

                // If quitting is true, it should NOT call preventDefault
                expect(mockEvent.preventDefault).not.toHaveBeenCalled();
            });

            it('should allow "Close to Tray" when NOT quitting', () => {
                const mainWindow = windowManager.createMainWindow();

                windowManager.setQuitting(false);

                const closeHandler = (mainWindow as any)._listeners.get('close');
                const mockEvent = { preventDefault: vi.fn() };

                closeHandler(mockEvent);

                // If NOT quitting, it SHOULD call preventDefault to hide to tray
                expect(mockEvent.preventDefault).toHaveBeenCalled();
                expect(mainWindow.hide).toHaveBeenCalled();
            });
        });
    });
});
