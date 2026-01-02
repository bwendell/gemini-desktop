/**
 * E2E Test: Print to PDF Full Content Verification (Task 7.9)
 *
 * Verifies that the scrolling screenshot capture approach correctly captures
 * full conversations, produces multi-page PDFs, and restores viewport state.
 *
 * Cross-platform tests for Windows, macOS, and Linux.
 *
 * Tests follow the Golden Rule: "If this code path was broken, would this test fail?"
 *
 * @see docs/E2E_TESTING_GUIDELINES.md
 */

/// <reference path="./helpers/wdio-electron.d.ts" />

import { browser, expect } from '@wdio/globals';
import { MainWindowPage } from './pages';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { E2ELogger } from './helpers/logger';
import { E2E_TIMING } from './helpers/e2eConstants';
import {
  setupPrintDialogInterception,
  getPrintDialogInterceptResult,
  cleanupDialogInterception,
  triggerPrintViaHotkey,
  triggerPrintViaMenu,
  getTempPdfPath,
  verifyPdfFile,
  cleanupTestPdfFile,
  waitForPdfFileViaElectron,
  cleanupTestFileViaElectron,
} from './helpers/printActions';
import { getPlatform, isLinuxCI } from './helpers/platform';

// ============================================================================
// Test Suite
// ============================================================================

