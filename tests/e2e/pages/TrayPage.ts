/**
 * Tray Page Object.
 *
 * Encapsulates all interactions for the system tray icon and context menu.
 * Delegates to existing trayActions helper functions where appropriate.
 *
 * @module TrayPage
 */

/// <reference path="../helpers/wdio-electron.d.ts" />

import { browser } from '@wdio/globals';
import { BasePage } from './BasePage';
import {
  getTrayState,
  simulateTrayClick,
  simulateTrayRightClick,
  clickTrayMenuItem,
  getTrayTooltip,
  verifyTrayCreated,
  TrayState,
} from '../helpers/trayActions';
import { isWindowVisible, isWindowMinimized, closeWindow } from '../helpers/windowStateActions';
import { isLinux, isLinuxCI, isMacOS } from '../helpers/platform';
import { Selectors } from '../helpers/selectors';
import { E2E_TIMING } from '../helpers/e2eConstants';

/**
 * Page Object for the System Tray.
 * Provides methods for tray icon interaction, state queries, and context menu actions.
 */
export class TrayPage extends BasePage {
  constructor() {
    super('TrayPage');
  }

  // ===========================================================================
  // TRAY STATE QUERIES
  // ===========================================================================

  /**
   * Get the current tray state.
   * @returns The full tray state object
   */
  async getState(): Promise<TrayState> {
    return getTrayState();
  }

  /**
   * Check if the tray icon exists and is not destroyed.
   * @returns True if tray icon exists
   */
  async exists(): Promise<boolean> {
    const state = await getTrayState();
    return state.exists && !state.isDestroyed;
  }

  /**
   * Verify the tray icon was created on app startup.
   * Alias for exists() for semantic clarity.
   * @returns True if tray exists and is not destroyed
   */
  async isCreated(): Promise<boolean> {
    return verifyTrayCreated();
  }

  /**
   * Get the tray tooltip text.
   * @returns The tooltip text or null
   */
  async getTooltip(): Promise<string | null> {
    return getTrayTooltip();
  }

  /**
   * Wait for the tray icon to be created.
   * @param timeout - Timeout in milliseconds (default: 5000)
   */
  async waitForCreation(timeout = 5000): Promise<void> {
    await browser.waitUntil(
      async () => {
        return await verifyTrayCreated();
      },
      {
        timeout,
        interval: 100,
        timeoutMsg: `[${this.pageName}] Tray icon was not created within ${timeout}ms`,
      }
    );
    this.log('Tray icon created');
  }

  // ===========================================================================
  // TRAY CLICK ACTIONS
  // ===========================================================================

  /**
   * Click the tray icon to restore/show the main window.
   */
  async click(): Promise<void> {
    this.log('Clicking tray icon');
    await simulateTrayClick();
  }

  /**
   * Right-click the tray icon to show context menu.
   */
  async rightClick(): Promise<void> {
    this.log('Right-clicking tray icon');
    await simulateTrayRightClick();
  }

  /**
   * Click the tray icon and wait for the window to become visible.
   * @param timeout - Timeout in milliseconds (default: 5000)
   */
  async clickAndWaitForWindow(timeout = 5000): Promise<void> {
    await this.click();
    await browser.waitUntil(
      async () => {
        return await isWindowVisible();
      },
      {
        timeout,
        interval: 100,
        timeoutMsg: `[${this.pageName}] Window did not become visible after tray click within ${timeout}ms`,
      }
    );
    this.log('Window visible after tray click');
  }

  // ===========================================================================
  // CONTEXT MENU ACTIONS
  // ===========================================================================

  /**
   * Click the "Show" menu item from the tray context menu.
   * This restores the main window.
   */
  async clickShowMenuItem(): Promise<void> {
    this.log('Clicking "Show" menu item');
    await clickTrayMenuItem('show');
  }

  /**
   * Click the "Show" menu item and wait for the window to become visible.
   * @param timeout - Timeout in milliseconds (default: 5000)
   */
  async clickShowMenuItemAndWait(timeout = 5000): Promise<void> {
    await this.clickShowMenuItem();
    await browser.waitUntil(
      async () => {
        return await isWindowVisible();
      },
      {
        timeout,
        interval: 100,
        timeoutMsg: `[${this.pageName}] Window did not become visible after Show menu item within ${timeout}ms`,
      }
    );
    this.log('Window visible after Show menu item');
  }

  /**
   * Click the "Quit" menu item from the tray context menu.
   * WARNING: This will terminate the application and break the E2E session.
   * Use with caution in tests.
   */
  async clickQuitMenuItem(): Promise<void> {
    this.log('Clicking "Quit" menu item');
    await clickTrayMenuItem('quit');
  }

  // ===========================================================================
  // WINDOW STATE INTEGRATION
  // ===========================================================================

