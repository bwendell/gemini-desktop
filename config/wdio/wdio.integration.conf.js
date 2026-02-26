import { config as dotenvConfig } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
    chromedriverCapabilities,
    ensureArmChromedriver,
    getAppArgs,
    linuxServiceConfig,
    killOrphanElectronProcesses,
} from './electron-args.js';
import { getChromedriverOptions } from './chromedriver-options.js';

dotenvConfig();

// Get directory of this config file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SPEC_FILE_RETRIES = Number(process.env.WDIO_SPEC_FILE_RETRIES ?? 2);
const chromedriverOptions = getChromedriverOptions();
const SPEC_FILE_RETRY_DELAY_SECONDS = Number(process.env.WDIO_SPEC_FILE_RETRY_DELAY_SECONDS ?? 5);
const TEST_RETRIES = Number(process.env.WDIO_TEST_RETRIES ?? 2);
const VITE_TEST_MODE = 'integration';

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
            'wdio:chromedriverOptions': {
                ...chromedriverOptions,
                ...(chromedriverCapabilities['wdio:chromedriverOptions'] ?? {}),
            },
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
                appArgs: getAppArgs('--disable-web-security', '--integration-test'),
                ...linuxServiceConfig,
            },
        ],
    ],
    framework: 'mocha',
    reporters: ['spec'],
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000,
        retries: TEST_RETRIES,
    },

    // Retry failed spec files to reduce CI timing-related flakes
    specFileRetries: SPEC_FILE_RETRIES,
    specFileRetriesDelay: SPEC_FILE_RETRY_DELAY_SECONDS,
    specFileRetriesDeferred: false,

    /**
     * Gets executed before test execution begins.
     * Build the Electron app before running tests.
     */
    onPrepare: async function () {
        await ensureArmChromedriver();
        const { execSync } = await import('child_process');
        console.log('Building Electron app for integration tests...');
        execSync(`vite build --mode ${VITE_TEST_MODE} && npm run build:electron`, { stdio: 'inherit' });
    },

    // Wait for app to fully load before starting tests
    before: async function () {
        // Windows needs more time for initial startup in CI (Defender scan, first-time extraction)
        const startupDelay = process.platform === 'win32' ? 8000 : 5000;
        await new Promise((resolve) => setTimeout(resolve, startupDelay));
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

    after: async function () {
        try {
            await browser.electron.execute((electron) => electron.app.quit());
        } catch (error) {
            console.warn('Failed to quit Electron app:', error);
        }
    },

    /**
     * Gets executed right after terminating the webdriver session.
     */
    afterSession: async function () {
        await killOrphanElectronProcesses();
    },
};
