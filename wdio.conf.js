/**
 * WebdriverIO configuration for Electron E2E testing.
 * 
 * Platform Support:
 * - Windows: ✅ Fully supported
 * - Linux: ✅ Fully supported  
 * - macOS: ✅ Fully supported
 * 
 * @see https://webdriver.io/docs/desktop-testing/electron
 */

import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Path to the Electron main entry (compiled from TypeScript)
const electronMainPath = path.resolve(__dirname, 'dist-electron/main.cjs');

export const config = {
    specs: [
        './tests/e2e/app-startup.spec.ts',
        './tests/e2e/menu_bar.spec.ts',
        './tests/e2e/options-window.spec.ts',
        './tests/e2e/menu-interactions.spec.ts',
        './tests/e2e/theme.spec.ts',
        './tests/e2e/theme-selector-visual.spec.ts',
        './tests/e2e/theme-selector-keyboard.spec.ts',
        './tests/e2e/external-links.spec.ts',
    ],
    maxInstances: 1,

    // Use Electron service with appEntryPoint
    services: [
        ['electron', {
            appEntryPoint: electronMainPath,
            appArgs: process.env.CI ? [
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--enable-logging'
            ] : [],
        }],
    ],

    // Capabilities for Electron
    capabilities: [
        {
            browserName: 'electron',
            maxInstances: 1, // Force sequential execution
        },
    ],

    // Framework & Reporters
    reporters: ['spec'],
    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000,
    },

    // Build the frontend and Electron backend before tests
    onPrepare: () => {
        console.log('Building frontend for E2E tests...');
        let result = spawnSync('npm', ['run', 'build'], {
            stdio: 'inherit',
            shell: true,
        });

        if (result.status !== 0) {
            throw new Error('Failed to build frontend');
        }
        console.log('Build complete.');

        console.log('Building Electron backend...');
        result = spawnSync('npm', ['run', 'build:electron'], {
            stdio: 'inherit',
            shell: true,
        });

        if (result.status !== 0) {
            throw new Error('Failed to build Electron backend');
        }
        console.log('Electron backend build complete.');
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
        // Add a short delay to ensure React has time to mount
        // Increased wait time for CI environments to prevent race conditions
        await new Promise(resolve => setTimeout(resolve, 5000));
    },

    // Ensure the app quits after tests
    after: async function () {
        await browser.electron.execute((electron) => electron.app.quit());
    },
};
