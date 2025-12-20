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
    getDevUrl,
    isMacOS,
} from '../utils/constants';
import { getPreloadPath, getDistHtmlPath, getIconPath } from '../utils/paths';
import { createLogger } from '../utils/logger';

const logger = createLogger('[WindowManager]');

export default class WindowManager {
    readonly isDev: boolean;
    private mainWindow: BrowserWindow | null = null;
    private optionsWindow: BrowserWindow | null = null;
    private quickChatWindow: BrowserWindow | null = null;
    private isQuitting: boolean = false;

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
     * Auto-closes when user successfully navigates back to Gemini.
     * 
     * Defensive measures:
     * - Handles page load failures gracefully
     * - Guards against destroyed window/webContents
     * - Logs all significant navigation events
     * - Handles invalid URLs without crashing
     * 
     * @param url - The URL to load in the auth window
     * @returns The created auth window
     */
    createAuthWindow(url: string): BrowserWindow {
        logger.log('Creating auth window for:', url);

        const authWindow = new BrowserWindow(AUTH_WINDOW_CONFIG);

        // Load the URL and handle initial load errors
        authWindow.loadURL(url).catch((error) => {
            logger.error('Failed to load auth URL:', {
                url,
                error: (error as Error).message
            });
        });

        // Handle page load failures (network errors, DNS failures, etc.)
        authWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
            logger.error('Auth window failed to load:', {
                errorCode,
                errorDescription,
                url: validatedURL
            });
            // Don't auto-close on load failure - let user see the error or retry
        });

        // Handle certificate errors (expired certs, self-signed, etc.)
        authWindow.webContents.on('certificate-error', (_event, _url, _error, _certificate, callback) => {
            // In production, we should NOT bypass certificate errors for security
            // Just log and deny - the default browser error page will show
            logger.warn('Certificate error in auth window - connection denied for security');
            callback(false);
        });

        // Auto-close when user successfully signs in and navigates to Gemini
        authWindow.webContents.on('did-navigate', (_event, navigationUrl) => {
            // Guard: Check if window/webContents still exists
            if (authWindow.isDestroyed()) {
                logger.warn('Auth window navigated but window was already destroyed');
                return;
            }

            try {
                const urlObj = new URL(navigationUrl);
                const hostname = urlObj.hostname;

                // Log navigation for debugging OAuth flows
                logger.log('Auth window navigated to:', hostname);

                if (isInternalDomain(hostname)) {
                    logger.log('Login successful, closing auth window');

                    // Guard: Double-check before closing
                    if (!authWindow.isDestroyed()) {
                        authWindow.close();
                    }
                }
            } catch (e) {
                // Invalid URL - log but don't crash
                logger.error('Invalid URL in auth navigation:', {
                    url: navigationUrl,
                    error: (e as Error).message
                });
            }
        });

        // Handle in-page navigation (hash changes, etc.) - for completeness
        authWindow.webContents.on('did-navigate-in-page', (_event, navigationUrl) => {
            if (!authWindow.isDestroyed()) {
                logger.log('Auth window in-page navigation:', navigationUrl);
            }
        });

        // Log when window is closed (by user or auto-close)
        authWindow.on('closed', () => {
            logger.log('Auth window closed');
        });

        // Handle unresponsive renderer (rare but possible)
        authWindow.on('unresponsive', () => {
            logger.warn('Auth window became unresponsive');
        });

        authWindow.on('responsive', () => {
            logger.log('Auth window became responsive again');
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

        // Close to tray behavior
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.mainWindow as any).on('close', (event: Electron.Event) => {
            if (!this.isQuitting) {
                event.preventDefault();
                this.hideToTray();
            }
            return false;
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
                const protocol = urlObj.protocol;

                // Allow navigation to local application files (needed for reload)
                if (protocol === 'file:') {
                    logger.log('Allowing navigation to local file:', url);
                    return;
                }

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
     * Hide the main window to tray (minimize to tray behavior).
     * Hides window and sets skipTaskbar to remove from taskbar.
     */
    hideToTray(): void {
        try {
            if (!this.mainWindow) {
                logger.warn('Cannot hide to tray: no main window');
                return;
            }

            this.mainWindow.hide();
            // On Windows/Linux, also remove from taskbar
            if (!isMacOS) {
                this.mainWindow.setSkipTaskbar(true);
            }
            logger.log('Main window hidden to tray');
        } catch (error) {
            logger.error('Failed to hide window to tray:', error);
        }
    }

    /**
     * Restore the main window from tray.
     */
    restoreFromTray(): void {
        try {
            if (!this.mainWindow) {
                logger.warn('Cannot restore from tray: no main window');
                return;
            }

            this.mainWindow.show();
            this.mainWindow.focus();
            // Restore taskbar visibility on Windows/Linux
            if (!isMacOS) {
                this.mainWindow.setSkipTaskbar(false);
            }
            logger.log('Main window restored from tray');
        } catch (error) {
            logger.error('Failed to restore window from tray:', error);
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

        // Center the window horizontally, position it in upper third vertically
        /* v8 ignore next 2 -- fallback for undefined constants, always defined */
        const { x, y } = this._calculateQuickChatPosition();

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
            const { x, y } = this._calculateQuickChatPosition();

            if (this.quickChatWindow && !this.quickChatWindow.isDestroyed()) {
                this.quickChatWindow.setPosition(x, y);
                this.quickChatWindow.show();
                this.quickChatWindow.focus();
            }
        }
        logger.log('Quick Chat window shown');
    }

    /**
     * Calculate position for Quick Chat window based on cursor location.
     * Centers horizontally on the active display, upper third vertically.
     * @private
     */
    private _calculateQuickChatPosition(): { x: number; y: number } {
        const cursorPoint = screen.getCursorScreenPoint();
        const display = screen.getDisplayNearestPoint(cursorPoint);
        const { width: displayWidth, height: displayHeight } = display.workAreaSize;
        const { x: displayX, y: displayY } = display.workArea;

        /* v8 ignore next -- fallback for undefined constant, always defined */
        const windowWidth = QUICK_CHAT_WINDOW_CONFIG.width ?? QUICK_CHAT_WIDTH;
        const x = displayX + Math.round((displayWidth - windowWidth) / 2);
        const y = displayY + Math.round(displayHeight / 4);

        return { x, y };
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

    /**
     * Set the quitting state.
     * Used to distinguish between closing to tray (user X) and quitting app (Cmd+Q/Menu).
     * @param state - Whether the app is quitting
     */
    setQuitting(state: boolean): void {
        this.isQuitting = state;
    }
}
