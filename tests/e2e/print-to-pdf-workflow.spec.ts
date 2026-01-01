/**
 * E2E Test: Print to PDF Full Workflow (Task 5.5.7)
 *
 * Verifies complete user workflows for print-to-pdf functionality,
 * following E2E testing best practices.
 *
 * Tests follow the Golden Rule: "If this code path was broken, would this test fail?"
 *
 * @see docs/E2E_TESTING_GUIDELINES.md
 */

import { browser, expect } from '@wdio/globals';
import { MainWindowPage, OptionsPage } from './pages';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { waitForWindowCount } from './helpers/windowActions';
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
  performPrintWorkflow,
} from './helpers/printActions';

describe('Print to PDF Full Workflow', () => {
  const mainWindow = new MainWindowPage();
  const optionsPage = new OptionsPage();

  beforeEach(async () => {
    await waitForAppReady();
    // Ensure dialog interception is cleaned up from any previous test
    await cleanupDialogInterception();
  });

  afterEach(async () => {
    await cleanupDialogInterception();
    await ensureSingleWindow();
  });

  // ===========================================================================
  // Workflow 1: Complete workflow via hotkey
  // ===========================================================================

  describe('Complete Workflow via Hotkey', () => {
    it('should complete full workflow: hotkey → dialog → save → file created', async function () {
      // This is the "happy path" test for hotkey-triggered print
      E2ELogger.info('print-workflow', 'Starting hotkey workflow test');

      const tempPath = getTempPdfPath();

      try {
        // 1. Set up dialog to auto-save to temp path
        await setupPrintDialogInterception({ autoSave: true, savePath: tempPath });

        // 2. Trigger print via hotkey (Ctrl+Shift+P / Cmd+Shift+P)
        await triggerPrintViaHotkey();

        // 3. Wait for print operation to complete
        await browser.pause(2000); // PDF generation can take time

        // 4. Verify dialog was called
        const dialogResult = await getPrintDialogInterceptResult();
        expect(dialogResult.dialogCalled).toBe(true);
        E2ELogger.info('print-workflow', 'Dialog was called');

        // 5. Verify PDF file was created
        const fileResult = verifyPdfFile(tempPath);
        expect(fileResult.exists).toBe(true);
        expect(fileResult.size).toBeGreaterThan(0);
        expect(fileResult.isValidPdf).toBe(true);
        E2ELogger.info(
          'print-workflow',
          `PDF created: ${fileResult.size} bytes, valid: ${fileResult.isValidPdf}`
        );
      } finally {
        // Cleanup
        cleanupTestPdfFile(tempPath);
      }
    });

    it('should cancel gracefully when user cancels save dialog', async () => {
      // Set up dialog to cancel
      await setupPrintDialogInterception({ autoSave: false });

      // Trigger print
      await triggerPrintViaHotkey();
      await browser.pause(E2E_TIMING.EXTENDED_PAUSE_MS);

      // Verify dialog was called but no file created
      const dialogResult = await getPrintDialogInterceptResult();
      expect(dialogResult.dialogCalled).toBe(true);

      // App should still be responsive after cancel
      const isLoaded = await mainWindow.isLoaded();
      expect(isLoaded).toBe(true);
    });
  });

  // ===========================================================================
  // Workflow 2: Complete workflow via File menu
  // ===========================================================================

  describe('Complete Workflow via File Menu', () => {
    it('should complete full workflow: menu click → dialog → save → file created', async function () {
      E2ELogger.info('print-workflow', 'Starting menu workflow test');

      const tempPath = getTempPdfPath();

      try {
        // 1. Set up dialog to auto-save
        await setupPrintDialogInterception({ autoSave: true, savePath: tempPath });

        // 2. Trigger print via File menu
        await triggerPrintViaMenu();

        // 3. Wait for print operation
        await browser.pause(2000);

        // 4. Verify dialog was called
        const dialogResult = await getPrintDialogInterceptResult();
        expect(dialogResult.dialogCalled).toBe(true);

        // 5. Verify PDF file was created and is valid
        const fileResult = verifyPdfFile(tempPath);
        expect(fileResult.exists).toBe(true);
        expect(fileResult.isValidPdf).toBe(true);
        E2ELogger.info('print-workflow', `PDF verified: ${fileResult.size} bytes`);
      } finally {
        cleanupTestPdfFile(tempPath);
      }
    });
  });

  // ===========================================================================
  // Workflow 3: Toggle disable/re-enable workflow
  // ===========================================================================

  describe('Toggle Disable/Re-enable Workflow', () => {
    it('should disable hotkey when toggle is OFF, re-enable when ON', async function () {
      // 1. Open Options and disable printToPdf
      await mainWindow.openOptionsViaMenu();
      await waitForWindowCount(2);
      await optionsPage.waitForLoad();
      await optionsPage.navigateToSettings();

      // Ensure toggle is ON first, then disable
      const wasEnabled = await optionsPage.isHotkeyEnabled('printToPdf');
      if (wasEnabled) {
        await optionsPage.toggleHotkey('printToPdf');
        await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
      }

      // Verify toggle is now OFF
      const isDisabled = !(await optionsPage.isHotkeyEnabled('printToPdf'));
      expect(isDisabled).toBe(true);
      E2ELogger.info('print-workflow', 'Print toggle disabled');

      // 2. Close Options
      await optionsPage.close();
      await waitForWindowCount(1);

      // 3. Verify hotkey does NOT trigger print
      await setupPrintDialogInterception({ autoSave: false });
      await triggerPrintViaHotkey();
      await browser.pause(E2E_TIMING.EXTENDED_PAUSE_MS);

      const dialogResult = await getPrintDialogInterceptResult();
      expect(dialogResult.dialogCalled).toBe(false);
      E2ELogger.info('print-workflow', 'Hotkey did not trigger when disabled');

      // 4. Re-enable the toggle
      await mainWindow.openOptionsViaMenu();
      await waitForWindowCount(2);
      await optionsPage.waitForLoad();
      await optionsPage.navigateToSettings();

      await optionsPage.toggleHotkey('printToPdf');
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      const isReEnabled = await optionsPage.isHotkeyEnabled('printToPdf');
      expect(isReEnabled).toBe(true);

      await optionsPage.close();
      await waitForWindowCount(1);

      // 5. Verify hotkey NOW triggers print
      await setupPrintDialogInterception({ autoSave: false });
      await triggerPrintViaHotkey();
      await browser.pause(E2E_TIMING.EXTENDED_PAUSE_MS);

      const dialogResult2 = await getPrintDialogInterceptResult();
      expect(dialogResult2.dialogCalled).toBe(true);
      E2ELogger.info('print-workflow', 'Hotkey triggers after re-enable');
    });
  });

  // ===========================================================================
  // Workflow 4: Error recovery workflow
  // ===========================================================================

  describe('Error Recovery Workflow', () => {
    it('should handle errors gracefully and allow retry', async function () {
      // First, perform a successful print to establish baseline
      const tempPath1 = getTempPdfPath();

      try {
        // 1. First print should succeed
        await setupPrintDialogInterception({ autoSave: true, savePath: tempPath1 });
        await triggerPrintViaHotkey();
        await browser.pause(2000);

        const result1 = await getPrintDialogInterceptResult();
        expect(result1.dialogCalled).toBe(true);
        E2ELogger.info('print-workflow', 'First print successful');

        // 2. Now simulate dialog cancel (user-level "error"/abort)
        await setupPrintDialogInterception({ autoSave: false });
        await triggerPrintViaHotkey();
        await browser.pause(E2E_TIMING.EXTENDED_PAUSE_MS);

        const result2 = await getPrintDialogInterceptResult();
        expect(result2.dialogCalled).toBe(true);
        E2ELogger.info('print-workflow', 'Dialog cancel handled');

        // 3. Verify app is still functional after cancel
        const isLoaded = await mainWindow.isLoaded();
        expect(isLoaded).toBe(true);

        // 4. Retry should work
        const tempPath2 = getTempPdfPath();
        try {
          await setupPrintDialogInterception({ autoSave: true, savePath: tempPath2 });
          await triggerPrintViaMenu(); // Use menu this time for variety
          await browser.pause(2000);

          const result3 = await getPrintDialogInterceptResult();
          expect(result3.dialogCalled).toBe(true);

          const fileResult = verifyPdfFile(tempPath2);
          expect(fileResult.exists).toBe(true);
          E2ELogger.info('print-workflow', 'Retry succeeded');
        } finally {
          cleanupTestPdfFile(tempPath2);
        }
      } finally {
        cleanupTestPdfFile(tempPath1);
      }
    });
  });
});
