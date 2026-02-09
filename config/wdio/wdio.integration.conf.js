import { config as dotenvConfig } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getAppArgs, linuxServiceConfig } from './electron-args.js';

dotenvConfig();

// Get directory of this config file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the Electron main entry (compiled from TypeScript)
const electronMainPath = join(__dirname, '../../dist-electron', 'main/main.cjs');

export const config = {
    runner: 'local',
    specs: ['../../tests/integration/**/*.test.ts'],
    exclude: ['../../tests/integration/macos-titlebar.integration.test.ts'],
    maxInstances: 1,
    // Use modern capabilities format (service-level appEntryPoint handles app launch)
    capabilities: [
        {
            browserName: 'electron',
            maxInstances: 1, // Force sequential execution
        },
    ],
    logLevel: 'debug',
    bail: 0,
    baseUrl: 'http://localhost',
    waitforTimeout: 30000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    services: [
        [
            'electron',
            {
                appEntryPoint: electronMainPath,
                appArgs: getAppArgs('--disable-web-security'),
                ...linuxServiceConfig,
            },
        ],
    ],
    framework: 'mocha',
    reporters: ['spec'],
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000,
    },

    /**
     * Gets executed before test execution begins.
     * Build the Electron app before running tests.
     */
    onPrepare: async function () {
        const { execSync } = await import('child_process');
        console.log('Building Electron app for integration tests...');
        execSync('npm run build && npm run build:electron', { stdio: 'inherit' });
    },

    /**
     * Gets executed before each worker process is spawned.
     */
    onWorkerStart: function () {
        // Worker setup if needed
    },

    /**
     * Gets executed after all tests are done.
     */
    onComplete: function () {
        console.log('Integration tests completed');
    },

    /**
     * Gets executed right after terminating the webdriver session.
     */
    afterSession: async function (config, capabilities, specs) {
        // Ensure we don't leave lingering Electron processes
        const { execSync } = await import('child_process');
        const platform = process.platform;

        try {
            if (platform === 'win32') {
                execSync('taskkill /F /IM electron.exe /T', { stdio: 'ignore' });
            } else {
                // On macOS/Linux, be a bit more specific if possible,
                // but pkill -f is common in CI for this app.
                execSync('pkill -f electron', { stdio: 'ignore' });
            }
        } catch (e) {
            // Process might already be gone
        }
    },
};
