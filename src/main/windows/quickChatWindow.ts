/**
 * Quick Chat Window class for the floating prompt.
 *
 * Handles:
 * - Spotlight-like floating window
 * - Positioning based on cursor/display
 * - Blur-to-hide behavior
 * - Toggle visibility
 *
 * @module QuickChatWindow
 */

import { BrowserWindow, screen, type BrowserWindowConstructorOptions } from 'electron';
import BaseWindow from './baseWindow';
import { QUICK_CHAT_WINDOW_CONFIG, QUICK_CHAT_WIDTH } from '../utils/constants';
import { getPreloadPath } from '../utils/paths';

/**
 * Quick Chat floating window.
 * Spotlight-like appearance: frameless, transparent, always-on-top.
 */
export default class QuickChatWindow extends BaseWindow {
    protected readonly windowConfig: BrowserWindowConstructorOptions;
    protected readonly htmlFile = 'src/renderer/windows/quickchat/quickchat.html';

    /**
     * Creates a new QuickChatWindow instance.
     * @param isDev - Whether running in development mode
     */
    constructor(isDev: boolean) {
        super(isDev, '[QuickChatWindow]');
        this.windowConfig = QUICK_CHAT_WINDOW_CONFIG;
    }

    private _isReady = false;
    private _suppressBlurUntil = 0;
    private _readyToShowFallbackTimeout: ReturnType<typeof setTimeout> | null = null;

    /**
     * Create the Quick Chat window.
     * @returns The created BrowserWindow
     */
    create(): BrowserWindow {
        if (this.window) {
            return this.window;
        }

        const { x, y } = this.calculatePosition();

        this.window = new BrowserWindow({
            ...this.windowConfig,
            x,
            y,
            webPreferences: {
                ...this.windowConfig.webPreferences,
                preload: getPreloadPath(),
            },
        });

        // Track when window is actually ready
        this.window.webContents.once('did-finish-load', () => {
            this._isReady = true;
            this.emit('quick-chat-ready');
        });

        // Use parent class content loading
        this.loadContent();

        this.window.once('ready-to-show', () => {
            this.showWindow();
        });

        this._readyToShowFallbackTimeout = setTimeout(() => {
            this._readyToShowFallbackTimeout = null;

            if (this.window && !this.window.isDestroyed() && !this.window.isVisible()) {
                this.logger.warn('ready-to-show timeout - showing Quick Chat window via fallback');
                this.showWindow();
            }
        }, 1000);

        // Auto-hide when window loses focus (Spotlight behavior)
        this.window.on('blur', () => {
            if (Date.now() < this._suppressBlurUntil) {
                return;
            }
            this.hide();
        });

        this.window.on('closed', () => {
            this.clearReadyToShowFallbackTimeout();
            this.window = null;
            this._isReady = false;
            this.emit('closed');
        });

        this.logger.log('Quick Chat window created');
        return this.window;
    }

    /**
     * Show and focus the Quick Chat window.
     * Creates the window if it doesn't exist.
     */
    showAndFocus(): void {
        if (!this.window) {
            this.create();
        } else {
            // Reposition to current cursor display
            const { x, y } = this.calculatePosition();

            if (this.window && !this.window.isDestroyed()) {
                this.window.setPosition(x, y);
                this.showWindow();
            }
        }
    }

    private showWindow(): void {
        if (!this.window || this.window.isDestroyed()) {
            return;
        }
        this._suppressBlurUntil = Date.now() + 500;
        this.window.show();
        this.window.focus();
    }

    /**
     * Toggle Quick Chat window visibility.
     */
    toggle(): void {
        if (this.window && this.window.isVisible()) {
            this.hide();
        } else {
            this.showAndFocus();
        }
    }

    /**
     * Hide the Quick Chat window with logging.
     */
    override hide(): void {
        this.clearReadyToShowFallbackTimeout();

        if (this.window && !this.window.isDestroyed()) {
            this.window.hide();
            this.logger.log('Quick Chat window hidden');
        }
    }

    private clearReadyToShowFallbackTimeout(): void {
        if (this._readyToShowFallbackTimeout) {
            clearTimeout(this._readyToShowFallbackTimeout);
            this._readyToShowFallbackTimeout = null;
        }
    }

    /**
     * Calculate position for Quick Chat window based on cursor location.
     * Centers horizontally on the active display, upper third vertically.
     */
    private calculatePosition(): { x: number; y: number } {
        const cursorPoint = screen.getCursorScreenPoint();
        const display = screen.getDisplayNearestPoint(cursorPoint);
        const { width: displayWidth, height: displayHeight } = display.workAreaSize;
        const { x: displayX, y: displayY } = display.workArea;

        /* v8 ignore next -- fallback for undefined constant, always defined */
        const windowWidth = this.windowConfig.width ?? QUICK_CHAT_WIDTH;
        const x = displayX + Math.round((displayWidth - windowWidth) / 2);
        const y = displayY + Math.round(displayHeight / 4);

        return { x, y };
    }

    /**
     * Check if window content is fully loaded.
     */
    isReady(): boolean {
        return this._isReady;
    }
}
