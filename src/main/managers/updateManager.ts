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
import type BadgeManager from './badgeManager';
import type TrayManager from './trayManager';

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
  private lastCheckTime: number = 0;
  private readonly settings: SettingsStore<AutoUpdateSettings>;
  private readonly badgeManager?: BadgeManager;
  private readonly trayManager?: TrayManager;

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
    if (this.shouldDisableUpdates()) {
      this.enabled = false;
      this.autoUpdater = null as unknown as AppUpdater; // Will never be used
      logger.log('Auto-updates disabled for this platform/install type');
      logger.log(`UpdateManager initialized (enabled: ${this.enabled})`);
      return; // Exit early - don't import/configure autoUpdater at all
    }

    // Only now do we initialize autoUpdater - after confirming updates are supported
    this.autoUpdater = getAutoUpdater();

    // Load user preference (default to enabled)
    this.enabled = this.settings.get('autoUpdateEnabled') ?? true;

    // Configure auto-updater - only if updates are supported
    this.autoUpdater.autoDownload = true;
    this.autoUpdater.autoInstallOnAppQuit = true;

    if (process.argv.includes('--test-auto-update')) {
      this.autoUpdater.forceDevUpdateConfig = true;
    }

    // Configure logging
    this.autoUpdater.logger = log;
    log.transports.file.level = 'info';

    this.setupEventListeners();
    logger.log(`UpdateManager initialized (enabled: ${this.enabled})`);

    // Start periodic checks if enabled
    if (this.enabled) {
      this.startPeriodicChecks();
    }
  }

  /**
   * Determine if auto-updates should be disabled based on platform and install type.
   * @returns true if updates should be disabled
   */
  private shouldDisableUpdates(): boolean {
    const currentPlatform = this.mockPlatform || process.platform;
    const currentEnv = this.mockEnv || process.env;

    // Allow updates in test environment (Vitest or Integration Tests)
    if (currentEnv.VITEST || currentEnv.TEST_AUTO_UPDATE) {
      return false;
    }

    // Linux: Disable updates in non-AppImage environments FIRST
    // This MUST come before any other checks to prevent electron-updater
    // from being accessed on headless Linux (CI), where it hangs on D-Bus
    if (currentPlatform === 'linux' && !currentEnv.APPIMAGE) {
      logger.log('Linux non-AppImage detected (or simulated) - updates disabled');
      return true;
    }

    // Windows: Disable updates if running as Portable
    if (currentPlatform === 'win32' && currentEnv.PORTABLE_EXECUTABLE_DIR) {
      logger.log('Windows Portable detected - updates disabled');
      return true;
    }

    // Development mode - skip updates (unless testing)
    if (
      !app.isPackaged &&
      !process.argv.includes('--test-auto-update') &&
      !currentEnv.TEST_AUTO_UPDATE
    ) {
      logger.log('Development mode detected - updates disabled');
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
      await this.autoUpdater.checkForUpdatesAndNotify();
    } catch (error) {
      logger.error('Update check failed:', error);
      // MASKED ERROR: Do NOT send the raw error message to the renderer/user.
      this.broadcastToWindows(
        'update-error',
        'The auto-update service encountered an error. Please try again later.'
      );
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

    this.autoUpdater.quitAndInstall(false, true);
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
   */
  private setupEventListeners(): void {
    this.autoUpdater.on('error', (error) => {
      logger.error('Auto-updater error:', error);
      // MASKED ERROR: Do NOT send the raw error message to the renderer/user.
      // Raw errors from electron-updater can be massive (HTML, full stack traces) and
      // cause UI rendering issues (toasts going off-screen).
      // We log the real error above for debugging, but tell the user a generic message.
      this.broadcastToWindows(
        'auto-update:error',
        'The auto-update service encountered an error. Please try again later.'
      );
    });

    this.autoUpdater.on('checking-for-update', () => {
      logger.log('Checking for update...');
      this.lastCheckTime = Date.now();
      this.broadcastToWindows('auto-update:checking', null);
    });

    this.autoUpdater.on('update-available', (info: UpdateInfo) => {
      logger.log(`Update available: ${info.version}`);
      this.broadcastToWindows('auto-update:available', info);
    });

    this.autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      logger.log(`No update available (current: ${info.version})`);
      this.broadcastToWindows('auto-update:not-available', info);
    });

    this.autoUpdater.on('download-progress', (progress) => {
      logger.log(`Download progress: ${progress.percent.toFixed(1)}%`);
      this.broadcastToWindows('auto-update:download-progress', progress);
    });

    this.autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      logger.log(`Update downloaded: ${info.version}`);

      // Show native badge and tray tooltip
      this.badgeManager?.showUpdateBadge();
      this.trayManager?.setUpdateTooltip(info.version);

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
        'auto-update:error',
        'The auto-update service encountered an error. Please try again later.'
      );
    } else if (event === 'checking-for-update') {
      this.broadcastToWindows('auto-update:checking', null);
    } else {
      this.broadcastToWindows(`auto-update:${event.replace('update-', '')}`, data);
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
