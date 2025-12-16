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

// Path to the Electron main entry
const electronMainPath = path.resolve(__dirname, 'electron/main.cjs');

export const config = {
    // Test specs
    specs: ['./tests/e2e/**/*.spec.ts'],
    maxInstances: 1,

    // Use Electron service with appEntryPoint
    services: [
        ['electron', {
            appEntryPoint: electronMainPath,
            appArgs: [],
        }],
    ],

    // Capabilities for Electron
    capabilities: [
        {
            browserName: 'electron',
        },
    ],

    // Framework & Reporters
    reporters: ['spec'],
    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000,
    },

    // Build the frontend before tests
    onPrepare: () => {
        console.log('Building frontend for E2E tests...');
        const result = spawnSync('npm', ['run', 'build'], {
            stdio: 'inherit',
            shell: true,
        });

        if (result.status !== 0) {
            throw new Error('Failed to build frontend');
        }
        console.log('Build complete.');
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
        await new Promise(resolve => setTimeout(resolve, 2000));
    },
};
