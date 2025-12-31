/**
 * Base Window class for Electron windows.
 * Provides common functionality for all window types.
 *
 * @module BaseWindow
 */

import { BrowserWindow } from 'electron';
import type { BrowserWindowConstructorOptions } from 'electron';
import { EventEmitter } from 'events';

import { createLogger } from '../utils/logger';
import { getPreloadPath, getDistHtmlPath } from '../utils/paths';
import { getDevUrl } from '../utils/constants';

/**
 * Abstract base class for application windows.
 * Encapsulates common BrowserWindow management patterns.
 *
 * @abstract
 */
export default abstract class BaseWindow extends EventEmitter {
  /** The underlying BrowserWindow instance */
  protected window: BrowserWindow | null = null;

  /** Whether running in development mode */
  protected readonly isDev: boolean;

  /** Logger instance for this window */
  protected readonly logger: ReturnType<typeof createLogger>;

  /** Window configuration options */
  protected abstract readonly windowConfig: BrowserWindowConstructorOptions;

  /** HTML file to load (e.g., 'index.html', 'options.html') */
  protected abstract readonly htmlFile: string;

  /**
   * Creates a new BaseWindow instance.
   * @param isDev - Whether running in development mode
   * @param loggerPrefix - Prefix for log messages
   */
  constructor(isDev: boolean, loggerPrefix: string) {
    super();
    this.isDev = isDev;
    this.logger = createLogger(loggerPrefix);
  }

  /**
   * Get the underlying BrowserWindow instance.
   * @returns The BrowserWindow or null if not created
   */
  getWindow(): BrowserWindow | null {
    return this.window;
  }

  /**
   * Check if the window exists and is not destroyed.
   * @returns True if window is valid
   */
  isValid(): boolean {
    return this.window !== null && !this.window.isDestroyed();
  }

  /**
   * Create and show the window.
   * Subclasses should call this and then set up additional handlers.
   * @returns The created BrowserWindow
   */
  protected createWindow(): BrowserWindow {
    this.logger.log('[DEBUG] BaseWindow.createWindow() called');
    
    if (this.window && !this.window.isDestroyed()) {
      this.logger.log('[DEBUG] Window already exists, focusing');
      this.window.focus();
      return this.window;
    }

    try {
      this.logger.log('[DEBUG] Creating new BrowserWindow...');
      this.logger.log(`Creating window with props: partition=${this.windowConfig.webPreferences?.partition}`);

      this.window = new BrowserWindow({
        ...this.windowConfig,
        webPreferences: {
          ...this.windowConfig.webPreferences,
          preload: getPreloadPath(),
        },
      });
      this.logger.log('[DEBUG] BrowserWindow created successfully');

      this.logger.log('[DEBUG] About to call loadContent()');
      this.loadContent();
      this.logger.log('[DEBUG] loadContent() completed');
      
      this.logger.log('[DEBUG] About to call setupBaseHandlers()');
      this.setupBaseHandlers();
      this.logger.log('[DEBUG] setupBaseHandlers() completed');

      return this.window;
    } catch (error) {
      this.logger.error('Failed to create window:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Re-throw so the caller (WindowManager) can handle gracefully
      throw error;
    }
  }

  /**
   * Load the appropriate content based on dev/prod mode.
   */
  protected loadContent(): void {
    if (!this.window) return;

    if (this.isDev) {
      this.window.loadURL(getDevUrl(this.htmlFile));
    } else {
      this.window.loadFile(getDistHtmlPath(this.htmlFile));
    }
  }

  /**
   * Set up base event handlers common to all windows.
   */
  protected setupBaseHandlers(): void {
    if (!this.window) return;

    this.window.on('closed', () => {
      this.logger.log('Window closed');
      this.window = null;
      this.emit('closed');
    });
  }

  /**
   * Close the window if it exists.
   */
  close(): void {
    if (this.isValid()) {
      this.window?.close();
    }
  }

  /**
   * Show the window.
   */
  show(): void {
    if (this.isValid()) {
      this.window?.show();
    }
  }

  /**
   * Hide the window.
   */
  hide(): void {
    if (this.isValid()) {
      this.window?.hide();
    }
  }

  /**
   * Focus the window.
   */
  focus(): void {
    if (this.isValid()) {
      this.window?.focus();
    }
  }
}
