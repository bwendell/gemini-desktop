/**
 * E2E Test: Always On Top - Hotkey Toggle
 *
 * Tests the global hotkey (Ctrl+Shift+T / Cmd+Shift+T) for toggling Always On Top.
 * Verifies:
 * - Hotkey toggles the always-on-top state
 * - State changes are reflected immediately
 * - Rapid toggling works correctly
 * - Cross-platform keyboard shortcuts work (Ctrl vs Cmd)
 */

import { browser, expect } from '@wdio/globals';
import { E2ELogger } from './helpers/logger';
import { getPlatform, isMacOS, isWindows, isLinux } from './helpers/platform';
import { E2E_TIMING } from './helpers/e2eConstants';

declare global {
  interface Window {
    electronAPI: {
      getAlwaysOnTop: () => Promise<{ enabled: boolean }>;
    };
  }
}

describe('Always On Top - Hotkey Toggle', () => {
  let platform: string;
  let modifierKey: string;

  before(async () => {
    platform = await getPlatform();
    // Use Command on macOS, Control on Windows/Linux
    modifierKey = (await isMacOS()) ? 'Meta' : 'Control';
    E2ELogger.info('always-on-top-hotkey', `Platform: ${platform}, Modifier: ${modifierKey}`);
  });

  /**
   * Helper to press the always-on-top hotkey.
   * Uses platform-appropriate modifier (Cmd on macOS, Ctrl elsewhere).
   */
  async function pressAlwaysOnTopHotkey(): Promise<void> {
    // Hotkey is Ctrl+Shift+T (Windows/Linux) or Cmd+Shift+T (macOS)
    await browser.keys([modifierKey, 'Shift', 't']);
  }

  describe('Basic Hotkey Functionality', () => {
    it('should toggle always-on-top when hotkey is pressed', async () => {
      E2ELogger.info('always-on-top-hotkey', 'Testing basic hotkey toggle');

      // Get initial state
      const initialState = await browser.execute(() => {
        return window.electronAPI?.getAlwaysOnTop?.();
      });

      const wasEnabled = initialState?.enabled ?? false;
      E2ELogger.info(
        'always-on-top-hotkey',
        `Initial state: ${wasEnabled ? 'enabled' : 'disabled'}`
      );

      // Press hotkey
      await pressAlwaysOnTopHotkey();
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP); // Wait for IPC

      // Verify state changed
      const newState = await browser.execute(() => {
        return window.electronAPI?.getAlwaysOnTop?.();
      });

      expect(newState?.enabled).toBe(!wasEnabled);
      E2ELogger.info(
        'always-on-top-hotkey',
        `State after hotkey: ${newState?.enabled ? 'enabled' : 'disabled'}`
      );

      // Toggle back
      await pressAlwaysOnTopHotkey();
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      const finalState = await browser.execute(() => {
        return window.electronAPI?.getAlwaysOnTop?.();
      });

      expect(finalState?.enabled).toBe(wasEnabled);
      E2ELogger.info('always-on-top-hotkey', 'Successfully toggled back to initial state');
    });

    it('should toggle state when hotkey is pressed multiple times', async () => {
      E2ELogger.info('always-on-top-hotkey', 'Testing multiple hotkey presses');

      const initialState = await browser.execute(() => {
        return window.electronAPI?.getAlwaysOnTop?.();
      });

      const startEnabled = initialState?.enabled ?? false;

      // Press hotkey 4 times
      for (let i = 0; i < 4; i++) {
        await pressAlwaysOnTopHotkey();
        await browser.pause(250);

        const currentState = await browser.execute(() => {
          return window.electronAPI?.getAlwaysOnTop?.();
        });

        const expectedEnabled = i % 2 === 0 ? !startEnabled : startEnabled;
        expect(currentState?.enabled).toBe(expectedEnabled);

        E2ELogger.info(
          'always-on-top-hotkey',
          `Toggle ${i + 1}: ${currentState?.enabled ? 'enabled' : 'disabled'}`
        );
      }

      // After 4 toggles (even number), should be back to start
      const finalState = await browser.execute(() => {
        return window.electronAPI?.getAlwaysOnTop?.();
      });
      expect(finalState?.enabled).toBe(startEnabled);
    });
  });

  describe('Rapid Toggle Stability', () => {
    it('should handle rapid hotkey presses without desync', async () => {
      E2ELogger.info('always-on-top-hotkey', 'Testing rapid toggle stability');

      const initialState = await browser.execute(() => {
        return window.electronAPI?.getAlwaysOnTop?.();
      });

      const startEnabled = initialState?.enabled ?? false;

      // Rapidly press hotkey 5 times with minimal delay
      for (let i = 0; i < 5; i++) {
        await pressAlwaysOnTopHotkey();
        await browser.pause(100); // Very short delay
      }

      // Wait for all IPC operations to settle
      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

      // Final state should be opposite of start (5 is odd)
      const finalState = await browser.execute(() => {
        return window.electronAPI?.getAlwaysOnTop?.();
      });

      expect(finalState?.enabled).toBe(!startEnabled);
      E2ELogger.info(
        'always-on-top-hotkey',
        `Rapid toggle: started ${startEnabled}, ended ${finalState?.enabled}`
      );

      // Reset to initial state
      if (finalState?.enabled !== startEnabled) {
        await pressAlwaysOnTopHotkey();
        await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
      }
    });
  });

  describe('Cross-Platform Hotkey Support', () => {
    it('should use Ctrl+Shift+T on Windows', async function () {
      if (!(await isWindows())) {
        E2ELogger.info('always-on-top-hotkey', 'Skipping Windows-specific test');
        return;
      }

      E2ELogger.info('always-on-top-hotkey', 'Testing Windows hotkey (Ctrl+Shift+T)');

      const initialState = await browser.execute(() => {
        return window.electronAPI?.getAlwaysOnTop?.();
      });

      // Use Control modifier
      await browser.keys(['Control', 'Shift', 't']);
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      const newState = await browser.execute(() => {
        return window.electronAPI?.getAlwaysOnTop?.();
      });

      expect(newState?.enabled).toBe(!initialState?.enabled);

      // Toggle back
      await browser.keys(['Control', 'Shift', 't']);
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      E2ELogger.info('always-on-top-hotkey', 'Windows: Hotkey verified working');
    });

    it('should use Cmd+Shift+T on macOS', async function () {
      if (!(await isMacOS())) {
        E2ELogger.info('always-on-top-hotkey', 'Skipping macOS-specific test');
        return;
      }

      E2ELogger.info('always-on-top-hotkey', 'Testing macOS hotkey (Cmd+Shift+T)');

      const initialState = await browser.execute(() => {
        return window.electronAPI?.getAlwaysOnTop?.();
      });

      // Use Meta (Command) modifier
      await browser.keys(['Meta', 'Shift', 't']);
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      const newState = await browser.execute(() => {
        return window.electronAPI?.getAlwaysOnTop?.();
      });

      expect(newState?.enabled).toBe(!initialState?.enabled);

      // Toggle back
      await browser.keys(['Meta', 'Shift', 't']);
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      E2ELogger.info('always-on-top-hotkey', 'macOS: Hotkey verified working');
    });

    it('should use Ctrl+Shift+T on Linux', async function () {
      if (!(await isLinux())) {
        E2ELogger.info('always-on-top-hotkey', 'Skipping Linux-specific test');
        return;
      }

      E2ELogger.info('always-on-top-hotkey', 'Testing Linux hotkey (Ctrl+Shift+T)');

      const initialState = await browser.execute(() => {
        return window.electronAPI?.getAlwaysOnTop?.();
      });

      // Use Control modifier
      await browser.keys(['Control', 'Shift', 't']);
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      const newState = await browser.execute(() => {
        return window.electronAPI?.getAlwaysOnTop?.();
      });

      expect(newState?.enabled).toBe(!initialState?.enabled);

      // Toggle back
      await browser.keys(['Control', 'Shift', 't']);
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      E2ELogger.info('always-on-top-hotkey', 'Linux: Hotkey verified working');
    });
  });
});
