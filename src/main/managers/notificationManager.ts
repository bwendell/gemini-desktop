/**
 * Notification Manager for the Electron main process.
 * Handles native OS notifications and taskbar badges for response notifications.
 *
 * @module NotificationManager
 */

import { Notification, type BrowserWindow } from 'electron';
import { createLogger } from '../utils/logger';
import type SettingsStore from '../store';
import type BadgeManager from './badgeManager';

const logger = createLogger('[NotificationManager]');

/**
 * Settings interface for notification preferences.
 */
export interface NotificationSettings extends Record<string, unknown> {
    responseNotificationsEnabled: boolean;
}

/**
 * Manages native OS notifications and taskbar badges for response notifications.
 *
 * ## Features
 * - Shows native OS notification when Gemini response completes and window is unfocused
 * - Shows taskbar badge (via BadgeManager) when unfocused
 * - Clears badge when window regains focus
 * - Respects user setting for enabling/disabling notifications
 *
 * @class NotificationManager
 */
export default class NotificationManager {
    /** Reference to main window for focus tracking */
    private readonly mainWindow: BrowserWindow;

    /** BadgeManager for taskbar badges */
    private readonly badgeManager: BadgeManager;

    /** Settings store for persisting preferences */
    private readonly store: SettingsStore<NotificationSettings>;

    /** Current focus state of the main window */
    private _isWindowFocused: boolean;

    /**
     * Creates a new NotificationManager instance.
     * @param mainWindow - The main BrowserWindow instance
     * @param badgeManager - BadgeManager for taskbar badges
     * @param store - Settings store for persisting notification preferences
     */
    constructor(mainWindow: BrowserWindow, badgeManager: BadgeManager, store: SettingsStore<NotificationSettings>) {
        this.mainWindow = mainWindow;
        this.badgeManager = badgeManager;
        this.store = store;

        // Initialize focus state - check if window is currently focused
        this._isWindowFocused = mainWindow.isFocused();

        // Subscribe to window focus/blur events
        this.mainWindow.on('focus', this.onWindowFocus.bind(this));
        this.mainWindow.on('blur', this.onWindowBlur.bind(this));

        logger.log('NotificationManager initialized');
    }

    /**
     * Handler for window focus event.
     * Clears notification badge when window regains focus.
     * @private
     */
    private onWindowFocus(): void {
        this._isWindowFocused = true;
        // Clear notification badge when window regains focus
        this.badgeManager.clearNotificationBadge();
        logger.log('Window focused, notification badge cleared');
    }

    /**
     * Handler for window blur event.
     * @private
     */
    private onWindowBlur(): void {
        this._isWindowFocused = false;
        logger.log('Window blurred');
    }

    /**
     * Check if the main window is currently focused.
     * @returns True if the window is focused
     */
    get isWindowFocused(): boolean {
        return this._isWindowFocused;
    }

    /**
     * Handle a completed Gemini response.
     * Shows notification and badge if window is unfocused and notifications are enabled.
     */
    onResponseComplete(): void {
        // Check if notifications are enabled
        if (!this.isEnabled()) {
            logger.log('Response complete, but notifications disabled');
            return;
        }

        // Check if window is focused
        if (this._isWindowFocused) {
            logger.log('Response complete, but window is focused - no notification');
            return;
        }

        // Show notification and badge
        this.showNotification();
        this.badgeManager.showNotificationBadge();
        logger.log('Response complete - notification and badge shown');
    }

    /**
     * Check if response notifications are enabled.
     * @returns True if notifications are enabled
     */
    isEnabled(): boolean {
        return this.store.get('responseNotificationsEnabled') ?? true;
    }

    /**
     * Enable or disable response notifications.
     * @param enabled - Whether to enable notifications
     */
    setEnabled(enabled: boolean): void {
        this.store.set('responseNotificationsEnabled', enabled);
        logger.log(`Response notifications ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Show a native OS notification for a completed response.
     * Returns early if notifications are not supported on the platform.
     */
    showNotification(): void {
        // Check if notifications are supported on this platform
        if (!Notification.isSupported()) {
            logger.log('Notifications not supported on this platform');
            return;
        }

        const notification = new Notification({
            title: 'Gemini',
            body: 'Response ready',
            silent: false,
        });

        // Focus the main window when notification is clicked
        notification.on('click', () => {
            if (!this.mainWindow.isDestroyed()) {
                if (this.mainWindow.isMinimized()) {
                    this.mainWindow.restore();
                }
                this.mainWindow.show();
                this.mainWindow.focus();
            }
        });

        notification.show();
        logger.log('Notification shown');
    }
}
