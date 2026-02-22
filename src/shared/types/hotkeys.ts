/**
 * Hotkey Types
 *
 * Shared types for hotkey management across main and renderer processes.
 */

/**
 * Identifiers for individual hotkey features.
 */
export type HotkeyId = 'alwaysOnTop' | 'peekAndHide' | 'quickChat' | 'printToPdf';

/**
 * All valid hotkey IDs as an array for iteration and validation.
 */
export const HOTKEY_IDS: HotkeyId[] = ['alwaysOnTop', 'peekAndHide', 'quickChat', 'printToPdf'];

/**
 * Scope of a hotkey determining its registration mechanism.
 * - 'global': Registered via globalShortcut, works system-wide
 * - 'application': Registered via Menu accelerators, works only when app focused
 */
export type HotkeyScope = 'global' | 'application';

/**
 * Hotkeys that work system-wide via Electron's globalShortcut API.
 * These work even when the application is not focused.
 */
export const GLOBAL_HOTKEY_IDS: HotkeyId[] = ['quickChat', 'peekAndHide'];

/**
 * Hotkeys that work only when the application window is focused.
 * These are registered via Menu accelerators.
 */
export const APPLICATION_HOTKEY_IDS: HotkeyId[] = ['alwaysOnTop', 'printToPdf'];

/**
 * Maps each hotkey ID to its scope.
 */
export const HOTKEY_SCOPE_MAP: Record<HotkeyId, HotkeyScope> = {
    quickChat: 'global',
    peekAndHide: 'global',
    alwaysOnTop: 'application',
    printToPdf: 'application',
};

/**
 * Get the scope of a hotkey.
 * @param id - The hotkey identifier
 * @returns The scope ('global' or 'application')
 */
export function getHotkeyScope(id: HotkeyId): HotkeyScope {
    return HOTKEY_SCOPE_MAP[id];
}

/**
 * Check if a hotkey is a global hotkey (works system-wide).
 * @param id - The hotkey identifier
 * @returns True if the hotkey is global
 */
export function isGlobalHotkey(id: HotkeyId): boolean {
    return HOTKEY_SCOPE_MAP[id] === 'global';
}

/**
 * Check if a hotkey is an application hotkey (works only when app focused).
 * @param id - The hotkey identifier
 * @returns True if the hotkey is application-scoped
 */
export function isApplicationHotkey(id: HotkeyId): boolean {
    return HOTKEY_SCOPE_MAP[id] === 'application';
}

/**
 * Individual hotkey settings returned from main process.
 * Each key represents a hotkey feature's enabled state.
 */
export interface IndividualHotkeySettings {
    /** Always on Top toggle hotkey enabled state */
    alwaysOnTop: boolean;
    /** Peek and Hide hotkey enabled state */
    peekAndHide: boolean;
    /** Quick Chat toggle hotkey enabled state */
    quickChat: boolean;
    /** Print to PDF hotkey enabled state */
    printToPdf: boolean;
}

/**
 * Configuration for a single hotkey, including its enabled state and accelerator.
 */
export interface HotkeyConfig {
    /** Whether the hotkey is enabled */
    enabled: boolean;
    /** The keyboard accelerator string (e.g., 'CommandOrControl+Shift+T') */
    accelerator: string;
}

/**
 * Complete hotkey settings with both enabled state and accelerator for each hotkey.
 */
export interface HotkeySettings {
    alwaysOnTop: HotkeyConfig;
    peekAndHide: HotkeyConfig;
    quickChat: HotkeyConfig;
    printToPdf: HotkeyConfig;
}

/**
 * Accelerator settings for persistence.
 * Maps hotkey IDs to their accelerator strings.
 */
export type HotkeyAccelerators = Record<HotkeyId, string>;

/**
 * Default accelerators for each hotkey.
 * Used when no custom accelerator is configured.
 */
export const DEFAULT_ACCELERATORS: HotkeyAccelerators = {
    // Ctrl+Alt+P = Pin window (always on top)
    // Note: Ctrl+Alt+T conflicts with GNOME terminal shortcut
    alwaysOnTop: 'CommandOrControl+Alt+P',
    // Ctrl+Alt+H = Peek and Hide window
    // Note: Ctrl+Alt+E was not conflicting but H is more intuitive
    peekAndHide: 'CommandOrControl+Alt+H',
    // Ctrl+Shift+Space = Quick Chat toggle
    quickChat: 'CommandOrControl+Shift+Space',
    // Ctrl+Shift+P = Print to PDF
    printToPdf: 'CommandOrControl+Shift+P',
};

// ==========================================================================
// Wayland Platform Status Types
// ==========================================================================

/**
 * Supported Linux desktop environments for Wayland global hotkey detection.
 * - 'kde': KDE Plasma (supports XDG Desktop Portal GlobalShortcuts)
 * - 'gnome': GNOME
 * - 'hyprland': Hyprland
 * - 'sway': Sway
 * - 'cosmic': COSMIC
 * - 'deepin': Deepin
 * - 'unknown': Unrecognized or unsupported desktop environment
 */
export type DesktopEnvironment = 'kde' | 'gnome' | 'hyprland' | 'sway' | 'cosmic' | 'deepin' | 'unknown';

/**
 * Method used to register global shortcuts on Wayland.
 * - 'chromium-flag': Uses Chromium's built-in ozone-platform-hint=auto flag
 * - 'dbus-direct': Uses D-Bus XDG Desktop Portal GlobalShortcuts interface (direct path, no Chromium fallback)
 * - 'dbus-fallback': Uses D-Bus XDG Desktop Portal GlobalShortcuts interface (fallback after Chromium registration failure)
 * - 'none': No portal method available; global shortcuts are unsupported
 */
export type PortalMethod = 'chromium-flag' | 'dbus-direct' | 'dbus-fallback' | 'none';

/**
 * Wayland session detection and portal availability status.
 */
export interface WaylandStatus {
    /** Whether the current session is running under Wayland */
    isWayland: boolean;
    /** Detected desktop environment */
    desktopEnvironment: DesktopEnvironment;
    /** Desktop environment version string, or null if not detected */
    deVersion: string | null;
    /** Whether XDG Desktop Portal GlobalShortcuts is available */
    portalAvailable: boolean;
    /** Method selected for global shortcut registration */
    portalMethod: PortalMethod;
}

/**
 * Result of attempting to register a single global hotkey.
 */
export interface HotkeyRegistrationResult {
    /** The hotkey that was registered (or failed) */
    hotkeyId: HotkeyId;
    /** Whether registration succeeded */
    success: boolean;
    /** Error message if registration failed */
    error?: string;
}

/**
 * Aggregated platform hotkey status sent to the renderer for UI display.
 */
export interface PlatformHotkeyStatus {
    /** Wayland session and portal detection results */
    waylandStatus: WaylandStatus;
    /** Per-hotkey registration outcomes */
    registrationResults: HotkeyRegistrationResult[];
    /** Whether global hotkeys are currently functional */
    globalHotkeysEnabled: boolean;
}
