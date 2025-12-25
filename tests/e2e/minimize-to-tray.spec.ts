/**
 * E2E Test: Minimize-to-Tray Hotkey Workflow
 *
 * Tests the minimize-to-tray functionality via hotkey and API.
 * Since global hotkeys cannot be simulated via WebDriver, we test
 * the workflow via Electron API calls.
 *
 * Verifies:
 * 1. Hotkey action triggers minimize-to-tray (via API)
 * 2. Window is hidden to tray (not just minimized)
 * 3. Can restore from tray after hotkey minimize
 *
 * Cross-platform: Windows, macOS, Linux
 *
 * @module minimize-to-tray.spec
 */

import { browser, $, expect } from '@wdio/globals';
import { Selectors } from './helpers/selectors';
import { E2ELogger } from './helpers/logger';
import { isWindowVisible, isWindowMinimized } from './helpers/windowStateActions';
import { simulateTrayClick, verifyTrayCreated } from './helpers/trayActions';
import { isMacOS, isLinux } from './helpers/platform';

/**
 * Simulate the minimize-to-tray hotkey action via API.
 * This is equivalent to pressing Ctrl+Alt+E / Cmd+Alt+E.
 */
async function triggerMinimizeToTray(): Promise<void> {
  await browser.electron.execute(() => {
    const windowManager = (global as any).windowManager as
      | {
          hideToTray?: () => void;
        }
      | undefined;

    if (windowManager?.hideToTray) {
      windowManager.hideToTray();
    }
  });
}

/**
 * Check if window is hidden to tray (not visible and not minimized).
 */
async function isHiddenToTray(): Promise<boolean> {
  return browser.electron.execute((electron: typeof import('electron')) => {
    const windows = electron.BrowserWindow.getAllWindows();
    const mainWindow = windows[0];

    if (!mainWindow) return false;

    // Hidden to tray = not visible AND not minimized
    return !mainWindow.isVisible() && !mainWindow.isMinimized();
  });
}

/**
 * Check if skipTaskbar is set (Windows/Linux only).
 */
async function isSkipTaskbar(): Promise<boolean> {
  return browser.electron.execute((electron: typeof import('electron')) => {
    const windows = electron.BrowserWindow.getAllWindows();
    const mainWindow = windows[0];

    if (!mainWindow) return false;

    // This property is only meaningful on Windows/Linux
    return mainWindow.isSkipTaskbar?.() ?? false;
  });
}

/**
 * Check if running on Linux CI (headless Xvfb).
 */
async function isLinuxCI(): Promise<boolean> {
  if (!(await isLinux())) return false;

  return browser.electron.execute(() => {
    return !!(process.env.CI || process.env.GITHUB_ACTIONS);
  });
}

