/**
 * Sandbox Detection Utility
 *
 * Detects if the Electron chromium sandbox will fail to initialize on Linux.
 * Chromium uses two sandbox mechanisms on Linux:
 *   1. User namespace sandbox (preferred, requires unprivileged user namespaces)
 *   2. SUID sandbox (fallback, requires chrome-sandbox owned by root with mode 4755)
 *
 * If BOTH mechanisms are unavailable, Electron will crash on startup.
 * This module detects that condition and allows graceful fallback to --no-sandbox.
 *
 * Common scenarios where this applies:
 *   - AppImages on Ubuntu 24.04+ (AppArmor restricts user namespaces)
 *   - Local development (chrome-sandbox in node_modules lacks SUID permissions)
 *   - CI environments with restricted namespaces and no SUID binary setup
 *
 * @module sandboxDetector
 */

import * as fs from 'fs';
import * as path from 'path';

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
 * Check if unprivileged user namespaces are available.
 * This is the preferred sandbox mechanism on modern Linux.
 *
 * User namespaces are available when:
 *   - AppArmor does NOT restrict them, AND
 *   - The kernel allows unprivileged user namespace creation
 *
 * @returns true if user namespace sandbox can be used
 */
export function hasUserNamespaceSupport(): boolean {
    return !hasAppArmorRestriction() && !hasUserNamespaceRestriction();
}

/**
 * Check if the SUID sandbox helper binary has correct permissions.
 * Electron requires chrome-sandbox to be owned by root (uid 0) with the
 * SUID bit set (mode 4755). Without this, the SUID sandbox fallback fails.
 *
 * Also checks the CHROME_DEVEL_SANDBOX environment variable, which Chromium
 * supports for overriding the sandbox binary path.
 *
 * @returns true if the SUID sandbox binary exists with correct permissions
 */
export function hasSuidSandboxPermissions(): boolean {
    // Chromium respects CHROME_DEVEL_SANDBOX as an override path
    const overridePath = process.env.CHROME_DEVEL_SANDBOX;
    const chromeSandboxPath = overridePath || path.join(path.dirname(process.execPath), 'chrome-sandbox');

    try {
        const stat = fs.statSync(chromeSandboxPath);
        // Must be owned by root (uid 0) and have SUID bit + 0755 permissions
        return stat.uid === 0 && (stat.mode & 0o4755) === 0o4755;
    } catch {
        // Binary doesn't exist or can't be stat'd
        return false;
    }
}

/**
 * Detect if the sandbox will fail and should be disabled.
 *
 * Returns true when BOTH sandbox mechanisms are unavailable:
 *   1. User namespace sandbox is blocked (AppArmor or kernel restriction), AND
 *   2. SUID sandbox fallback is not viable (chrome-sandbox lacks permissions)
 *
 * This covers:
 *   - AppImages on restrictive systems (original use case)
 *   - Local development (chrome-sandbox in node_modules is never SUID)
 *   - CI environments with restricted namespaces
 *
 * @returns true if sandbox should be disabled for compatibility
 */
export function shouldDisableSandbox(): boolean {
    // Only applies to Linux — macOS and Windows use different sandbox mechanisms
    if (process.platform !== 'linux') {
        return false;
    }

    // If user namespaces are available, the preferred sandbox works fine
    if (hasUserNamespaceSupport()) {
        return false;
    }

    // User namespaces are restricted — check if SUID sandbox is a viable fallback
    if (hasSuidSandboxPermissions()) {
        return false;
    }

    // Neither sandbox mechanism is available — disable to prevent crash
    return true;
}
