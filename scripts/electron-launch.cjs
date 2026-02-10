/**
 * Electron Launcher with Sandbox Detection
 *
 * This script detects whether the Linux sandbox will work before launching
 * Electron. If neither the user namespace sandbox nor the SUID sandbox is
 * available, it passes --no-sandbox to the Electron binary.
 *
 * This MUST run before Electron starts because Chromium's SUID sandbox check
 * happens at the native C++ level, before any JavaScript executes.
 *
 * Usage: node scripts/electron-launch.cjs [electron args...]
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Detect if the Linux sandbox will fail.
 * Mirrors the logic in src/main/utils/sandboxDetector.ts but runs as a
 * standalone Node.js script before Electron is launched.
 *
 * @returns {boolean} true if --no-sandbox should be passed
 */
function shouldDisableSandbox() {
    if (process.platform !== 'linux') {
        return false;
    }

    // Check user namespace support
    const hasUserNamespaceSupport = (() => {
        // Check AppArmor restriction
        try {
            const apparmor = fs.readFileSync('/proc/sys/kernel/apparmor_restrict_unprivileged_userns', 'utf8').trim();
            if (apparmor === '1') return false;
        } catch {
            // No AppArmor restriction
        }

        // Check kernel-level restriction
        try {
            const userns = fs.readFileSync('/proc/sys/kernel/unprivileged_userns_clone', 'utf8').trim();
            if (userns === '0') return false;
        } catch {
            // No kernel restriction
        }

        return true;
    })();

    if (hasUserNamespaceSupport) {
        return false;
    }

    // Check SUID sandbox fallback
    const electronPath = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron');
    const overridePath = process.env.CHROME_DEVEL_SANDBOX;
    const chromeSandboxPath = overridePath || path.join(path.dirname(electronPath), 'chrome-sandbox');

    try {
        const stat = fs.statSync(chromeSandboxPath);
        if (stat.uid === 0 && (stat.mode & 0o4755) === 0o4755) {
            return false; // SUID sandbox is viable
        }
    } catch {
        // Binary missing or can't stat
    }

    return true; // Neither sandbox mechanism available
}

// Determine extra args
const extraArgs = [];
if (shouldDisableSandbox()) {
    console.log('[electron-launch] Sandbox unavailable — launching with --no-sandbox');
    extraArgs.push('--no-sandbox');
}

// Forward all arguments after this script to electron
const userArgs = process.argv.slice(2);
const electronBin = require('electron');
const allArgs = ['.', ...extraArgs, ...userArgs];

// Spawn electron with inherited stdio
const child = spawn(electronBin, allArgs, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
});

child.on('exit', (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
    } else {
        process.exit(code || 0);
    }
});
