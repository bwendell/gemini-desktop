/**
 * Main Window class for the primary application window.
 *
 * Handles:
 * - Main window creation with custom titlebar
 * - Close-to-tray behavior
 * - Navigation security (blocking external URLs)
 * - Window open handler (OAuth interception, external links)
 *
 * @module MainWindow
 */

import { BrowserWindow, shell, type BrowserWindowConstructorOptions } from 'electron';
import BaseWindow from './baseWindow';
import {
    MAIN_WINDOW_CONFIG,
    getTitleBarStyle,
    isInternalDomain,
    isOAuthDomain,
    isMacOS,
    getDevUrl,
} from '../utils/constants';
import { getIconPath, getDistHtmlPath } from '../utils/paths';

/**
 * Main application window.
 * Extends BaseWindow with main window specific behavior.
 */
export default class MainWindow extends BaseWindow {
    protected readonly windowConfig: BrowserWindowConstructorOptions;
    protected readonly htmlFile = 'index.html';

    /** Whether the app is quitting (vs closing to tray) */
    private isQuitting = false;

    /** Callback to create auth window for OAuth flows */
    private createAuthWindowCallback?: (url: string) => void;

    /** Callback to close options window when closing main window */
    private closeOptionsWindowCallback?: () => void;

    /** Callback to close auth window when closing main window */
    private closeAuthWindowCallback?: () => void;

    /**
     * Creates a new MainWindow instance.
     * @param isDev - Whether running in development mode
     */
    constructor(isDev: boolean) {
        super(isDev, '[MainWindow]');
        this.windowConfig = {
            ...MAIN_WINDOW_CONFIG,
            titleBarStyle: getTitleBarStyle(),
            icon: getIconPath(),
        };
    }

    /**
     * Set callback for creating auth windows (OAuth flow).
     * @param callback - Function to create auth window with URL
     */
    setAuthWindowCallback(callback: (url: string) => void): void {
        this.createAuthWindowCallback = callback;
    }

    /**
     * Set callback for closing options window when main window closes.
     * @param callback - Function to close options window
     */
    setCloseOptionsCallback(callback: () => void): void {
        this.closeOptionsWindowCallback = callback;
    }

    /**
     * Set callback for closing auth window when main window closes.
     * @param callback - Function to close auth window
     */
    setCloseAuthCallback(callback: () => void): void {
        this.closeAuthWindowCallback = callback;
    }

    /**
     * Create and show the main window.
     * @returns The created BrowserWindow
     */
    create(): BrowserWindow {
        const win = this.createWindow();

        if (this.isDev && this.window) {
            this.window.webContents.openDevTools();
        }

        this.window?.once('ready-to-show', () => {
            this.window?.show();
        });

        this.setupWindowOpenHandler();
        this.setupNavigationHandler();
        this.setupCloseHandler();

        return win;
    }

    /**
     * Override loadContent to use base dev URL for main window.
     * Main window loads from root, not /index.html.
     */
    protected override loadContent(): void {
        if (!this.window) return;

        if (this.isDev) {
            // Main window uses base URL in dev mode
            this.window.loadURL(getDevUrl());
        } else {
            this.window.loadFile(getDistHtmlPath(this.htmlFile));
        }
    }

    /**
     * Set up navigation handler to prevent navigation hijacking.
     * Blocks attempts to navigate the main window to external URLs.
     */
    private setupNavigationHandler(): void {
        if (!this.window) return;

        this.window.webContents.on('will-navigate', (event, url) => {
            try {
                const urlObj = new URL(url);
                const hostname = urlObj.hostname;
                const protocol = urlObj.protocol;

                // Allow navigation to local application files (needed for reload)
                if (protocol === 'file:') {
                    this.logger.log('Allowing navigation to local file:', url);
                    return;
                }

                // Allow navigation to internal domains
                if (isInternalDomain(hostname)) {
                    this.logger.log('Allowing navigation to internal URL:', url);
                    return;
                }

                // Allow navigation to OAuth domains (for sign-in flows)
                if (isOAuthDomain(hostname)) {
                    this.logger.log('Allowing navigation to OAuth URL:', url);
                    return;
                }

                // Block navigation to external URLs
                this.logger.warn('Blocked navigation to external URL:', url);
                event.preventDefault();
            } catch (e) {
                this.logger.error('Invalid navigation URL, blocking:', url);
                event.preventDefault();
            }
        });
    }

