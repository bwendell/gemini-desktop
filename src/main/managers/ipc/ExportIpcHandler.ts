import { ipcMain, type IpcMainEvent } from 'electron';
import { BaseIpcHandler } from './BaseIpcHandler';
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels';

export class ExportIpcHandler extends BaseIpcHandler {
    register(): void {
        ipcMain.on(IPC_CHANNELS.EXPORT_CHAT_PDF, (event: IpcMainEvent) => {
            this._handleExportPdf(event);
        });

        ipcMain.on(IPC_CHANNELS.EXPORT_CHAT_MARKDOWN, (event: IpcMainEvent) => {
            this._handleExportMarkdown(event);
        });
    }

    private _handleExportPdf(event: IpcMainEvent): void {
        this.logger.log('Export to PDF triggered via IPC');
        if (!this.deps.exportManager) {
            this.logger.error('ExportManager not initialized');
            return;
        }
        this.deps.exportManager.exportToPdf(event.sender).catch((err) => {
            this.handleError('exportToPdf', err);
        });
    }

    private _handleExportMarkdown(event: IpcMainEvent): void {
        this.logger.log('Export to Markdown triggered via IPC');
        if (!this.deps.exportManager) {
            this.logger.error('ExportManager not initialized');
            return;
        }
        this.deps.exportManager.exportToMarkdown(event.sender).catch((err) => {
            this.handleError('exportToMarkdown', err);
        });
    }
}
