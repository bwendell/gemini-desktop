/**
 * E2E Test: Print to PDF Save Dialog Interaction (Task 5.5.5)
 *
 * Verifies the save dialog behavior for the Print to PDF feature, including
 * dialog options, cancel handling, file creation, and collision handling.
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
import {
  cleanupDialogInterception,
  triggerPrintViaMenuDirect,
  getDownloadsFolderViaElectron,
} from './helpers/printActions';

// ============================================================================
// Types
// ============================================================================

interface CapturedDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

interface DialogInterceptState {
  wasCalled: boolean;
  capturedOptions: CapturedDialogOptions | null;
  mockResponse: { canceled: boolean; filePath?: string };
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Print to PDF Save Dialog Interaction', () => {
  const mainWindow = new MainWindowPage();

  beforeEach(async () => {
    await waitForAppReady();
  });

  afterEach(async () => {
    // Clean up any dialog interception
    await cleanupDialogInterception();
    await ensureSingleWindow();
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  /**
   * Sets up dialog interception to capture options and return mock response.
   */
  async function setupDialogIntercept(mockResponse: { canceled: boolean; filePath?: string }) {
    await browser.electron.execute(
      (electron: typeof import('electron'), response: { canceled: boolean; filePath?: string }) => {
        // Store original if not already stored
        if (!(electron.dialog as any)._originalShowSaveDialog) {
          (electron.dialog as any)._originalShowSaveDialog = electron.dialog.showSaveDialog;
        }

        // Initialize intercept state
        (electron.dialog as any)._interceptState = {
          wasCalled: false,
          capturedOptions: null,
          mockResponse: response,
        };

        // Override showSaveDialog
        electron.dialog.showSaveDialog = async (
          _browserWindow: Electron.BrowserWindow,
          options: Electron.SaveDialogOptions
        ) => {
          const state = (electron.dialog as any)._interceptState;
          state.wasCalled = true;
          state.capturedOptions = {
            title: options.title,
            defaultPath: options.defaultPath,
            filters: options.filters,
          };
          return state.mockResponse;
        };
      },
      mockResponse
    );
  }

  /**
   * Gets the captured dialog state after triggering print.
   */
  async function getDialogInterceptState(): Promise<DialogInterceptState> {
    return browser.electron.execute((electron: typeof import('electron')) => {
      return (
        (electron.dialog as any)._interceptState || {
          wasCalled: false,
          capturedOptions: null,
          mockResponse: { canceled: true },
        }
      );
    });
  }

  /**
   * Triggers print-to-pdf via menu item click.
   */
  async function triggerPrintToPdf() {
    await triggerPrintViaMenuDirect();
    // Wait for dialog to be called
    await browser.pause(500);
  }

  // ==========================================================================
  // Dialog Title Test
  // ==========================================================================

  describe('Dialog Title', () => {
    it('should open save dialog with title "Save Chat as PDF"', async () => {
      await setupDialogIntercept({ canceled: true });
      await triggerPrintToPdf();

      const state = await getDialogInterceptState();
      expect(state.wasCalled).toBe(true);
      expect(state.capturedOptions?.title).toBe('Save Chat as PDF');
      E2ELogger.info('print-to-pdf-save-dialog', 'Dialog title verified: "Save Chat as PDF"');
    });
  });

  // ==========================================================================
  // Default Filename Tests
  // ==========================================================================

  describe('Default Filename', () => {
    it('should have default filename format: gemini-chat-YYYY-MM-DD.pdf', async () => {
      await setupDialogIntercept({ canceled: true });
      await triggerPrintToPdf();

      const state = await getDialogInterceptState();
      expect(state.wasCalled).toBe(true);

      const defaultPath = state.capturedOptions?.defaultPath || '';
      const filename = defaultPath.split(/[/\\]/).pop() || '';

      // Verify filename matches pattern: gemini-chat-YYYY-MM-DD.pdf or gemini-chat-YYYY-MM-DD-N.pdf
      const pattern = /^gemini-chat-\d{4}-\d{2}-\d{2}(-\d+)?\.pdf$/;
      expect(filename).toMatch(pattern);
      E2ELogger.info('print-to-pdf-save-dialog', `Default filename verified: "${filename}"`);
    });

    it("should use today's date in filename", async () => {
      await setupDialogIntercept({ canceled: true });
      await triggerPrintToPdf();

      const state = await getDialogInterceptState();
      const defaultPath = state.capturedOptions?.defaultPath || '';
      const filename = defaultPath.split(/[/\\]/).pop() || '';

      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      expect(filename).toContain(today);
      E2ELogger.info('print-to-pdf-save-dialog', `Date in filename verified: "${today}"`);
    });
  });

  // ==========================================================================
  // Default Directory Test
  // ==========================================================================

  describe('Default Directory', () => {
    it('should have default directory as Downloads folder', async () => {
      // Get expected Downloads path
      const downloadsPath = await getDownloadsFolderViaElectron();

      await setupDialogIntercept({ canceled: true });
      await triggerPrintToPdf();

      const state = await getDialogInterceptState();
      expect(state.wasCalled).toBe(true);

      const defaultPath = state.capturedOptions?.defaultPath || '';
      // Default path should start with downloads folder
      expect(defaultPath.toLowerCase()).toContain(downloadsPath.toLowerCase());
      E2ELogger.info('print-to-pdf-save-dialog', `Default directory verified: "${downloadsPath}"`);
    });
  });

  // ==========================================================================
  // PDF Filter Test
  // ==========================================================================

  describe('PDF Filter', () => {
    it('should have PDF filter selected: *.pdf', async () => {
      await setupDialogIntercept({ canceled: true });
      await triggerPrintToPdf();

      const state = await getDialogInterceptState();
      expect(state.wasCalled).toBe(true);

      const filters = state.capturedOptions?.filters || [];
      expect(filters.length).toBeGreaterThan(0);
      expect(filters[0].name).toBe('PDF Files');
      expect(filters[0].extensions).toContain('pdf');
      E2ELogger.info('print-to-pdf-save-dialog', 'PDF filter verified');
    });
  });

  // ==========================================================================
  // Cancel Behavior Test
  // ==========================================================================

  describe('Cancel Behavior', () => {
    it('should not create file when save dialog is canceled', async () => {
      // Set up to track if SUCCESS IPC was sent
      await browser.electron.execute((electron: typeof import('electron')) => {
        (electron as any)._printSuccessSent = false;
        const { ipcMain } = electron;
        // Listen for any window sending success message
        const wins = electron.BrowserWindow.getAllWindows();
        wins.forEach((win) => {
          if (!win.isDestroyed()) {
            const originalSend = win.webContents.send.bind(win.webContents);
            win.webContents.send = (channel: string, ...args: unknown[]) => {
              if (channel === 'print-to-pdf:success') {
                (electron as any)._printSuccessSent = true;
              }
              return originalSend(channel, ...args);
            };
          }
        });
      });

      await setupDialogIntercept({ canceled: true });
      await triggerPrintToPdf();

      // Wait for any potential file operations
      await browser.pause(500);

      // Verify no success message was sent
      const successSent = await browser.electron.execute((electron: typeof import('electron')) => {
        return (electron as any)._printSuccessSent || false;
      });

      expect(successSent).toBe(false);
      E2ELogger.info('print-to-pdf-save-dialog', 'Cancel behavior verified: no file created');
    });
  });

  // ==========================================================================
  // Save Behavior Test
  // ==========================================================================

  describe('Save Behavior', () => {
    it('should create PDF file when location is selected and saved', async () => {
      // Create a unique temp file path
      const tempPath = await browser.electron.execute((electron: typeof import('electron')) => {
        const path = require('path');
        const os = require('os');
        return path.join(os.tmpdir(), `e2e-print-test-${Date.now()}.pdf`);
      });

      // Set up to track success
      let successFilePath: string | null = null;
      await browser.electron.execute(
        (electron: typeof import('electron'), expectedPath: string) => {
          (electron as any)._printSuccessPath = null;
          const wins = electron.BrowserWindow.getAllWindows();
          wins.forEach((win) => {
            if (!win.isDestroyed()) {
              const originalSend = win.webContents.send.bind(win.webContents);
              win.webContents.send = (channel: string, ...args: unknown[]) => {
                if (channel === 'print-to-pdf:success') {
                  (electron as any)._printSuccessPath = args[0];
                }
                return originalSend(channel, ...args);
              };
            }
          });
        },
        tempPath
      );

      await setupDialogIntercept({ canceled: false, filePath: tempPath });
      await triggerPrintToPdf();

      // Wait for file to be written
      await browser.pause(2000);

      // Check if file exists
      const fileExists = await browser.electron.execute(
        (electron: typeof import('electron'), path: string) => {
          const fs = require('fs');
          return fs.existsSync(path);
        },
        tempPath
      );

      expect(fileExists).toBe(true);
      E2ELogger.info('print-to-pdf-save-dialog', `PDF file created at: ${tempPath}`);

      // Also verify success IPC was sent with correct path
      successFilePath = await browser.electron.execute((electron: typeof import('electron')) => {
        return (electron as any)._printSuccessPath;
      });
      expect(successFilePath).toBe(tempPath);

      // Cleanup: delete the temp file
      await browser.electron.execute((electron: typeof import('electron'), path: string) => {
        const fs = require('fs');
        if (fs.existsSync(path)) {
          fs.unlinkSync(path);
        }
      }, tempPath);
    });
  });

  // ==========================================================================
  // File Collision Handling Test
  // ==========================================================================

  describe('File Collision Handling', () => {
    it('should append -1, -2, etc. when file already exists', async () => {
      // Get expected base filename
      const today = new Date().toISOString().split('T')[0];
      const baseFilename = `gemini-chat-${today}.pdf`;

      // Create the base file in downloads to force collision
      const { downloadsPath, createdPath } = await browser.electron.execute(
        (electron: typeof import('electron'), filename: string) => {
          const path = require('path');
          const fs = require('fs');
          const downloadsPath = electron.app.getPath('downloads');
          const filePath = path.join(downloadsPath, filename);

          // Create empty file to trigger collision
          fs.writeFileSync(filePath, '');

          return { downloadsPath, createdPath: filePath };
        },
        baseFilename
      );

      try {
        await setupDialogIntercept({ canceled: true });
        await triggerPrintToPdf();

        const state = await getDialogInterceptState();
        expect(state.wasCalled).toBe(true);

        const defaultPath = state.capturedOptions?.defaultPath || '';
        const filename = defaultPath.split(/[/\\]/).pop() || '';

        // Should end with -1.pdf since base file exists
        expect(filename).toMatch(/gemini-chat-\d{4}-\d{2}-\d{2}-\d+\.pdf$/);
        E2ELogger.info(
          'print-to-pdf-save-dialog',
          `File collision handled: "${filename}" (base file existed)`
        );
      } finally {
        // Cleanup: delete the collision test file
        await browser.electron.execute((electron: typeof import('electron'), path: string) => {
          const fs = require('fs');
          if (fs.existsSync(path)) {
            fs.unlinkSync(path);
          }
        }, createdPath);
      }
    });
  });
});
