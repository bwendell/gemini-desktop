/**
 * Sandbox Detection Utility
 *
 * Detects if the Electron chromium sandbox will fail to initialize on Linux.
 * This is common with AppImages on Ubuntu 24.04+ due to AppArmor restrictions.
 *
 * @module sandboxDetector
 */

import * as fs from 'fs';

/**
 * Check if running as an AppImage.
 * AppImages set the APPIMAGE environment variable when running.
 */
export function isAppImage(): boolean {
    return !!process.env.APPIMAGE;
}

/**
 * Check if AppArmor restricts unprivileged user namespaces.
 * Ubuntu 24.04+ enables this by default, which breaks Electron sandbox in AppImages.
 *
 * @returns true if AppArmor restriction is active
 */
export function hasAppArmorRestriction(): boolean {
    try {
        const value = fs.readFileSync('/proc/sys/kernel/apparmor_restrict_unprivileged_userns', 'utf8').trim();
        return value === '1';
    } catch {
        // File doesn't exist on non-AppArmor systems or older kernels
        return false;
    }
}

/**
 * Check if unprivileged user namespaces are disabled at the kernel level.
 *
 * @returns true if user namespaces are disabled
 */
export function hasUserNamespaceRestriction(): boolean {
    try {
        const value = fs.readFileSync('/proc/sys/kernel/unprivileged_userns_clone', 'utf8').trim();
        return value === '0';
    } catch {
        // File doesn't exist on systems that always allow user namespaces
        return false;
    }
}

/**
 * Detect if the sandbox will fail and should be disabled.
 *
 * Returns true if:
 * 1. Running as an AppImage on Linux, AND
 * 2. Either AppArmor restricts user namespaces OR user namespaces are disabled
 *
 * @returns true if sandbox should be disabled for compatibility
 */
export function shouldDisableSandbox(): boolean {
    // Only applies to Linux
    if (process.platform !== 'linux') {
        return false;
    }

    // Only needed for AppImages (packaged app running from APPIMAGE)
    if (!isAppImage()) {
        return false;
    }

    // Check for restrictions that would cause sandbox failure
    return hasAppArmorRestriction() || hasUserNamespaceRestriction();
}