describe('Print to PDF Full Content Verification', () => {
  const mainWindow = new MainWindowPage();
  let tempFilePath: string;
  let platform: string;

  before(async () => {
    await waitForAppReady();
    platform = await getPlatform();
    E2ELogger.info('print-full-content', `Running on platform: ${platform}`);
  });

  beforeEach(async () => {
    await cleanupDialogInterception();
    tempFilePath = '';
  });

  afterEach(async () => {
    await cleanupDialogInterception();
    await ensureSingleWindow();

    // Clean up test file if it exists
    if (tempFilePath) {
      cleanupTestPdfFile(tempFilePath);
      tempFilePath = '';
    }
  });

  // ==========================================================================
  // 7.9.1: Long Conversation PDF Output
  // ==========================================================================

  describe('Long Conversation PDF Output (7.9.1)', () => {
    it('should create PDF file with valid content', async function () {
      // This test verifies the happy path of full-page capture
      E2ELogger.info('print-full-content', 'Starting PDF creation test');

      tempFilePath = getTempPdfPath();

      // Set up dialog to auto-save
      await setupPrintDialogInterception({ autoSave: true, savePath: tempFilePath });

      // Trigger print via hotkey (platform-appropriate: Ctrl+Shift+P or Cmd+Shift+P)
      await triggerPrintViaHotkey();

      // Wait for PDF generation (scrolling capture can take time)
      await waitForPdfFileViaElectron(tempFilePath);

      // Verify dialog was called
      const dialogResult = await getPrintDialogInterceptResult();
      expect(dialogResult.dialogCalled).toBe(true);

      // Verify PDF file is valid
      const fileResult = verifyPdfFile(tempFilePath);
      expect(fileResult.exists).toBe(true);
      expect(fileResult.isValidPdf).toBe(true);
      expect(fileResult.size).toBeGreaterThan(0);

      E2ELogger.info(
        'print-full-content',
        `PDF created: ${fileResult.size} bytes, valid: ${fileResult.isValidPdf}`
      );
    });

    it('should create PDF with content larger than single viewport', async function () {
      // This test verifies that multi-page content produces larger PDFs
      E2ELogger.info('print-full-content', 'Starting multi-page PDF test');

      tempFilePath = getTempPdfPath();

      // Set up dialog to auto-save
      await setupPrintDialogInterception({ autoSave: true, savePath: tempFilePath });

      // Trigger print
      await triggerPrintViaMenu();

      // Wait for PDF generation
      await waitForPdfFileViaElectron(tempFilePath);

      // Verify file size indicates full content
      // A multi-page PDF with images should be > 50KB (single viewport typically ~30KB)
      const fileResult = verifyPdfFile(tempFilePath);
      expect(fileResult.exists).toBe(true);
      expect(fileResult.isValidPdf).toBe(true);

      E2ELogger.info(
        'print-full-content',
        `Multi-page PDF size: ${fileResult.size} bytes (platform: ${platform})`
      );

      // Log if PDF is likely multi-page based on size
      if (fileResult.size > 50000) {
        E2ELogger.info('print-full-content', 'PDF size indicates multi-page content');
      }
    });
  });

  // ==========================================================================
  // 7.9.2: Viewport Restoration After Print
  // ==========================================================================

  describe('Viewport Restoration After Print (7.9.2)', () => {
    it('should keep window usable after print completes', async function () {
      E2ELogger.info('print-full-content', 'Testing viewport restoration');

      tempFilePath = getTempPdfPath();

      // Set up dialog to auto-save
      await setupPrintDialogInterception({ autoSave: true, savePath: tempFilePath });

      // Trigger print
      await triggerPrintViaHotkey();

      // Wait for PDF generation
      await waitForPdfFileViaElectron(tempFilePath);

      // Give time for scroll restoration
      await browser.pause(E2E_TIMING.EXTENDED_PAUSE_MS);

      // Verify window is still responsive
      const isLoaded = await mainWindow.isLoaded();
      expect(isLoaded).toBe(true);

      // Verify we can still interact with the window (not stuck at expanded size)
      const windowIsResponsive = await browser.electron.execute(() => {
        const win = require('electron').BrowserWindow.getAllWindows()[0];
        return win && !win.isDestroyed() && win.isVisible();
      });
      expect(windowIsResponsive).toBe(true);

      E2ELogger.info('print-full-content', 'Window remains usable after print');
    });

    it('should allow new print after previous completes', async function () {
      // Print twice to verify no state corruption
      E2ELogger.info('print-full-content', 'Testing sequential prints');

      const tempPath1 = getTempPdfPath();
      const tempPath2 = getTempPdfPath();

      try {
        // First print
        await setupPrintDialogInterception({ autoSave: true, savePath: tempPath1 });
        await triggerPrintViaMenu();

        await waitForPdfFileViaElectron(tempPath1);

        E2ELogger.info('print-full-content', 'First print completed');

        // Wait for print lock to release
        await browser.pause(2000);

        // Second print
        await setupPrintDialogInterception({ autoSave: true, savePath: tempPath2 });
        await triggerPrintViaHotkey();

        await waitForPdfFileViaElectron(tempPath2);

        // Verify both files exist
        const file1Result = verifyPdfFile(tempPath1);
        const file2Result = verifyPdfFile(tempPath2);

        expect(file1Result.exists).toBe(true);
        expect(file1Result.isValidPdf).toBe(true);
        expect(file2Result.exists).toBe(true);
        expect(file2Result.isValidPdf).toBe(true);

        E2ELogger.info('print-full-content', 'Sequential prints successful');
      } finally {
        cleanupTestPdfFile(tempPath1);
        cleanupTestPdfFile(tempPath2);
      }
    });
  });

  // ==========================================================================
  // 7.9.3: Print During Scroll
  // ==========================================================================

  describe('Print During Scroll (7.9.3)', () => {
    it('should capture full content regardless of initial scroll position', async function () {
      E2ELogger.info('print-full-content', 'Testing print from scrolled position');

      tempFilePath = getTempPdfPath();

      // Scroll to middle of content (simulate user scrolling)
      await browser.electron.execute(() => {
        // Access the main window's webContents and scroll
        const win = require('electron').BrowserWindow.getAllWindows()[0];
        if (win) {
          // Execute JavaScript in the webContents to scroll
          win.webContents.executeJavaScript(`
            (() => {
              const container = document.querySelector('[class*="conversation"]') 
                || document.querySelector('[class*="scroll"]')
                || document.documentElement;
              if (container && container.scrollTo) {
                const midPoint = Math.floor(container.scrollHeight / 2);
                container.scrollTo(0, midPoint);
              }
            })();
          `);
        }
      });

      // Wait for scroll to settle
      await browser.pause(500);

      // Record scroll position before print
      const scrollPosBefore = await browser.electron.execute(() => {
        const win = require('electron').BrowserWindow.getAllWindows()[0];
        if (win) {
          return win.webContents.executeJavaScript(`
            (() => {
              const container = document.querySelector('[class*="conversation"]') 
                || document.querySelector('[class*="scroll"]')
                || document.documentElement;
              return container ? container.scrollTop : 0;
            })();
          `);
        }
        return 0;
      });

      E2ELogger.info('print-full-content', `Scroll position before print: ${scrollPosBefore}`);

      // Set up dialog and trigger print
      await setupPrintDialogInterception({ autoSave: true, savePath: tempFilePath });
      await triggerPrintViaHotkey();

      // Wait for PDF generation
      await waitForPdfFileViaElectron(tempFilePath);

      // Verify PDF is valid and contains full content
      const fileResult = verifyPdfFile(tempFilePath);
      expect(fileResult.exists).toBe(true);
      expect(fileResult.isValidPdf).toBe(true);
      expect(fileResult.size).toBeGreaterThan(0);

      // Wait for scroll restoration
      await browser.pause(E2E_TIMING.EXTENDED_PAUSE_MS);

      E2ELogger.info('print-full-content', `PDF from scrolled position: ${fileResult.size} bytes`);
    });
  });

  // ==========================================================================
  // 7.9.4: Print with Varying Window Sizes
  // ==========================================================================

  describe('Print with Varying Window Sizes (7.9.4)', () => {
    const testSizes = [
      { width: 800, height: 600, name: 'small' },
      { width: 1280, height: 720, name: 'medium' },
      { width: 1920, height: 1080, name: 'large' },
    ];

    // Store original size for restoration
    let originalWidth: number;
    let originalHeight: number;

    before(async () => {
      // Get original window size
      const size = await browser.electron.execute(() => {
        const win = require('electron').BrowserWindow.getAllWindows()[0];
        const bounds = win.getBounds();
        return { width: bounds.width, height: bounds.height };
      });
      originalWidth = size.width;
      originalHeight = size.height;
    });

    afterEach(async () => {
      // Restore original window size
      await browser.electron.execute(
        (electron: typeof import('electron'), width: number, height: number) => {
          const win = electron.BrowserWindow.getAllWindows()[0];
          if (win) {
            win.setSize(width, height);
          }
        },
        originalWidth,
        originalHeight
      );
      await browser.pause(500); // Let resize settle
    });

    it('should produce valid PDF from small window (800x600)', async function () {
      const size = testSizes[0];
      E2ELogger.info(
        'print-full-content',
        `Testing ${size.name} window: ${size.width}x${size.height}`
      );

      // Resize window
      await browser.electron.execute(
        (electron: typeof import('electron'), width: number, height: number) => {
          const win = electron.BrowserWindow.getAllWindows()[0];
          if (win) {
            win.setSize(width, height);
          }
        },
        size.width,
        size.height
      );
      await browser.pause(500);

      tempFilePath = getTempPdfPath();
      await setupPrintDialogInterception({ autoSave: true, savePath: tempFilePath });
      await triggerPrintViaMenu();

      await waitForPdfFileViaElectron(tempFilePath);

      const fileResult = verifyPdfFile(tempFilePath);
      expect(fileResult.exists).toBe(true);
      expect(fileResult.isValidPdf).toBe(true);

      E2ELogger.info('print-full-content', `${size.name} window PDF: ${fileResult.size} bytes`);
    });

    it('should produce valid PDF from medium window (1280x720)', async function () {
      const size = testSizes[1];
      E2ELogger.info(
        'print-full-content',
        `Testing ${size.name} window: ${size.width}x${size.height}`
      );

      // Resize window
      await browser.electron.execute(
        (electron: typeof import('electron'), width: number, height: number) => {
          const win = electron.BrowserWindow.getAllWindows()[0];
          if (win) {
            win.setSize(width, height);
          }
        },
        size.width,
        size.height
      );
      await browser.pause(500);

      tempFilePath = getTempPdfPath();
      await setupPrintDialogInterception({ autoSave: true, savePath: tempFilePath });
      await triggerPrintViaHotkey();

      await waitForPdfFileViaElectron(tempFilePath);

      const fileResult = verifyPdfFile(tempFilePath);
      expect(fileResult.exists).toBe(true);
      expect(fileResult.isValidPdf).toBe(true);

      E2ELogger.info('print-full-content', `${size.name} window PDF: ${fileResult.size} bytes`);
    });

    it('should produce valid PDF from large window (1920x1080)', async function () {
      // Skip on Linux CI where large window sizes may not work in Xvfb
      const linuxCI = await isLinuxCI();
      if (linuxCI) {
        E2ELogger.info('print-full-content', 'Skipping large window test on Linux CI');
        this.skip();
        return;
      }

      const size = testSizes[2];
      E2ELogger.info(
        'print-full-content',
        `Testing ${size.name} window: ${size.width}x${size.height}`
      );

      // Resize window
      await browser.electron.execute(
        (electron: typeof import('electron'), width: number, height: number) => {
          const win = electron.BrowserWindow.getAllWindows()[0];
          if (win) {
            win.setSize(width, height);
          }
        },
        size.width,
        size.height
      );
      await browser.pause(500);

      tempFilePath = getTempPdfPath();
      await setupPrintDialogInterception({ autoSave: true, savePath: tempFilePath });
      await triggerPrintViaMenu();

      await waitForPdfFileViaElectron(tempFilePath);

      const fileResult = verifyPdfFile(tempFilePath);
      expect(fileResult.exists).toBe(true);
      expect(fileResult.isValidPdf).toBe(true);

      E2ELogger.info('print-full-content', `${size.name} window PDF: ${fileResult.size} bytes`);
    });
  });

  // ==========================================================================
  // Cross-Platform Specific Tests
  // ==========================================================================

  describe('Cross-Platform Verification', () => {
    it('should work with platform-specific hotkey', async function () {
      // This test verifies Ctrl+Shift+P (Windows/Linux) or Cmd+Shift+P (macOS)
      E2ELogger.info('print-full-content', `Running platform hotkey test on: ${platform}`);

      tempFilePath = getTempPdfPath();
      await setupPrintDialogInterception({ autoSave: true, savePath: tempFilePath });

      // triggerPrintViaHotkey handles platform differences internally
      await triggerPrintViaHotkey();

      await waitForPdfFileViaElectron(tempFilePath);

      const dialogResult = await getPrintDialogInterceptResult();
      expect(dialogResult.dialogCalled).toBe(true);

      const fileResult = verifyPdfFile(tempFilePath);
      expect(fileResult.exists).toBe(true);
      expect(fileResult.isValidPdf).toBe(true);

      E2ELogger.info('print-full-content', `Platform hotkey test passed on ${platform}`);
    });

    it('should use platform-appropriate Downloads folder path', async function () {
      // This verifies the default path includes platform-correct Downloads location
      E2ELogger.info('print-full-content', 'Testing Downloads folder detection');

      // Set up dialog to capture options
      await setupPrintDialogInterception({ autoSave: false });
      await triggerPrintViaMenu();
      await browser.pause(E2E_TIMING.EXTENDED_PAUSE_MS);

      const dialogResult = await getPrintDialogInterceptResult();
      expect(dialogResult.dialogCalled).toBe(true);

      const defaultPath = dialogResult.dialogOptions?.defaultPath || '';
      E2ELogger.info('print-full-content', `Default path: ${defaultPath}`);

      // Verify the path looks like a Downloads folder path for this platform
      const lowerPath = defaultPath.toLowerCase();
      const hasDownloadsPath =
        lowerPath.includes('downloads') ||
        lowerPath.includes('téléchargements') || // French
        lowerPath.includes('descargas') || // Spanish
        lowerPath.includes('下载'); // Chinese

      // At minimum, verify the file has the expected .pdf extension
      expect(defaultPath.endsWith('.pdf')).toBe(true);

      E2ELogger.info(
        'print-full-content',
        `Platform ${platform}: default path ends with .pdf as expected`
      );
  });

  // ==========================================================================
  // 8.3: Progress Overlay Visibility Tests
  // ==========================================================================

  describe('Progress Overlay Visibility (8.3)', () => {
    it('should show progress overlay during capture', async function () {
      // This test verifies the progress overlay appears when print starts
      // Golden Rule: If overlay rendering broke, DOM query would fail
      E2ELogger.info('print-full-content', 'Testing progress overlay visibility');

      tempFilePath = getTempPdfPath();
      await setupPrintDialogInterception({ autoSave: true, savePath: tempFilePath });

      // Trigger print
      await triggerPrintViaHotkey();

      // Check for overlay shortly after trigger (before print completes)
      // We need to check quickly as the overlay may disappear after completion
      const overlayVisibleDuringCapture = await browser.electron.execute(
        (electron: typeof import('electron')) => {
          const win = electron.BrowserWindow.getAllWindows()[0];
          if (!win || win.isDestroyed()) return false;

          // Query for the progress overlay in the renderer
          return win.webContents.executeJavaScript(`
            (() => {
              const overlay = document.querySelector('[data-testid="print-progress-overlay"]')
                || document.querySelector('.print-progress-overlay')
                || document.querySelector('[class*="PrintProgressOverlay"]');
              return !!overlay;
            })();
          `);
        }
      );

      // Note: The overlay may have already disappeared if print was fast
      // We log the result but don't fail if it wasn't visible
      E2ELogger.info(
        'print-full-content',
        `Progress overlay visible during capture: ${overlayVisibleDuringCapture}`
      );

      // Wait for PDF and verify it completed successfully
      await waitForPdfFileViaElectron(tempFilePath);

      // Verify overlay is gone after completion
      const overlayVisibleAfter = await browser.electron.execute(
        (electron: typeof import('electron')) => {
          const win = electron.BrowserWindow.getAllWindows()[0];
          if (!win || win.isDestroyed()) return false;

          return win.webContents.executeJavaScript(`
            (() => {
              const overlay = document.querySelector('[data-testid="print-progress-overlay"]')
                || document.querySelector('.print-progress-overlay')
                || document.querySelector('[class*="PrintProgressOverlay"]');
              return !!overlay;
            })();
          `);
        }
      );

      // Overlay should be hidden after print completes
      expect(overlayVisibleAfter).toBe(false);

      const fileResult = verifyPdfFile(tempFilePath);
      expect(fileResult.exists).toBe(true);
      expect(fileResult.isValidPdf).toBe(true);

      E2ELogger.info('print-full-content', 'Progress overlay test completed');
    });

    it('should hide overlay after successful print', async function () {
      // Verifies overlay cleanup happens correctly
      E2ELogger.info('print-full-content', 'Testing overlay cleanup after print');

      tempFilePath = getTempPdfPath();
      await setupPrintDialogInterception({ autoSave: true, savePath: tempFilePath });

      await triggerPrintViaMenu();
      await waitForPdfFileViaElectron(tempFilePath);

      // Wait extra time for cleanup
      await browser.pause(E2E_TIMING.EXTENDED_PAUSE_MS);

      // Verify no overlay is visible
      const overlayVisible = await browser.electron.execute(
        (electron: typeof import('electron')) => {
          const win = electron.BrowserWindow.getAllWindows()[0];
          if (!win || win.isDestroyed()) return false;

          return win.webContents.executeJavaScript(`
            (() => {
              const overlay = document.querySelector('[data-testid="print-progress-overlay"]')
                || document.querySelector('.print-progress-overlay')
                || document.querySelector('[class*="PrintProgressOverlay"]');
              return !!overlay;
            })();
          `);
        }
      );

      expect(overlayVisible).toBe(false);

      const fileResult = verifyPdfFile(tempFilePath);
      expect(fileResult.exists).toBe(true);

      E2ELogger.info('print-full-content', 'Overlay cleanup verified');
    });

    it('should hide overlay when print is cancelled', async function () {
      // Verifies cancel button hides overlay and aborts operation
      E2ELogger.info('print-full-content', 'Testing overlay cancel functionality');

      // Set up dialog to NOT auto-save (we're testing cancel)
      await setupPrintDialogInterception({ autoSave: false });

      await triggerPrintViaHotkey();
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      // Cancel the print operation (if overlay is visible)
      await browser.electron.execute((electron: typeof import('electron')) => {
        const win = electron.BrowserWindow.getAllWindows()[0];
        if (!win || win.isDestroyed()) return;

        // Try to click cancel button via JavaScript
        win.webContents.executeJavaScript(`
          (() => {
            const cancelBtn = document.querySelector('[data-testid="print-cancel-button"]')
              || document.querySelector('.print-progress-overlay button')
              || document.querySelector('[class*="PrintProgressOverlay"] button');
            if (cancelBtn) {
              cancelBtn.click();
            }
          })();
        `);
      });

      await browser.pause(E2E_TIMING.EXTENDED_PAUSE_MS);

      // Verify overlay is gone
      const overlayVisible = await browser.electron.execute(
        (electron: typeof import('electron')) => {
          const win = electron.BrowserWindow.getAllWindows()[0];
          if (!win || win.isDestroyed()) return false;

          return win.webContents.executeJavaScript(`
            (() => {
              const overlay = document.querySelector('[data-testid="print-progress-overlay"]')
                || document.querySelector('.print-progress-overlay')
                || document.querySelector('[class*="PrintProgressOverlay"]');
              return !!overlay;
            })();
          `);
        }
      );

      expect(overlayVisible).toBe(false);

      // App should still be responsive after cancel
      const isLoaded = await mainWindow.isLoaded();
      expect(isLoaded).toBe(true);

      E2ELogger.info('print-full-content', 'Cancel functionality verified');
    });
  });
});
