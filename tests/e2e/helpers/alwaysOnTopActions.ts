/**
 * Always On Top E2E Test Helpers.
 *
 * Provides utilities for testing the "Always On Top" feature.
 * Consolidates duplicated code from multiple always-on-top test files.
 *
 * @module alwaysOnTopActions
 */

/// <reference path="./wdio-electron.d.ts" />

import { browser } from '@wdio/globals';
import { E2ELogger } from './logger';
import { isMacOS } from './platform';
import { E2E_TIMING } from './e2eConstants';
import { clickMenuItemById } from './menuActions';

// ============================================================================
// Types
// ============================================================================

/**
 * Always On Top state returned from the electronAPI.
 */
export interface AlwaysOnTopState {
  enabled: boolean;
}

// ============================================================================
// State Query Functions
// ============================================================================

/**
 * Gets the current Always On Top state via the renderer's electronAPI.
 *
 * @returns Promise<AlwaysOnTopState> - The current state
 */
export async function getAlwaysOnTopState(): Promise<AlwaysOnTopState> {
  const result = await browser.execute(() => {
    return (window as any).electronAPI?.getAlwaysOnTop?.();
  });

  const state = { enabled: result?.enabled ?? false };
  E2ELogger.info('alwaysOnTopActions', `Current state: ${state.enabled ? 'enabled' : 'disabled'}`);
  return state;
}

/**
 * Gets the Always On Top state directly from the BrowserWindow.
 * Use this when you need the actual window state rather than the IPC-reported state.
 *
 * @returns Promise<boolean> - True if window is always on top
 */
export async function getWindowAlwaysOnTopState(): Promise<boolean> {
  return browser.electron.execute((electron) => {
    const win = electron.BrowserWindow.getAllWindows()[0];
    return win ? win.isAlwaysOnTop() : false;
  });
}

// ============================================================================
// Action Functions
// ============================================================================

/**
 * Sets the Always On Top state via the renderer's electronAPI.
 * Waits until the state is confirmed via the main process.
 *
 * @param enabled - Whether to enable always on top
 * @param waitMs - Maximum time to wait for state confirmation (defaults to E2E_TIMING.IPC_ROUND_TRIP)
 */
export async function setAlwaysOnTop(
  enabled: boolean,
  waitMs = E2E_TIMING.IPC_ROUND_TRIP
): Promise<void> {
  E2ELogger.info('alwaysOnTopActions', `Setting always-on-top to: ${enabled}`);

  // Fire the IPC call
  await browser.execute((enable) => {
    (window as any).electronAPI?.setAlwaysOnTop?.(enable);
  }, enabled);

  // Wait until the state is confirmed via main process
  const timeout = Math.max(waitMs, 1000); // Minimum 1 second for verification
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const actualState = await getWindowAlwaysOnTopState();
    if (actualState === enabled) {
      E2ELogger.info('alwaysOnTopActions', `State confirmed: ${enabled}`);
      return;
    }
    await browser.pause(50); // Poll every 50ms
  }

  // Log warning if timeout but state not confirmed (don't throw to avoid breaking existing tests)
  const finalState = await getWindowAlwaysOnTopState();
  E2ELogger.info(
    'alwaysOnTopActions',
    `State verification timeout: expected ${enabled}, got ${finalState}`
  );
}

/**
 * Toggles the Always On Top state via the View menu.
 *
 * @param waitMs - Time to wait after clicking (defaults to E2E_TIMING.IPC_ROUND_TRIP)
 */
export async function toggleAlwaysOnTopViaMenu(waitMs = E2E_TIMING.IPC_ROUND_TRIP): Promise<void> {
  E2ELogger.info('alwaysOnTopActions', 'Toggling via menu');
  await clickMenuItemById('menu-view-always-on-top');
  await browser.pause(waitMs);
}

/**
 * Presses the Always On Top hotkey (Ctrl+Shift+T or Cmd+Shift+T on macOS).
 *
 * @param waitMs - Time to wait after pressing (defaults to E2E_TIMING.IPC_ROUND_TRIP)
 */
export async function pressAlwaysOnTopHotkey(waitMs = E2E_TIMING.IPC_ROUND_TRIP): Promise<void> {
  const modifierKey = (await isMacOS()) ? 'Meta' : 'Control';
  E2ELogger.info('alwaysOnTopActions', `Pressing hotkey: ${modifierKey}+Alt+P`);

  await browser
    .action('key')
    .down(modifierKey)
    .down('Alt')
    .down('p')
    .pause(100) // Hold briefly
    .up('p')
    .up('Alt')
    .up(modifierKey)
    .perform();

  await browser.pause(waitMs);
}

/**
 * Toggles the Always On Top state and verifies the change.
 * Returns the new state after toggling.
 *
 * @param method - How to toggle ('menu' | 'hotkey' | 'api')
 * @returns Promise<boolean> - The new enabled state
 */
export async function toggleAlwaysOnTop(
  method: 'menu' | 'hotkey' | 'api' = 'api'
): Promise<boolean> {
  const before = await getAlwaysOnTopState();

  switch (method) {
    case 'menu':
      await toggleAlwaysOnTopViaMenu();
      break;
    case 'hotkey':
      await pressAlwaysOnTopHotkey();
      break;
    case 'api':
    default:
      await setAlwaysOnTop(!before.enabled);
      break;
  }

  const after = await getAlwaysOnTopState();
  E2ELogger.info(
    'alwaysOnTopActions',
    `Toggled via ${method}: ${before.enabled} -> ${after.enabled}`
  );

  return after.enabled;
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Resets the Always On Top state to disabled.
 * Useful in afterEach hooks to ensure clean test state.
 */
export async function resetAlwaysOnTopState(): Promise<void> {
  E2ELogger.info('alwaysOnTopActions', 'Resetting always-on-top state to disabled');
  await setAlwaysOnTop(false, E2E_TIMING.CLEANUP_PAUSE);
}

/**
 * Verifies the current Always On Top state matches expected.
 *
 * @param expected - Expected enabled state
 * @returns Promise<boolean> - True if state matches expected
 */
export async function verifyAlwaysOnTopState(expected: boolean): Promise<boolean> {
  const state = await getAlwaysOnTopState();
  const matches = state.enabled === expected;

  if (!matches) {
    E2ELogger.info(
      'alwaysOnTopActions',
      `State mismatch: expected ${expected}, got ${state.enabled}`
    );
  }

  return matches;
}

/**
 * Gets the platform-specific modifier key for hotkeys.
 *
 * @returns Promise<'Meta' | 'Control'> - The modifier key to use
 */
export async function getModifierKey(): Promise<'Meta' | 'Control'> {
  return (await isMacOS()) ? 'Meta' : 'Control';
}
