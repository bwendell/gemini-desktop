/**
 * Auto-Update Manager
 * 
 * Handles automatic application updates using electron-updater.
 * Provides VS Code-style update experience with:
 * - Background update checking
 * - User opt-out via settings
 * - Native OS notifications
 * - Platform-specific handling (macOS, Windows, Linux)
 * 
 * @module UpdateManager
 */

import { app, BrowserWindow } from 'electron';
import { autoUpdater, type UpdateInfo } from 'electron-updater';
import type { AppUpdater } from 'electron-updater';
import log from 'electron-log';
import { createLogger } from '../utils/logger';
import type SettingsStore from '../store';

const logger = createLogger('[UpdateManager]');

// Re-export UpdateInfo for use in other modules
export type { UpdateInfo };

/**
 * Settings interface for auto-update preferences
 */
export interface AutoUpdateSettings extends Record<string, unknown> {
    autoUpdateEnabled: boolean;
}

/**
 * Get the autoUpdater instance.
 * Direct import works for both ESM and CommonJS.
 */
function getAutoUpdater(): AppUpdater {
    return autoUpdater;
}

/**
 * UpdateManager handles automatic application updates.
 * 
 * Features:
 * - Periodic background checking for updates
 * - Silent download of updates
 * - User notification when update is ready
 * - Opt-out via settings
 * - Platform-aware (disables for DEB/RPM Linux, portable Windows)
 */
export default class UpdateManager {
    private autoUpdater: AppUpdater;
    private enabled: boolean = true;
    private checkInterval: ReturnType<typeof setInterval> | null = null;
    private readonly settings: SettingsStore<AutoUpdateSettings>;

    /**
     * Creates a new UpdateManager instance.
     * @param settings - Settings store for persisting auto-update preferences
     */
    constructor(settings: SettingsStore<AutoUpdateSettings>) {
        this.settings = settings;
        this.autoUpdater = getAutoUpdater();

        // Load user preference (default to enabled)
        this.enabled = this.settings.get('autoUpdateEnabled') ?? true;

        // Configure auto-updater
        this.autoUpdater.autoDownload = true;
        this.autoUpdater.autoInstallOnAppQuit = true;

        // Configure logging
        this.autoUpdater.logger = log;
        log.transports.file.level = 'info';

        // Disable for non-updatable platforms
        if (this.shouldDisableUpdates()) {
            this.enabled = false;
            logger.log('Auto-updates disabled for this platform/install type');
        }

        this.setupEventListeners();
        logger.log(`UpdateManager initialized (enabled: ${this.enabled})`);
    }

    /**
     * Determine if auto-updates should be disabled based on platform and install type.
     * @returns true if updates should be disabled
     */
    private shouldDisableUpdates(): boolean {
        // Development mode - skip updates
        if (!app.isPackaged) {
            logger.log('Development mode detected - updates disabled');
            return true;
        }

        // Linux: Only AppImage supports auto-updates
        // DEB/RPM users expect to update via their package manager
        if (process.platform === 'linux' && !process.env.APPIMAGE) {
            logger.log('Linux non-AppImage detected - updates disabled');
            return true;
        }

        return false;
    }

    /**
     * Check if auto-updates are enabled.
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Enable or disable auto-updates.
     * Setting is persisted to disk.
     * @param enabled - Whether to enable auto-updates
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        this.settings.set('autoUpdateEnabled', enabled);
        logger.log(`Auto-updates ${enabled ? 'enabled' : 'disabled'}`);

        if (enabled && !this.checkInterval) {
            this.startPeriodicChecks();
        } else if (!enabled && this.checkInterval) {
            this.stopPeriodicChecks();
        }
    }

    /**
     * Manually check for updates.
     * Safe to call even if updates are disabled (will just log and return).
     */
    async checkForUpdates(): Promise<void> {
        if (!this.enabled) {
            logger.log('Update check skipped - updates disabled');
            return;
        }

        if (!app.isPackaged) {
            logger.log('Update check skipped - development mode');
            return;
        }

        try {
            logger.log('Checking for updates...');
            await this.autoUpdater.checkForUpdatesAndNotify();
        } catch (error) {
            logger.error('Update check failed:', error);
            this.broadcastToWindows('update-error',
                error instanceof Error ? error.message : String(error)
            );
        }
    }

    /**
     * Start periodic update checks.
     * @param intervalMs - Interval between checks in milliseconds (default: 1 hour)
     */
    startPeriodicChecks(intervalMs: number = 60 * 60 * 1000): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }

        if (!this.enabled) {
            logger.log('Periodic checks not started - updates disabled');
            return;
        }

        this.checkInterval = setInterval(() => {
            this.checkForUpdates();
        }, intervalMs);

        logger.log(`Periodic update checks started (interval: ${intervalMs / 1000}s)`);

        // Also check immediately on startup (with a small delay)
        setTimeout(() => {
            this.checkForUpdates();
        }, 10000); // Wait 10 seconds after startup
    }

    /**
     * Stop periodic update checks.
     */
    stopPeriodicChecks(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            logger.log('Periodic update checks stopped');
        }
    }

    /**
     * Quit the application and install the pending update.
     * Only works if an update has been downloaded.
     */
    quitAndInstall(): void {
        logger.log('Quitting and installing update...');
        this.autoUpdater.quitAndInstall(false, true);
    }

    /**
     * Set up event listeners for auto-updater events.
     */
    private setupEventListeners(): void {
        this.autoUpdater.on('error', (error) => {
            logger.error('Auto-updater error:', error);
            this.broadcastToWindows('auto-update:error', error.message);
        });

        this.autoUpdater.on('checking-for-update', () => {
            logger.log('Checking for update...');
        });

        this.autoUpdater.on('update-available', (info: UpdateInfo) => {
            logger.log(`Update available: ${info.version}`);
            this.broadcastToWindows('auto-update:available', info);
        });

        this.autoUpdater.on('update-not-available', (info: UpdateInfo) => {
            logger.log(`No update available (current: ${info.version})`);
        });

        this.autoUpdater.on('download-progress', (progress) => {
            logger.log(`Download progress: ${progress.percent.toFixed(1)}%`);
        });

        this.autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
            logger.log(`Update downloaded: ${info.version}`);
            this.broadcastToWindows('auto-update:downloaded', info);
        });
    }

    /**
     * Broadcast an event to all renderer windows.
     * @param channel - IPC channel name
     * @param data - Data to send
     */
    private broadcastToWindows(channel: string, data: unknown): void {
        const windows = BrowserWindow.getAllWindows();
        for (const win of windows) {
            if (!win.isDestroyed()) {
                win.webContents.send(channel, data);
            }
        }
    }

    /**
     * Clean up resources when the manager is destroyed.
     */
    destroy(): void {
        this.stopPeriodicChecks();
        this.autoUpdater.removeAllListeners();
        logger.log('UpdateManager destroyed');
    }
}
