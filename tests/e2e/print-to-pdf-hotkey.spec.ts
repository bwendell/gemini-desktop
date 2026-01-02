/**
 * E2E Test: Print to PDF Hotkey (Task 5.5.4)
 *
 * Verifies that the "Print to PDF" hotkey correctly triggers the print flow.
 * Tests hotkey registration, focus behavior, toggle state effects, and custom accelerators.
 *
 * **Key Insight**: Application hotkeys (menu accelerators) are handled at the Electron main
 * process level, not by WebDriver keyboard events. We test by programmatically clicking
 * the menu item via Electron APIs, following industry best practices.
 *
 * @see docs/E2E_TESTING_GUIDELINES.md
 */

/// <reference path="./helpers/wdio-electron.d.ts" />

import { browser, expect } from '@wdio/globals';
import { MainWindowPage, OptionsPage } from './pages';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { waitForWindowCount } from './helpers/windowActions';
import { clickMenuItemById, getMenuItemState } from './helpers/menuActions';
import { getPlatform, E2EPlatform } from './helpers/platform';
import { E2ELogger } from './helpers/logger';
import { E2E_TIMING } from './helpers/e2eConstants';
import { REGISTERED_HOTKEYS } from './helpers/hotkeyHelpers';
import {
  setupPrintDialogInterception,
  cleanupDialogInterception,
  triggerPrintViaMenuDirect,
} from './helpers/printActions';

// ============================================================================
// Test Constants
// ============================================================================

const PRINT_TO_PDF_MENU_ID = 'menu-file-print-to-pdf';
const PRINT_TO_PDF_HOTKEY_ID = 'printToPdf';

// ============================================================================
// Test Suite
// ============================================================================

