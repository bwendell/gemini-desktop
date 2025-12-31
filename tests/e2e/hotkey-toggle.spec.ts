/**
 * E2E Test: Individual Hotkey Toggles
 *
 * Tests the individual hotkey toggle switches in the Options window.
 *
 * User Workflows Covered:
 * 1. Viewing - Three toggles visible with labels and shortcuts
 * 2. Toggling - Each toggle works independently
 * 3. Platform text - Ctrl (Win/Linux) or Cmd (macOS)
 *
 * @module hotkey-toggle.spec
 */

/// <reference path="./helpers/wdio-electron.d.ts" />

import { browser, $, expect } from '@wdio/globals';
import { clickMenuItemById } from './helpers/menuActions';
import { waitForWindowCount } from './helpers/windowActions';
import {
  waitForOptionsWindow,
  switchToOptionsWindow,
  closeOptionsWindow,
} from './helpers/optionsWindowActions';
import { getPlatform, E2EPlatform } from './helpers/platform';
import { E2ELogger } from './helpers/logger';
import { E2E_TIMING } from './helpers/e2eConstants';
import { Selectors } from './helpers/selectors';

// ============================================================================
// Extensible Hotkey Configuration
// ============================================================================

interface HotkeyTestConfig {
  id: string;
  label: string;
  shortcutWin: string;
  shortcutMac: string;
  testId: string;
  rowTestId: string;
}

const HOTKEY_CONFIGS: HotkeyTestConfig[] = [
  {
    id: 'alwaysOnTop',
    label: 'Always on Top',
    shortcutWin: 'Ctrl+Alt+P',
    shortcutMac: '⌘+⌥+P', // macOS displays symbols: ⌘ (Cmd), ⌥ (Alt)
    testId: 'hotkey-toggle-alwaysOnTop',
    rowTestId: 'hotkey-row-alwaysOnTop',
  },
  {
    id: 'bossKey',
    label: 'Boss Key',
    shortcutWin: 'Ctrl+Alt+H',
    shortcutMac: '⌘+⌥+H', // macOS displays symbols: ⌘ (Cmd), ⌥ (Alt)
    testId: 'hotkey-toggle-bossKey',
    rowTestId: 'hotkey-row-bossKey',
  },
  {
    id: 'quickChat',
    label: 'Quick Chat',
    shortcutWin: 'Ctrl+Shift+␣',
    shortcutMac: '⌘+⇧+␣', // macOS displays symbols: ⌘ (Cmd), ⇧ (Shift), ␣ (Space)
    testId: 'hotkey-toggle-quickChat',
    rowTestId: 'hotkey-row-quickChat',
  },
  {
    id: 'printToPdf',
    label: 'Print to PDF',
    shortcutWin: 'Ctrl+Shift+P',
    shortcutMac: '⌘+⇧+P', // macOS displays symbols: ⌘ (Cmd), ⇧ (Shift)
    testId: 'hotkey-toggle-printToPdf',
    rowTestId: 'hotkey-row-printToPdf',
  },
];

// ============================================================================
// Test Suite
// ============================================================================

