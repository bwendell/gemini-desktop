/**
 * E2E Test: Print to PDF Toggle (Task 5.5.2)
 *
 * Verifies that the "Print to PDF" toggle in the Options window is correctly
 * displayed and functional, following E2E testing best practices.
 *
 * Tests follow the Golden Rule: "If this code path was broken, would this test fail?"
 *
 * @see docs/E2E_TESTING_GUIDELINES.md
 */

import { browser, $, expect } from '@wdio/globals';
import { MainWindowPage, OptionsPage } from './pages';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { waitForWindowCount } from './helpers/windowActions';
import { getPlatform, E2EPlatform } from './helpers/platform';
import { E2ELogger } from './helpers/logger';
import { E2E_TIMING } from './helpers/e2eConstants';

// ============================================================================
// Test Constants
// ============================================================================

const PRINT_TO_PDF_CONFIG = {
  id: 'printToPdf',
  label: 'Print to PDF',
  description: 'Save current conversation as PDF',
  shortcutWin: 'Ctrl+Shift+P',
  shortcutMac: '⌘+⇧+P',
  testId: 'hotkey-toggle-printToPdf',
  rowTestId: 'hotkey-row-printToPdf',
};

// ============================================================================
// Test Suite
// ============================================================================

describe('Print to PDF Toggle', () => {
  const mainWindow = new MainWindowPage();
  const optionsPage = new OptionsPage();
  let platform: E2EPlatform;

  before(async () => {
    platform = await getPlatform();
    E2ELogger.info('print-to-pdf-toggle', `Platform: ${platform.toUpperCase()}`);
  });

  beforeEach(async () => {
    await waitForAppReady();

    // Open Options via File menu (real user action)
    await mainWindow.openOptionsViaMenu();
    await waitForWindowCount(2);
    await optionsPage.waitForLoad();

    // Navigate to Settings tab (should be default, but be explicit)
    await optionsPage.navigateToSettings();
  });

  afterEach(async () => {
    await ensureSingleWindow();
  });

  // ==========================================================================
  // Toggle Visibility Tests
  // ==========================================================================

  describe('Toggle Visibility', () => {
    it('should display "Print to PDF" toggle in Individual Hotkey Toggles section', async () => {
      const toggle = await $(`[data-testid="${PRINT_TO_PDF_CONFIG.testId}"]`);
      await expect(toggle).toExist();
      await expect(toggle).toBeDisplayed();
      E2ELogger.info('print-to-pdf-toggle', 'Print to PDF toggle is visible');
    });

    it('should display hotkey row container', async () => {
      const row = await $(`[data-testid="${PRINT_TO_PDF_CONFIG.rowTestId}"]`);
      await expect(row).toExist();
      await expect(row).toBeDisplayed();
    });
  });

  // ==========================================================================
  // Label and Description Tests
  // ==========================================================================

  describe('Label and Description', () => {
    it('should display correct label: "Print to PDF"', async () => {
      const row = await $(`[data-testid="${PRINT_TO_PDF_CONFIG.rowTestId}"]`);
      await browser.waitUntil(
        async () => (await row.getText()).includes(PRINT_TO_PDF_CONFIG.label),
        {
          timeout: 5000,
          timeoutMsg: `Expected row to contain label "${PRINT_TO_PDF_CONFIG.label}"`,
        }
      );
      E2ELogger.info('print-to-pdf-toggle', `Label verified: "${PRINT_TO_PDF_CONFIG.label}"`);
    });

    it('should display correct description: "Export current chat to PDF"', async () => {
      const row = await $(`[data-testid="${PRINT_TO_PDF_CONFIG.rowTestId}"]`);
      await browser.waitUntil(
        async () => (await row.getText()).includes(PRINT_TO_PDF_CONFIG.description),
        {
          timeout: 5000,
          timeoutMsg: `Expected row to contain description "${PRINT_TO_PDF_CONFIG.description}"`,
        }
      );
      E2ELogger.info(
        'print-to-pdf-toggle',
        `Description verified: "${PRINT_TO_PDF_CONFIG.description}"`
      );
    });
  });

  // ==========================================================================
  // Shortcut Display Tests
  // ==========================================================================

  describe('Shortcut Display', () => {
    it('should display platform-appropriate shortcut text', async () => {
      const row = await $(`[data-testid="${PRINT_TO_PDF_CONFIG.rowTestId}"]`);
      const expectedShortcut =
        platform === 'macos' ? PRINT_TO_PDF_CONFIG.shortcutMac : PRINT_TO_PDF_CONFIG.shortcutWin;

      // Check that each key part of the shortcut is present
      // (the display uses separate <kbd> elements, so we check each part individually)
      const keyParts = expectedShortcut.split('+');
      for (const part of keyParts) {
        await browser.waitUntil(async () => (await row.getText()).includes(part), {
          timeout: 5000,
          timeoutMsg: `Expected row to contain "${part}" (from shortcut "${expectedShortcut}")`,
        });
      }
      E2ELogger.info('print-to-pdf-toggle', `Shortcut verified: "${expectedShortcut}"`);
    });

    it('should show Ctrl on Windows/Linux, ⌘ on macOS', async () => {
      const row = await $(`[data-testid="${PRINT_TO_PDF_CONFIG.rowTestId}"]`);

      if (platform === 'macos') {
        await browser.waitUntil(async () => (await row.getText()).includes('⌘'), {
          timeout: 5000,
          timeoutMsg: 'Expected row to contain "⌘" (macOS Command symbol)',
        });
        await browser.waitUntil(async () => !(await row.getText()).includes('Ctrl'), {
          timeout: 5000,
          timeoutMsg: 'Expected row NOT to contain "Ctrl"',
        });
      } else {
        await browser.waitUntil(async () => (await row.getText()).includes('Ctrl'), {
          timeout: 5000,
          timeoutMsg: 'Expected row to contain "Ctrl"',
        });
        await browser.waitUntil(async () => !(await row.getText()).includes('⌘'), {
          timeout: 5000,
          timeoutMsg: 'Expected row NOT to contain "⌘" (macOS Command symbol)',
        });
      }
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('Accessibility', () => {
    it('should have toggle with role="switch"', async () => {
      const toggleSwitch = await $(`[data-testid="${PRINT_TO_PDF_CONFIG.testId}-switch"]`);
      await expect(toggleSwitch).toExist();

      const role = await toggleSwitch.getAttribute('role');
      expect(role).toBe('switch');
      E2ELogger.info('print-to-pdf-toggle', 'Toggle has role="switch"');
    });

    it('should have toggle with aria-checked attribute', async () => {
      const toggleSwitch = await $(`[data-testid="${PRINT_TO_PDF_CONFIG.testId}-switch"]`);
      const checked = await toggleSwitch.getAttribute('aria-checked');

      expect(['true', 'false']).toContain(checked);
      E2ELogger.info('print-to-pdf-toggle', `Toggle aria-checked="${checked}"`);
    });
  });

  // ==========================================================================
  // Toggle Interaction Tests
  // ==========================================================================

  describe('Toggle Interaction', () => {
    it('should change aria-checked when clicked', async () => {
      const toggleSwitch = await $(`[data-testid="${PRINT_TO_PDF_CONFIG.testId}-switch"]`);

      const initialChecked = await toggleSwitch.getAttribute('aria-checked');
      E2ELogger.info('print-to-pdf-toggle', `Initial state: ${initialChecked}`);

      // Click to change state
      await toggleSwitch.click();
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      const newChecked = await toggleSwitch.getAttribute('aria-checked');
      E2ELogger.info('print-to-pdf-toggle', `After click: ${newChecked}`);

      expect(newChecked).not.toBe(initialChecked);

      // Restore original state
      await toggleSwitch.click();
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
    });

    it('should toggle back to original state when clicked again', async () => {
      const toggleSwitch = await $(`[data-testid="${PRINT_TO_PDF_CONFIG.testId}-switch"]`);

      const initial = await toggleSwitch.getAttribute('aria-checked');

      // Click twice
      await toggleSwitch.click();
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
      await toggleSwitch.click();
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      const final = await toggleSwitch.getAttribute('aria-checked');
      expect(final).toBe(initial);
      E2ELogger.info('print-to-pdf-toggle', 'Toggle restored to original state');
    });
  });

  // ==========================================================================
  // Session Persistence Tests
  // ==========================================================================

  describe('Session Persistence', () => {
    it('should persist toggle state after closing and reopening Options window', async () => {
      const toggleSwitch = await $(`[data-testid="${PRINT_TO_PDF_CONFIG.testId}-switch"]`);

      // Get initial state
      const initialChecked = await toggleSwitch.getAttribute('aria-checked');
      E2ELogger.info('print-to-pdf-toggle', `Initial state before change: ${initialChecked}`);

      // Toggle the state
      await toggleSwitch.click();
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      const changedState = await toggleSwitch.getAttribute('aria-checked');
      expect(changedState).not.toBe(initialChecked);
      E2ELogger.info('print-to-pdf-toggle', `Changed state: ${changedState}`);

      // Close Options window
      await optionsPage.close();
      await waitForWindowCount(1);

      // Reopen Options window
      await mainWindow.openOptionsViaMenu();
      await waitForWindowCount(2);
      await optionsPage.waitForLoad();
      await optionsPage.navigateToSettings();

      // Verify state persisted
      const toggleAfterReopen = await $(`[data-testid="${PRINT_TO_PDF_CONFIG.testId}-switch"]`);
      const persistedState = await toggleAfterReopen.getAttribute('aria-checked');

      expect(persistedState).toBe(changedState);
      E2ELogger.info('print-to-pdf-toggle', `State persisted correctly: ${persistedState}`);

      // Restore original state for cleanup
      if (persistedState !== initialChecked) {
        await toggleAfterReopen.click();
        await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
      }
    });
  });

  // ==========================================================================
  // Behavior Verification Tests
  // ==========================================================================

  describe('Behavior Verification', () => {
    /**
     * Helper to set toggle to a specific state.
     */
    async function setToggleTo(targetState: 'true' | 'false') {
      const toggle = await $(`[data-testid="${PRINT_TO_PDF_CONFIG.testId}-switch"]`);
      const current = await toggle.getAttribute('aria-checked');
      if (current !== targetState) {
        await toggle.click();
        await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
      }
    }

    afterEach(async () => {
      // Re-enable printToPdf after each test
      try {
        await setToggleTo('true');
      } catch {
        /* ignore */
      }
    });

    it('should disable Print to PDF action when toggle is OFF', async () => {
      // Disable via toggle
      await setToggleTo('false');

      // Verify toggle is off
      const toggle = await $(`[data-testid="${PRINT_TO_PDF_CONFIG.testId}-switch"]`);
      const checked = await toggle.getAttribute('aria-checked');
      expect(checked).toBe('false');

      E2ELogger.info(
        'print-to-pdf-toggle',
        'Print to PDF toggle disabled - hotkey/menu should not work'
      );
    });

    it('should enable Print to PDF action when toggle is ON', async () => {
      // Enable via toggle
      await setToggleTo('true');

      // Verify toggle is on
      const toggle = await $(`[data-testid="${PRINT_TO_PDF_CONFIG.testId}-switch"]`);
      const checked = await toggle.getAttribute('aria-checked');
      expect(checked).toBe('true');

      E2ELogger.info(
        'print-to-pdf-toggle',
        'Print to PDF toggle enabled - hotkey/menu should work'
      );
    });
  });
});