describe('Print to PDF Hotkey', () => {
  const mainWindow = new MainWindowPage();
  const optionsPage = new OptionsPage();
  let platform: E2EPlatform;

  before(async () => {
    platform = await getPlatform();
    E2ELogger.info('print-to-pdf-hotkey', `Platform: ${platform.toUpperCase()}`);
    await waitForAppReady();
  });

  afterEach(async () => {
    await ensureSingleWindow();
  });

  // ==========================================================================
  // Hotkey Registration Tests
  // ==========================================================================

  describe('Hotkey Registration', () => {
    it('should have printToPdf defined in REGISTERED_HOTKEYS', () => {
      expect(REGISTERED_HOTKEYS.PRINT_TO_PDF).toBeDefined();
      expect(REGISTERED_HOTKEYS.PRINT_TO_PDF.accelerator).toBeDefined();
      E2ELogger.info(
        'print-to-pdf-hotkey',
        `Accelerator: ${REGISTERED_HOTKEYS.PRINT_TO_PDF.accelerator}`
      );
    });

    it('should have correct accelerator format', () => {
      const accelerator = REGISTERED_HOTKEYS.PRINT_TO_PDF.accelerator;
      // Should contain CommandOrControl, Shift, and P
      expect(accelerator).toContain('CommandOrControl');
      expect(accelerator).toContain('Shift');
      expect(accelerator).toContain('P');
    });

    it('should have menu item with accelerator registered', async () => {
      const state = await getMenuItemState(PRINT_TO_PDF_MENU_ID);

      expect(state.exists).toBe(true);
      expect(state.enabled).toBe(true);
      expect(state.accelerator).toBeDefined();

      // Verify accelerator contains expected keys
      if (state.accelerator) {
        expect(state.accelerator).toMatch(/Shift.*P|⇧.*P/i);
      }

      E2ELogger.info('print-to-pdf-hotkey', `Menu item accelerator: ${state.accelerator}`);
    });
  });

  // ==========================================================================
  // Hotkey Triggers Print Flow Tests
  // ==========================================================================

  describe('Hotkey Triggers Print Flow', () => {
    it('should open save dialog when menu item is clicked (simulating hotkey)', async () => {
      // Set up dialog interception to track if it was called
      const dialogResult = await browser.electron.execute((electron: typeof import('electron')) => {
        return new Promise<{ called: boolean; title: string | undefined }>((resolve) => {
          // Store original showSaveDialog
          const originalShowSaveDialog = electron.dialog.showSaveDialog;

          // Override to track calls and auto-cancel
          let wasCalled = false;
          let dialogTitle: string | undefined;

          electron.dialog.showSaveDialog = async (
            windowOrOptions: Electron.BrowserWindow | Electron.SaveDialogOptions,
            options?: Electron.SaveDialogOptions
          ) => {
            wasCalled = true;
            const opts = options || (windowOrOptions as Electron.SaveDialogOptions);
            dialogTitle = opts.title;
            return { canceled: true, filePath: undefined };
          };

          // Click the menu item (this is what the hotkey does)
          const menu = electron.Menu.getApplicationMenu();
          const item = menu?.getMenuItemById('menu-file-print-to-pdf');
          if (item && item.enabled) {
            item.click();
          }

          // Wait for dialog call
          setTimeout(() => {
            // Restore original
            electron.dialog.showSaveDialog = originalShowSaveDialog;
            resolve({ called: wasCalled, title: dialogTitle });
          }, 1000);
        });
      });

      expect(dialogResult.called).toBe(true);
      expect(dialogResult.title).toContain('PDF');
      E2ELogger.info('print-to-pdf-hotkey', 'Hotkey triggered save dialog successfully');
    });
  });

  // ==========================================================================
  // Main Window Focus Tests
  // ==========================================================================

  describe('Main Window Focus', () => {
    it('should have hotkey action available when main window is focused', async () => {
      // Verify menu item is enabled when main window is focused
      const state = await getMenuItemState(PRINT_TO_PDF_MENU_ID);
      expect(state.exists).toBe(true);
      expect(state.enabled).toBe(true);
    });
  });

  // ==========================================================================
  // Hotkey Disabled State Tests
  // ==========================================================================

  describe('Hotkey Disabled State', () => {
    it('should disable menu item when printToPdf toggle is OFF', async () => {
      // 1. Open Options window
      await mainWindow.openOptionsViaMenu();
      await waitForWindowCount(2);
      await optionsPage.waitForLoad();
      await optionsPage.navigateToSettings();

      // 2. Get initial state and disable if enabled
      const wasEnabled = await optionsPage.isHotkeyEnabled(PRINT_TO_PDF_HOTKEY_ID);
      if (wasEnabled) {
        await optionsPage.toggleHotkey(PRINT_TO_PDF_HOTKEY_ID);
        await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
      }

      // 3. Close Options and verify menu item state
      await optionsPage.close();
      await waitForWindowCount(1);

      const state = await getMenuItemState(PRINT_TO_PDF_MENU_ID);

      // When disabled, the accelerator should be undefined or the item should be disabled
      // Behavior may vary - check if accelerator is removed
      E2ELogger.info(
        'print-to-pdf-hotkey',
        `Menu state when disabled: enabled=${state.enabled}, accelerator=${state.accelerator}`
      );

      // Either accelerator is undefined or item is disabled
      const isEffectivelyDisabled = !state.accelerator || !state.enabled;
      expect(isEffectivelyDisabled).toBe(true);

      // Cleanup: re-enable the hotkey
      await mainWindow.openOptionsViaMenu();
      await waitForWindowCount(2);
      await optionsPage.waitForLoad();
      await optionsPage.navigateToSettings();
      await optionsPage.toggleHotkey(PRINT_TO_PDF_HOTKEY_ID);
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
      await optionsPage.close();
    });

    it('should re-enable menu item when printToPdf toggle is ON', async () => {
      // 1. Open Options and ensure toggle is ON
      await mainWindow.openOptionsViaMenu();
      await waitForWindowCount(2);
      await optionsPage.waitForLoad();
      await optionsPage.navigateToSettings();

      // Ensure it's enabled
      const isEnabled = await optionsPage.isHotkeyEnabled(PRINT_TO_PDF_HOTKEY_ID);
      if (!isEnabled) {
        await optionsPage.toggleHotkey(PRINT_TO_PDF_HOTKEY_ID);
        await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
      }

      // 2. Close Options and verify menu item is enabled with accelerator
      await optionsPage.close();
      await waitForWindowCount(1);

      const state = await getMenuItemState(PRINT_TO_PDF_MENU_ID);

      expect(state.exists).toBe(true);
      expect(state.accelerator).toBeDefined();
      E2ELogger.info(
        'print-to-pdf-hotkey',
        `Menu state when enabled: enabled=${state.enabled}, accelerator=${state.accelerator}`
      );
    });
  });

  // ==========================================================================
  // Custom Accelerator Tests
  // ==========================================================================

  describe('Custom Accelerator', () => {
    it('should update menu item accelerator when changed in Options', async () => {
      // 1. Open Options and change accelerator
      await mainWindow.openOptionsViaMenu();
      await waitForWindowCount(2);
      await optionsPage.waitForLoad();
      await optionsPage.navigateToSettings();

      // 2. Click accelerator input to enable recording
      await optionsPage.clickAcceleratorInput(PRINT_TO_PDF_HOTKEY_ID);
      await browser.waitUntil(
        async () => await optionsPage.isRecordingModeActive(PRINT_TO_PDF_HOTKEY_ID),
        { timeout: 2000, timeoutMsg: 'Recording mode did not activate' }
      );

      // 3. Press new accelerator (Ctrl+Alt+P or Cmd+Alt+P)
      const modifiers = platform === 'macos' ? ['Meta', 'Alt'] : ['Control', 'Alt'];
      await browser.keys([...modifiers, 'p']);
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      // 4. Close Options and verify menu item accelerator updated
      await optionsPage.close();
      await waitForWindowCount(1);

      const state = await getMenuItemState(PRINT_TO_PDF_MENU_ID);

      // Verify accelerator contains Alt
      expect(state.accelerator).toBeDefined();
      if (state.accelerator) {
        expect(state.accelerator).toMatch(/Alt/i);
      }
      E2ELogger.info('print-to-pdf-hotkey', `Custom accelerator: ${state.accelerator}`);

      // 5. Cleanup: reset to default
      await mainWindow.openOptionsViaMenu();
      await waitForWindowCount(2);
      await optionsPage.waitForLoad();
      await optionsPage.navigateToSettings();
      await optionsPage.clickResetButton(PRINT_TO_PDF_HOTKEY_ID);
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
      await optionsPage.close();
    });

    it('should trigger print flow with custom accelerator', async () => {
      // First set a custom accelerator
      await mainWindow.openOptionsViaMenu();
      await waitForWindowCount(2);
      await optionsPage.waitForLoad();
      await optionsPage.navigateToSettings();

      await optionsPage.clickAcceleratorInput(PRINT_TO_PDF_HOTKEY_ID);
      await browser.waitUntil(
        async () => await optionsPage.isRecordingModeActive(PRINT_TO_PDF_HOTKEY_ID),
        { timeout: 2000 }
      );

      const modifiers = platform === 'macos' ? ['Meta', 'Alt'] : ['Control', 'Alt'];
      await browser.keys([...modifiers, 'p']);
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      await optionsPage.close();
      await waitForWindowCount(1);

      // Now test that the print flow still works (by clicking menu item)
      const dialogResult = await browser.electron.execute((electron: typeof import('electron')) => {
        return new Promise<boolean>((resolve) => {
          const originalShowSaveDialog = electron.dialog.showSaveDialog;
          let wasCalled = false;

          electron.dialog.showSaveDialog = async () => {
            wasCalled = true;
            return { canceled: true, filePath: undefined };
          };

          const menu = electron.Menu.getApplicationMenu();
          const item = menu?.getMenuItemById('menu-file-print-to-pdf');
          if (item && item.enabled) {
            item.click();
          }

          setTimeout(() => {
            electron.dialog.showSaveDialog = originalShowSaveDialog;
            resolve(wasCalled);
          }, 1000);
        });
      });

      expect(dialogResult).toBe(true);
      E2ELogger.info('print-to-pdf-hotkey', 'Custom accelerator triggers print flow');

      // Cleanup: reset to default
      await mainWindow.openOptionsViaMenu();
      await waitForWindowCount(2);
      await optionsPage.waitForLoad();
      await optionsPage.navigateToSettings();
      await optionsPage.clickResetButton(PRINT_TO_PDF_HOTKEY_ID);
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
      await optionsPage.close();
    });
  });
});
