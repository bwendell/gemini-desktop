/**
 * Auth Window class for Google sign-in.
 *
 * Handles:
 * - OAuth window creation with shared session
 * - Navigation detection for successful sign-in
 * - Auto-close when navigation returns to Gemini
 * - Error handling for network/certificate issues
 *
 * @module AuthWindow
 */

import { BrowserWindow, type BrowserWindowConstructorOptions } from 'electron';
import BaseWindow from './baseWindow';
import { AUTH_WINDOW_CONFIG, isInternalDomain } from '../utils/constants';
import { getIconPath } from '../utils/paths';

/**
 * Authentication window for Google sign-in.
 * Uses shared session to persist cookies with main window.
 */
export default class AuthWindow extends BaseWindow {
  protected readonly windowConfig: BrowserWindowConstructorOptions;
  protected readonly htmlFile = ''; // Not used - loads URL instead

  /**
   * Creates a new AuthWindow instance.
   * @param isDev - Whether running in development mode
   */
  constructor(isDev: boolean) {
    super(isDev, '[AuthWindow]');
    this.windowConfig = {
      ...AUTH_WINDOW_CONFIG,
      icon: getIconPath(),
    };
  }

  /**
   * Create the auth window and load the OAuth URL.
   * @param url - The OAuth URL to load
   * @returns The created BrowserWindow
   */
  create(url: string): BrowserWindow {
    this.logger.log('Creating auth window for:', url);

    // Close any existing auth window before creating a new one
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }

    const authWindow = this.createWindow();

    // Load the URL and handle initial load errors
    authWindow.loadURL(url).catch((error) => {
      this.logger.error('Failed to load auth URL:', {
        url,
        error: (error as Error).message,
      });
    });

    this.setupAuthHandlers(authWindow);

    return authWindow;
  }

  /**
   * Override loadContent to do nothing as AuthWindow loads external URLs.
   */
  protected override loadContent(): void {
    // No-op: AuthWindow uses loadURL with dynamic URLs in create()
  }

  /**
   * Set up all event handlers for the auth window.
   */
  private setupAuthHandlers(authWindow: BrowserWindow): void {
    // Handle page load failures (network errors, DNS failures, etc.)
    authWindow.webContents.on(
      'did-fail-load',
      (_event, errorCode, errorDescription, validatedURL) => {
        this.logger.error('Auth window failed to load:', {
          errorCode,
          errorDescription,
          url: validatedURL,
        });
        // Don't auto-close on load failure - let user see the error or retry
      }
    );

    // Handle certificate errors (expired certs, self-signed, etc.)
    authWindow.webContents.on(
      'certificate-error',
      (_event, _url, _error, _certificate, callback) => {
        // In production, we should NOT bypass certificate errors for security
        this.logger.warn('Certificate error in auth window - connection denied for security');
        callback(false);
      }
    );

    // Auto-close when user successfully signs in and navigates to Gemini
    authWindow.webContents.on('did-navigate', (_event, navigationUrl) => {
      // Guard: Check if window/webContents still exists
      if (authWindow.isDestroyed()) {
        this.logger.warn('Auth window navigated but window was already destroyed');
        return;
      }

      try {
        const urlObj = new URL(navigationUrl);
        const hostname = urlObj.hostname;

        // Log navigation for debugging OAuth flows
        this.logger.log('Auth window navigated to:', hostname);

        if (isInternalDomain(hostname)) {
          this.logger.log('Login successful, closing auth window');

          // Guard: Double-check before closing
          if (!authWindow.isDestroyed()) {
            authWindow.close();
          }
        }
      } catch (e) {
        // Invalid URL - log but don't crash
        this.logger.error('Invalid URL in auth navigation:', {
          url: navigationUrl,
          error: (e as Error).message,
        });
      }
    });

    // Handle in-page navigation (hash changes, etc.)
    authWindow.webContents.on('did-navigate-in-page', (_event, navigationUrl) => {
      if (!authWindow.isDestroyed()) {
        this.logger.log('Auth window in-page navigation:', navigationUrl);
      }
    });

    // Log when window is closed and clear reference
    authWindow.on('closed', () => {
      this.logger.log('Auth window closed');
      this.window = null;
      this.emit('closed');
    });

    // Handle unresponsive renderer
    authWindow.on('unresponsive', () => {
      this.logger.warn('Auth window became unresponsive');
    });

    authWindow.on('responsive', () => {
      this.logger.log('Auth window became responsive again');
    });
  }
}
