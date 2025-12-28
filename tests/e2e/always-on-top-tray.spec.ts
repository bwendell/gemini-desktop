/**
 * E2E Test: Always On Top - Tray Interaction
 *
 * Tests always-on-top behavior with system tray minimize/restore.
 * Verifies:
 * - State persists when minimizing to tray
 * - State persists when restoring from tray
 * - Cross-platform tray behavior
 */

import { browser, expect } from '@wdio/globals';
import { E2ELogger } from './helpers/logger';
import { getPlatform, isMacOS, isWindows, isLinux } from './helpers/platform';
import { E2E_TIMING } from './helpers/e2eConstants';
import { setAlwaysOnTop, getAlwaysOnTopState } from './helpers/alwaysOnTopActions';
import {
  hideWindow,
  showWindow,
  isWindowVisible,
} from './helpers/windowStateActions';

describe('Always On Top - Tray Interaction', () => {
  let platform: string;

  before(async () => {
    platform = await getPlatform();
    E2ELogger.info('always-on-top-tray', `Running on platform: ${platform}`);
  });

  afterEach(async () => {
    // Ensure window is visible and reset state
    await showWindow();
    await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
    await setAlwaysOnTop(false, E2E_TIMING.CLEANUP_PAUSE);
  });

  describe('Hide and Show Persistence', () => {
    it('should maintain always-on-top after hide/show', async () => {
      E2ELogger.info('always-on-top-tray', 'Testing hide/show persistence');

      // Enable always-on-top
      await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);

      const stateBeforeHide = await getAlwaysOnTopState();
      expect(stateBeforeHide.enabled).toBe(true);

      // Hide window (simulate minimize to tray)
      await hideWindow();
      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

      // Verify window is hidden
      const visible = await isWindowVisible();
      expect(visible).toBe(false);

      E2ELogger.info('always-on-top-tray', 'Window hidden');

      // Show window (restore from tray)
      await showWindow();
      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

      // Verify window is visible again
      const visibleAfter = await isWindowVisible();
      expect(visibleAfter).toBe(true);

      // Verify always-on-top persisted
      const stateAfterShow = await getAlwaysOnTopState();
      expect(stateAfterShow.enabled).toBe(true);

      E2ELogger.info('always-on-top-tray', 'Always-on-top persisted through hide/show');
    });

    it('should maintain disabled state after hide/show', async () => {
      E2ELogger.info('always-on-top-tray', 'Testing disabled state through hide/show');

      // Ensure disabled
      await setAlwaysOnTop(false, E2E_TIMING.IPC_ROUND_TRIP);

      // Hide and show
      await hideWindow();
      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);
      await showWindow();
      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

      // Verify still disabled
      const state = await getAlwaysOnTopState();
      expect(state.enabled).toBe(false);

      E2ELogger.info('always-on-top-tray', 'Disabled state persisted through hide/show');
    });
  });

  describe('Multiple Hide/Show Cycles', () => {
    it('should maintain always-on-top through multiple cycles', async () => {
      E2ELogger.info('always-on-top-tray', 'Testing multiple hide/show cycles');

      await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);

      // Perform 3 hide/show cycles
      for (let i = 0; i < 3; i++) {
        await hideWindow();
        await browser.pause(E2E_TIMING.CYCLE_PAUSE);
        await showWindow();
        await browser.pause(E2E_TIMING.CYCLE_PAUSE);

        const state = await getAlwaysOnTopState();
        expect(state.enabled).toBe(true);

        E2ELogger.info('always-on-top-tray', `Cycle ${i + 1}/3: State maintained`);
      }
    });
  });

  describe('Toggle While Hidden', () => {
    it('should maintain state set before hide when shown', async () => {
      E2ELogger.info('always-on-top-tray', 'Testing state set before hide');

      // First disable
      await setAlwaysOnTop(false, E2E_TIMING.CLEANUP_PAUSE);

      // Then enable
      await setAlwaysOnTop(true, E2E_TIMING.CLEANUP_PAUSE);

      // Hide
      await hideWindow();
      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

      // Show
      await showWindow();
      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

      // Should still be enabled
      const state = await getAlwaysOnTopState();
      expect(state.enabled).toBe(true);

      E2ELogger.info('always-on-top-tray', 'State set before hide was maintained');
    });
  });

  describe('Cross-Platform Tray Behavior', () => {
    it('should work on Windows', async function () {
      if (!(await isWindows())) {
        E2ELogger.info('always-on-top-tray', 'Skipping Windows-specific test');
        return;
      }

      E2ELogger.info('always-on-top-tray', 'Testing Windows tray behavior');

      await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);

      await hideWindow();
      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);
      await showWindow();
      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

      const state = await getAlwaysOnTopState();
      expect(state.enabled).toBe(true);

      E2ELogger.info('always-on-top-tray', 'Windows: Tray behavior verified');
    });

    it('should work on macOS', async function () {
      if (!(await isMacOS())) {
        E2ELogger.info('always-on-top-tray', 'Skipping macOS-specific test');
        return;
      }

      E2ELogger.info('always-on-top-tray', 'Testing macOS tray behavior');

      await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);

      await hideWindow();
      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);
      await showWindow();
      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

      const state = await getAlwaysOnTopState();
      expect(state.enabled).toBe(true);

      E2ELogger.info('always-on-top-tray', 'macOS: Tray behavior verified');
    });

    it('should work on Linux', async function () {
      if (!(await isLinux())) {
        E2ELogger.info('always-on-top-tray', 'Skipping Linux-specific test');
        return;
      }

      E2ELogger.info('always-on-top-tray', 'Testing Linux tray behavior');

      await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);

      await hideWindow();
      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);
      await showWindow();
      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

      const state = await getAlwaysOnTopState();
      expect(state.enabled).toBe(true);

      E2ELogger.info('always-on-top-tray', 'Linux: Tray behavior verified');
    });
  });
});
