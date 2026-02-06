/**
 * Platform detection utilities.
 *
 * Provides consistent cross-platform detection across the application.
 * Centralizes platform-specific logic for easier testing and maintenance.
 */

import type { PlatformHotkeyStatus } from '../../shared/types/hotkeys';

/**
 * Supported operating systems.
 */
export type Platform = 'windows' | 'linux' | 'macos';

/**
 * Returns the current operating system type.
 *
 * Uses Electron's preload API if available, otherwise falls back to
 * navigator.platform detection.
 *
 * @returns The current platform ('windows', 'linux', or 'macos')
 */
export function getPlatform(): Platform {
    // Check if Electron API is available (from preload)
    if (window.electronAPI) {
        const platform = window.electronAPI.platform;
        if (platform === 'darwin') return 'macos';
        if (platform === 'win32') return 'windows';
        return 'linux';
    }

    // Fallback to navigator.platform for testing/development
    const nav = navigator.platform.toLowerCase();
    if (nav.includes('mac')) return 'macos';
    if (nav.includes('win')) return 'windows';
    return 'linux';
}

/**
 * Checks if the current platform is macOS.
 *
 * Use this for conditionally rendering macOS-specific UI elements,
 * such as hiding custom window controls when native traffic lights are used.
 *
 * @returns true if running on macOS, false otherwise
 */
export function isMacOS(): boolean {
    return getPlatform() === 'macos';
}

/**
 * Checks if the current platform is Windows.
 *
 * @returns true if running on Windows, false otherwise
 */
export function isWindows(): boolean {
    return getPlatform() === 'windows';
}

/**
 * Checks if the current platform is Linux.
 *
 * @returns true if running on Linux, false otherwise
 */
export function isLinux(): boolean {
    return getPlatform() === 'linux';
}

/**
 * Checks if the current platform uses custom window controls.
 *
 * On macOS, we use native traffic light buttons via titleBarStyle: 'hidden'.
 * On Windows and Linux, we render custom React-based window controls.
 *
 * @returns true if custom controls should be rendered
 */
export function usesCustomWindowControls(): boolean {
    return !isMacOS();
}

/**
 * Determines if the application is running in development mode.
 *
 * Uses multiple signals to detect dev mode across different environments:
 * - Vite's DEV flag (works when Vite is serving)
 * - MODE not production (Vite build mode)
 * - localhost URL (Electron loading from dev server)
 * - file:// protocol with Electron (local dev without server)
 *
 * Supports environment override for testing.
 *
 * @param envOverride - Optional environment object for testing
 * @returns true if in development mode, false otherwise
 */
export function isDevMode(env?: { DEV?: boolean; MODE?: string }): boolean {
    // Use overrides if provided, otherwise fall back to import.meta.env
    const dev = env?.DEV ?? import.meta.env.DEV;
    const mode = env?.MODE ?? import.meta.env.MODE;

    // Vite dev mode signals
    if (dev || mode !== 'production') {
        return true;
    }

    // Localhost check (Electron loading from dev server)
    if (window.location.hostname === 'localhost') {
        return true;
    }

    // file:// protocol with Electron = local development
    // (production Electron apps also use file://, but we check for specific dev indicators)
    if (window.location.protocol === 'file:' && window.electronAPI?.isElectron) {
        // Check if app is NOT packaged (dev mode indicator)
        // In production, app.isPackaged would be true, but we can't check that from renderer
        // Instead, check if we're loading from a typical dev path pattern
        const pathname = window.location.pathname;
        // Dev builds typically load from dist/ in project directory,
        // Production loads from app.asar or resources/app/
        if (!pathname.includes('app.asar') && !pathname.includes('resources')) {
            return true;
        }
    }

    return false;
}

/**
 * @deprecated Use isDevMode() instead
 */
export const getIsDev = isDevMode;

/**
 * Get the current platform hotkey status from the main process.
 *
 * This provides detailed information about Wayland session status,
 * portal availability, and individual hotkey registration results.
 *
 * @returns Promise resolving to the platform hotkey status, or null if unavailable
 */
export async function getPlatformHotkeyStatus(): Promise<PlatformHotkeyStatus | null> {
    if (window.electronAPI?.getPlatformHotkeyStatus) {
        return window.electronAPI.getPlatformHotkeyStatus();
    }
    return null;
}

/**
 * Checks if the current environment is Wayland with portal support.
 *
 * This is the criteria for enabling global hotkeys on Wayland.
 *
 * @param status - The platform hotkey status
 * @returns true if global hotkeys are supported on this Wayland session
 */
export function isWaylandWithPortal(status: PlatformHotkeyStatus | null): boolean {
    return status?.waylandStatus.isWayland === true && status?.waylandStatus.portalAvailable === true;
}

/**
 * Checks if global hotkeys are currently reported as enabled by the system.
 *
 * @param status - The platform hotkey status
 * @returns true if global hotkeys are enabled
 */
export function areGlobalHotkeysEnabled(status: PlatformHotkeyStatus | null): boolean {
    return status?.globalHotkeysEnabled === true;
}