describe('Minimize-to-Tray Hotkey Workflow', () => {
  beforeEach(async () => {
    // Ensure app is loaded and window is visible
    const mainLayout = await $(Selectors.mainLayout);
    await mainLayout.waitForExist({ timeout: 15000 });

    // Make sure window is visible before each test
    const visible = await isWindowVisible();
    if (!visible) {
      await simulateTrayClick();
      await browser.pause(300);
    }
  });

  afterEach(async () => {
    // Restore window after each test
    const visible = await isWindowVisible();
    if (!visible) {
      await simulateTrayClick();
      await browser.pause(300);
    }
  });

  describe('Hotkey Action Triggers Hide-to-Tray', () => {
    it('should hide window to tray when minimize hotkey action is triggered', async () => {
      // Verify window is visible initially
      const initialVisible = await isWindowVisible();
      expect(initialVisible).toBe(true);

      // Trigger minimize-to-tray (simulates hotkey)
      await triggerMinimizeToTray();
      await browser.pause(500);

      // Window should be hidden
      const hiddenToTray = await isHiddenToTray();
      expect(hiddenToTray).toBe(true);

      E2ELogger.info('minimize-to-tray', 'Window hidden to tray via hotkey action');
    });

    it('should not be minimized to taskbar (hidden vs minimized)', async () => {
      // Trigger minimize-to-tray
      await triggerMinimizeToTray();
      await browser.pause(500);

      // Should NOT be minimized (minimized is different from hidden)
      const isMinimized = await isWindowMinimized();
      expect(isMinimized).toBe(false);

      // Should not be visible
      const isVisible = await isWindowVisible();
      expect(isVisible).toBe(false);

      E2ELogger.info('minimize-to-tray', 'Window is hidden, not minimized');
    });

    it('should skip taskbar on Windows/Linux when hidden to tray', async () => {
      // Skip on macOS (no taskbar concept)
      if (await isMacOS()) {
        E2ELogger.info('minimize-to-tray', 'Skipping taskbar test on macOS');
        return;
      }

      // Skip on Linux CI (Xvfb limitations)
      if (await isLinuxCI()) {
        E2ELogger.info('minimize-to-tray', 'Skipping taskbar test on Linux CI');
        return;
      }

      // Trigger minimize-to-tray
      await triggerMinimizeToTray();
      await browser.pause(500);

      // Should skip taskbar
      const skipTaskbar = await isSkipTaskbar();
      expect(skipTaskbar).toBe(true);

      E2ELogger.info('minimize-to-tray', 'Window is skipping taskbar');
    });
  });

  describe('Restore from Tray After Hotkey', () => {
    it('should restore window from tray after hotkey minimize', async () => {
      // 1. Hide to tray
      await triggerMinimizeToTray();
      await browser.pause(500);

      // Verify hidden
      const hiddenAfterMinimize = await isHiddenToTray();
      expect(hiddenAfterMinimize).toBe(true);

      // 2. Click tray to restore
      await simulateTrayClick();
      await browser.pause(500);

      // 3. Window should be visible again
      const visibleAfterRestore = await isWindowVisible();
      expect(visibleAfterRestore).toBe(true);

      E2ELogger.info('minimize-to-tray', 'Window restored from tray after hotkey minimize');
    });

    it('should restore taskbar visibility on Windows/Linux', async () => {
      // Skip on macOS
      if (await isMacOS()) {
        return;
      }

      // Skip on Linux CI
      if (await isLinuxCI()) {
        return;
      }

      // 1. Hide to tray
      await triggerMinimizeToTray();
      await browser.pause(500);

      // 2. Restore
      await simulateTrayClick();
      await browser.pause(500);

      // 3. Should NOT skip taskbar anymore
      const skipTaskbar = await isSkipTaskbar();
      expect(skipTaskbar).toBe(false);

      E2ELogger.info('minimize-to-tray', 'Taskbar visibility restored after restore');
    });
  });

  describe('Tray Icon Persists', () => {
    it('should keep tray icon visible after hiding to tray', async () => {
      // Hide to tray
      await triggerMinimizeToTray();
      await browser.pause(500);

      // Tray should still exist
      const trayExists = await verifyTrayCreated();
      expect(trayExists).toBe(true);

      E2ELogger.info('minimize-to-tray', 'Tray icon persists when window is hidden');
    });
  });

  describe('Multiple Hotkey Cycles', () => {
    it('should handle multiple hide/restore cycles via hotkey', async () => {
      // Cycle 1
      await triggerMinimizeToTray();
      await browser.pause(300);
      let hidden = await isHiddenToTray();
      expect(hidden).toBe(true);

      await simulateTrayClick();
      await browser.pause(300);
      let visible = await isWindowVisible();
      expect(visible).toBe(true);

      // Cycle 2
      await triggerMinimizeToTray();
      await browser.pause(300);
      hidden = await isHiddenToTray();
      expect(hidden).toBe(true);

      await simulateTrayClick();
      await browser.pause(300);
      visible = await isWindowVisible();
      expect(visible).toBe(true);

      E2ELogger.info('minimize-to-tray', 'Multiple hide/restore cycles successful');
    });
  });
});
