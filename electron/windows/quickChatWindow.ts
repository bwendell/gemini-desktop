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
import {
    QUICK_CHAT_WINDOW_CONFIG,
    QUICK_CHAT_WIDTH,
} from '../utils/constants';

/**
 * Quick Chat floating window.
 * Spotlight-like appearance: frameless, transparent, always-on-top.
 */
export default class QuickChatWindow extends BaseWindow {
    protected readonly windowConfig: BrowserWindowConstructorOptions;
    protected readonly htmlFile = 'quickchat.html';

    /**
     * Creates a new QuickChatWindow instance.
     * @param isDev - Whether running in development mode
     */
    constructor(isDev: boolean) {
        super(isDev, '[QuickChatWindow]');
        this.windowConfig = QUICK_CHAT_WINDOW_CONFIG;
    }

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
            },
        });

        // Use parent class content loading
        this.loadContent();

        this.window.once('ready-to-show', () => {
            this.window?.show();
            this.window?.focus();
        });

        // Auto-hide when window loses focus (Spotlight behavior)
        this.window.on('blur', () => {
            this.hide();
        });

        this.window.on('closed', () => {
            this.window = null;
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
                this.window.show();
                this.window.focus();
            }
        }
        this.logger.log('Quick Chat window shown');
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
        if (this.window && !this.window.isDestroyed()) {
            this.window.hide();
            this.logger.log('Quick Chat window hidden');
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
}