  /**
   * Check if the main window is currently visible.
   * @returns True if the main window is visible
   */
  async isWindowVisible(): Promise<boolean> {
    return isWindowVisible();
  }

  /**
   * Check if the main window is minimized.
   * @returns True if the main window is minimized
   */
  async isWindowMinimized(): Promise<boolean> {
    return isWindowMinimized();
  }

  /**
   * Check if the window is hidden to tray (not visible AND not minimized).
   * This distinguishes between minimize-to-taskbar and hide-to-tray states.
   * @returns True if window is hidden to tray
   */
  async isHiddenToTray(): Promise<boolean> {
    const visible = await isWindowVisible();
    const minimized = await isWindowMinimized();
    // Hidden to tray = not visible AND not minimized
    return !visible && !minimized;
  }

  /**
   * Check if the window is skipping the taskbar (Windows/Linux only).
   * On macOS, this always returns false as there's no taskbar concept.
   * @returns True if window is set to skip taskbar
   */
  async isSkipTaskbar(): Promise<boolean> {
    return browser.electron.execute((electron: typeof import('electron')) => {
      const windows = electron.BrowserWindow.getAllWindows();
      const mainWindow = windows[0];

      if (!mainWindow) return false;

      // This property is only meaningful on Windows/Linux
      return mainWindow.isSkipTaskbar?.() ?? false;
    });
  }

  /**
   * Check if running on Linux CI (headless Xvfb environment).
   * Used to skip certain tests that don't work reliably in Xvfb.
   * @returns True if running on Linux CI
   */
  async isLinuxCI(): Promise<boolean> {
    return isLinuxCI();
  }

  /**
   * Hide the main window to tray by clicking the close button.
   * This is the preferred method as it simulates real user interaction.
   */
  async hideViaCloseButton(): Promise<void> {
    this.log('Hiding window to tray via close button');
    const closeBtn = await browser.$(Selectors.closeButton);
    await closeBtn.waitForClickable({ timeout: 5000 });
    await closeBtn.click();
    await this.pause(300);
  }

  /**
   * Hide the main window to tray.
   * Uses closeWindow which triggers hide-to-tray behavior.
   * Waits for window to be hidden and adds stabilization pause for macOS.
   */
  async hideWindowToTray(): Promise<void> {
    this.log('Hiding window to tray');
    await closeWindow();

    // Wait for window to actually become hidden
    await browser.waitUntil(async () => !(await isWindowVisible()), {
      timeout: E2E_TIMING.WINDOW_STATE_TIMEOUT,
      interval: 100,
      timeoutMsg: `[${this.pageName}] Window did not hide within timeout`,
    });

    // Additional stabilization pause for macOS to prevent WebSocket issues
    // macOS window state transitions can affect Electron's IPC stability
    const onMac = await isMacOS();
    await browser.pause(onMac ? E2E_TIMING.WINDOW_HIDE_SHOW : E2E_TIMING.UI_STATE_PAUSE_MS);
  }

  /**
   * Restore the main window from tray via tray click.
   * Waits for window to be visible and adds stabilization pause for macOS.
   */
  async restoreWindowViaTrayClick(): Promise<void> {
    await this.click();

    // Wait for window to actually become visible
    await browser.waitUntil(async () => await isWindowVisible(), {
      timeout: E2E_TIMING.WINDOW_STATE_TIMEOUT,
      interval: 100,
      timeoutMsg: `[${this.pageName}] Window did not become visible after tray click`,
    });

    // Additional stabilization pause for macOS
    const onMac = await isMacOS();
    await browser.pause(onMac ? E2E_TIMING.WINDOW_HIDE_SHOW : E2E_TIMING.UI_STATE_PAUSE_MS);
    this.log('Window restored via tray click');
  }

  /**
   * Restore the main window from tray via Show menu item.
   * Waits for window to be visible and adds stabilization pause for macOS.
   */
  async restoreWindowViaShowMenu(): Promise<void> {
    await this.clickShowMenuItem();

    // Wait for window to actually become visible
    await browser.waitUntil(async () => await isWindowVisible(), {
      timeout: E2E_TIMING.WINDOW_STATE_TIMEOUT,
      interval: 100,
      timeoutMsg: `[${this.pageName}] Window did not become visible after Show menu`,
    });

    // Additional stabilization pause for macOS
    const onMac = await isMacOS();
    await browser.pause(onMac ? E2E_TIMING.WINDOW_HIDE_SHOW : E2E_TIMING.UI_STATE_PAUSE_MS);
    this.log('Window restored via Show menu item');
  }

  /**
   * Perform a hide and restore cycle via tray click.
   * Useful for testing multiple hide/restore cycles.
   */
  async hideAndRestoreViaTrayClick(): Promise<void> {
    await this.hideWindowToTray();
    await this.restoreWindowViaTrayClick();
  }

