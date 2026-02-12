/**
 * Badge Manager for the Electron main process.
 * Handles platform-specific dock/taskbar badges for update and response notifications.
 *
 * @module BadgeManager
 */

import { app, nativeImage, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { createLogger } from '../utils/logger';
import type { PlatformAdapter } from '../platform/PlatformAdapter';
import { getPlatformAdapter } from '../platform/platformAdapterFactory';

const logger = createLogger('[BadgeManager]');

/**
 * Manages dock (macOS) and taskbar (Windows) badges.
 *
 * ## Platform Support
 * - **macOS**: Uses `app.dock.setBadge()` to show text badge on dock icon
 * - **Windows**: Uses `BrowserWindow.setOverlayIcon()` to show overlay on taskbar
 * - **Linux**: No native badge API (gracefully skipped)
 *
 * @class BadgeManager
 */
export default class BadgeManager {
    /** Reference to main window for Windows overlay */
    private mainWindow: BrowserWindow | null = null;

    /** Badge overlay icon for Windows */
    private badgeIcon: Electron.NativeImage | null = null;

    /** Current update badge state */
    private hasUpdateBadge = false;

    /** Current notification badge state */
    private hasNotificationBadge = false;

    /** Platform adapter for badge rendering */
    private readonly adapter: PlatformAdapter;

    constructor(adapter?: PlatformAdapter) {
        this.adapter = adapter ?? getPlatformAdapter();
        logger.log('BadgeManager initialized');
        this.loadBadgeIcon();
    }

    /**
     * Set the main window reference (needed for Windows overlay).
     * @param window - The main BrowserWindow instance
     */
    setMainWindow(window: BrowserWindow | null): void {
        this.mainWindow = window;
        logger.log('Main window reference set');
    }

    /**
     * Load the badge overlay icon for Windows.
     * @private
     */
    private loadBadgeIcon(): void {
        if (!this.adapter.supportsBadges() || this.adapter.id === 'mac') return;

        try {
            // Look for badge icon in build directory
            const iconPath = path.join(__dirname, '../../build/badge-icon.png');
            if (fs.existsSync(iconPath)) {
                this.badgeIcon = nativeImage.createFromPath(iconPath);
                logger.log('Badge icon loaded from:', iconPath);
            } else {
                // Create a simple red dot programmatically as fallback
                this.badgeIcon = this.createDefaultBadgeIcon();
                logger.log('Using default badge icon');
            }
        } catch (error) {
            logger.error('Failed to load badge icon:', error);
            this.badgeIcon = this.createDefaultBadgeIcon();
        }
    }

    /**
     * Create a default green dot badge icon programmatically.
     * Uses raw pixel data in BGRA format (Windows native format).
     * @private
     * @returns NativeImage of a green dot
     */
    private createDefaultBadgeIcon(): Electron.NativeImage {
        const size = 16;
        const radius = 3; // Small, compact dot
        const centerX = size / 2;
        const centerY = size / 2;

        // Create BGRA buffer (Windows native format - 4 bytes per pixel)
        const buffer = Buffer.alloc(size * size * 4);

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = (y * size + x) * 4;

                // Calculate distance from center
                const dx = x - centerX + 0.5;
                const dy = y - centerY + 0.5;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance <= radius) {
                    // Google Green (#34a853) - solid color, no anti-aliasing for cleaner look
                    // BGRA format for Windows: #34a853 = R:52, G:168, B:83
                    buffer[index] = 83; // B
                    buffer[index + 1] = 168; // G
                    buffer[index + 2] = 52; // R
                    buffer[index + 3] = 255; // A - fully opaque
                } else {
                    // Transparent
                    buffer[index] = 0;
                    buffer[index + 1] = 0;
                    buffer[index + 2] = 0;
                    buffer[index + 3] = 0;
                }
            }
        }

        try {
            return nativeImage.createFromBuffer(buffer, {
                width: size,
                height: size,
            });
        } catch (error) {
            logger.error('Failed to create badge icon from buffer:', error);
            return nativeImage.createEmpty();
        }
    }

    /**
     * Internal method to show the badge on dock/taskbar.
     * Called by both update and notification badge methods.
     * @private
     */
    private showBadge(description: string, text = '•'): void {
        try {
            if (!this.adapter.supportsBadges()) {
                logger.log('Linux: Native badge not supported, skipping');
                return;
            }

            if (this.adapter.id === 'windows') {
                // Windows: need to check window/icon availability before delegating
                if (!this.mainWindow || this.mainWindow.isDestroyed() || !this.badgeIcon) {
                    logger.warn('Cannot set Windows overlay: window or icon not available');
                    return;
                }
            }

            this.adapter.showBadge({ window: this.mainWindow, description, text, overlayIcon: this.badgeIcon }, app);
            logger.log(this.adapter.id === 'mac' ? `macOS dock badge set: ${text}` : 'Windows taskbar overlay set');
        } catch (error) {
            /* v8 ignore next 2 -- defensive error handling */
            logger.error('Failed to show badge:', error);
        }
    }

    /**
     * Internal method to clear the badge from dock/taskbar.
     * Only clears if no badges of any type are active.
     * @private
     */
    private clearBadgeIfNoneActive(): void {
        if (this.hasUpdateBadge || this.hasNotificationBadge) {
            return; // Another badge type is still active
        }

        try {
            if (!this.adapter.supportsBadges()) {
                return; // Linux: Nothing to clear
            }

            this.adapter.clearBadge({ window: this.mainWindow }, app);
            logger.log(this.adapter.id === 'mac' ? 'macOS dock badge cleared' : 'Windows taskbar overlay cleared');
        } catch (error) {
            /* v8 ignore next 2 -- defensive error handling */
            logger.error('Failed to clear badge:', error);
        }
    }

    /**
     * Show the update badge on dock/taskbar.
     * @param text - Optional text to show (macOS only, defaults to "•")
     */
    showUpdateBadge(text = '•'): void {
        if (this.hasUpdateBadge) {
            logger.log('Update badge already shown');
            return;
        }

        this.hasUpdateBadge = true;
        this.showBadge('Update available', text);
    }

    /**
     * Clear the update badge from dock/taskbar.
     */
    clearUpdateBadge(): void {
        if (!this.hasUpdateBadge) {
            return;
        }

        this.hasUpdateBadge = false;
        this.clearBadgeIfNoneActive();
    }

    /**
     * Show the notification badge on dock/taskbar.
     * Used for response notifications when the window is unfocused.
     * @param text - Optional text to show (macOS only, defaults to "•")
     */
    showNotificationBadge(text = '•'): void {
        if (this.hasNotificationBadge) {
            logger.log('Notification badge already shown');
            return;
        }

        this.hasNotificationBadge = true;
        this.showBadge('Response ready', text);
    }

    /**
     * Clear the notification badge from dock/taskbar.
     */
    clearNotificationBadge(): void {
        if (!this.hasNotificationBadge) {
            return;
        }

        this.hasNotificationBadge = false;
        this.clearBadgeIfNoneActive();
    }

    /**
     * Check if any badge is currently shown.
     * @returns True if any badge (update or notification) is visible
     */
    hasBadgeShown(): boolean {
        return this.hasUpdateBadge || this.hasNotificationBadge;
    }

    /**
     * Check if notification badge is currently shown.
     * @returns True if notification badge is visible
     */
    hasNotificationBadgeShown(): boolean {
        return this.hasNotificationBadge;
    }
}
