/**
 * Print IPC Handler.
 *
 * Handles IPC channels for print-to-PDF operations:
 * - print-to-pdf:trigger - Triggers PDF printing
 * - print-to-pdf:cancel - Cancels ongoing print operation
 *
 * Also subscribes to windowManager's 'print-to-pdf-triggered' event
 * for local triggers (hotkey/menu).
 *
 * @module ipc/PrintIpcHandler
 */

import { ipcMain, type IpcMainEvent } from 'electron';
import { BaseIpcHandler } from './BaseIpcHandler';
import { IPC_CHANNELS } from '../../utils/constants';

/**
 * Handler for print-related IPC channels.
 *
 * Manages print-to-PDF operations including IPC-triggered and
 * local event-triggered (hotkey/menu) print flows.
 */
export class PrintIpcHandler extends BaseIpcHandler {
    /**
     * Register print IPC handlers with ipcMain.
     * Also subscribes to windowManager's print-to-pdf-triggered event.
     */
    register(): void {
        // Handle IPC trigger from renderer
        ipcMain.on(IPC_CHANNELS.PRINT_TO_PDF_TRIGGER, (event: IpcMainEvent) => {
            this._handlePrintTrigger(event);
        });

        // Handle cancel request from renderer
        ipcMain.on(IPC_CHANNELS.PRINT_CANCEL, () => {
            this._handlePrintCancel();
        });

        // Handle local trigger from hotkey/menu via WindowManager event
        this.deps.windowManager.on('print-to-pdf-triggered', () => {
            this._handleLocalPrintTrigger();
        });
    }

    /**
     * Handle print:trigger IPC request.
     * @param event - IPC event containing the sender webContents
     */
    private _handlePrintTrigger(event: IpcMainEvent): void {
        this.logger.log('Print to PDF triggered via IPC');

        if (!this.deps.printManager) {
            this.logger.error('PrintManager not initialized');
            return;
        }

        this.deps.printManager.printToPdf(event.sender).catch((err) => {
            this.handleError('printToPdf', err);
        });
    }

    /**
     * Handle print:cancel IPC request.
     */
    private _handlePrintCancel(): void {
        this.logger.log('Print cancellation requested via IPC');
        this.deps.printManager?.cancel();
    }

    /**
     * Handle local print trigger (hotkey/menu via WindowManager event).
     * Assumes print target is the main window for hotkeys/menu.
     */
    private _handleLocalPrintTrigger(): void {
        this.logger.log('Print to PDF triggered via local event');

        if (!this.deps.printManager) {
            this.logger.error('PrintManager not initialized');
            return;
        }

        // We assume print target is the main window for hotkeys/menu
        const mainWindow = this.deps.windowManager.getMainWindow();
        if (!mainWindow || mainWindow.isDestroyed()) {
            this.logger.warn('Cannot print: Main window not found or destroyed');
            return;
        }

        this.deps.printManager.printToPdf(mainWindow.webContents).catch((err) => {
            this.handleError('printToPdf (local)', err);
        });
    }
}
