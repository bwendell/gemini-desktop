/**
 * E2E Test: Always On Top - Menu-Hotkey Synchronization
 *
 * Tests that menu checkmarks and hotkey state stay synchronized.
 * Verifies:
 * - Toggling via hotkey updates menu checkmark
 * - Toggling via menu updates internal state (tested by hotkey)
 * - State remains synchronized across activation methods
 * - Cross-platform synchronization
 */

import { browser, expect } from '@wdio/globals';
import { E2ELogger } from './helpers/logger';
import { getPlatform, isMacOS, isWindows, isLinux } from './helpers/platform';
import { E2E_TIMING } from './helpers/e2eConstants';
import {
  getAlwaysOnTopState,
  pressAlwaysOnTopHotkey,
  toggleAlwaysOnTopViaMenu,
  getModifierKey,
} from './helpers/alwaysOnTopActions';

describe('Always On Top - Menu-Hotkey Synchronization', () => {
  let platform: string;
  let modifierKey: 'Meta' | 'Control';

  before(async () => {
    platform = await getPlatform();
    modifierKey = await getModifierKey();
    E2ELogger.info('always-on-top-menu-sync', `Platform: ${platform}, Modifier: ${modifierKey}`);
  });

  describe('Hotkey to Menu Synchronization', () => {
    it('should update state when toggled via hotkey', async () => {
      E2ELogger.info('always-on-top-menu-sync', 'Testing hotkey -> state sync');

      // Get initial state
      const initialState = await getAlwaysOnTopState();

      const wasEnabled = initialState.enabled;

      // Toggle via hotkey
      await pressAlwaysOnTopHotkey();

      // Verify state changed
      const newState = await getAlwaysOnTopState();

      expect(newState.enabled).toBe(!wasEnabled);
      E2ELogger.info(
        'always-on-top-menu-sync',
        `State after hotkey: ${newState.enabled ? 'enabled' : 'disabled'}`
      );

      // Restore
      await pressAlwaysOnTopHotkey();
    });
  });

  describe('Menu to Hotkey Synchronization', () => {
    it('should update state when toggled via menu', async () => {
      E2ELogger.info('always-on-top-menu-sync', 'Testing menu -> state sync');

      // Get initial state
      const initialState = await getAlwaysOnTopState();

      const wasEnabled = initialState.enabled;

      // Toggle via menu
      await toggleAlwaysOnTopViaMenu();

      // Verify state changed
      const newState = await getAlwaysOnTopState();

      expect(newState.enabled).toBe(!wasEnabled);
      E2ELogger.info(
        'always-on-top-menu-sync',
        `State after menu click: ${newState.enabled ? 'enabled' : 'disabled'}`
      );

      // Restore
      await toggleAlwaysOnTopViaMenu();
    });
  });

  describe('Bidirectional Synchronization', () => {
    it('should remain synced when alternating between menu and hotkey', async () => {
      E2ELogger.info('always-on-top-menu-sync', 'Testing bidirectional sync');

      // Get initial state
      const initialState = await getAlwaysOnTopState();

      const startEnabled = initialState.enabled;

      // 1. Toggle via hotkey
      await pressAlwaysOnTopHotkey();

      let state = await getAlwaysOnTopState();
      expect(state.enabled).toBe(!startEnabled);
      E2ELogger.info('always-on-top-menu-sync', `After hotkey: ${state.enabled}`);

      // 2. Toggle via menu
      await toggleAlwaysOnTopViaMenu();

      state = await getAlwaysOnTopState();
      expect(state.enabled).toBe(startEnabled);
      E2ELogger.info('always-on-top-menu-sync', `After menu: ${state.enabled}`);

      // 3. Toggle via hotkey again
      await pressAlwaysOnTopHotkey();

      state = await getAlwaysOnTopState();
      expect(state.enabled).toBe(!startEnabled);
      E2ELogger.info('always-on-top-menu-sync', `After hotkey again: ${state.enabled}`);

      // 4. Toggle via menu to restore
      await toggleAlwaysOnTopViaMenu();

      state = await getAlwaysOnTopState();
      expect(state.enabled).toBe(startEnabled);
      E2ELogger.info(
        'always-on-top-menu-sync',
        'Successfully alternated 4 times, all states correct'
      );
    });

    it('should handle rapid alternation between input methods', async () => {
      E2ELogger.info('always-on-top-menu-sync', 'Testing rapid alternation');

      const initialState = await getAlwaysOnTopState();

      const startEnabled = initialState.enabled;

      // Rapidly alternate: hotkey, menu, hotkey, menu, hotkey
      await pressAlwaysOnTopHotkey(E2E_TIMING.CLEANUP_PAUSE);
      await toggleAlwaysOnTopViaMenu(E2E_TIMING.CLEANUP_PAUSE);
      await pressAlwaysOnTopHotkey(E2E_TIMING.CLEANUP_PAUSE);
      await toggleAlwaysOnTopViaMenu(E2E_TIMING.CLEANUP_PAUSE);
      await pressAlwaysOnTopHotkey();

      // After 5 toggles (odd), should be opposite of start
      const finalState = await getAlwaysOnTopState();

      expect(finalState.enabled).toBe(!startEnabled);
      E2ELogger.info(
        'always-on-top-menu-sync',
        'Rapid alternation: state correctly reflects 5 toggles'
      );

      // Restore
      if (finalState.enabled !== startEnabled) {
        await pressAlwaysOnTopHotkey(E2E_TIMING.CLEANUP_PAUSE);
      }
    });
  });

  describe('Cross-Platform Synchronization', () => {
    it('should work on Windows', async function () {
      if (!(await isWindows())) {
        E2ELogger.info('always-on-top-menu-sync', 'Skipping Windows-specific test');
        return;
      }

      E2ELogger.info('always-on-top-menu-sync', 'Testing Windows sync');

      const initialState = await getAlwaysOnTopState();

      // Hotkey
      await browser.keys(['Control', 'Shift', 't']);
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      let state = await getAlwaysOnTopState();
      expect(state.enabled).toBe(!initialState.enabled);

      // Menu
      await toggleAlwaysOnTopViaMenu();

      state = await getAlwaysOnTopState();
      expect(state.enabled).toBe(initialState.enabled);

      E2ELogger.info('always-on-top-menu-sync', 'Windows: Synchronization verified');
    });

    it('should work on macOS', async function () {
      if (!(await isMacOS())) {
        E2ELogger.info('always-on-top-menu-sync', 'Skipping macOS-specific test');
        return;
      }

      E2ELogger.info('always-on-top-menu-sync', 'Testing macOS sync');

      const initialState = await getAlwaysOnTopState();

      // Hotkey
      await browser.keys(['Meta', 'Shift', 't']);
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      let state = await getAlwaysOnTopState();
      expect(state.enabled).toBe(!initialState.enabled);

      // Menu
      await toggleAlwaysOnTopViaMenu();

      state = await getAlwaysOnTopState();
      expect(state.enabled).toBe(initialState.enabled);

      E2ELogger.info('always-on-top-menu-sync', 'macOS: Synchronization verified');
    });

    it('should work on Linux', async function () {
      if (!(await isLinux())) {
        E2ELogger.info('always-on-top-menu-sync', 'Skipping Linux-specific test');
        return;
      }

      E2ELogger.info('always-on-top-menu-sync', 'Testing Linux sync');

      const initialState = await getAlwaysOnTopState();

      // Hotkey
      await browser.keys(['Control', 'Shift', 't']);
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      let state = await getAlwaysOnTopState();
      expect(state.enabled).toBe(!initialState.enabled);

      // Menu
      await toggleAlwaysOnTopViaMenu();

      state = await getAlwaysOnTopState();
      expect(state.enabled).toBe(initialState.enabled);

      E2ELogger.info('always-on-top-menu-sync', 'Linux: Synchronization verified');
    });
  });
});
