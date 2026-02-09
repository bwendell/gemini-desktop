/**
 * WebdriverIO configuration for testing packaged Electron release builds.
 *
 * This configuration uses appBinaryPath to launch the packaged executable
 * instead of appEntryPoint which launches from source.
 *
 * Platform Support:
 * - Windows: release/win-unpacked/Gemini Desktop.exe
 * - Linux: release/linux-unpacked/gemini-desktop
 * - macOS: release/mac/Gemini Desktop.app/Contents/MacOS/Gemini Desktop
 *
 * @see https://webdriver.io/docs/desktop-testing/electron
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * Get the path to the packaged Electron binary based on the current platform.
 * @returns {string} Path to the executable
 */
function getReleaseBinaryPath() {
    const releaseDir = path.resolve(__dirname, '../../release');
    const platform = process.platform;

    let binaryPath;

    switch (platform) {
        case 'win32':
            binaryPath = path.join(releaseDir, 'win-unpacked', 'Gemini Desktop.exe');
            break;
        case 'darwin':
            binaryPath = path.join(releaseDir, 'mac', 'Gemini Desktop.app', 'Contents', 'MacOS', 'Gemini Desktop');
            // Also check for arm64 build
            if (!fs.existsSync(binaryPath)) {
                binaryPath = path.join(
                    releaseDir,
                    'mac-arm64',
                    'Gemini Desktop.app',
                    'Contents',
                    'MacOS',
                    'Gemini Desktop'
                );
            }
            break;
        case 'linux':
            binaryPath = path.join(releaseDir, 'linux-unpacked', 'gemini-desktop');
            break;
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }

    if (!fs.existsSync(binaryPath)) {
        throw new Error(
            `Release binary not found at: ${binaryPath}\n` +
                `Please run 'npm run electron:build' first to create a packaged build.`
        );
    }

    console.log(`[Release E2E] Using binary: ${binaryPath}`);
    return binaryPath;
}

export const config = {
    specs: [
        // Core functionality tests that work with packaged builds
        // These tests don't spawn additional Electron processes or require dev paths
        '../../tests/e2e/app-startup.spec.ts',
        '../../tests/e2e/menu_bar.spec.ts',
        '../../tests/e2e/options-window.spec.ts',
        '../../tests/e2e/theme.spec.ts',
        '../../tests/e2e/theme-selector-visual.spec.ts',
        '../../tests/e2e/theme-selector-keyboard.spec.ts',

        // Window management tests
        '../../tests/e2e/window-controls.spec.ts',
        '../../tests/e2e/window-bounds.spec.ts',

        // Tray functionality tests
        '../../tests/e2e/tray.spec.ts',
        // NOTE: tray-quit.spec.ts excluded - it quits the app which terminates WebDriverIO session
        '../../tests/e2e/minimize-to-tray.spec.ts',

        // Options and settings tests
        '../../tests/e2e/options-tabs.spec.ts',
        '../../tests/e2e/settings-persistence.spec.ts',

        // Other core functionality
        '../../tests/e2e/context-menu.spec.ts',
        '../../tests/e2e/external-links.spec.ts',

        // Release-specific tests (packaging verification)
        '../../tests/e2e/release/*.spec.ts',
    ],
    // Exclude tests that don't work with packaged builds:
    // - single-instance.spec.ts: Spawns additional Electron processes
    // - auth.spec.ts: May try to spawn additional windows with dev paths
    // - quick-chat*.spec.ts: May have timing issues with packaged builds
    // - hotkeys.spec.ts: Global hotkey registration may differ in packaged builds
    // - tray-quit.spec.ts: Quits app, terminating WebDriverIO session
    exclude: [],
    maxInstances: 1,

    // Use Electron service with appBinaryPath for packaged builds
    services: [
        [
            'electron',
            {
                appBinaryPath: getReleaseBinaryPath(),
                appArgs: process.env.CI
                    ? [
                          ...(process.platform === 'linux' ? ['--no-sandbox', '--disable-setuid-sandbox'] : []),
                          '--disable-dev-shm-usage',
                          '--disable-gpu',
                          '--enable-logging',
                          '--test-auto-update',
                      ]
                    : [
                          '--test-auto-update',
                          // Wayland support for KDE/GNOME on Linux
                          ...(process.platform === 'linux' && process.env.XDG_SESSION_TYPE === 'wayland'
                              ? ['--ozone-platform=wayland', '--no-sandbox']
                              : []),
                      ],
                // Ubuntu 24.04+ requires AppArmor profile for Electron (Linux only)
                apparmorAutoInstall: process.env.CI && process.platform === 'linux' ? 'sudo' : false,
                // Enable wdio-electron-service's built-in Xvfb management for Linux CI
                // This is required for parallel test execution - do NOT use xvfb-run wrapper
                // as it sets DISPLAY which prevents autoXvfb from working properly with workers
                ...(process.platform === 'linux' && process.env.CI
                    ? {
                          autoXvfb: true,
                          xvfbAutoInstall: true,
                          xvfbAutoInstallMode: 'sudo',
                          xvfbMaxRetries: 5, // More retries for CI stability
                      }
                    : {}),
            },
        ],
    ],

    // Capabilities for Electron
    capabilities: [
        {
            browserName: 'electron',
            maxInstances: 1,
        },
    ],

    // Framework & Reporters
    reporters: ['spec'],
    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd',
        timeout: 90000,
    },

    // Retry failed spec files
    specFileRetries: 1,
    specFileRetriesDelay: 2,
    specFileRetriesDeferred: false,

    // No build step needed - we're testing the already-built package
    onPrepare: () => {
        console.log('[Release E2E] Testing packaged release build...');
    },

    // Log level
    logLevel: 'info',

    // Base URL for the app
    baseUrl: '',

    // Default timeout for all waitFor* commands
    waitforTimeout: 15000,

    // Connection retry settings
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,

    // Wait for app to fully load before starting tests
    before: async function (capabilities, specs) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
    },

    // Ensure the app quits after tests
    after: async function () {
        await browser.electron.execute((electron) => electron.app.quit());
    },
};
