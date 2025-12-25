/**
 * E2E Test: Window Controls Functionality
 *
 * Tests that window control buttons (minimize, maximize, close) actually
 * change window state, not just that they exist.
 *
 * ## Platform Behavior
 * - **Windows/Linux**: Tests custom HTML button clicks
 * - **macOS**: Tests keyboard shortcuts + API verification (native controls can't be clicked)
 *
 * @module window-controls.spec
 */

import { browser, $, expect } from '@wdio/globals';
import { usesCustomControls, isMacOS, isLinux } from './helpers/platform';
import { Selectors } from './helpers/selectors';
import { E2ELogger } from './helpers/logger';
import { E2E_TIMING } from './helpers/e2eConstants';
import {
  isWindowMaximized,
  isWindowMinimized,
  isWindowVisible,
  isWindowDestroyed,
  getWindowState,
  maximizeWindow,
  restoreWindow,
  closeWindow,
} from './helpers/windowStateActions';

/**
 * Detects if running on Linux in CI (headless Xvfb).
 * Window manager operations don't work reliably in this environment.
 */
async function isLinuxCI(): Promise<boolean> {
  if (!(await isLinux())) return false;

  // Check for common CI environment variables
  const isCIEnv = await browser.electron.execute(() => {
    return !!(process.env.CI || process.env.GITHUB_ACTIONS);
  });

  return isCIEnv;
}

