/**
 * Notification Manager for the Electron main process.
 * Handles native OS notifications and taskbar badges for response notifications.
 *
 * @module NotificationManager
 */

import { Notification, type BrowserWindow } from 'electron';
import * as fs from 'fs';
import { createLogger } from '../utils/logger';
import { APP_NAME } from '../utils/constants';
import { getNotificationIconPath } from '../utils/paths';
import type SettingsStore from '../store';
import type BadgeManager from './badgeManager';
import type { PlatformAdapter } from '../platform/PlatformAdapter';

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

    /** PlatformAdapter for platform-specific notification hints */
    private readonly platformAdapter: PlatformAdapter;

    /** Current focus state of the main window */
    private _isWindowFocused: boolean;

    /** Bound reference to onWindowFocus for proper listener removal */
    private readonly boundOnWindowFocus: () => void;

    /** Bound reference to onWindowBlur for proper listener removal */
    private readonly boundOnWindowBlur: () => void;

    /** Track active notifications for cleanup on dispose (Task 12.10) */
    private readonly activeNotifications: Set<Notification> = new Set();

    /**
     * Creates a new NotificationManager instance.
     * @param mainWindow - The main BrowserWindow instance
     * @param badgeManager - BadgeManager for taskbar badges
     * @param store - Settings store for persisting notification preferences
     * @param platformAdapter - PlatformAdapter for platform-specific behavior
     */
    constructor(
        mainWindow: BrowserWindow,
        badgeManager: BadgeManager,
        store: SettingsStore<NotificationSettings>,
        platformAdapter: PlatformAdapter
    ) {
        this.mainWindow = mainWindow;
        this.badgeManager = badgeManager;
        this.store = store;
        this.platformAdapter = platformAdapter;

        // Initialize focus state - check if window is currently focused
        this._isWindowFocused = mainWindow.isFocused();

        // Store bound function references for proper listener removal in dispose()
        // .bind() creates a new function each call, so we must store the reference
        this.boundOnWindowFocus = this.onWindowFocus.bind(this);
        this.boundOnWindowBlur = this.onWindowBlur.bind(this);

        // Subscribe to window focus/blur events using stored references
        this.mainWindow.on('focus', this.boundOnWindowFocus);
        this.mainWindow.on('blur', this.boundOnWindowBlur);

        logger.log('NotificationManager initialized');
    }

    /**
     * Handler for window focus event.
     * Clears notification badge when window regains focus.
     * @private
     */
    private onWindowFocus(): void {
        // Check if window is destroyed before accessing state (task 11.4)
        if (this.mainWindow.isDestroyed()) {
            logger.log('Window focus event ignored - window is destroyed');
            return;
        }

        this._isWindowFocused = true;
        // Clear notification badge when window regains focus (task 12.4: null guard)
        if (!this.badgeManager) {
            logger.warn('BadgeManager not available - cannot clear notification badge');
        } else {
            this.badgeManager.clearNotificationBadge();
        }
        logger.log('Window focused, notification badge cleared');
    }

    /**
     * Handler for window blur event.
     * @private
     */
    private onWindowBlur(): void {
        // Check if window is destroyed before accessing state (task 11.4)
        if (this.mainWindow.isDestroyed()) {
            logger.log('Window blur event ignored - window is destroyed');
            return;
        }

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
     * Each operation is wrapped in try/catch so one failure doesn't block the other.
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

        // Show notification (task 11.1: wrapped in try/catch)
        try {
            this.showNotification();
        } catch (error) {
            logger.error('Failed to show notification:', error);
        }

        // Show badge (task 11.1: wrapped independently so notification failure doesn't block badge)
        // Task 12.4: null guard for badgeManager
        try {
            if (!this.badgeManager) {
                logger.warn('BadgeManager not available - cannot show notification badge');
            } else {
                this.badgeManager.showNotificationBadge();
            }
        } catch (error) {
            logger.error('Failed to show notification badge:', error);
        }

        logger.log('Response complete - notification and badge shown');
    }

    /**
     * Check if response notifications are enabled.
     * Always returns a boolean, defaulting to true for null/undefined values.
     * @returns True if notifications are enabled
     */
    isEnabled(): boolean {
        const value = this.store.get('responseNotificationsEnabled');
        // Handle null/undefined - default to true
        if (value === null || value === undefined) {
            return true;
        }
        // Ensure we always return a boolean
        return value === true;
    }

    /**
     * Enable or disable response notifications.
     * Validates that enabled is a boolean before persisting.
     * @param enabled - Whether to enable notifications
     */
    setEnabled(enabled: boolean): void {
        // Type validation (task 11.3)
        if (typeof enabled !== 'boolean') {
            logger.warn(`setEnabled received non-boolean value: ${typeof enabled} (${enabled})`);
            return;
        }

        // Task 12.2: wrap store.set() in try/catch for graceful failure
        try {
            this.store.set('responseNotificationsEnabled', enabled);
            logger.log(`Response notifications ${enabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            logger.error('Failed to persist response notifications setting:', error);
        }
    }

    /**
     * Show a native OS notification for a completed response.
     * Returns early if notifications are not supported on the platform.
     * Logs platform-specific guidance when notifications are not supported.
     */
    showNotification(): void {
        // Check if notifications are supported on this platform
        if (!Notification.isSupported()) {
            const hint = this.platformAdapter.getNotificationSupportHint();
            if (hint) {
                logger.warn(hint);
            } else {
                logger.log('Notifications not supported on this platform');
            }
            return;
        }

        // Resolve icon path for notifications (Windows and Linux)
        // macOS ignores this and uses the app bundle icon instead
        // Uses centralized helper that supports Flatpak, AppImage, deb, rpm, etc.
        let iconPath: string | undefined = getNotificationIconPath();

        // Verify icon path exists before using (task 11.7)
        if (iconPath && !fs.existsSync(iconPath)) {
            logger.warn(`Notification icon not found at path: ${iconPath} - notification will show without icon`);
            iconPath = undefined;
        }

        // Wrap Notification constructor and show() in try/catch (task 11.2)
        let notification: Notification;
        try {
            notification = new Notification({
                title: APP_NAME,
                body: 'Response ready',
                silent: false,
                icon: iconPath,
            });
        } catch (error) {
            logger.error('Failed to create notification:', error);
            return;
        }

        notification.on('click', () => {
            this.focusMainWindow();
        });

        // Task 12.10: Track notification for cleanup on dispose
        this.activeNotifications.add(notification);

        // Remove from tracking when notification is closed/dismissed
        notification.on('close', () => {
            this.activeNotifications.delete(notification);
        });

        try {
            notification.show();
            logger.log('Notification shown');
        } catch (error) {
            logger.error('Failed to show notification:', error);
        }
    }

    /**
     * Focus and restore the main window.
     * Called when a notification is clicked.
     * Handles restoring minimized windows before focusing.
     * @private
     */
    private focusMainWindow(): void {
        if (this.mainWindow.isDestroyed()) {
            logger.log('Cannot focus - main window is destroyed');
            return;
        }

        if (this.mainWindow.isMinimized()) {
            this.mainWindow.restore();
        }
        this.mainWindow.show();
        this.mainWindow.focus();
        logger.log('Main window focused via notification click');
    }

    /** Whether dispose() has already been called */
    private _isDisposed = false;

    /**
     * Clean up resources when the manager is disposed.
     * Removes focus/blur event listeners from the main window.
     * Safe to call multiple times (idempotent).
     */
    dispose(): void {
        if (this._isDisposed) {
            logger.log('NotificationManager already disposed, skipping');
            return;
        }

        this._isDisposed = true;

        // Remove event listeners if window is still valid
        // Use stored bound references (same ones used in constructor registration)
        if (!this.mainWindow.isDestroyed()) {
            this.mainWindow.removeListener('focus', this.boundOnWindowFocus);
            this.mainWindow.removeListener('blur', this.boundOnWindowBlur);
        }

        // Task 12.10: Close any pending notifications
        for (const notification of this.activeNotifications) {
            try {
                notification.close();
            } catch {
                // Notification may already be closed, ignore
            }
        }
        this.activeNotifications.clear();

        logger.log('NotificationManager disposed');
    }
}
