/**
 * Platform detection utilities.
 * 
 * Provides consistent cross-platform detection across the application.
 * Centralizes platform-specific logic for easier testing and maintenance.
 */

import { type as getOsType } from '@tauri-apps/plugin-os';

/**
 * Supported operating systems.
 */
export type Platform = 'windows' | 'linux' | 'macos';

/**
 * Returns the current operating system type.
 * 
 * This is a thin wrapper around the Tauri OS plugin that provides:
 * - Type-safe return value
 * - Centralized platform detection for testing
 * 
 * @returns The current platform ('windows', 'linux', or 'macos')
 */
export function getPlatform(): Platform {
    return getOsType() as Platform;
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
 * On macOS, we use native traffic light buttons via titleBarStyle: 'overlay'.
 * On Windows and Linux, we render custom React-based window controls.
 * 
 * @returns true if custom controls should be rendered
 */
export function usesCustomWindowControls(): boolean {
    return !isMacOS();
}