describe('Window Controls Functionality', () => {
  beforeEach(async () => {
    // Ensure we start from a consistent state
    const mainLayout = await $(Selectors.mainLayout);
    await mainLayout.waitForExist({ timeout: 15000 });
  });

  // =========================================================================
  // Windows/Linux: Custom Button Tests
  // =========================================================================

  describe('Custom Window Controls (Windows/Linux)', () => {
    it('should maximize window when maximize button is clicked', async () => {
      if (!(await usesCustomControls())) {
        E2ELogger.info('window-controls', 'Skipping - macOS uses native controls');
        return;
      }

      // Skip on Linux CI - Xvfb doesn't have a real window manager
      if (await isLinuxCI()) {
        E2ELogger.info(
          'window-controls',
          'Skipping - Linux CI uses headless Xvfb without window manager'
        );
        return;
      }

      // 1. Verify not maximized initially (or restore if it is)
      const initialState = await isWindowMaximized();
      if (initialState) {
        await restoreWindow();
        await browser.pause(E2E_TIMING.QUICK_RESTORE);
      }

      // 2. Click maximize button
      const maximizeBtn = await $(Selectors.maximizeButton);
      await maximizeBtn.waitForClickable({ timeout: 5000 });
      await maximizeBtn.click();
      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

      // 3. Verify window is now maximized
      const isMaximized = await isWindowMaximized();
      expect(isMaximized).toBe(true);

      E2ELogger.info('window-controls', 'Maximize button click verified');
    });

    it('should restore window when maximize button is clicked again', async () => {
      if (!(await usesCustomControls())) {
        return;
      }

      // 1. Ensure window is maximized first
      const initialState = await isWindowMaximized();
      if (!initialState) {
        await maximizeWindow();
        await browser.pause(E2E_TIMING.QUICK_RESTORE);
      }

      // 2. Click maximize button again to restore
      const maximizeBtn = await $(Selectors.maximizeButton);
      await maximizeBtn.click();
      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

      // 3. Verify window is restored (not maximized)
      const isMaximized = await isWindowMaximized();
      expect(isMaximized).toBe(false);

      E2ELogger.info('window-controls', 'Restore via maximize button verified');
    });

    it('should minimize window to taskbar when minimize button is clicked', async () => {
      if (!(await usesCustomControls())) {
        return;
      }

      // Skip on Linux CI
      if (await isLinuxCI()) {
        E2ELogger.info(
          'window-controls',
          'Skipping - Linux CI uses headless Xvfb without window manager'
        );
        return;
      }

      // 1. Click minimize button
      const minimizeBtn = await $(Selectors.minimizeButton);
      await minimizeBtn.waitForClickable({ timeout: 5000 });
      await minimizeBtn.click();
      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

      // 2. Verify window is minimized (Standard behavior)
      const isMinimized = await isWindowMinimized();
      expect(isMinimized).toBe(true);

      // 3. Restore window for subsequent tests
      await restoreWindow();

      E2ELogger.info('window-controls', 'Minimize button click verified');
    });

    it('should hide window to tray when close button is clicked', async () => {
      if (!(await usesCustomControls())) {
        return;
      }

      // 1. Click close button
      const closeBtn = await $(Selectors.closeButton);
      await closeBtn.waitForClickable({ timeout: 5000 });
      await closeBtn.click();
      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

      // 2. Verify window behavior:
      // - Not destroyed (app still running)
      // - Not visible (hidden to tray)
      // - Not minimized (just hidden)

      // Use helpers that use browser.electron.execute (Main Process)
      await expect(isWindowDestroyed()).resolves.toBe(false);
      await expect(isWindowVisible()).resolves.toBe(false);
      await expect(isWindowMinimized()).resolves.toBe(false);

      // 3. Restore window via windowManager (simulating tray click)
      await restoreWindow();
      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);
      await expect(isWindowVisible()).resolves.toBe(true);

      E2ELogger.info('window-controls', 'Close-to-tray verified');
    });
  });

  // =========================================================================
  // macOS: Keyboard Shortcut Tests
  // =========================================================================

  describe('Native Window Controls via Keyboard (macOS)', () => {
    it('should verify window state API works on macOS', async () => {
      if (!(await isMacOS())) {
        E2ELogger.info('window-controls', 'Skipping macOS-specific test');
        return;
      }

      // Just verify we can read window state on macOS
      const state = await getWindowState();

      expect(typeof state.isMaximized).toBe('boolean');
      expect(typeof state.isMinimized).toBe('boolean');
      expect(typeof state.isFullScreen).toBe('boolean');

      E2ELogger.info('window-controls', `macOS window state: ${JSON.stringify(state)}`);
    });

    it.skip('should minimize window via keyboard shortcut on macOS', async () => {
      // SKIPPED: This test cannot work in E2E environments on macOS.
      //
      // REASON: Keyboard shortcuts like Cmd+M are handled at the OS level
      // on macOS. WebDriver's browser.keys() sends synthetic events to web
      // content, NOT to the operating system's window management system.
      //
      // ALTERNATIVE: The shortcut registration and callback logic are tested
      // in unit tests (hotkeyManager.test.ts), which is sufficient for
      // verifying this functionality works correctly.
      //
      // CONTEXT: This is a known limitation of E2E testing with WebDriver
      // and applies to all OS-level global keyboard shortcuts.
    });

    it('should hide window to tray when close is triggered on macOS', async () => {
      if (!(await isMacOS())) {
        return;
      }

      // Use the close API instead of Cmd+W keyboard shortcut
      // WebDriver sends keyboard events to web content, NOT to the OS,
      // so Cmd+W won't actually trigger the window close on macOS.
      await closeWindow();
      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

      // Log state for debugging
      const stateAfterClose = await getWindowState();
      E2ELogger.info(
        'window-controls',
        `macOS state after close: ${JSON.stringify(stateAfterClose)}`
      );

      // Verify close-to-tray behavior on macOS:
      // - Not destroyed (app still running)
      // - Not visible (hidden/minimized to Dock)
      await expect(isWindowDestroyed()).resolves.toBe(false);
      await expect(isWindowVisible()).resolves.toBe(false);

      // Restore window
      await restoreWindow();
      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);
      await expect(isWindowVisible()).resolves.toBe(true);

      E2ELogger.info('window-controls', 'macOS close-to-tray verified');
    });
  });

  // =========================================================================
  // Cross-Platform: API-Based Tests
  // =========================================================================

  describe('Window State via API (All Platforms)', () => {
    it('should correctly report window state', async () => {
      const state = await getWindowState();

      // State should be an object with expected properties
      expect(state).toHaveProperty('isMaximized');
      expect(state).toHaveProperty('isMinimized');
      expect(state).toHaveProperty('isFullScreen');

      E2ELogger.info('window-controls', `Cross-platform state check: ${JSON.stringify(state)}`);
    });

    it('should maximize and restore via API calls', async () => {
      // Skip on macOS - maximize() doesn't work reliably
      if (await isMacOS()) {
        E2ELogger.info(
          'window-controls',
          'Skipping maximize test - macOS uses zoom/fullscreen instead of traditional maximize'
        );
        return;
      }

      // Skip on Linux CI - Xvfb doesn't support window manager operations
      if (await isLinuxCI()) {
        E2ELogger.info('window-controls', 'Skipping - Linux CI uses headless Xvfb');
        return;
      }

      // 2. Maximize via API
      await maximizeWindow();
      const afterMaximize = await isWindowMaximized();
      expect(afterMaximize).toBe(true);

      // 3. Restore via API
      await restoreWindow();
      const afterRestore = await isWindowMaximized();
      expect(afterRestore).toBe(false);

      E2ELogger.info('window-controls', 'API-based maximize/restore verified');
    });
  });
});
