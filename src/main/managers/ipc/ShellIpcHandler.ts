/**
 * Shell IPC Handler.
 *
 * Handles shell-related IPC channels for filesystem operations like
 * revealing files in the system file explorer.
 *
 * @module ipc/ShellIpcHandler
 */

import { ipcMain, shell } from 'electron';
import { BaseIpcHandler } from './BaseIpcHandler';
import { IPC_CHANNELS } from '../../utils/constants';

/**
 * Handler for shell-related IPC operations.
 *
 * Currently handles:
 * - `shell:show-item-in-folder` - Opens file explorer and selects the file
 */
export class ShellIpcHandler extends BaseIpcHandler {
    /**
     * Register shell IPC handlers with ipcMain.
     */
    register(): void {
        // Reveal file in system file explorer
        ipcMain.on(IPC_CHANNELS.SHELL_SHOW_ITEM_IN_FOLDER, (_event, filePath: string) => {
            try {
                if (typeof filePath !== 'string' || filePath.trim().length === 0) {
                    this.logger.warn('Invalid file path for reveal in folder:', filePath);
                    return;
                }

                this.logger.log('Revealing file in folder:', filePath);
                shell.showItemInFolder(filePath);
            } catch (error) {
                this.logger.error('Error revealing file in folder:', {
                    error: (error as Error).message,
                    filePath,
                });
            }
        });
    }
}
