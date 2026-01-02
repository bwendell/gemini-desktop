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
import PDFDocument from 'pdfkit';

const logger = createLogger('[PrintManager]');

export default class PrintManager {
  private windowManager: WindowManager;
  private isPrinting = false;
  private isCancelled = false;

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager;
  }

  /**
   * Cancels the currently running print operation.
   */
  public cancel(): void {
    this.isCancelled = true;
    logger.log('Print cancellation requested');
  }

  /**
   * Handles the print-to-PDF flow using scrolling screenshot capture.
   *
   * 1. Captures full page via scrolling screenshots
   * 2. Stitches images into a PDF document
   * 3. Prompts the user to save the file with a unique default filename
   * 4. Writes the file to disk
   * 5. Sends success/error feedback to the renderer
   *
   * @param senderWebContents - Optional webContents to print (if triggered from renderer).
   *                            If not provided, uses the main window.
   */
  async printToPdf(senderWebContents?: WebContents): Promise<void> {
    // Reset cancellation flag
    this.isCancelled = false;

    if (this.isPrinting) {
      logger.warn('Print-to-pdf already in progress, ignoring request');
      return;
    }

    this.isPrinting = true;
    logger.log('Starting print-to-pdf flow');

    // 1. Determine which WebContents to print
    let contentsToPrint = senderWebContents;

    try {
      if (!contentsToPrint) {
        const mainWindow = this.windowManager.getMainWindow();
        if (!mainWindow) {
          logger.error('Cannot print: Main window not found');
          return;
        }
        contentsToPrint = mainWindow.webContents;
      }

      // 2. Capture full page via scrolling screenshots
      const imageBuffers = await this.captureFullPage(contentsToPrint);

      // Check if cancelled during capture
      if (this.isCancelled) {
        logger.log('Print cancelled, skipping PDF generation');
        return;
      }

      // Handle empty captures
      if (imageBuffers.length === 0) {
        logger.error('No images captured');
        contentsToPrint.send(IPC_CHANNELS.PRINT_TO_PDF_ERROR, 'No content captured');
        return;
      }

      // 3. Stitch images into PDF
      const pdfData = await this.stitchImagesToPdf(imageBuffers);

      logger.log(`PDF generated, size: ${pdfData.length} bytes`);

      // 4. Generate unique default filename
      // Format: gemini-chat-YYYY-MM-DD.pdf
      // If file exists, append numeric suffix: gemini-chat-YYYY-MM-DD-1.pdf, etc.
      const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const defaultFilename = `gemini-chat-${dateStr}.pdf`;
      const downloadsFolder = this.getDownloadsFolder();
      const uniqueDefaultPath = this.getUniqueFilePath(path.join(downloadsFolder, defaultFilename));

      // 5. Show save dialog
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

      // 6. Write file to disk
      await fs.writeFile(filePath, pdfData);
      logger.log(`PDF saved to: ${filePath}`);

      // 7. Send success notification to the renderer
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
    } finally {
      this.isPrinting = false;
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

  /**
   * Retrieves scroll dimensions from the Gemini scrollable container.
   *
   * @param webContents - The WebContents of the window containing Gemini
   * @returns Scroll dimensions or null if container not found
   */
  private async getIframeScrollInfo(
    webContents: WebContents
  ): Promise<{ scrollHeight: number; scrollTop: number; clientHeight: number } | null> {
    try {
      // First check if Gemini is loaded directly in the main frame (most common case)
      const mainFrameUrl = webContents.getURL();
      let targetFrame: Electron.WebFrameMain | null = null;

      if (mainFrameUrl.includes('gemini.google.com')) {
        // Gemini is in the main frame
        targetFrame = webContents.mainFrame;
        logger.log('Gemini found in main frame');
      } else {
        // Check subframes for Gemini (fallback for embedded scenarios)
        const frames = webContents.mainFrame.frames;
        const geminiFrame = frames.find((frame) => frame.url.includes('gemini.google.com'));
        if (geminiFrame) {
          targetFrame = geminiFrame;
          logger.log('Gemini found in subframe');
        }
      }

      if (!targetFrame) {
        logger.warn('Gemini frame not found');
        return null;
      }

      // Execute JavaScript to get scroll info
      const scrollInfo = (await targetFrame.executeJavaScript(`
      (() => {
        // Try multiple selectors for the scrollable container
        // Note: infinite-scroller is a custom HTML element TAG, not a class
        const selectors = [
          'infinite-scroller.chat-history',
          'infinite-scroller',
          'main[role="main"]',
          '[data-scroll-preservation="true"]',
          'main'
        ];

        console.log('[PrintManager] Searching for scrollable container...');
        console.log('[PrintManager] Document URL:', document.location.href);

        for (const selector of selectors) {
          const container = document.querySelector(selector);
          if (container) {
            console.log('[PrintManager] Found element for selector:', selector, {
              scrollHeight: container.scrollHeight,
              scrollTop: container.scrollTop,
              clientHeight: container.clientHeight,
              isScrollable: container.scrollHeight > container.clientHeight
            });
            if (container.scrollHeight > container.clientHeight) {
              return {
                scrollHeight: container.scrollHeight,
                scrollTop: container.scrollTop,
                clientHeight: container.clientHeight
              };
            }
          } else {
            console.log('[PrintManager] No element found for selector:', selector);
          }
        }

        // Fallback to document
        console.log('[PrintManager] Falling back to document element:', {
          scrollHeight: document.documentElement.scrollHeight,
          scrollTop: document.documentElement.scrollTop,
          clientHeight: document.documentElement.clientHeight
        });
        return {
          scrollHeight: document.documentElement.scrollHeight,
          scrollTop: document.documentElement.scrollTop,
          clientHeight: document.documentElement.clientHeight
        };
      })()
    `)) as { scrollHeight: number; scrollTop: number; clientHeight: number } | null;

      return scrollInfo;
    } catch (error) {
      logger.error('Failed to get iframe scroll info', { error });
      return null;
    }
  }

  /**
   * Scrolls the Gemini scrollable container to a specified position.
   *
   * @param webContents - The WebContents of the window containing Gemini
   * @param position - The scroll position (in pixels) to scroll to
   * @returns true if scroll was successful, false if frame not found or scroll failed
   */
  private async scrollIframeTo(webContents: WebContents, position: number): Promise<boolean> {
    try {
      // First check if Gemini is loaded directly in the main frame (most common case)
      const mainFrameUrl = webContents.getURL();
      let targetFrame: Electron.WebFrameMain | null = null;

      if (mainFrameUrl.includes('gemini.google.com')) {
        // Gemini is in the main frame
        targetFrame = webContents.mainFrame;
      } else {
        // Check subframes for Gemini (fallback for embedded scenarios)
        const frames = webContents.mainFrame.frames;
        const geminiFrame = frames.find((frame) => frame.url.includes('gemini.google.com'));
        if (geminiFrame) {
          targetFrame = geminiFrame;
        }
      }

      if (!targetFrame) {
        logger.warn('Gemini frame not found for scrolling');
        return false;
      }

      // Execute JavaScript to scroll
      await targetFrame.executeJavaScript(`
        (() => {
          const selectors = [
            'infinite-scroller.chat-history',
            'infinite-scroller',
            'main[role="main"]',
            '[data-scroll-preservation="true"]',
            'main'
          ];

          for (const selector of selectors) {
            const container = document.querySelector(selector);
            if (container) {
              container.scrollTop = ${position};
              return true;
            }
          }

          // Fallback to document
          document.documentElement.scrollTop = ${position};
          return true;
        })()
      `);

      // Wait for scroll and lazy loading (skip in tests for speed)
      if (process.env.NODE_ENV !== 'test') {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      return true;
    } catch (error) {
      logger.error('Failed to scroll', { error, position });
      return false;
    }
  }

  /**
   * Captures the current viewport as a PNG image buffer.
   * Hides the print overlay before capture and shows it again after.
   *
   * @param webContents - The WebContents to capture
   * @returns A PNG buffer of the captured viewport
   * @throws If capture fails
   */
  private async captureViewport(webContents: WebContents): Promise<Buffer> {
    try {
      // Hide the overlay before capture
      webContents.send(IPC_CHANNELS.PRINT_OVERLAY_HIDE);

      // Wait for the overlay animation to complete (200ms in the component)
      // Add a small buffer for safety
      if (process.env.NODE_ENV !== 'test') {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      // Capture the current viewport
      const image = await webContents.capturePage();

      // Convert to PNG buffer
      const buffer = image.toPNG();

      logger.log('Viewport captured', {
        size: buffer.length,
        dimensions: image.getSize(),
      });

      // Show the overlay again after capture
      webContents.send(IPC_CHANNELS.PRINT_OVERLAY_SHOW);

      return buffer;
    } catch (error) {
      // Make sure to show overlay even if capture fails
      webContents.send(IPC_CHANNELS.PRINT_OVERLAY_SHOW);
      logger.error('Failed to capture viewport', { error });
      throw error;
    }
  }

  /**
   * Captures the full page by scrolling through the content and taking screenshots.
   *
   * This method orchestrates the scrolling screenshot capture:
   * 1. Gets scroll dimensions from the iframe
   * 2. Calculates capture positions (90% overlap for seamless stitching)
   * 3. Loops through positions, capturing and reporting progress
   * 4. Restores original scroll position
   *
   * @param webContents - The WebContents to capture from
   * @returns Array of PNG buffers, one per captured viewport
   */
  private async captureFullPage(webContents: WebContents): Promise<Buffer[]> {
    const captures: Buffer[] = [];
    let originalScrollTop = 0;

    try {
      // Get scroll dimensions
      const scrollInfo = await this.getIframeScrollInfo(webContents);
      if (!scrollInfo) {
        // Fallback: capture single viewport
        logger.warn('Could not get scroll info, capturing single viewport');
        const buffer = await this.captureViewport(webContents);
        captures.push(buffer);
        return captures;
      }

      const { scrollHeight, scrollTop, clientHeight } = scrollInfo;
      originalScrollTop = scrollTop;

      // Calculate step size (90% of viewport for overlap)
      const stepSize = Math.floor(clientHeight * 0.9);
      const totalCaptures = Math.ceil(scrollHeight / stepSize);

      logger.log('Starting full page capture', {
        scrollHeight,
        clientHeight,
        stepSize,
        totalCaptures,
      });

      // Send progress start
      webContents.send(IPC_CHANNELS.PRINT_PROGRESS_START, { totalPages: totalCaptures });

      // Capture loop
      for (let i = 0; i < totalCaptures; i++) {
        // Check for cancellation
        if (this.isCancelled) {
          logger.log('Print cancelled by user');
          break;
        }

        // Scroll to position
        const scrollPosition = i * stepSize;
        await this.scrollIframeTo(webContents, scrollPosition);

        // Capture viewport
        const buffer = await this.captureViewport(webContents);
        captures.push(buffer);

        // Send progress update
        webContents.send(IPC_CHANNELS.PRINT_PROGRESS_UPDATE, {
          currentPage: i + 1,
          totalPages: totalCaptures,
          progress: Math.round(((i + 1) / totalCaptures) * 100),
        });
      }

      return captures;
    } finally {
      // Restore scroll position
      await this.scrollIframeTo(webContents, originalScrollTop);

      // Send progress end
      if (!webContents.isDestroyed()) {
        webContents.send(IPC_CHANNELS.PRINT_PROGRESS_END, {
          cancelled: this.isCancelled,
          success: !this.isCancelled && captures.length > 0,
        });
      }
    }
  }

  /**
   * Combines multiple PNG image buffers into a single PDF document.
   *
   * Each image becomes a separate page with dimensions matching the original image.
   * Uses pdfkit with autoFirstPage: false to control page sizing precisely.
   *
   * @param imageBuffers - Array of PNG image buffers to combine
   * @returns A Buffer containing the combined PDF document
   */
  private async stitchImagesToPdf(imageBuffers: Buffer[]): Promise<Buffer> {
    logger.log('Stitching images to PDF', {
      imageCount: imageBuffers.length,
    });

    return new Promise((resolve, reject) => {
      try {
        // Create PDF with no automatic first page
        const doc = new PDFDocument({ autoFirstPage: false });

        // Collect output chunks
        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          logger.log('PDF created', {
            size: pdfBuffer.length,
            pages: imageBuffers.length,
          });
          resolve(pdfBuffer);
        });
        doc.on('error', (error) => {
          logger.error('PDF generation error', { error });
          reject(error);
        });

        // Add each image as a page
        for (let i = 0; i < imageBuffers.length; i++) {
          const imageBuffer = imageBuffers[i];

          // Open the image to get dimensions
          // Note: openImage is a runtime method not in @types/pdfkit
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const image = (doc as any).openImage(imageBuffer) as { width: number; height: number };

          // Add page with image dimensions
          doc.addPage({
            size: [image.width, image.height],
            margin: 0,
          });

          // Draw image at full page size
          // Note: pdfkit accepts pre-opened images but types don't reflect this
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (doc as any).image(image, 0, 0, {
            width: image.width,
            height: image.height,
          });

          logger.log(`Added page ${i + 1}/${imageBuffers.length}`);
        }

        // Finalize the PDF
        doc.end();
      } catch (error) {
        logger.error('Failed to stitch images to PDF', { error });
        reject(error);
      }
    });
  }
}
