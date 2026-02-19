/**
 * Base WebdriverIO configuration for Electron E2E testing.
 *
 * This file contains shared configuration used by all test groups.
 * Group-specific configurations extend this file and define their own 'specs' array.
 */

import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { getAppArgs, linuxServiceConfig, killOrphanElectronProcesses } from './electron-args.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SPEC_FILE_RETRIES = Number(process.env.WDIO_SPEC_FILE_RETRIES ?? 2);
const SPEC_FILE_RETRY_DELAY_SECONDS = Number(process.env.WDIO_SPEC_FILE_RETRY_DELAY_SECONDS ?? 5);
const TEST_RETRIES = Number(process.env.WDIO_TEST_RETRIES ?? 2);

export const electronMainPath = path.resolve(__dirname, '../../dist-electron/main/main.cjs');

export const baseConfig = {
    maxInstances: 1,

    services: [
        [
            'electron',
            {
                appEntryPoint: electronMainPath,
                appArgs: getAppArgs('--test-auto-update', '--e2e-disable-auto-submit'),
                ...linuxServiceConfig,
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
        timeout: 90000, // Increased from 60s for stability
        retries: TEST_RETRIES,
    },

    // Retry failed spec files to handle flaky tests
    specFileRetries: SPEC_FILE_RETRIES,
    specFileRetriesDelay: SPEC_FILE_RETRY_DELAY_SECONDS,
    specFileRetriesDeferred: false,

    // Build the frontend and Electron backend before tests
    onPrepare: () => {
        if (process.env.SKIP_BUILD) {
            console.log('Skipping build (SKIP_BUILD is set)...');
            return;
        }

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
    // Linux needs more time for xvfb/display initialization
    connectionRetryTimeout: process.platform === 'linux' || process.platform === 'win32' ? 180000 : 120000,
    connectionRetryCount: 3,

    // Wait for app to fully load before starting tests
    before: async function (capabilities, specs) {
        // Add a delay to ensure React has time to mount
        // Windows needs more time for initial startup in CI (Defender scan, first-time extraction)
        const startupDelay = process.platform === 'win32' ? 8000 : 5000;
        await new Promise((resolve) => setTimeout(resolve, startupDelay));
    },

    // Ensure the app quits after tests
    after: async function () {
        try {
            await browser.electron.execute((electron) => electron.app.quit());
        } catch (error) {
            // App may already be gone or in a bad state
        }
    },

    // Kill any orphaned Electron processes after each spec file
    afterSession: async function () {
        await killOrphanElectronProcesses();
    },
};
