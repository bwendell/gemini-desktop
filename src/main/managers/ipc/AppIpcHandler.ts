/**
 * App IPC Handler.
 *
 * Handles application-level IPC channels for opening options windows
 * and Google sign-in authentication.
 *
 * @module ipc/AppIpcHandler
 */

import { ipcMain } from 'electron';
import { BaseIpcHandler } from './BaseIpcHandler';
import { IPC_CHANNELS, GOOGLE_ACCOUNTS_URL } from '../../utils/constants';

/**
 * Handler for application-level IPC operations.
 *
 * Currently handles:
 * - `open-options` - Opens the options window, optionally to a specific tab
 * - `open-google-signin` - Opens Google sign-in authentication window
 */
export class AppIpcHandler extends BaseIpcHandler {
    /**
     * Register app IPC handlers with ipcMain.
     */
    register(): void {
        // Open options window (optionally to a specific tab)
        ipcMain.on(IPC_CHANNELS.OPEN_OPTIONS, (_event, tab?: 'settings' | 'about') => {
            try {
                this.deps.windowManager.createOptionsWindow(tab);
            } catch (error) {
                this.logger.error('Error opening options window:', error);
            }
        });

        // Open Google sign-in using WindowManager's createAuthWindow
        ipcMain.handle(IPC_CHANNELS.OPEN_GOOGLE_SIGNIN, async (): Promise<void> => {
            try {
                const authWindow = this.deps.windowManager.createAuthWindow(GOOGLE_ACCOUNTS_URL);

                // Return a promise that resolves when window is closed
                return new Promise((resolve) => {
                    authWindow.on('closed', () => resolve());
                });
            } catch (error) {
                this.logger.error('Error opening Google sign-in:', error);
                throw error;
            }
        });
    }
}
