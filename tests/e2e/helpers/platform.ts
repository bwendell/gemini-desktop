/**
 * E2E Platform Detection Utilities.
 * Runs browser.execute() to determine platform from rendered context.
 */
import { browser } from '@wdio/globals';

export type E2EPlatform = 'windows' | 'linux' | 'macos';

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
