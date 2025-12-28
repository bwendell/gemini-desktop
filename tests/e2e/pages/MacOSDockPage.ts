/**
 * macOS Dock Page Object.
 *
 * Encapsulates all macOS-specific Dock and window behavior testing.
 * Provides methods to interact with Dock icon, simulate activate events,
 * and query Dock menu state.
 *
 * Platform-specific: macOS only
 *
 * @module MacOSDockPage
 */

/// <reference path="../helpers/wdio-electron.d.ts" />

import { browser } from '@wdio/globals';
import { BasePage } from './BasePage';

/**
 * Dock menu item representation.
 */
export interface DockMenuItem {
  label: string;
  type: string;
}

/**
 * State of the Dock menu.
 */
export interface DockMenuState {
  exists: boolean;
  items: DockMenuItem[];
}

/**
 * Page Object for macOS Dock behavior.
 * Provides methods to interact with and verify Dock-specific functionality.
 */
export class MacOSDockPage extends BasePage {
  constructor() {
    super('MacOSDockPage');
  }

  // ===========================================================================
  // PLATFORM CHECKS
  // ===========================================================================

  /**
   * Check if the current platform is macOS.
   * @returns True if running on macOS
   */
  async isMacOS(): Promise<boolean> {
    return browser.electron.execute(() => process.platform === 'darwin');
  }

  /**
   * Get the current platform identifier.
   * @returns Platform string (e.g., 'darwin', 'win32', 'linux')
   */
  async getPlatform(): Promise<string> {
    return browser.electron.execute(() => process.platform);
  }

  // ===========================================================================
  // DOCK ICON ACTIONS
  // ===========================================================================

  /**
   * Simulate the 'activate' event that macOS sends when Dock icon is clicked.
   * This is a macOS-specific Electron event with no UI equivalent.
   *
   * The activate event is fired when:
   * - User clicks the Dock icon
   * - App is activated via Spotlight, etc.
   * - User switches to the app
   */
  async simulateActivateEvent(): Promise<void> {
    this.log('Simulating Dock activate event');
    await browser.electron.execute((electron: typeof import('electron')) => {
      electron.app.emit('activate');
    });
  }

  /**
   * Check if the app would quit when all windows are closed.
   * On macOS, apps traditionally stay running even with no windows.
   *
   * @returns True if app would quit on all windows closed (non-macOS behavior)
   */
  async wouldQuitOnAllWindowsClosed(): Promise<boolean> {
    return browser.electron.execute((_electron: typeof import('electron')) => {
      // On macOS, app should NOT quit when all windows closed
      return process.platform !== 'darwin';
    });
  }

  // ===========================================================================
  // DOCK MENU QUERIES
  // ===========================================================================

  /**
   * Get the current state of the Dock menu.
   * @returns DockMenuState with menu existence and items
   */
  async getDockMenuState(): Promise<DockMenuState> {
    this.log('Getting Dock menu state');
    return browser.electron.execute((electron) => {
      const menu = electron.app.dock?.getMenu();
      if (!menu) {
        return { exists: false, items: [] };
      }

      return {
        exists: true,
        items: menu.items.map((item) => ({
          label: item.label,
          type: item.type,
        })),
      };
    });
  }

  /**
   * Get the labels of all Dock menu items.
   * @returns Array of menu item labels
   */
  async getDockMenuLabels(): Promise<string[]> {
    const state = await this.getDockMenuState();
    return state.items.map((item) => item.label);
  }

  /**
   * Check if a specific item exists in the Dock menu.
   * @param label - The menu item label to check for
   * @returns True if the item exists
   */
  async hasDockMenuItem(label: string): Promise<boolean> {
    const labels = await this.getDockMenuLabels();
    return labels.includes(label);
  }

  /**
   * Check if the Dock menu exists.
   * @returns True if Dock menu is configured
   */
  async hasDockMenu(): Promise<boolean> {
    const state = await this.getDockMenuState();
    return state.exists;
  }

  // ===========================================================================
  // WINDOW CONVENTION CHECKS
  // ===========================================================================

  /**
   * Check if custom window controls (non-native) are displayed.
   * On macOS, the main window should use native traffic light controls,
   * so custom window controls should NOT be present.
   *
   * @param selector - Optional custom selector for window controls (default: '.window-controls')
   * @returns True if custom window controls are displayed
   */
  async hasCustomWindowControls(selector = '.window-controls'): Promise<boolean> {
    return this.isElementDisplayed(selector);
  }

  /**
   * Verify that the app follows macOS window conventions.
   * This means custom window controls should NOT be present.
   *
   * @returns Object with convention compliance info
   */
  async verifyMacOSWindowConventions(): Promise<{
    usesNativeControls: boolean;
    hasCustomControls: boolean;
  }> {
    const hasCustomControls = await this.hasCustomWindowControls();
    return {
      usesNativeControls: !hasCustomControls,
      hasCustomControls,
    };
  }

  // ===========================================================================
  // DOCK VISIBILITY (Future extensibility)
  // ===========================================================================

  /**
   * Check if the Dock icon is visible (bouncing/visible).
   * Note: This checks the dock visibility setting, not actual visibility.
   *
   * @returns True if Dock icon is set to be visible
   */
  async isDockIconVisible(): Promise<boolean> {
    return browser.electron.execute((electron) => {
      // isVisible() returns whether the Dock icon is visible
      return electron.app.dock?.isVisible() ?? false;
    });
  }

  /**
   * Get the Dock badge text (if any).
   * @returns The badge text or empty string
   */
  async getDockBadge(): Promise<string> {
    return browser.electron.execute((electron) => {
      return electron.app.dock?.getBadge() ?? '';
    });
  }

  /**
   * Set the Dock badge text.
   * @param text - Badge text to display
   */
  async setDockBadge(text: string): Promise<void> {
    this.log(`Setting Dock badge: "${text}"`);
    await browser.electron.execute((electron, badgeText: string) => {
      electron.app.dock?.setBadge(badgeText);
    }, text);
  }

  /**
   * Clear the Dock badge.
   */
  async clearDockBadge(): Promise<void> {
    await this.setDockBadge('');
  }

  /**
   * Bounce the Dock icon.
   * @param type - 'critical' for continuous bouncing, 'informational' for single bounce
   * @returns The bounce request ID (can be used to cancel)
   */
  async bounceDockIcon(type: 'critical' | 'informational' = 'informational'): Promise<number> {
    this.log(`Bouncing Dock icon: ${type}`);
    return browser.electron.execute((electron, bounceType: string) => {
      return electron.app.dock?.bounce(bounceType as 'critical' | 'informational') ?? -1;
    }, type);
  }

  /**
   * Cancel a dock icon bounce.
   * @param id - The bounce request ID from bounceDockIcon
   */
  async cancelBounce(id: number): Promise<void> {
    this.log(`Cancelling Dock bounce: ${id}`);
    await browser.electron.execute((electron, bounceId: number) => {
      electron.app.dock?.cancelBounce(bounceId);
    }, id);
  }
}
