import { ipcMain, type IpcMainEvent } from 'electron';
import { BaseIpcHandler } from './BaseIpcHandler';
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels';

export class ExportIpcHandler extends BaseIpcHandler {
    register(): void {
        // IPC Handlers
        ipcMain.on(IPC_CHANNELS.EXPORT_CHAT_PDF, (event: IpcMainEvent) => {
            this._handleExportPdf(event);
        });

        ipcMain.on(IPC_CHANNELS.EXPORT_CHAT_MARKDOWN, (event: IpcMainEvent) => {
            this._handleExportMarkdown(event);
        });

        // Window Event Listeners
        this.deps.windowManager.on('print-to-pdf-triggered', () => {
            this.logger.log('Export to PDF triggered via WindowManager event');
            if (!this.deps.exportManager) {
                this.logger.error('ExportManager not initialized');
                return;
            }
            const win = this.deps.windowManager.getMainWindow();
            if (win && !win.isDestroyed()) {
                this.deps.exportManager.exportToPdf(win.webContents).catch((err) => {
                    this.handleError('exportToPdf (local)', err);
                });
            } else {
                this.logger.warn('Cannot export to PDF: Main window not found or destroyed');
            }
        });

        this.deps.windowManager.on('export-markdown-triggered', () => {
            this.logger.log('Export to Markdown triggered via WindowManager event');
            if (!this.deps.exportManager) {
                this.logger.error('ExportManager not initialized');
                return;
            }
            const win = this.deps.windowManager.getMainWindow();
            if (win && !win.isDestroyed()) {
                this.deps.exportManager.exportToMarkdown(win.webContents).catch((err) => {
                    this.handleError('exportToMarkdown (local)', err);
                });
            } else {
                this.logger.warn('Cannot export to Markdown: Main window not found or destroyed');
            }
        });
    }

    unregister(): void {
        ipcMain.removeAllListeners(IPC_CHANNELS.EXPORT_CHAT_PDF);
        ipcMain.removeAllListeners(IPC_CHANNELS.EXPORT_CHAT_MARKDOWN);
        this.deps.windowManager.removeAllListeners('print-to-pdf-triggered');
        this.deps.windowManager.removeAllListeners('export-markdown-triggered');
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