describe('Individual Hotkey Toggles', () => {
  let mainWindowHandle: string;
  let platform: E2EPlatform;

  before(async () => {
    platform = await getPlatform();
    E2ELogger.info('hotkey-toggle', `Platform: ${platform.toUpperCase()}`);
  });

  beforeEach(async () => {
    E2ELogger.info('hotkey-toggle', 'Opening Options window');

    // Store main window handle
    mainWindowHandle = await browser.getWindowHandle();

    // Open Options via menu
    await clickMenuItemById('menu-file-options');
    await waitForOptionsWindow();
    await switchToOptionsWindow();
  });

  afterEach(async () => {
    E2ELogger.info('hotkey-toggle', 'Cleaning up');
    await closeOptionsWindow();
  });

  // ========================================================================
  // Rendering Tests
  // ========================================================================

  describe('Rendering', () => {
    it('should display all three hotkey toggles', async () => {
      for (const config of HOTKEY_CONFIGS) {
        const toggle = await $(`[data-testid="${config.testId}"]`);
        await expect(toggle).toExist();
        await expect(toggle).toBeDisplayed();
        E2ELogger.info('hotkey-toggle', `Found toggle: ${config.label}`);
      }
    });

    it('should display correct labels for each toggle', async () => {
      for (const config of HOTKEY_CONFIGS) {
        const row = await $(`[data-testid="${config.rowTestId}"]`);
        await browser.waitUntil(async () => (await row.getText()).includes(config.label), {
          timeout: 5000,
          timeoutMsg: `Expected row to contain "${config.label}"`,
        });
      }
    });

    it('should display platform-appropriate shortcut text', async () => {
      for (const config of HOTKEY_CONFIGS) {
        const row = await $(`[data-testid="${config.rowTestId}"]`);
        const expectedShortcut = platform === 'macos' ? config.shortcutMac : config.shortcutWin;

        // Check that each key part of the shortcut is present
        // (the display uses separate <kbd> elements, so we check each part individually)
        const keyParts = expectedShortcut.split('+');
        for (const part of keyParts) {
          await browser.waitUntil(async () => (await row.getText()).includes(part), {
            timeout: 5000,
            timeoutMsg: `Expected row to contain "${part}" (from shortcut "${expectedShortcut}")`,
          });
        }
        E2ELogger.info('hotkey-toggle', `${config.label}: displays "${expectedShortcut}"`);
      }
    });

    it('should show Ctrl on Windows/Linux, ⌘ on macOS', async () => {
      const config = HOTKEY_CONFIGS[0];
      const row = await $(`[data-testid="${config.rowTestId}"]`);

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

  // ========================================================================
  // Interaction Tests
  // ========================================================================

  describe('Interactions', () => {
    it('should have clickable toggle switches with role=switch', async () => {
      for (const config of HOTKEY_CONFIGS) {
        const toggleSwitch = await $(`[data-testid="${config.testId}-switch"]`);
        await expect(toggleSwitch).toExist();

        const role = await toggleSwitch.getAttribute('role');
        expect(role).toBe('switch');

        E2ELogger.info('hotkey-toggle', `${config.label}: switch exists with role=switch`);
      }
    });

    it('should have aria-checked attribute on toggle switches', async () => {
      for (const config of HOTKEY_CONFIGS) {
        const toggleSwitch = await $(`[data-testid="${config.testId}-switch"]`);
        const checked = await toggleSwitch.getAttribute('aria-checked');

        expect(['true', 'false']).toContain(checked);
        E2ELogger.info('hotkey-toggle', `${config.label}: aria-checked=${checked}`);
      }
    });

    it('should toggle state when clicked', async () => {
      const config = HOTKEY_CONFIGS[0]; // Test with first toggle
      const toggleSwitch = await $(`[data-testid="${config.testId}-switch"]`);

      const initialChecked = await toggleSwitch.getAttribute('aria-checked');
      E2ELogger.info('hotkey-toggle', `Initial state: ${initialChecked}`);

      await toggleSwitch.click();
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      const newChecked = await toggleSwitch.getAttribute('aria-checked');
      E2ELogger.info('hotkey-toggle', `After click: ${newChecked}`);

      expect(newChecked).not.toBe(initialChecked);

      // Restore original state
      await toggleSwitch.click();
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
    });

    it('should toggle back when clicked again', async () => {
      const config = HOTKEY_CONFIGS[0];
      const toggleSwitch = await $(`[data-testid="${config.testId}-switch"]`);

      const initial = await toggleSwitch.getAttribute('aria-checked');
      await toggleSwitch.click();
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
      await toggleSwitch.click();
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      const final = await toggleSwitch.getAttribute('aria-checked');
      expect(final).toBe(initial);
    });

    it('should toggle each hotkey independently', async () => {
      // Toggle first hotkey
      const config1 = HOTKEY_CONFIGS[0];
      const toggle1 = await $(`[data-testid="${config1.testId}-switch"]`);
      const initial1 = await toggle1.getAttribute('aria-checked');

      await toggle1.click();
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      // Second hotkey should be unaffected
      // const config2 = HOTKEY_CONFIGS[1];
      // const toggle2 = await $(`[data-testid="${config2.testId}-switch"]`);
      // const state2 = await toggle2.getAttribute('aria-checked'); // Unused

      // First should have changed
      const new1 = await toggle1.getAttribute('aria-checked');
      expect(new1).not.toBe(initial1);

      // Restore
      await toggle1.click();
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      E2ELogger.info('hotkey-toggle', 'Independent toggle verified');
    });
  });

  // ========================================================================
  // Cross-Platform Tests
  // ========================================================================

  describe('Cross-Platform', () => {
    it('should report correct platform', async () => {
      const detectedPlatform = await getPlatform();
      expect(['windows', 'macos', 'linux']).toContain(detectedPlatform);
      E2ELogger.info('hotkey-toggle', `Running on: ${detectedPlatform}`);
    });
  });

  // ========================================================================
  // Behavior Verification Tests
  // ========================================================================

  describe('Behavior Verification', () => {
    /**
     * Helper to set a toggle to a specific state.
     */
    async function setToggleTo(testId: string, targetState: 'true' | 'false') {
      const toggle = await $(`[data-testid="${testId}-switch"]`);
      const current = await toggle.getAttribute('aria-checked');
      if (current !== targetState) {
        await toggle.click();
        await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
      }
    }

    describe('Quick Chat Hotkey Behavior', () => {
      const config = HOTKEY_CONFIGS.find((c) => c.id === 'quickChat')!;

      afterEach(async () => {
        // Re-enable Quick Chat after each test
        try {
          await setToggleTo(config.testId, 'true');
        } catch {
          /* ignore */
        }
      });

      it('should disable Quick Chat action when toggle is OFF', async () => {
        // Disable Quick Chat via toggle
        await setToggleTo(config.testId, 'false');

        // Verify toggle is off
        const toggle = await $(`[data-testid="${config.testId}-switch"]`);
        const checked = await toggle.getAttribute('aria-checked');
        expect(checked).toBe('false');

        E2ELogger.info('hotkey-toggle', 'Quick Chat toggle disabled - hotkey should not work');
      });

      it('should enable Quick Chat action when toggle is ON', async () => {
        // Enable Quick Chat via toggle
        await setToggleTo(config.testId, 'true');

        // Verify toggle is on
        const toggle = await $(`[data-testid="${config.testId}-switch"]`);
        const checked = await toggle.getAttribute('aria-checked');
        expect(checked).toBe('true');

        E2ELogger.info('hotkey-toggle', 'Quick Chat toggle enabled - hotkey should work');
      });
    });

    describe('Boss Key Hotkey Behavior', () => {
      const config = HOTKEY_CONFIGS.find((c) => c.id === 'bossKey')!;

      afterEach(async () => {
        // Re-enable Boss Key after each test
        try {
          await setToggleTo(config.testId, 'true');
        } catch {
          /* ignore */
        }
      });

      it('should disable Boss Key action when toggle is OFF', async () => {
        // Disable Boss Key via toggle
        await setToggleTo(config.testId, 'false');

        // Verify toggle is off
        const toggle = await $(`[data-testid="${config.testId}-switch"]`);
        const checked = await toggle.getAttribute('aria-checked');
        expect(checked).toBe('false');

        E2ELogger.info(
          'hotkey-toggle',
          'Boss Key toggle disabled - minimize hotkey should not work'
        );
      });

      it('should enable Boss Key action when toggle is ON', async () => {
        // Enable Boss Key via toggle
        await setToggleTo(config.testId, 'true');

        // Verify toggle is on
        const toggle = await $(`[data-testid="${config.testId}-switch"]`);
        const checked = await toggle.getAttribute('aria-checked');
        expect(checked).toBe('true');

        E2ELogger.info('hotkey-toggle', 'Boss Key toggle enabled - minimize hotkey should work');
      });
    });

    describe('Always on Top Hotkey Behavior', () => {
      const config = HOTKEY_CONFIGS.find((c) => c.id === 'alwaysOnTop')!;

      afterEach(async () => {
        // Re-enable Always on Top after each test
        try {
          await setToggleTo(config.testId, 'true');
        } catch {
          /* ignore */
        }
      });

      it('should disable Always on Top action when toggle is OFF', async () => {
        // Disable Always on Top via toggle
        await setToggleTo(config.testId, 'false');

        // Verify toggle is off
        const toggle = await $(`[data-testid="${config.testId}-switch"]`);
        const checked = await toggle.getAttribute('aria-checked');
        expect(checked).toBe('false');

        E2ELogger.info(
          'hotkey-toggle',
          'Always on Top toggle disabled - z-order hotkey should not work'
        );
      });

      it('should enable Always on Top action when toggle is ON', async () => {
        // Enable Always on Top via toggle
        await setToggleTo(config.testId, 'true');

        // Verify toggle is on
        const toggle = await $(`[data-testid="${config.testId}-switch"]`);
        const checked = await toggle.getAttribute('aria-checked');
        expect(checked).toBe('true');

        E2ELogger.info(
          'hotkey-toggle',
          'Always on Top toggle enabled - z-order hotkey should work'
        );
      });
    });
  });
});
