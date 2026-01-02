/**
 * Auth Window Page Object.
 *
 * Encapsulates all selectors and interactions for the OAuth authentication window.
 * Handles Google Sign-in flows and session management.
 *
 * @module AuthWindowPage
 */

/// <reference path="../helpers/wdio-electron.d.ts" />

import { browser } from '@wdio/globals';
import { BasePage } from './BasePage';
import { clickMenuItemById } from '../helpers/menuActions';
import { waitForWindowCount } from '../helpers/windowActions';
import { E2E_TIMING } from '../helpers/e2eConstants';

/**
 * Page Object for the OAuth Authentication Window.
 * Provides methods to interact with Google Sign-in and manage auth session.
 */
export class AuthWindowPage extends BasePage {
  /** Cached main window handle for switching back */
  private mainWindowHandle: string | null = null;

  constructor() {
    super('AuthWindowPage');
  }

  // ===========================================================================
  // WINDOW MANAGEMENT
  // ===========================================================================

  /**
   * Open the auth window via the "Sign in to Google" menu item.
   */
  async openViaMenu(): Promise<void> {
    this.log('Opening auth window via menu');
    // Cache the main window handle before opening auth
    const handles = await browser.getWindowHandles();
    this.mainWindowHandle = handles[0];
    await clickMenuItemById('menu-file-signin');
  }

  /**
   * Wait for the auth window to open (expect 2 windows).
   * @param timeout - Timeout in milliseconds (default: 5000)
   */
  async waitForOpen(timeout = 5000): Promise<void> {
    this.log('Waiting for auth window to open');
    await waitForWindowCount(2, timeout);
  }

  /**
   * Switch browser context to the auth window.
   * @returns The auth window handle
   */
  async switchTo(): Promise<string> {
    const handles = await browser.getWindowHandles();
    const authHandle = handles.find((h) => h !== this.mainWindowHandle);

    if (!authHandle) {
      throw new Error('Auth window handle not found');
    }

    await browser.switchToWindow(authHandle);
    this.log('Switched to auth window');
    return authHandle;
  }

  /**
   * Close the auth window and switch back to main window.
   */
  async close(): Promise<void> {
    this.log('Closing auth window');
    await browser.closeWindow();
    await waitForWindowCount(1, 3000);

    if (this.mainWindowHandle) {
      await browser.switchToWindow(this.mainWindowHandle);
    } else {
      // Fallback: switch to first available window
      const handles = await browser.getWindowHandles();
      if (handles.length > 0) {
        await browser.switchToWindow(handles[0]);
      }
    }
    this.log('Returned to main window');
  }

  /**
   * Check if the auth window is currently open.
   */
  async isOpen(): Promise<boolean> {
    const handles = await browser.getWindowHandles();
    return handles.length > 1;
  }

  /**
   * Get the auth window handle.
   * @returns The auth window handle or null if not found
   */
  async getHandle(): Promise<string | null> {
    const handles = await browser.getWindowHandles();
    return handles.find((h) => h !== this.mainWindowHandle) ?? null;
  }

  // ===========================================================================
  // URL/NAVIGATION
  // ===========================================================================

  /**
   * Get the current URL in the auth window.
   */
  async getUrl(): Promise<string> {
    return browser.getUrl();
  }

  /**
   * Navigate to a URL in the auth window.
   * @param url - URL to navigate to
   */
  async navigateTo(url: string): Promise<void> {
    this.log(`Navigating to: ${url}`);
    await browser.url(url);
    await this.pause(E2E_TIMING.UI_STATE_PAUSE_MS);
  }

  /**
   * Check if the current URL is on accounts.google.com.
   * Uses proper URL parsing to prevent substring bypass attacks.
   */
  async isOnGoogleAccounts(): Promise<boolean> {
    const url = await this.getUrl();
    try {
      const hostname = new URL(url).hostname;
      return hostname === 'accounts.google.com' || hostname.endsWith('.accounts.google.com');
    } catch {
      return false;
    }
  }

  /**
   * Simulate successful login by navigating to Gemini URL.
   * This triggers the auth window auto-close behavior.
   */
  async simulateSuccessfulLogin(): Promise<void> {
    this.log('Simulating successful login (navigating to Gemini)');
    await this.navigateTo('https://gemini.google.com/app');
  }

  /**
   * Wait for the auth window to auto-close after successful login.
   * @param timeout - Timeout in milliseconds (default: 5000)
   */
  async waitForAutoClose(timeout = 5000): Promise<void> {
    this.log('Waiting for auth window to auto-close');
    await waitForWindowCount(1, timeout);

    // Switch back to main window
    if (this.mainWindowHandle) {
      await browser.switchToWindow(this.mainWindowHandle);
    }
  }

  // ===========================================================================
  // COOKIE/SESSION
  // ===========================================================================

  /**
   * Set a cookie in the auth window session.
   * @param name - Cookie name
   * @param value - Cookie value
   * @param domain - Cookie domain (default: '.google.com')
   */
  async setCookie(name: string, value: string, domain = '.google.com'): Promise<void> {
    this.log(`Setting cookie: ${name}`);
    await browser.setCookies([
      {
        name,
        value,
        domain,
        path: '/',
        secure: true,
        httpOnly: false,
      },
    ]);
  }

  /**
   * Get a cookie from the auth window session.
   * @param name - Cookie name
   * @returns Cookie object or undefined if not found
   */
  async getCookie(name: string): Promise<{ name: string; value: string } | undefined> {
    const cookies = await browser.getCookies([name]);
    return cookies.find((c: { name: string }) => c.name === name);
  }

  // ===========================================================================
  // COMBINED WORKFLOWS
  // ===========================================================================

  /**
   * Open auth window and switch to it.
   * Combines openViaMenu, waitForOpen, and switchTo.
   */
  async openAndSwitchTo(): Promise<void> {
    await this.openViaMenu();
    await this.waitForOpen();
    await this.switchTo();
  }

  /**
   * Switch to main window.
   */
  async switchToMainWindow(): Promise<void> {
    if (this.mainWindowHandle) {
      await browser.switchToWindow(this.mainWindowHandle);
      this.log('Switched to main window');
    } else {
      const handles = await browser.getWindowHandles();
      if (handles.length > 0) {
        await browser.switchToWindow(handles[0]);
        this.log('Switched to first window (assumed main)');
      }
    }
  }

  /**
   * Get the cached main window handle.
   */
  getMainWindowHandle(): string | null {
    return this.mainWindowHandle;
  }

  /**
   * Set the main window handle manually (useful if auth window is opened via other means).
   */
  setMainWindowHandle(handle: string): void {
    this.mainWindowHandle = handle;
  }
}
