/**
 * E2E Platform Detection Utilities.
 * Runs browser.execute() to determine platform from rendered context.
 */
/// <reference path="./wdio-electron.d.ts" />

import { browser } from '@wdio/globals';
import { readFileSync } from 'fs';

export type E2EPlatform = 'windows' | 'linux' | 'macos';

/**
 * Detect WSL at module load time (before browser is available).
 * This is more reliable than using browser.electron.execute().
 */
const IS_WSL_ENVIRONMENT = (() => {
    // Only check on Linux (Node.js process.platform)
    if (process.platform !== 'linux') return false;

    try {
        const version = readFileSync('/proc/version', 'utf8');
        return version.toLowerCase().includes('microsoft');
    } catch {
        return false;
    }
})();

/**
 * Detect CI at module load time.
 */
const IS_CI_ENVIRONMENT = !!(process.env.CI || process.env.GITHUB_ACTIONS);

/**
 * Gets the current platform from the browser context.
 * @returns {Promise<E2EPlatform>} 'windows', 'linux', or 'macos'
 */
export async function getPlatform(): Promise<E2EPlatform> {
    const navPlatform = await browser.execute(() => navigator.platform);
    const lower = navPlatform.toLowerCase();
    if (lower.includes('mac') || lower.includes('darwin')) return 'macos';
    if (lower.includes('win')) return 'windows';
    return 'linux';
}

/**
 * Checks if the current platform is macOS.
 * @returns {Promise<boolean>} True if running on macOS
 */
export async function isMacOS(): Promise<boolean> {
    return (await getPlatform()) === 'macos';
}

/**
 * Checks if the current platform is Windows.
 * @returns {Promise<boolean>} True if running on Windows
 */
export async function isWindows(): Promise<boolean> {
    return (await getPlatform()) === 'windows';
}

/**
 * Checks if the current platform is Linux.
 * @returns {Promise<boolean>} True if running on Linux
 */
export async function isLinux(): Promise<boolean> {
    return (await getPlatform()) === 'linux';
}

/**
 * Determines if the app uses custom window controls (Windows/Linux).
 * macOS uses native controls.
 * @returns {Promise<boolean>} True if custom controls should be visible
 */
export async function usesCustomControls(): Promise<boolean> {
    return !(await isMacOS());
}

/**
 * Detects if running in WSL (Windows Subsystem for Linux).
 *
 * WSL lacks a real window manager, so window operations like minimize/maximize
 * don't behave correctly. This is similar to running in headless Xvfb.
 *
 * @returns {Promise<boolean>} True if running in WSL
 */
export async function isWSL(): Promise<boolean> {
    if (!(await isLinux())) return false;
    return IS_WSL_ENVIRONMENT;
}

/**
 * Detects if running on Linux in CI (headless Xvfb) or WSL.
 *
 * This is useful for skipping tests that rely on window manager features
 * that don't work in headless/limited environments:
 * - Window minimize detection
 * - Window maximize detection
 * - Global hotkey registration (Wayland limitations)
 *
 * Environments detected:
 * - CI (via CI or GITHUB_ACTIONS env vars)
 * - WSL (Windows Subsystem for Linux)
 *
 * @returns {Promise<boolean>} True if running on Linux CI or WSL
 */
export async function isLinuxCI(): Promise<boolean> {
    if (!(await isLinux())) return false;
    return IS_CI_ENVIRONMENT || IS_WSL_ENVIRONMENT;
}

/**
 * Synchronous platform detection for module-level use.
 * Uses process.platform directly (not browser.execute).
 *
 * Use these functions in describe.skip patterns and other module-level checks
 * that run before the browser context is available:
 *
 * @example
 * const describeMac = isMacOSSync() ? describe : describe.skip;
 * describeMac('macOS-specific tests', () => { ... });
 */

/**
 * Checks if the current platform is macOS (synchronous).
 * Uses process.platform directly, suitable for module-level checks.
 * @returns {boolean} True if running on macOS
 */
export function isMacOSSync(): boolean {
    return process.platform === 'darwin';
}

/**
 * Checks if the current platform is Windows (synchronous).
 * Uses process.platform directly, suitable for module-level checks.
 * @returns {boolean} True if running on Windows
 */
export function isWindowsSync(): boolean {
    return process.platform === 'win32';
}

/**
 * Checks if the current platform is Linux (synchronous).
 * Uses process.platform directly, suitable for module-level checks.
 * @returns {boolean} True if running on Linux
 */
export function isLinuxSync(): boolean {
    return process.platform === 'linux';
}
