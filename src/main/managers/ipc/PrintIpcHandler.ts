import { ipcMain, type IpcMainEvent } from 'electron';

import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels';
import { BaseIpcHandler } from './BaseIpcHandler';

export class PrintIpcHandler extends BaseIpcHandler {
    register(): void {
        ipcMain.on(IPC_CHANNELS.PRINT_TRIGGER, (event: IpcMainEvent) => {
            this._handlePrintTrigger(event);
        });

        ipcMain.on(IPC_CHANNELS.PRINT_CANCEL, () => {
            this._handlePrintCancel();
        });
    }

    unregister(): void {
        ipcMain.removeAllListeners(IPC_CHANNELS.PRINT_TRIGGER);
        ipcMain.removeAllListeners(IPC_CHANNELS.PRINT_CANCEL);
    }

    private _handlePrintTrigger(event: IpcMainEvent): void {
        this.logger.log('Print to PDF triggered via IPC');
        if (!this.deps.exportManager) {
            this.logger.error('ExportManager not initialized');
            return;
        }

        this.deps.exportManager.exportToPdf(event.sender).catch((error) => {
            this.handleError('exportToPdf', error);
        });
    }

    private _handlePrintCancel(): void {
        this.logger.warn('Print cancel requested but no cancel flow is available');
    }
}
