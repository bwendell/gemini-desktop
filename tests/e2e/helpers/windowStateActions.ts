/**
 * Window state actions for E2E testing.
 *
 * Provides access to Electron window state via IPC calls.
 * Works on all platforms (Windows, macOS, Linux).
 *
 * ## Architecture
 * - Uses browser.execute() to call window.electronAPI methods
 * - Uses browser.electron.execute() for direct BrowserWindow access
 * - Graceful fallbacks when APIs are unavailable
 *
 * @module windowStateActions
 */
/// <reference path="./wdio-electron.d.ts" />

import { browser } from '@wdio/globals';
import { E2ELogger } from './logger';
import { E2E_TIMING } from './e2eConstants';

// ============================================================================
// Types
// ============================================================================

export interface WindowState {
  isMaximized: boolean;
  isMinimized: boolean;
  isFullScreen: boolean;
  isVisible: boolean;
  isDestroyed: boolean;
}

// ============================================================================
// State Query Functions
// ============================================================================

/**
 * Gets the complete window state.
 *
 * @returns Object with isMaximized, isMinimized, isFullScreen
 */
export async function getWindowState(): Promise<WindowState> {
  const state = await browser.electron.execute((electron) => {
    // use getAllWindows() because getFocusedWindow() returns null if window is minimized
    const wins = electron.BrowserWindow.getAllWindows();
    const win = wins[0];

    if (!win) {
      return {
        isMaximized: false,
        isMinimized: false,
        isFullScreen: false,
        isVisible: false,
        isDestroyed: false,
      };
    }
    return {
      isMaximized: win.isMaximized(),
      isMinimized: win.isMinimized(),
      isFullScreen: win.isFullScreen(),
      isVisible: win.isVisible(),
      isDestroyed: win.isDestroyed(),
    };
  });

  E2ELogger.info('windowStateActions', `Window state: ${JSON.stringify(state)}`);
  return state;
}

/**
 * Checks if the current window is maximized.
 */
export async function isWindowMaximized(): Promise<boolean> {
  const result = await browser.execute(() => {
    return (window as any).electronAPI?.isMaximized?.() ?? false;
  });

  // If electronAPI method doesn't exist, fall back to Electron direct access
  if (result === false) {
    const state = await getWindowState();
    return state.isMaximized;
  }

  return result;
}

/**
 * Checks if the current window is minimized.
 */
export async function isWindowMinimized(): Promise<boolean> {
  const state = await getWindowState();
  return state.isMinimized;
}

/**
 * Checks if the current window is in fullscreen mode.
 */
export async function isWindowFullScreen(): Promise<boolean> {
  const state = await getWindowState();
  return state.isFullScreen;
}

/**
 * Checks if the current window is visible.
 */
export async function isWindowVisible(): Promise<boolean> {
  const state = await getWindowState();
  return state.isVisible;
}

/**
 * Checks if the current window is destroyed.
 */
export async function isWindowDestroyed(): Promise<boolean> {
  const state = await getWindowState();
  return state.isDestroyed;
}

// ============================================================================
// Action Functions (via IPC)
// ============================================================================

/**
 * Maximizes the current window via Electron API.
 */
export async function maximizeWindow(): Promise<void> {
  E2ELogger.info('windowStateActions', 'Maximizing window via API');

  await browser.execute(() => {
    (window as any).electronAPI?.maximizeWindow?.();
  });

  // Give the window time to transition
  await browser.pause(E2E_TIMING.QUICK_RESTORE);
}

/**
 * Minimizes the current window via Electron API.
 */
export async function minimizeWindow(): Promise<void> {
  E2ELogger.info('windowStateActions', 'Minimizing window via API');

  await browser.execute(() => {
    (window as any).electronAPI?.minimizeWindow?.();
  });

  await browser.pause(E2E_TIMING.QUICK_RESTORE);
}

/**
 * Restores the window from maximized/minimized state.
 */
export async function restoreWindow(): Promise<void> {
  E2ELogger.info('windowStateActions', 'Restoring window via API');

  // Use direct Electron API for restore (not exposed via electronAPI)
  await browser.electron.execute((electron) => {
    const win = electron.BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      }
      if (win.isMinimized()) {
        win.restore();
      }
      if (!win.isVisible()) {
        win.show();
      }
    }
  });

  await browser.pause(E2E_TIMING.QUICK_RESTORE);
}

/**
 * Closes the current window via Electron API.
 */
export async function closeWindow(): Promise<void> {
  E2ELogger.info('windowStateActions', 'Closing window via API');

  await browser.execute(() => {
    (window as any).electronAPI?.closeWindow?.();
  });
}

/**
 * Hides the current window (e.g., minimize to tray).
 */
export async function hideWindow(): Promise<void> {
  E2ELogger.info('windowStateActions', 'Hiding window via API');

  await browser.electron.execute((electron) => {
    const win = electron.BrowserWindow.getAllWindows()[0];
    if (win) {
      win.hide();
    }
  });

  await browser.pause(E2E_TIMING.QUICK_RESTORE);
}

/**
 * Shows the current window (e.g., restore from tray).
 */
export async function showWindow(): Promise<void> {
  E2ELogger.info('windowStateActions', 'Showing window via API');

  await browser.electron.execute((electron) => {
    const win = electron.BrowserWindow.getAllWindows()[0];
    if (win) {
      win.show();
      win.focus();
    }
  });

  await browser.pause(E2E_TIMING.QUICK_RESTORE);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Waits for window to reach a specific state.
 *
 * @param predicate - Function that returns true when desired state is reached
 * @param timeoutMs - Maximum wait time
 * @param pollIntervalMs - How often to check state
 */
export async function waitForWindowState(
  predicate: (state: WindowState) => boolean,
  timeoutMs = 5000,
  pollIntervalMs = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const state = await getWindowState();
    if (predicate(state)) {
      return;
    }
    await browser.pause(pollIntervalMs);
  }

  throw new Error(`Window did not reach expected state within ${timeoutMs}ms`);
}
