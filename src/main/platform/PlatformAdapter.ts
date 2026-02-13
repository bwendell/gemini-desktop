/**
 * PlatformAdapter interface.
 *
 * Defines the contract that each platform-specific adapter must implement.
 * Adapters encapsulate higher-level platform behaviors (app configuration,
 * hotkey strategy, badge rendering, window tray behavior, menu structure)
 * rather than simple boolean checks.
 *
 * @module PlatformAdapter
 */

import type { MenuItemConstructorOptions } from 'electron';
import type { WaylandStatus } from '../../shared/types/hotkeys';
import type { Logger } from '../types';
import type {
    PlatformId,
    HotkeyRegistrationPlan,
    ShowBadgeParams,
    ClearBadgeParams,
    DockMenuCallbacks,
    MainWindowPlatformConfig,
    TitleBarStyle,
    AppIconFilename,
} from './types';

/**
 * Contract for platform-specific behavior in the Electron main process.
 *
 * Concrete implementations:
 * - LinuxWaylandAdapter — Linux under Wayland compositor
 * - LinuxX11Adapter     — Linux under X11
 * - WindowsAdapter      — Windows
 * - MacAdapter          — macOS
 */
export interface PlatformAdapter {
    /** Identifies which adapter is active */
    readonly id: PlatformId;

    /**
     * Apply platform-specific app configuration at startup.
     * For Linux: sets app name, WM_CLASS, desktop name, Wayland logging.
     * For Windows/macOS: sets display name.
     */
    applyAppConfiguration(app: Electron.App, logger: Logger): void;

    /**
     * Apply Windows Application User Model ID for notification branding
     * and taskbar grouping. No-op on non-Windows platforms.
     */
    applyAppUserModelId(app: Electron.App): void;

    /**
     * Determine how global hotkeys should be registered on this platform.
     */
    getHotkeyRegistrationPlan(): HotkeyRegistrationPlan;

    /**
     * Get the Wayland detection status for diagnostic/UI reporting.
     * Non-Linux adapters return a default (all-false) WaylandStatus.
     */
    getWaylandStatus(): WaylandStatus;

    /**
     * Whether the app should quit when all windows are closed.
     * macOS returns false (stay in dock); all others return true.
     */
    shouldQuitOnWindowAllClosed(): boolean;

    getTitleBarStyle(): TitleBarStyle;

    getAppIconFilename(): AppIconFilename;

    shouldDisableUpdates(env: NodeJS.ProcessEnv): boolean;

    requestMediaPermissions(logger: Logger): Promise<void>;

    getNotificationSupportHint(): string | undefined;

    // ----- Badge methods -----

    /**
     * Whether this platform supports dock/taskbar badges.
     * macOS (dock badge) and Windows (overlay icon) return true; Linux returns false.
     */
    supportsBadges(): boolean;

    /**
     * Apply a badge on the dock/taskbar using platform-specific APIs.
     * - macOS: `app.dock.setBadge(text)` — requires `app` parameter
     * - Windows: `window.setOverlayIcon(overlayIcon, description)`
     * - Linux: no-op
     */
    showBadge(params: ShowBadgeParams, app?: Electron.App): void;

    /**
     * Clear the badge from dock/taskbar.
     * - macOS: `app.dock.setBadge('')` — requires `app` parameter
     * - Windows: `window.setOverlayIcon(null, '')`
     * - Linux: no-op
     */
    clearBadge(params: ClearBadgeParams, app?: Electron.App): void;

    // ----- Window methods -----

    /**
     * Get additional platform-specific window configuration for the main window.
     * Linux adapters return `{ wmClass: 'gemini-desktop' }`; others return `{}`.
     */
    getMainWindowPlatformConfig(): MainWindowPlatformConfig;

    /**
     * Hide the main window to tray with platform-specific behavior.
     * Non-macOS platforms also call `setSkipTaskbar(true)`.
     */
    hideToTray(window: Electron.BrowserWindow): void;

    /**
     * Restore the main window from tray with platform-specific behavior.
     * Non-macOS platforms also call `setSkipTaskbar(false)`.
     */
    restoreFromTray(window: Electron.BrowserWindow): void;

    // ----- Menu methods -----

    /**
     * Whether to include a macOS-style app menu (prepended to menu template).
     * Only macOS returns true.
     */
    shouldIncludeAppMenu(): boolean;

    /**
     * Get the label for the settings/options menu item.
     * macOS: "Settings...", Windows/Linux: "Options"
     */
    getSettingsMenuLabel(): string;

    /**
     * Get the role for the File menu's close/quit item.
     * macOS: 'close' (close window), Windows/Linux: 'quit' (quit app)
     */
    getWindowCloseRole(): 'close' | 'quit';

    /**
     * Get the dock menu template (macOS only).
     * Returns null on non-macOS platforms.
     */
    getDockMenuTemplate(callbacks: DockMenuCallbacks): MenuItemConstructorOptions[] | null;
}