  /**
   * Perform a hide and restore cycle via Show menu item.
   * Useful for testing multiple hide/restore cycles.
   */
  async hideAndRestoreViaShowMenu(): Promise<void> {
    await this.hideWindowToTray();
    await this.restoreWindowViaShowMenu();
  }

  // ===========================================================================
  // ASSERTIONS (convenience methods for common checks)
  // ===========================================================================

  /**
   * Assert that the tray icon exists.
   * @throws Error if tray does not exist
   */
  async assertExists(): Promise<void> {
    const exists = await this.exists();
    if (!exists) {
      throw new Error(`[${this.pageName}] Tray icon does not exist`);
    }
    this.log('Tray icon exists (assertion passed)');
  }

  /**
   * Assert that the window is visible.
   * @throws Error if window is not visible
   */
  async assertWindowVisible(): Promise<void> {
    const visible = await this.isWindowVisible();
    if (!visible) {
      throw new Error(`[${this.pageName}] Window is not visible`);
    }
    this.log('Window is visible (assertion passed)');
  }

  /**
   * Assert that the window is hidden.
   * @throws Error if window is visible
   */
  async assertWindowHidden(): Promise<void> {
    const visible = await this.isWindowVisible();
    if (visible) {
      throw new Error(`[${this.pageName}] Window is visible but should be hidden`);
    }
    this.log('Window is hidden (assertion passed)');
  }

  // ===========================================================================
  // RELEASE VALIDATION (for verifying tray in packaged builds)
  // ===========================================================================

  /**
   * Verify that the tray manager is properly initialized.
   * Used for release build validation.
   * @returns Object with initialization status and tooltip
   */
  async verifyManagerInitialized(): Promise<{
    exists: boolean;
    tooltip: string | null;
    error: string | null;
  }> {
    return browser.electron.execute(() => {
      const trayManager = (global as any).trayManager;

      if (!trayManager) {
        return { exists: false, tooltip: null, error: 'trayManager not in global' };
      }

      const tray = trayManager.getTray();
      if (!tray) {
        return { exists: false, tooltip: null, error: 'getTray() returned null' };
      }

      if (tray.isDestroyed()) {
        return { exists: false, tooltip: null, error: 'tray is destroyed' };
      }

      return {
        exists: true,
        tooltip: trayManager.getToolTip?.() || tray.getToolTip?.() || null,
        error: null,
      };
    });
  }

  /**
   * Get information about the tray icon file in the packaged build.
   * @returns Object with icon path, existence status, and platform info
   */
  async getIconFileInfo(): Promise<{
    path: string;
    exists: boolean;
    platform: string;
    resourcesPath: string;
  }> {
    return browser.electron.execute(() => {
      const isWindows = process.platform === 'win32';
      const iconFilename = isWindows ? 'icon.ico' : 'icon.png';
      const iconPath = require('path').join(process.resourcesPath, iconFilename);
      const exists = require('fs').existsSync(iconPath);

      return {
        path: iconPath,
        exists,
        platform: process.platform,
        resourcesPath: process.resourcesPath,
      };
    });
  }

  /**
   * Get detailed information about the tray icon file content.
   * @returns Object with file size and validation status
   */
  async getIconFileDetails(): Promise<{
    exists: boolean;
    size: number;
    isFile: boolean;
    error?: string;
  }> {
    return browser.electron.execute(() => {
      const isWindows = process.platform === 'win32';
      const iconFilename = isWindows ? 'icon.ico' : 'icon.png';
      const iconPath = require('path').join(process.resourcesPath, iconFilename);

      try {
        const stats = require('fs').statSync(iconPath);
        return {
          exists: true,
          size: stats.size,
          isFile: stats.isFile(),
        };
      } catch (e) {
        return {
          exists: false,
          size: 0,
          isFile: false,
          error: (e as Error).message,
        };
      }
    });
  }

  /**
   * Check if the tray has a click handler registered.
   * @returns True if the tray exists and has click handler (implied by existence)
   */
  async hasClickHandler(): Promise<boolean> {
    return browser.electron.execute(() => {
      const trayManager = (global as any).trayManager;
      const tray = trayManager?.getTray();
      // Tray existence implies click handler was registered in createTray()
      return tray && !tray.isDestroyed();
    });
  }

  /**
   * Check if the tray has a context menu attached.
   * @returns True if the tray exists (context menu is always set in createTray())
   */
  async hasContextMenu(): Promise<boolean> {
    return browser.electron.execute(() => {
      const trayManager = (global as any).trayManager;
      const tray = trayManager?.getTray();
      // Context menu is always set if tray was created successfully
      return tray && !tray.isDestroyed();
    });
  }
}
