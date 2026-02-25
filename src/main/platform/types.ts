/**
 * Platform adapter types.
 *
 * Defines the type vocabulary shared across all platform adapters
 * and the factory that selects them.
 *
 * @module PlatformTypes
 */

import type { WaylandStatus } from '../../shared/types/hotkeys';

/**
 * Identifies the concrete adapter in use at runtime.
 */
export type PlatformId = 'linux-wayland' | 'linux-x11' | 'windows' | 'mac';

export type TitleBarStyle = 'hidden' | undefined;

export type AppIconFilename = 'icon.ico' | 'icon.png';

export type TrayIconFilename = 'trayIconTemplate.png' | 'icon.ico' | 'icon.png';

/**
 * How global hotkeys should be registered on this platform.
 *
 * - `native`       — Electron's globalShortcut API (Windows/macOS)
 * - `wayland-dbus` — D-Bus XDG Desktop Portal (Linux Wayland with portal)
 * - `disabled`     — No global hotkeys (Linux X11 or portal unavailable)
 */
export type HotkeyRegistrationMode = 'native' | 'wayland-dbus' | 'disabled';

/**
 * Describes how and whether to register global hotkeys,
 * along with the Wayland detection status for diagnostic reporting.
 */
export interface HotkeyRegistrationPlan {
    /** Registration strategy to use */
    mode: HotkeyRegistrationMode;
    /** Wayland session status; non-Linux adapters use a default (all-false) value */
    waylandStatus: WaylandStatus;
}

/**
 * Parameters for showing a platform badge on dock/taskbar.
 */
export interface ShowBadgeParams {
    /** Reference to the main BrowserWindow (needed for Windows overlay) */
    window: Electron.BrowserWindow | null;
    /** Accessible description of the badge */
    description: string;
    /** Badge text (macOS dock badge text) */
    text: string;
    /** Pre-created overlay icon (Windows taskbar overlay) */
    overlayIcon: Electron.NativeImage | null;
}

/**
 * Parameters for clearing a platform badge.
 */
export interface ClearBadgeParams {
    /** Reference to the main BrowserWindow (needed for Windows overlay clear) */
    window: Electron.BrowserWindow | null;
}

/**
 * Callbacks passed to getDockMenuTemplate to avoid adapter→manager circular dependency.
 */
export interface DockMenuCallbacks {
    /** Restore the main window from tray */
    restoreFromTray: () => void;
    /** Open the settings/options window */
    createOptionsWindow: () => void;
}

/**
 * Platform-specific BrowserWindow configuration.
 *
 * Electron's `wmClass` property exists at runtime but is not in the
 * official type definitions.  This interface provides type safety for
 * the `getMainWindowPlatformConfig()` return value.
 */
export interface MainWindowPlatformConfig {
    /** Linux WM_CLASS / Wayland app_id — omitted on Windows/macOS */
    wmClass?: string;
}
