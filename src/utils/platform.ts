/**
 * Platform detection utilities.
 * 
 * Provides consistent cross-platform detection across the application.
 * Centralizes platform-specific logic for easier testing and maintenance.
 */

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
