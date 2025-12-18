/**
 * Window Manager for the Electron main process.
 * Handles creation and management of application windows.
 * 
 * @module WindowManager
 */

import { BrowserWindow, shell } from 'electron';
import {
    isInternalDomain,
    isOAuthDomain,
    AUTH_WINDOW_CONFIG,
    MAIN_WINDOW_CONFIG,
    OPTIONS_WINDOW_CONFIG,
    getTitleBarStyle,
    getDevUrl
} from '../utils/constants';
import { getPreloadPath, getDistHtmlPath, getIconPath } from '../utils/paths';
import { createLogger } from '../utils/logger';

const logger = createLogger('[WindowManager]');

export default class WindowManager {
    readonly isDev: boolean;
    private mainWindow: BrowserWindow | null = null;
    private optionsWindow: BrowserWindow | null = null;

    /**
     * Creates a new WindowManager instance.
     * @param isDev - Whether running in development mode
     */
    constructor(isDev: boolean) {
        this.isDev = isDev;
    }

    /**
     * Create an authentication window for Google sign-in.
     * Uses shared session to persist cookies with main window.
     * 
     * @param url - The URL to load in the auth window
     * @returns The created auth window
     */
    createAuthWindow(url: string): BrowserWindow {
        logger.log('Creating auth window for:', url);

        const authWindow = new BrowserWindow(AUTH_WINDOW_CONFIG);
        authWindow.loadURL(url);

        authWindow.on('closed', () => {
            logger.log('Auth window closed');
        });

        return authWindow;
    }

    /**
     * Create the main application window.
     * @returns The main window
     */
    createMainWindow(): BrowserWindow {
        if (this.mainWindow) {
            this.mainWindow.focus();
            return this.mainWindow;
        }

        this.mainWindow = new BrowserWindow({
            ...MAIN_WINDOW_CONFIG,
            titleBarStyle: getTitleBarStyle(),
            webPreferences: {
                ...MAIN_WINDOW_CONFIG.webPreferences,
                preload: getPreloadPath(),
            },
            icon: getIconPath(),
        });

        const distIndexPath = getDistHtmlPath('index.html');

        // Load the app
        if (this.isDev) {
            this.mainWindow.loadURL(getDevUrl());
            this.mainWindow.webContents.openDevTools();
        } else {
            this.mainWindow.loadFile(distIndexPath);
        }

        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow?.show();
        });

        this._setupWindowOpenHandler();
        this._setupNavigationHandler();

        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
            // Close options window if it exists to ensure app quits
            if (this.optionsWindow) {
                this.optionsWindow.close();
            }
        });

        return this.mainWindow;
    }

    /**
     * Set up navigation handler to prevent navigation hijacking.
     * Blocks attempts to navigate the main window to external URLs.
     * @private
     */
    private _setupNavigationHandler(): void {
        if (!this.mainWindow) return;

        this.mainWindow.webContents.on('will-navigate', (event, url) => {
            try {
                const urlObj = new URL(url);
                const hostname = urlObj.hostname;

                // Allow navigation to internal domains
                if (isInternalDomain(hostname)) {
                    logger.log('Allowing navigation to internal URL:', url);
                    return;
                }

                // Allow navigation to OAuth domains (for sign-in flows)
                if (isOAuthDomain(hostname)) {
                    logger.log('Allowing navigation to OAuth URL:', url);
                    return;
                }

                // Block navigation to external URLs
                logger.warn('Blocked navigation to external URL:', url);
                event.preventDefault();
            } catch (e) {
                logger.error('Invalid navigation URL, blocking:', url);
                event.preventDefault();
            }
        });
    }

    /**
     * Set up handler for window.open() calls from the renderer.
     * Routes URLs to appropriate destinations (auth window, internal, or external).
     * @private
     */
    private _setupWindowOpenHandler(): void {
        if (!this.mainWindow) return;

        this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            try {
                const urlObj = new URL(url);
                const hostname = urlObj.hostname;

                // OAuth domains: open in dedicated auth window
                if (isOAuthDomain(hostname)) {
                    logger.log('Intercepting OAuth popup:', url);
                    this.createAuthWindow(url);
                    return { action: 'deny' };
                }

                // Internal domains: allow in new Electron window
                if (isInternalDomain(hostname)) {
                    return { action: 'allow' };
                }
            } catch (e) {
                logger.error('Invalid URL in window open handler:', url);
            }

            // External links: open in system browser
            if (url.startsWith('http:') || url.startsWith('https:')) {
                shell.openExternal(url);
            }
            return { action: 'deny' };
        });
    }

    /**
     * Create or focus the options window.
     * @param tab - Optional tab to open ('settings' or 'about')
     * @returns The options window
     */
    createOptionsWindow(tab?: 'settings' | 'about'): BrowserWindow {
        // Build hash fragment for tab
        const hash = tab ? `#${tab}` : '';

        if (this.optionsWindow) {
            // If window exists, navigate to the requested tab
            if (tab) {
                const currentUrl = this.optionsWindow.webContents.getURL();
                const baseUrl = currentUrl.split('#')[0];
                this.optionsWindow.loadURL(`${baseUrl}${hash}`);
            }
            this.optionsWindow.focus();
            return this.optionsWindow;
        }

        this.optionsWindow = new BrowserWindow({
            ...OPTIONS_WINDOW_CONFIG,
            titleBarStyle: getTitleBarStyle(),
            webPreferences: {
                ...OPTIONS_WINDOW_CONFIG.webPreferences,
                preload: getPreloadPath(),
            },
        });

        const distOptionsPath = getDistHtmlPath('options.html');

        if (this.isDev) {
            this.optionsWindow.loadURL(getDevUrl('options.html') + hash);
        } else {
            this.optionsWindow.loadFile(distOptionsPath, { hash: tab });
        }

        this.optionsWindow.once('ready-to-show', () => {
            this.optionsWindow?.show();
        });

        this.optionsWindow.on('closed', () => {
            this.optionsWindow = null;
        });

        return this.optionsWindow;
    }

    /**
     * Get the main window instance.
     * @returns The main window or null
     */
    getMainWindow(): BrowserWindow | null {
        return this.mainWindow;
    }

    /**
     * Minimize the main window.
     */
    minimizeMainWindow() {
        if (this.mainWindow) {
            this.mainWindow.minimize();
        }
    }
}
