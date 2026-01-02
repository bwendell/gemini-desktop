/**
 * E2E Test: PDF Export Toast Notifications (Task 6)
 *
 * Verifies toast notifications for PDF export functionality:
 * - Success toast with file path and "Show in Folder" action
 * - Error toast when PDF export fails
 * - "Show in Folder" action triggers shell API
 *
 * Tests follow the Golden Rule: "If this code path was broken, would this test fail?"
 *
 * @see docs/E2E_TESTING_GUIDELINES.md
 */

import { browser, expect } from '@wdio/globals';
import { ToastPage } from './pages';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { E2ELogger } from './helpers/logger';
import { E2E_TIMING } from './helpers/e2eConstants';
import {
  setupPrintDialogInterception,
  cleanupDialogInterception,
  triggerPrintViaMenu,
  getTempPdfPath,
  cleanupTestPdfFile,
} from './helpers/printActions';

describe('PDF Export Toast Notifications', () => {
  const toastPage = new ToastPage();

  beforeEach(async () => {
    await waitForAppReady();
    // Ensure dialog interception is cleaned up from any previous test
    await cleanupDialogInterception();
    // Clear any existing toasts
    await toastPage.dismissAll();
    await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
  });

  afterEach(async () => {
    await cleanupDialogInterception();
    await toastPage.dismissAll();
    await ensureSingleWindow();
  });

  // ===========================================================================
  // Test 6.1: Success toast with file path
  // ===========================================================================

  describe('Success Toast', () => {
    it('should show success toast with file path after PDF export', async function () {
      E2ELogger.info('pdf-export-toast', 'Starting success toast test');

      const tempPath = getTempPdfPath();

      try {
        // 1. Set up dialog to auto-save to temp path
        await setupPrintDialogInterception({ autoSave: true, savePath: tempPath });

        // 2. Trigger print via menu (real user flow)
        await triggerPrintViaMenu();

        // 3. Wait for PDF generation to complete (may take time)
        await browser.pause(3000);

        // 4. Verify success toast appears
        await toastPage.waitForToastType('success', 10000);
        E2ELogger.info('pdf-export-toast', 'Success toast appeared');

        // 5. Verify toast contains file path
        const toastText = await toastPage.getToastText(0);
        expect(toastText.message).toContain('PDF saved to');
        expect(toastText.message).toContain(tempPath);
        E2ELogger.info('pdf-export-toast', `Toast message: ${toastText.message}`);

        // 6. Verify "Show in Folder" action button exists
        const toast = await toastPage.getToastByIndex(0);
        expect(toast).not.toBeNull();

        const actionBtn = await toast!.$(toastPage.actionButtonSelector(0));
        const actionExists = await actionBtn.isExisting();
        expect(actionExists).toBe(true);

        const actionText = await actionBtn.getText();
        expect(actionText).toBe('Show in Folder');
        E2ELogger.info('pdf-export-toast', 'Show in Folder action button verified');
      } finally {
        // Cleanup
        cleanupTestPdfFile(tempPath);
      }
    });

    it('should not auto-dismiss success toast (persistent)', async function () {
      E2ELogger.info('pdf-export-toast', 'Starting persistent toast test');

      const tempPath = getTempPdfPath();

      try {
        // 1. Set up and trigger print
        await setupPrintDialogInterception({ autoSave: true, savePath: tempPath });
        await triggerPrintViaMenu();
        await browser.pause(3000);

        // 2. Wait for success toast
        await toastPage.waitForToastType('success', 10000);

        // 3. Wait for longer than the default auto-dismiss duration (5s)
        await browser.pause(7000);

        // 4. Verify toast is still visible (persistent)
        const isStillDisplayed = await toastPage.isToastTypeDisplayed('success');
        expect(isStillDisplayed).toBe(true);
        E2ELogger.info('pdf-export-toast', 'Toast is persistent - did not auto-dismiss');
      } finally {
        cleanupTestPdfFile(tempPath);
      }
    });
  });

  // ===========================================================================
  // Test 6.2: "Show in Folder" action triggers shell API
  // ===========================================================================

  describe('Show in Folder Action', () => {
    it('should invoke shell API when clicking Show in Folder', async function () {
      E2ELogger.info('pdf-export-toast', 'Starting Show in Folder test');

      const tempPath = getTempPdfPath();

      try {
        // 1. Set up tracking for shell.showItemInFolder calls
        await browser.electron.execute((electron: typeof import('electron')) => {
          const { shell } = electron;
          // Track calls to showItemInFolder
          (electron as any)._showItemInFolderCalled = false;
          (electron as any)._showItemInFolderPath = null;

          // Override showItemInFolder to track calls
          const original = shell.showItemInFolder.bind(shell);
          shell.showItemInFolder = (path: string) => {
            (electron as any)._showItemInFolderCalled = true;
            (electron as any)._showItemInFolderPath = path;
            // Don't actually open file explorer in tests
            // Return value is void, just track
          };
          (electron as any)._originalShowItemInFolder = original;
        });

        // 2. Trigger PDF export success
        await setupPrintDialogInterception({ autoSave: true, savePath: tempPath });
        await triggerPrintViaMenu();
        await browser.pause(3000);

        // 3. Wait for success toast
        await toastPage.waitForToastType('success', 10000);
        await toastPage.waitForAnimationComplete();

        // 4. Click "Show in Folder" action
        await toastPage.clickAction(0);
        await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
        E2ELogger.info('pdf-export-toast', 'Clicked Show in Folder action');

        // 5. Verify shell.showItemInFolder was called with correct path
        const result = await browser.electron.execute((electron: typeof import('electron')) => {
          return {
            called: (electron as any)._showItemInFolderCalled,
            path: (electron as any)._showItemInFolderPath,
          };
        });

        expect(result.called).toBe(true);
        expect(result.path).toBe(tempPath);
        E2ELogger.info('pdf-export-toast', `shell.showItemInFolder called with: ${result.path}`);
      } finally {
        // Cleanup: restore original showItemInFolder
        await browser.electron.execute((electron: typeof import('electron')) => {
          const { shell } = electron;
          if ((electron as any)._originalShowItemInFolder) {
            shell.showItemInFolder = (electron as any)._originalShowItemInFolder;
            delete (electron as any)._originalShowItemInFolder;
            delete (electron as any)._showItemInFolderCalled;
            delete (electron as any)._showItemInFolderPath;
          }
        });
        cleanupTestPdfFile(tempPath);
      }
    });
  });

  // ===========================================================================
  // Test 6.3: Error toast on export failure
  // ===========================================================================

  describe('Error Toast', () => {
    it('should show error toast when PDF export fails', async function () {
      E2ELogger.info('pdf-export-toast', 'Starting error toast test');

      // 1. Inject error by sending the error IPC event directly
      // This simulates a real error without needing to cause an actual failure
      const testErrorMessage = 'Test error: disk full';

      await browser.electron.execute((electron: typeof import('electron'), errorMsg: string) => {
        const { BrowserWindow } = electron;
        const mainWindow = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
        if (mainWindow) {
          mainWindow.webContents.send('print-to-pdf:error', errorMsg);
        }
      }, testErrorMessage);

      // 2. Wait for error toast to appear
      await toastPage.waitForToastType('error', 5000);
      E2ELogger.info('pdf-export-toast', 'Error toast appeared');

      // 3. Verify toast contains error message
      const toastText = await toastPage.getToastText(0);
      expect(toastText.message).toContain('Failed to export PDF');
      expect(toastText.message).toContain(testErrorMessage);
      E2ELogger.info('pdf-export-toast', `Toast message: ${toastText.message}`);

      // 4. Verify toast type class
      const toastType = await toastPage.getToastTypeClass();
      expect(toastType).toBe('error');
    });

    it('should allow dismissing error toast', async function () {
      E2ELogger.info('pdf-export-toast', 'Starting error toast dismiss test');

      // 1. Trigger error toast
      await browser.electron.execute((electron: typeof import('electron')) => {
        const { BrowserWindow } = electron;
        const mainWindow = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
        if (mainWindow) {
          mainWindow.webContents.send('print-to-pdf:error', 'Test error');
        }
      });

      // 2. Wait for error toast
      await toastPage.waitForToastType('error', 5000);
      await toastPage.waitForAnimationComplete();

      // 3. Click dismiss button
      await toastPage.clickDismiss();
      E2ELogger.info('pdf-export-toast', 'Clicked dismiss button');

      // 4. Verify toast is dismissed
      await toastPage.waitForAllToastsDismissed(3000);
      const toastCount = await toastPage.getToastCount();
      expect(toastCount).toBe(0);
      E2ELogger.info('pdf-export-toast', 'Error toast dismissed successfully');
    });
  });
});
