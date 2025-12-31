/**
 * Print Manager for the Electron main process.
 *
 * Handles generating PDF files from the main conversation window.
 *
 * @module PrintManager
 */

import { app, dialog, BrowserWindow, WebContents } from 'electron';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { createLogger } from '../utils/logger';
import type WindowManager from './windowManager';
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';

const logger = createLogger('[PrintManager]');

export default class PrintManager {
  private windowManager: WindowManager;

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager;
  }

  /**
   * Handles the print-to-PDF flow.
   *
   * 1. Generates a PDF from the current main window content
   * 2. Prompts the user to save the file with a unique default filename
   * 3. Writes the file to disk
   * 4. Sends success/error feedback to the renderer
   *
   * @param senderWebContents - Optional webContents to print (if triggered from renderer).
   *                            If not provided, uses the main window.
   */
  async printToPdf(senderWebContents?: WebContents): Promise<void> {
    logger.log('Starting print-to-pdf flow');

    // 1. Determine which WebContents to print
    let contentsToPrint = senderWebContents;

    if (!contentsToPrint) {
      const mainWindow = this.windowManager.getMainWindow();
      if (!mainWindow) {
        logger.error('Cannot print: Main window not found');
        return;
      }
      contentsToPrint = mainWindow.webContents;
    }

    try {
      // 2. Generate PDF data
      // printBackground: true ensures CSS backgrounds (like chat bubbles) are printed
      const pdfData = await contentsToPrint.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        landscape: false,
      });

      logger.log(`PDF generated, size: ${pdfData.length} bytes`);

      // 3. Generate unique default filename
      // Format: gemini-chat-YYYY-MM-DD.pdf
      // If file exists, append numeric suffix: gemini-chat-YYYY-MM-DD-1.pdf, etc.
      const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const defaultFilename = `gemini-chat-${dateStr}.pdf`;
      const downloadsFolder = this.getDownloadsFolder();
      const uniqueDefaultPath = this.getUniqueFilePath(path.join(downloadsFolder, defaultFilename));

      // 4. Show save dialog
      const mainWindow = this.windowManager.getMainWindow();
      const parentWindow = mainWindow || BrowserWindow.getFocusedWindow();

      const { canceled, filePath } = await dialog.showSaveDialog(parentWindow as BrowserWindow, {
        title: 'Save Chat as PDF',
        defaultPath: uniqueDefaultPath,
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      });

      // If user cancels, silently return without error
      if (canceled || !filePath) {
        logger.log('Print to PDF canceled by user');
        return;
      }

      // 5. Write file to disk
      await fs.writeFile(filePath, pdfData);
      logger.log(`PDF saved to: ${filePath}`);

      // 6. Send success notification to the renderer
      if (contentsToPrint && !contentsToPrint.isDestroyed()) {
        contentsToPrint.send(IPC_CHANNELS.PRINT_TO_PDF_SUCCESS, filePath);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error generating/saving PDF:', error);

      // Send error notification to the renderer
      if (contentsToPrint && !contentsToPrint.isDestroyed()) {
        contentsToPrint.send(IPC_CHANNELS.PRINT_TO_PDF_ERROR, errorMessage);
      }
    }
  }

  /**
   * Generates a unique file path by appending a counter if the file already exists.
   * Used for the 'defaultPath' in save dialog.
   *
   * Examples:
   * - gemini-chat-2025-12-30.pdf (if doesn't exist)
   * - gemini-chat-2025-12-30-1.pdf (if base exists)
   * - gemini-chat-2025-12-30-2.pdf (if base and -1 exist)
   *
   * @param desiredPath - The initial file path to check
   * @returns A unique file path that doesn't exist
   */
  private getUniqueFilePath(desiredPath: string): string {
    if (!existsSync(desiredPath)) {
      return desiredPath;
    }

    const dir = path.dirname(desiredPath);
    const ext = path.extname(desiredPath);
    const name = path.basename(desiredPath, ext);

    let counter = 1;
    let newPath = path.join(dir, `${name}-${counter}${ext}`);

    while (existsSync(newPath)) {
      counter++;
      newPath = path.join(dir, `${name}-${counter}${ext}`);
    }

    return newPath;
  }

  /**
   * Gets the user's Downloads folder path.
   * Cross-platform compatible.
   *
   * @returns The path to the Downloads folder
   */
  private getDownloadsFolder(): string {
    return app.getPath('downloads');
  }
}
