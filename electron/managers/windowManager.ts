/**
 * Window Manager for the Electron main process.
 * Handles creation and management of application windows.
 * 
 * @module WindowManager
 */

import { BrowserWindow, shell, screen } from 'electron';
import {
    isInternalDomain,
    isOAuthDomain,
    AUTH_WINDOW_CONFIG,
    MAIN_WINDOW_CONFIG,
    OPTIONS_WINDOW_CONFIG,
    QUICK_CHAT_WINDOW_CONFIG,
    QUICK_CHAT_WIDTH,
    QUICK_CHAT_HEIGHT,
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
    private quickChatWindow: BrowserWindow | null = null;

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
        /* v8 ignore next -- guard clause, mainWindow always exists when called */
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
        /* v8 ignore next -- guard clause, mainWindow always exists when called */
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

    /**
     * Create the Quick Chat floating window.
     * Centers on the active display, transparent and always-on-top.
     * @returns The Quick Chat window
     */
    createQuickChatWindow(): BrowserWindow {
        if (this.quickChatWindow) {
            return this.quickChatWindow;
        }

        // Get the display where the cursor is located
        const cursorPoint = screen.getCursorScreenPoint();
        const display = screen.getDisplayNearestPoint(cursorPoint);
        const { width: displayWidth, height: displayHeight } = display.workAreaSize;
        const { x: displayX, y: displayY } = display.workArea;

        // Center the window horizontally, position it in upper third vertically
        /* v8 ignore next 2 -- fallback for undefined constants, always defined */
        const windowWidth = QUICK_CHAT_WINDOW_CONFIG.width ?? QUICK_CHAT_WIDTH;
        const windowHeight = QUICK_CHAT_WINDOW_CONFIG.height ?? QUICK_CHAT_HEIGHT;
        const x = displayX + Math.round((displayWidth - windowWidth) / 2);
        const y = displayY + Math.round(displayHeight / 4);

        this.quickChatWindow = new BrowserWindow({
            ...QUICK_CHAT_WINDOW_CONFIG,
            x,
            y,
            webPreferences: {
                ...QUICK_CHAT_WINDOW_CONFIG.webPreferences,
                preload: getPreloadPath(),
            },
        });

        const distQuickChatPath = getDistHtmlPath('quickchat.html');

        if (this.isDev) {
            this.quickChatWindow.loadURL(getDevUrl('quickchat.html'));
        } else {
            this.quickChatWindow.loadFile(distQuickChatPath);
        }

        this.quickChatWindow.once('ready-to-show', () => {
            this.quickChatWindow?.show();
            this.quickChatWindow?.focus();
        });

        // Auto-hide when window loses focus (Spotlight behavior)
        this.quickChatWindow.on('blur', () => {
            this.hideQuickChat();
        });

        this.quickChatWindow.on('closed', () => {
            this.quickChatWindow = null;
        });

        logger.log('Quick Chat window created');
        return this.quickChatWindow;
    }

    /**
     * Show and focus the Quick Chat window.
     * Creates the window if it doesn't exist.
     */
    showQuickChat(): void {
        if (!this.quickChatWindow) {
            this.createQuickChatWindow();
        } else {
            // Reposition to current cursor display
            const cursorPoint = screen.getCursorScreenPoint();
            const display = screen.getDisplayNearestPoint(cursorPoint);
            const { width: displayWidth, height: displayHeight } = display.workAreaSize;
            const { x: displayX, y: displayY } = display.workArea;

            /* v8 ignore next -- fallback for undefined constant, always defined */
            const windowWidth = QUICK_CHAT_WINDOW_CONFIG.width ?? QUICK_CHAT_WIDTH;
            const x = displayX + Math.round((displayWidth - windowWidth) / 2);
            const y = displayY + Math.round(displayHeight / 4);

            this.quickChatWindow.setPosition(x, y);
            this.quickChatWindow.show();
            this.quickChatWindow.focus();
        }
        logger.log('Quick Chat window shown');
    }

    /**
     * Hide the Quick Chat window.
     */
    hideQuickChat(): void {
        if (this.quickChatWindow && !this.quickChatWindow.isDestroyed()) {
            this.quickChatWindow.hide();
            logger.log('Quick Chat window hidden');
        }
    }

    /**
     * Toggle Quick Chat window visibility.
     */
    toggleQuickChat(): void {
        if (this.quickChatWindow && this.quickChatWindow.isVisible()) {
            this.hideQuickChat();
        } else {
            this.showQuickChat();
        }
    }

    /**
     * Get the Quick Chat window instance.
     * @returns The Quick Chat window or null
     */
    getQuickChatWindow(): BrowserWindow | null {
        return this.quickChatWindow;
    }

    /**
     * Focus the main window and bring to front.
     */
    focusMainWindow(): void {
        if (this.mainWindow) {
            this.mainWindow.show();
            this.mainWindow.focus();
            logger.log('Main window focused');
        }
    }
}
