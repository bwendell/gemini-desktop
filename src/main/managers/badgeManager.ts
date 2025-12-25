/**
 * Badge Manager for the Electron main process.
 * Handles platform-specific dock/taskbar badges for update notifications.
 * 
 * @module BadgeManager
 */

import { app, nativeImage, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { createLogger } from '../utils/logger';
import { isMacOS, isWindows, isLinux } from '../utils/constants';

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

    /** Current badge state */
    private hasBadge = false;

    constructor() {
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
        if (!isWindows) return;

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
                    buffer[index] = 83;      // B
                    buffer[index + 1] = 168; // G
                    buffer[index + 2] = 52;  // R
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
                height: size
            });
        } catch (error) {
            logger.error('Failed to create badge icon from buffer:', error);
            return nativeImage.createEmpty();
        }
    }

    /**
     * Show the update badge on dock/taskbar.
     * @param text - Optional text to show (macOS only, defaults to "•")
     */
    showUpdateBadge(text = '•'): void {
        if (this.hasBadge) {
            logger.log('Badge already shown');
            return;
        }

        try {
            if (isMacOS) {
                // macOS: Set dock badge
                app.dock?.setBadge(text);
                logger.log('macOS dock badge set:', text);
            } else if (isWindows) {
                // Windows: Set taskbar overlay icon
                if (this.mainWindow && !this.mainWindow.isDestroyed() && this.badgeIcon) {
                    this.mainWindow.setOverlayIcon(this.badgeIcon, 'Update available');
                    logger.log('Windows taskbar overlay set');
                } else {
                    logger.warn('Cannot set Windows overlay: window or icon not available');
                }
            } else if (isLinux) {
                // Linux: No native badge support
                logger.log('Linux: Native badge not supported, skipping');
            }

            this.hasBadge = true;
        } catch (error) {
            /* v8 ignore next 2 -- defensive error handling */
            logger.error('Failed to show badge:', error);
        }
    }

    /**
     * Clear the update badge from dock/taskbar.
     */
    clearUpdateBadge(): void {
        if (!this.hasBadge) {
            return;
        }

        try {
            if (isMacOS) {
                // macOS: Clear dock badge
                app.dock?.setBadge('');
                logger.log('macOS dock badge cleared');
            } else if (isWindows) {
                // Windows: Clear taskbar overlay
                if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                    this.mainWindow.setOverlayIcon(null, '');
                    logger.log('Windows taskbar overlay cleared');
                }
            }
            // Linux: Nothing to clear

            this.hasBadge = false;
        } catch (error) {
            /* v8 ignore next 2 -- defensive error handling */
            logger.error('Failed to clear badge:', error);
        }
    }

    /**
     * Check if badge is currently shown.
     * @returns True if badge is visible
     */
    hasBadgeShown(): boolean {
        return this.hasBadge;
    }
}
