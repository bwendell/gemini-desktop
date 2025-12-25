import { config as dotenvConfig } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenvConfig();

// Get directory of this config file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine platform-specific Electron binary path
const platform = process.platform;
let electronBinary = 'electron';

if (platform === 'win32') {
    electronBinary = 'electron.exe';
} else if (platform === 'darwin') {
    electronBinary = 'Electron.app/Contents/MacOS/Electron';
} else {
    electronBinary = 'electron';
}

export const config = {
    runner: 'local',
    specs: ['../../tests/integration/**/*.test.ts'],
    exclude: [],
    maxInstances: 1,
    capabilities: [
        {
            browserName: 'electron',
            'wdio:electronServiceOptions': {
                appBinaryPath: join(__dirname, '../../node_modules', 'electron', 'dist', electronBinary),
                appEntryPoint: join(__dirname, '../../dist-electron', 'main.cjs'),
                appArgs: ['--disable-web-security', '--no-sandbox', '--disable-gpu'], // flags for CI/Linux stability
            },
        },
    ],
    logLevel: 'debug',
    bail: 0,
    baseUrl: 'http://localhost',
    waitforTimeout: 30000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    services: ['electron'],
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
        execSync('npm run build:electron', { stdio: 'inherit' });
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
