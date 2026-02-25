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
// NOTE: electron-updater is imported DYNAMICALLY to prevent D-Bus hang on Linux CI.
// Static imports cause electron-updater to initialize on module load, which hangs
// when there's no D-Bus session (headless Linux/CI environment).
import type { UpdateInfo, AppUpdater } from 'electron-updater';
import log from 'electron-log';
import { createLogger } from '../utils/logger';
import type SettingsStore from '../store';
import { getPlatformAdapter } from '../platform/platformAdapterFactory';
import type { PlatformAdapter } from '../platform/PlatformAdapter';
import { LinuxX11Adapter } from '../platform/adapters/LinuxX11Adapter';
import { MacAdapter } from '../platform/adapters/MacAdapter';
import { WindowsAdapter } from '../platform/adapters/WindowsAdapter';
import type BadgeManager from './badgeManager';
import type TrayManager from './trayManager';
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
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
 * Optional dependencies for visual notifications
 */
export interface UpdateManagerDeps {
    badgeManager?: BadgeManager;
    trayManager?: TrayManager;
}

/**
 * Get the autoUpdater instance via dynamic import.
 * This is critical for Linux CI - static import causes electron-updater to
 * initialize immediately on module load, which hangs trying to connect to D-Bus.
 */
async function getAutoUpdater(): Promise<AppUpdater> {
    const { autoUpdater } = await import('electron-updater');
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
    private autoUpdater: AppUpdater | null = null;
    private autoUpdaterPromise: Promise<AppUpdater> | null = null;
    private enabled: boolean = true;
    private checkInterval: ReturnType<typeof setInterval> | null = null;
    private lastCheckTime: number = 0;
    private isFirstCheck: boolean = true;
    private isManualCheck: boolean = false;
    private readonly settings: SettingsStore<AutoUpdateSettings>;
    private readonly badgeManager?: BadgeManager;
    private readonly trayManager?: TrayManager;
    private readonly updatesDisabled: boolean;

    /**
     * Creates a new UpdateManager instance.
     * @param settings - Settings store for persisting auto-update preferences
     * @param deps - Optional dependencies for visual notifications
     */
    constructor(settings: SettingsStore<AutoUpdateSettings>, deps?: UpdateManagerDeps) {
        this.settings = settings;
        this.badgeManager = deps?.badgeManager;
        this.trayManager = deps?.trayManager;

        // Check if we should disable updates FIRST before any autoUpdater initialization
        // This prevents electron-updater from initializing native resources on unsupported platforms
        // CRITICAL: This MUST happen synchronously in constructor to prevent D-Bus hang on Linux CI
        this.updatesDisabled = this.shouldDisableUpdates();

        if (this.updatesDisabled) {
            this.enabled = false;
            logger.log('Auto-updates disabled for this platform/install type');
            logger.log(`UpdateManager initialized (enabled: ${this.enabled})`);
            return; // Exit early - autoUpdater will never be loaded
        }

        // Load user preference (default to enabled)
        this.enabled = this.settings.get('autoUpdateEnabled') ?? true;
        logger.log(`UpdateManager initialized (enabled: ${this.enabled})`);

        // Start periodic checks if enabled
        // EXCEPTION: In test mode (--test-auto-update), we skip automatic checks
        // because CI environments cannot reach GitHub releases. The test flag is
        // specifically for verifying initialization works (dev-app-update.yml is found),
        // not for testing actual network update checks.
        if (this.enabled && !process.argv.includes('--test-auto-update')) {
            this.startPeriodicChecks();
        }
    }

    /**
     * Lazily initialize the autoUpdater.
     * This uses dynamic import to avoid loading electron-updater on unsupported platforms.
     */
    private async ensureAutoUpdater(): Promise<AppUpdater | null> {
        if (this.updatesDisabled) {
            return null;
        }

        if (this.autoUpdater) {
            return this.autoUpdater;
        }

        // Avoid multiple concurrent imports
        if (this.autoUpdaterPromise) {
            return this.autoUpdaterPromise;
        }

        this.autoUpdaterPromise = (async () => {
            logger.log('Lazily loading electron-updater...');
            const updater = await getAutoUpdater();

            // Configure auto-updater
            updater.autoDownload = true;
            updater.autoInstallOnAppQuit = true;

            if (process.argv.includes('--test-auto-update')) {
                updater.forceDevUpdateConfig = true;
            }

            // Configure logging
            updater.logger = log;
            log.transports.file.level = 'info';

            this.setupEventListeners(updater);
            this.autoUpdater = updater;
            logger.log('electron-updater loaded and configured');

            return updater;
        })();

        return this.autoUpdaterPromise;
    }

    /**
     * Determine if auto-updates should be disabled based on platform and install type.
     * @returns true if updates should be disabled
     */
    private shouldDisableUpdates(): boolean {
        const currentPlatform = this.mockPlatform || process.platform;
        const currentEnv = this.mockEnv || process.env;

        // Allow updates in test environment (Vitest, Integration Tests, or E2E with --test-auto-update flag)
        if (currentEnv.VITEST || currentEnv.TEST_AUTO_UPDATE || process.argv.includes('--test-auto-update')) {
            return false;
        }

        const platformAdapter = this.getAdapterForUpdateChecks(currentPlatform);

        if (platformAdapter.shouldDisableUpdates(currentEnv)) {
            if (currentPlatform === 'linux') {
                logger.log('Linux non-AppImage detected (or simulated) - updates disabled');
                return true;
            }

            if (currentPlatform === 'win32') {
                logger.log('Windows Portable detected - updates disabled');
                return true;
            }
        }

        // Development mode - skip updates (unless testing)
        if (!app.isPackaged && !process.argv.includes('--test-auto-update') && !currentEnv.TEST_AUTO_UPDATE) {
            logger.log('Development mode detected - updates disabled');
            return true;
        }

        return false;
    }

    private getAdapterForUpdateChecks(currentPlatform: NodeJS.Platform): PlatformAdapter {
        if (!this.mockPlatform || currentPlatform === process.platform) {
            return getPlatformAdapter();
        }

        switch (currentPlatform) {
            case 'linux':
                return new LinuxX11Adapter();
            case 'win32':
                return new WindowsAdapter();
            case 'darwin':
                return new MacAdapter();
            default:
                logger.warn(`Unsupported mocked platform '${currentPlatform}'. Falling back to host adapter.`);
                return getPlatformAdapter();
        }
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
     * Check for updates.
     * @param manual - If true, bypasses the enabled check (for user-initiated checks)
     */
    async checkForUpdates(manual: boolean = false): Promise<void> {
        if (!this.enabled && !manual) {
            logger.log('Update check skipped - updates disabled');
            return;
        }

        if (!app.isPackaged && !process.argv.includes('--test-auto-update')) {
            logger.log('Update check skipped - development mode');
            return;
        }

        try {
            logger.log(manual ? 'Manual update check...' : 'Checking for updates...');
            this.isManualCheck = manual;
            const updater = await this.ensureAutoUpdater();
            if (!updater) {
                logger.log('Update check skipped - updater not available');
                return;
            }
            await updater.checkForUpdatesAndNotify();
        } catch (error: any) {
            logger.error('Update check failed:', error);

            // Check if this is a known "benign" error (like 404/403 which means no access/no releases)
            // or a network error which we should suppress for background checks
            const errorStr = (error?.message || '').toString();
            const isNetworkOrConfigError =
                errorStr.includes('404') ||
                errorStr.includes('403') ||
                errorStr.includes('Github') ||
                errorStr.includes('Network') ||
                errorStr.includes('net::') ||
                errorStr.includes('Cannot find latest') ||
                errorStr.includes('no published versions');

            // If it's a manual check, or if it's NOT a benign/network error, we warn the user.
            // But if it IS a background check AND a network/config error, we stay silent to avoid annoying toasts.
            if (manual || !isNetworkOrConfigError) {
                // MASKED ERROR: Do NOT send the raw error message to the renderer/user.
                this.broadcastToWindows(
                    'update-error',
                    'The auto-update service encountered an error. Please try again later.'
                );
            } else {
                logger.log('Suppressing update error notification (background check + network/config error)');
                logger.log('Suppressed error details:', errorStr || error);
            }
        }
    }

    private startupTimeout: ReturnType<typeof setTimeout> | null = null;

    /**
     * Start periodic update checks.
     * @param intervalMs - Interval between checks in milliseconds (default: 6 hours)
     */
    startPeriodicChecks(intervalMs: number = 6 * 60 * 60 * 1000): void {
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
        // Clear any existing startup timeout first
        if (this.startupTimeout) {
            clearTimeout(this.startupTimeout);
        }

        this.startupTimeout = setTimeout(() => {
            this.checkForUpdates();
            this.startupTimeout = null;
        }, 10000); // Wait 10 seconds after startup
    }

    /**
     * Stop periodic update checks.
     */
    stopPeriodicChecks(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }

        if (this.startupTimeout) {
            clearTimeout(this.startupTimeout);
            this.startupTimeout = null;
        }

        logger.log('Periodic (and startup) update checks stopped');
    }

    /**
     * Quit the application and install the pending update.
     * Only works if an update has been downloaded.
     */
    quitAndInstall(): void {
        logger.log('Quitting and installing update...');

        // Clear native indicators before quitting
        this.badgeManager?.clearUpdateBadge();
        this.trayManager?.clearUpdateTooltip();

        if (
            this.mockEnv?.TEST_AUTO_UPDATE ||
            process.env.TEST_AUTO_UPDATE ||
            process.argv.includes('--test-auto-update')
        ) {
            logger.log('Test auto-update mode detected - skipping quitAndInstall');
            return;
        }

        if (this.autoUpdater) {
            this.autoUpdater.quitAndInstall(false, true);
        } else {
            logger.warn('quitAndInstall called but autoUpdater not loaded');
        }
    }

    /**
     * Get the timestamp of the last update check.
     */
    getLastCheckTime(): number {
        return this.lastCheckTime;
    }

    /**
     * Get the current tray tooltip (for E2E testing).
     */
    getTrayTooltip(): string {
        return this.trayManager?.getToolTip() || '';
    }

    /**
     * Set up event listeners for auto-updater events.
     * @param updater - The autoUpdater instance to attach listeners to
     */
    private setupEventListeners(updater: AppUpdater): void {
        updater.on('error', (error) => {
            logger.error('Auto-updater error:', error);
            // MASKED ERROR: Do NOT send the raw error message to the renderer/user.
            // Raw errors from electron-updater can be massive (HTML, full stack traces) and
            // cause UI rendering issues (toasts going off-screen).
            // We log the real error above for debugging, but tell the user a generic message.
            this.broadcastToWindows(
                IPC_CHANNELS.AUTO_UPDATE_ERROR,
                'The auto-update service encountered an error. Please try again later.'
            );
        });

        updater.on('checking-for-update', () => {
            logger.log('Checking for update...');
            this.lastCheckTime = Date.now();
            this.broadcastToWindows(IPC_CHANNELS.AUTO_UPDATE_CHECKING, null);
        });

        updater.on('update-available', (info: UpdateInfo) => {
            logger.log(`Update available: ${info.version}`);
            this.broadcastToWindows(IPC_CHANNELS.AUTO_UPDATE_AVAILABLE, info);
            this.isFirstCheck = false;
            this.isManualCheck = false;
        });

        updater.on('update-not-available', (info: UpdateInfo) => {
            logger.log(`No update available (current: ${info.version})`);
            if (this.isFirstCheck || this.isManualCheck) {
                this.broadcastToWindows(IPC_CHANNELS.AUTO_UPDATE_NOT_AVAILABLE, info);
            } else {
                logger.log('Suppressing "up to date" notification (periodic background check)');
            }
            this.isFirstCheck = false;
            this.isManualCheck = false;
        });

        updater.on('download-progress', (progress) => {
            logger.log(`Download progress: ${progress.percent.toFixed(1)}%`);
            this.broadcastToWindows(IPC_CHANNELS.AUTO_UPDATE_DOWNLOAD_PROGRESS, progress);
        });

        updater.on('update-downloaded', (info: UpdateInfo) => {
            logger.log(`Update downloaded: ${info.version}`);

            // Show native badge and tray tooltip
            this.badgeManager?.showUpdateBadge();
            this.trayManager?.setUpdateTooltip(info.version);

            this.broadcastToWindows(IPC_CHANNELS.AUTO_UPDATE_DOWNLOADED, info);
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
                try {
                    win.webContents.send(channel, data);
                } catch (error) {
                    logger.warn(`Failed to send ${channel} to window:`, error);
                }
            }
        }
    }

    // =========================================================================
    // Dev Testing Methods (only for manual testing in development)
    // =========================================================================

    private mockPlatform: NodeJS.Platform | null = null;
    private mockEnv: Record<string, string> | null = null;

    /**
     * Show the update badge for dev testing.
     * This allows testing the native badge without a real update.
     * @param version - Optional version string for tray tooltip
     */
    devShowBadge(version: string = '2.0.0-test'): void {
        logger.log('[DEV] Showing test update badge');
        this.badgeManager?.showUpdateBadge();
        this.trayManager?.setUpdateTooltip(version);
    }

    /**
     * Clear the update badge for dev testing.
     */
    devClearBadge(): void {
        logger.log('[DEV] Clearing test update badge');
        this.badgeManager?.clearUpdateBadge();
        this.trayManager?.clearUpdateTooltip();
    }

    /**
     * Mock the platform for testing logic.
     */
    devMockPlatform(platform: NodeJS.Platform | null): void {
        this.mockPlatform = platform;
        this.devReevaluate();
    }

    /**
     * Mock env vars for testing logic.
     */
    devMockEnv(env: Record<string, string> | null): void {
        this.mockEnv = env;
        this.devReevaluate();
    }

    /**
     * Emit a simulated update event.
     */
    devEmitUpdateEvent(event: string, data: any): void {
        logger.log(`[DEV] Emitting mock event: ${event}`);
        if (event === 'error') {
            // MASKED ERROR: Do NOT send the raw error message to the renderer/user.
            // Raw errors from electron-updater can be massive (HTML, full stack traces) and
            // cause UI rendering issues (toasts going off-screen).
            // We log the real error above for debugging, but tell the user a generic message.
            this.broadcastToWindows(
                IPC_CHANNELS.AUTO_UPDATE_ERROR,
                'The auto-update service encountered an error. Please try again later.'
            );
        } else if (event === 'checking-for-update') {
            this.broadcastToWindows(IPC_CHANNELS.AUTO_UPDATE_CHECKING, null);
        } else {
            // Map update events to their corresponding IPC channels
            const eventChannelMap: Record<string, string> = {
                'update-available': IPC_CHANNELS.AUTO_UPDATE_AVAILABLE,
                'update-not-available': IPC_CHANNELS.AUTO_UPDATE_NOT_AVAILABLE,
                'update-downloaded': IPC_CHANNELS.AUTO_UPDATE_DOWNLOADED,
                'update-error': IPC_CHANNELS.AUTO_UPDATE_ERROR,
            };
            const channel = eventChannelMap[event];
            if (channel) {
                this.broadcastToWindows(channel, data);
            }
        }

        // Also update internal state if needed
        if (event === 'update-downloaded') {
            this.badgeManager?.showUpdateBadge();
            this.trayManager?.setUpdateTooltip(data.version);
        }
    }

    /**
     * Re-evaluate enabled state based on current (potentially mocked) platform/env.
     */
    private devReevaluate(): void {
        if (this.shouldDisableUpdates()) {
            this.enabled = false;
        } else {
            // Restore enabled from settings if valid platform
            this.enabled = this.settings.get('autoUpdateEnabled') ?? true;
        }
    }

    /**
     * Clean up resources when the manager is destroyed.
     */
    destroy(): void {
        this.stopPeriodicChecks();
        // Only remove listeners if autoUpdater was initialized
        if (this.autoUpdater) {
            this.autoUpdater.removeAllListeners();
        }
        logger.log('UpdateManager destroyed');
    }
}
