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

import { BrowserWindow, session, shell, type BrowserWindowConstructorOptions } from 'electron';
import BaseWindow from './baseWindow';
import {
    MAIN_WINDOW_CONFIG,
    getTitleBarStyle,
    isInternalDomain,
    isOAuthDomain,
    isMacOS,
    getDevUrl,
    READY_TO_SHOW_FALLBACK_MS,
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

    /** Debounce cooldown in milliseconds for response-complete events */
    private static readonly RESPONSE_DEBOUNCE_MS = 1000;

    /** Timestamp of the last response-complete event (for debouncing) */
    private lastResponseCompleteTime = 0;

    /**
     * Creates a new MainWindow instance.
     * @param isDev - Whether running in development mode
     */
    constructor(isDev: boolean) {
        super(isDev, '[MainWindow]');
        this.windowConfig = {
            ...MAIN_WINDOW_CONFIG,
            title: 'Gemini Desktop',
            // On Linux, the WM_CLASS should match the executable/desktop ID
            ...(process.platform === 'linux' ? { wmClass: 'gemini-desktop' } : {}),
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
        this.logger.debug('MainWindow.create() called');
        const win = this.createWindow();
        this.logger.debug('createWindow() returned');

        if (this.isDev && this.window) {
            this.logger.debug('Opening dev tools');
            this.window.webContents.openDevTools();
        }

        this.window?.once('ready-to-show', () => {
            this.logger.debug('ready-to-show event fired, calling show()');
            this.window?.show();
        });

        // Fallback: show window after timeout in case ready-to-show doesn't fire
        // This is particularly important for headless Linux environments (e.g., Ubuntu CI)
        // where ready-to-show may not fire reliably with Xvfb
        setTimeout(() => {
            if (this.window && !this.window.isVisible()) {
                this.logger.warn('ready-to-show timeout - showing window via fallback');
                this.window.show();
            }
        }, READY_TO_SHOW_FALLBACK_MS);

        this.setupWindowOpenHandler();
        this.setupNavigationHandler();
        this.setupCloseHandler();
        this.setupCrashHandlers();
        this.setupResponseDetection();

        return win;
    }

    /**
     * Set up crash and error handlers for the main window.
     * These prevent OS crash dialogs and handle errors gracefully.
     */
    private setupCrashHandlers(): void {
        if (!this.window) return;

        // Handle renderer process crash
        this.window.webContents.on('render-process-gone', (_event, details) => {
            this.logger.error('Main window renderer process gone:', {
                reason: details.reason,
                exitCode: details.exitCode,
            });

            // If not killed intentionally, try to recover by reloading
            if (details.reason !== 'killed' && this.window && !this.window.isDestroyed()) {
                this.logger.log('Attempting to reload crashed main window renderer...');
                this.window.reload();
            }
        });

        // Handle page load failures (network errors, DNS failures, etc.)
        this.window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
            this.logger.error('Main window failed to load:', {
                errorCode,
                errorDescription,
                url: validatedURL,
            });
        });

        // Handle unresponsive renderer
        this.window.on('unresponsive', () => {
            this.logger.warn('Main window became unresponsive');
        });

        this.window.on('responsive', () => {
            this.logger.log('Main window became responsive again');
        });
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

                // Allow navigation to localhost (needed for dev mode reload/retry)
                if (hostname === 'localhost' || hostname === '127.0.0.1') {
                    this.logger.log('Allowing navigation to localhost:', url);
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
            } catch {
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
            let hostname: string;
            try {
                const urlObj = new URL(url);
                hostname = urlObj.hostname;
            } catch (error) {
                this.logger.error('Invalid URL in window open handler:', { url, error });
                return { action: 'deny' };
            }

            try {
                // OAuth domains: open in dedicated auth window
                if (isOAuthDomain(hostname)) {
                    this.logger.log('Intercepting OAuth popup:', url);
                    if (this.createAuthWindowCallback) {
                        this.createAuthWindowCallback(url);
                    } else {
                        this.logger.error('Auth window callback not set');
                    }
                    return { action: 'deny' };
                }

                // Internal domains: allow in new Electron window
                if (isInternalDomain(hostname)) {
                    return { action: 'allow' };
                }
            } catch (error) {
                this.logger.error('Error handling window open:', error);
                return { action: 'deny' };
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
            // Close auxiliary windows if they exist
            this.closeOptionsWindowCallback?.();
            this.closeAuthWindowCallback?.();
            this.window = null;
        });

        // Close to tray behavior
        this.window.on('close', (event) => {
            if (!this.isQuitting) {
                event.preventDefault();
                this.hideToTray();
            }
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
        if (this.window && !this.window.isDestroyed()) {
            this.window.minimize();
        }
    }

    /**
     * Set the always-on-top state for the main window.
     * @param enabled - Whether to enable always-on-top
     */
    setAlwaysOnTop(enabled: boolean): void {
        if (this.window && !this.window.isDestroyed()) {
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

    /** Delay in milliseconds before enabling response detection after page load */
    private static readonly RESPONSE_DETECTION_STARTUP_DELAY_MS = 10000;

    /** Whether response detection is active (disabled during startup) */
    private responseDetectionActive = false;

    /**
     * Set up response detection to monitor when Gemini finishes generating a response.
     * Uses network request monitoring to detect streaming completion.
     * Emits 'response-complete' event with debouncing to prevent rapid-fire notifications.
     *
     * Note: Detection is delayed until after page load + startup delay to avoid
     * false positives from initial page load network requests.
     */
    private setupResponseDetection(): void {
        if (!this.window) return;

        // Wait for page to finish loading before enabling response detection
        // This prevents false positives from initial page load network requests
        this.window.webContents.once('did-finish-load', () => {
            this.logger.log(
                `Response detection will activate in ${MainWindow.RESPONSE_DETECTION_STARTUP_DELAY_MS / 1000}s`
            );

            setTimeout(() => {
                this.responseDetectionActive = true;
                this.logger.log('Response detection now active');
            }, MainWindow.RESPONSE_DETECTION_STARTUP_DELAY_MS);
        });

        // Monitor Gemini's streaming API endpoints for response completion
        // The BardChatUi endpoint handles chat streaming responses
        const geminiApiFilter = {
            urls: ['*://gemini.google.com/*/BardChatUi/*'],
        };

        session.defaultSession.webRequest.onCompleted(geminiApiFilter, (details) => {
            // Skip if response detection is not yet active (during startup)
            if (!this.responseDetectionActive) {
                return;
            }

            // Only process successful streaming response completions
            if (details.statusCode !== 200) {
                return;
            }

            // Apply debouncing to prevent rapid notifications
            const now = Date.now();
            if (now - this.lastResponseCompleteTime < MainWindow.RESPONSE_DEBOUNCE_MS) {
                // Only log in dev/CI mode to avoid main thread overhead in production
                if (this.isDev || process.env.CI) {
                    this.logger.debug('Response-complete debounced');
                }
                return;
            }

            this.lastResponseCompleteTime = now;
            this.logger.debug('Response complete detected, emitting event');
            this.emit('response-complete');
        });

        this.logger.log('Response detection initialized (will activate after page load + delay)');
    }
}
