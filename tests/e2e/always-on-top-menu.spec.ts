/**
 * E2E Test: Always On Top - Menu Toggle
 *
 * Tests the "Always On Top" menu item in the View menu.
 * Verifies:
 * - Menu item exists and is clickable
 * - Toggling updates the checkmark
 * - State persists through toggle interactions
 * - Cross-platform compatibility (Windows, Linux custom menu; macOS native menu)
 */

import { browser, expect } from '@wdio/globals';
import { clickMenuItemById } from './helpers/menuActions';
import { E2ELogger } from './helpers/logger';
import { getPlatform, isMacOS, isWindows, isLinux } from './helpers/platform';
import { E2E_TIMING } from './helpers/e2eConstants';
import {
  getAlwaysOnTopState,
  toggleAlwaysOnTopViaMenu,
} from './helpers/alwaysOnTopActions';

describe('Always On Top - Menu Toggle', () => {
  let platform: string;

  before(async () => {
    platform = await getPlatform();
    E2ELogger.info('always-on-top-menu', `Running on platform: ${platform}`);
  });

  describe('Menu Item Rendering', () => {
    it('should have Always On Top menu item in View menu', async () => {
      E2ELogger.info('always-on-top-menu', 'Verifying menu item exists');

      // On macOS, menu is native and harder to verify programmatically
      // We'll skip visual verification but test functionality
      if (await isMacOS()) {
        E2ELogger.info(
          'always-on-top-menu',
          'macOS: Skipping menu item visual verification (native menu)'
        );
        return;
      }

      // On Windows/Linux, we can verify the custom titlebar menu
      // The menu item should exist even if menu isn't open
      // We'll verify by attempting to click it
      try {
        await clickMenuItemById('menu-view-always-on-top');
        await browser.pause(E2E_TIMING.CLEANUP_PAUSE);
        E2ELogger.info('always-on-top-menu', 'Menu item exists and is clickable');

        // Toggle back to original state
        await clickMenuItemById('menu-view-always-on-top');
        await browser.pause(E2E_TIMING.CLEANUP_PAUSE);
      } catch (error) {
        E2ELogger.error('always-on-top-menu', `Failed to find menu item: ${error}`);
        throw error;
      }
    });
  });

  describe('Toggle Functionality', () => {
    it('should toggle always on top state when menu item is clicked', async () => {
      E2ELogger.info('always-on-top-menu', 'Testing menu toggle functionality');

      // Get initial state
      const initialState = await getAlwaysOnTopState();

      const wasEnabled = initialState.enabled;
      E2ELogger.info('always-on-top-menu', `Initial state: ${wasEnabled ? 'enabled' : 'disabled'}`);

      // Click menu item to toggle
      await toggleAlwaysOnTopViaMenu();

      // Verify state changed
      const newState = await getAlwaysOnTopState();

      expect(newState.enabled).toBe(!wasEnabled);
      E2ELogger.info(
        'always-on-top-menu',
        `State after toggle: ${newState.enabled ? 'enabled' : 'disabled'}`
      );

      // Toggle back to original state
      await toggleAlwaysOnTopViaMenu();

      const finalState = await getAlwaysOnTopState();

      expect(finalState.enabled).toBe(wasEnabled);
      E2ELogger.info('always-on-top-menu', 'State correctly restored to initial value');
    });

    it('should toggle state multiple times correctly', async () => {
      E2ELogger.info('always-on-top-menu', 'Testing multiple toggle operations');

      // Get initial state
      const initialState = await getAlwaysOnTopState();

      const startEnabled = initialState.enabled;

      // Toggle 3 times
      for (let i = 0; i < 3; i++) {
        await toggleAlwaysOnTopViaMenu(E2E_TIMING.CLEANUP_PAUSE);

        const expectedEnabled = i % 2 === 0 ? !startEnabled : startEnabled;
        const currentState = await getAlwaysOnTopState();

        expect(currentState.enabled).toBe(expectedEnabled);
        E2ELogger.info(
          'always-on-top-menu',
          `Toggle ${i + 1}: ${currentState.enabled ? 'enabled' : 'disabled'}`
        );
      }

      // Should be back to opposite of start (3 is odd)
      const finalState = await getAlwaysOnTopState();
      expect(finalState.enabled).toBe(!startEnabled);

      // Toggle back to original
      await toggleAlwaysOnTopViaMenu(E2E_TIMING.CLEANUP_PAUSE);
    });
  });

  describe('Cross-Platform Compatibility', () => {
    it('should work on Windows', async function () {
      if (!(await isWindows())) {
        E2ELogger.info('always-on-top-menu', 'Skipping Windows-specific test');
        return;
      }

      E2ELogger.info('always-on-top-menu', 'Testing on Windows platform');

      const initialState = await getAlwaysOnTopState();

      await toggleAlwaysOnTopViaMenu();

      const newState = await getAlwaysOnTopState();

      expect(newState.enabled).toBe(!initialState.enabled);

      // Restore
      await toggleAlwaysOnTopViaMenu();

      E2ELogger.info('always-on-top-menu', 'Windows: Toggle verified working');
    });

    it('should work on macOS', async function () {
      if (!(await isMacOS())) {
        E2ELogger.info('always-on-top-menu', 'Skipping macOS-specific test');
        return;
      }

      E2ELogger.info('always-on-top-menu', 'Testing on macOS platform');

      const initialState = await getAlwaysOnTopState();

      // On macOS, use the native menu (same menu ID works)
      await toggleAlwaysOnTopViaMenu();

      const newState = await getAlwaysOnTopState();

      expect(newState.enabled).toBe(!initialState.enabled);

      // Restore
      await toggleAlwaysOnTopViaMenu();

      E2ELogger.info('always-on-top-menu', 'macOS: Toggle verified working');
    });

    it('should work on Linux', async function () {
      if (!(await isLinux())) {
        E2ELogger.info('always-on-top-menu', 'Skipping Linux-specific test');
        return;
      }

      E2ELogger.info('always-on-top-menu', 'Testing on Linux platform');

      const initialState = await getAlwaysOnTopState();

      await toggleAlwaysOnTopViaMenu();

      const newState = await getAlwaysOnTopState();

      expect(newState.enabled).toBe(!initialState.enabled);

      // Restore
      await toggleAlwaysOnTopViaMenu();

      E2ELogger.info('always-on-top-menu', 'Linux: Toggle verified working');
    });
  });
});
