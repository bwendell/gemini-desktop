/**
 * Window IPC Handler.
 *
 * Handles window control IPC channels for minimize, maximize, close,
 * show, and isMaximized operations.
 *
 * @module ipc/WindowIpcHandler
 */

import { ipcMain } from 'electron';
import { BaseIpcHandler } from './BaseIpcHandler';
import { IPC_CHANNELS } from '../../utils/constants';

/**
 * Handler for window control IPC operations.
 *
 * Handles:
 * - `window-minimize` - Minimizes the calling window
 * - `window-maximize` - Toggles maximize/unmaximize on the calling window
 * - `window-close` - Closes the calling window
 * - `window-show` - Restores the window from tray (via windowManager)
 * - `window-is-maximized` - Returns whether the calling window is maximized
 */
export class WindowIpcHandler extends BaseIpcHandler {
    /**
     * Register window control IPC handlers with ipcMain.
     */
    register(): void {
        // Minimize window
        ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, (event) => {
            const win = this.getWindowFromEvent(event);
            if (win && !win.isDestroyed()) {
                try {
                    win.minimize();
                } catch (error) {
                    this.logger.error('Error minimizing window:', {
                        error: error instanceof Error ? error.message : String(error),
                        windowId: win.id,
                    });
                }
            }
        });

        // Maximize/restore window
        ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, (event) => {
            const win = this.getWindowFromEvent(event);
            if (win && !win.isDestroyed()) {
                try {
                    if (win.isMaximized()) {
                        win.unmaximize();
                    } else {
                        win.maximize();
                    }
                } catch (error) {
                    this.logger.error('Error toggling maximize:', {
                        error: error instanceof Error ? error.message : String(error),
                        windowId: win.id,
                    });
                }
            }
        });

        // Close window
        ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, (event) => {
            const win = this.getWindowFromEvent(event);
            if (win && !win.isDestroyed()) {
                try {
                    win.close();
                } catch (error) {
                    this.logger.error('Error closing window:', {
                        error: error instanceof Error ? error.message : String(error),
                        windowId: win.id,
                    });
                }
            }
        });

        // Show/Restore window (e.g., from tray or helper)
        ipcMain.on(IPC_CHANNELS.WINDOW_SHOW, () => {
            try {
                this.deps.windowManager.restoreFromTray();
            } catch (error) {
                this.logger.error('Error showing window:', error);
            }
        });

        // Check if window is maximized
        ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, (event): boolean => {
            const win = this.getWindowFromEvent(event);
            if (!win || win.isDestroyed()) return false;

            try {
                return win.isMaximized();
            } catch (error) {
                this.logger.error('Error checking maximized state:', error);
                return false;
            }
        });
    }
}