    /**
     * Set up handler for window.open() calls from the renderer.
     * Routes URLs to appropriate destinations (auth window, internal, or external).
     */
    private setupWindowOpenHandler(): void {
        if (!this.window) return;

        this.window.webContents.setWindowOpenHandler(({ url }) => {
            try {
                const urlObj = new URL(url);
                const hostname = urlObj.hostname;

                // OAuth domains: open in dedicated auth window
                if (isOAuthDomain(hostname)) {
                    this.logger.log('Intercepting OAuth popup:', url);
                    this.createAuthWindowCallback?.(url);
                    return { action: 'deny' };
                }

                // Internal domains: allow in new Electron window
                if (isInternalDomain(hostname)) {
                    return { action: 'allow' };
                }
            } catch (e) {
                this.logger.error('Invalid URL in window open handler:', url);
            }

            // External links: open in system browser
            if (url.startsWith('http:') || url.startsWith('https:')) {
                shell.openExternal(url);
            }
            return { action: 'deny' };
        });
    }

    /**
     * Set up close handler for close-to-tray behavior.
     */
    private setupCloseHandler(): void {
        if (!this.window) return;

        this.window.on('closed', () => {
            // Close options window if it exists
            this.closeOptionsWindowCallback?.();
            this.window = null;
        });

        // Close to tray behavior
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.window as any).on('close', (event: Electron.Event) => {
            if (!this.isQuitting) {
                event.preventDefault();
                this.hideToTray();
            }
            return false;
        });
    }

    /**
     * Hide the main window to tray.
     */
    hideToTray(): void {
        try {
            if (!this.window) {
                this.logger.warn('Cannot hide to tray: no main window');
                return;
            }

            // Close auxiliary windows when hiding main window
            this.closeOptionsWindowCallback?.();
            this.closeAuthWindowCallback?.();

            this.window.hide();
            // On Windows/Linux, also remove from taskbar
            if (!isMacOS) {
                this.window.setSkipTaskbar(true);
            }
            this.logger.log('Main window hidden to tray');
        } catch (error) {
            this.logger.error('Failed to hide window to tray:', error);
        }
    }

    /**
     * Restore the main window from tray.
     */
    restoreFromTray(): void {
        try {
            if (!this.window) {
                this.logger.warn('Cannot restore from tray: no main window');
                return;
            }

            this.window.show();
            this.window.focus();
            // Restore taskbar visibility on Windows/Linux
            if (!isMacOS) {
                this.window.setSkipTaskbar(false);
            }
            this.logger.log('Main window restored from tray');
        } catch (error) {
            this.logger.error('Failed to restore window from tray:', error);
        }
    }

    /**
     * Set the quitting state.
     * @param state - Whether the app is quitting
     */
    setQuitting(state: boolean): void {
        this.isQuitting = state;
    }

    /**
     * Minimize the main window.
     */
    minimize(): void {
        if (this.window) {
            this.window.minimize();
        }
    }

    /**
     * Set the always-on-top state for the main window.
     * @param enabled - Whether to enable always-on-top
     */
    setAlwaysOnTop(enabled: boolean): void {
        if (this.window) {
            this.window.setAlwaysOnTop(enabled);
            this.emit('always-on-top-changed', enabled);
            this.logger.log(`Always on top ${enabled ? 'enabled' : 'disabled'}`);
        }
    }

    /**
     * Get the current always-on-top state.
     * @returns True if always-on-top is enabled
     */
    isAlwaysOnTop(): boolean {
        return this.window?.isAlwaysOnTop() ?? false;
    }
}
