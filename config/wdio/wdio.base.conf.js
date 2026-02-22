/**
 * Base WebdriverIO configuration for Electron E2E testing.
 *
 * This file contains shared configuration used by all test groups.
 * Group-specific configurations extend this file and define their own 'specs' array.
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { getAppArgs, linuxServiceConfig, killOrphanElectronProcesses } from './electron-args.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
// Retry policy: spec-level retries for infrastructure flakiness, test-level disabled for speed
// Rationale: One retry at spec level catches environment issues without excessive overhead
const SPEC_FILE_RETRIES = Number(process.env.WDIO_SPEC_FILE_RETRIES ?? 1);
const SPEC_FILE_RETRY_DELAY_SECONDS = Number(process.env.WDIO_SPEC_FILE_RETRY_DELAY_SECONDS ?? 5);
// Test-level retries disabled by default - use spec-level for flaky tests
const TEST_RETRIES = Number(process.env.WDIO_TEST_RETRIES ?? 0);

const SENSITIVE_KEY_REGEX = /(token|cookie|auth|session|password|secret|key)/i;

const sanitizeFilename = (value) =>
    value
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 200) || 'unknown';

const redactSensitiveData = (input) => {
    if (Array.isArray(input)) {
        return input.map((item) => redactSensitiveData(item));
    }

    if (input && typeof input === 'object') {
        return Object.entries(input).reduce((accumulator, [key, value]) => {
            if (SENSITIVE_KEY_REGEX.test(key)) {
                accumulator[key] = '[REDACTED]';
            } else {
                accumulator[key] = redactSensitiveData(value);
            }
            return accumulator;
        }, {});
    }

    return input;
};

const ensureDirectory = async (directoryPath) => {
    await fs.promises.mkdir(directoryPath, { recursive: true });
};

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
    reporters: ['spec', ['allure', { outputDir: 'tests/e2e/allure-results/' }]],
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

    afterTest: async function (test, context, result) {
        if (result?.passed) {
            return;
        }

        try {
            const screenshotsDir = path.resolve(__dirname, '../../tests/e2e/screenshots');
            const logsDir = path.resolve(__dirname, '../../tests/e2e/logs');
            await Promise.all([ensureDirectory(screenshotsDir), ensureDirectory(logsDir)]);

            const specName = sanitizeFilename(path.basename(test?.file ?? 'unknown-spec'));
            const titleName = sanitizeFilename(test?.title ?? 'unknown-test');
            const timestamp = Date.now();
            const baseName = `${specName}--${titleName}--${timestamp}`;
            const screenshotPath = path.join(screenshotsDir, `${baseName}.png`);
            const logPath = path.join(logsDir, `${baseName}.json`);

            await browser.saveScreenshot(screenshotPath);

            const appState = await browser.electron.execute((electron) => {
                const windows = electron.BrowserWindow.getAllWindows().map((window) => ({
                    id: window.id,
                    title: window.getTitle(),
                    bounds: window.getBounds(),
                    isVisible: window.isVisible(),
                    isFocused: window.isFocused(),
                }));

                return {
                    userDataPath: electron.app.getPath('userData'),
                    windows,
                    process: {
                        platform: electron.process.platform,
                        versions: electron.process.versions,
                        pid: electron.process.pid,
                    },
                };
            });

            const redactedState = redactSensitiveData(appState);
            await fs.promises.writeFile(logPath, JSON.stringify(redactedState, null, 2), 'utf-8');

            // Attach to Allure if available
            if (browser.allure) {
                await browser.allure.addAttachment('Screenshot', await fs.promises.readFile(screenshotPath), 'image/png');
                await browser.allure.addAttachment('State Dump', JSON.stringify(redactedState, null, 2), 'application/json');
                await browser.allure.addAttachment('Rerun Command', `npx wdio run config/wdio/wdio.conf.js --spec ${test?.file || ''}`, 'text/plain');
            }
        } catch (error) {
            console.warn('Failed to capture failure diagnostics:', error);
        }
    },

    // Kill any orphaned Electron processes after each spec file
    afterSession: async function () {
        await killOrphanElectronProcesses();
    },

    // Generate flaky test report and copy allure categories after worker ends
    onWorkerEnd: async function (cid, exitCode, specs, retries) {
        try {
            const logsDir = path.resolve(__dirname, '../../tests/e2e/logs');
            await fs.promises.mkdir(logsDir, { recursive: true });
            
            if (retries && retries.retries > 0) {
                const flakyTests = specs.map(spec => ({
                    specFile: spec,
                    retries: retries.retries,
                    timestamp: new Date().toISOString()
                }));
                
                const flakyReport = {
                    generatedAt: new Date().toISOString(),
                    flakyTests
                };
                
                await fs.promises.writeFile(
                    path.join(logsDir, 'flaky-report.json'),
                    JSON.stringify(flakyReport, null, 2),
                    'utf-8'
                );
            }
            
            // Copy allure categories
            const categoriesSource = path.resolve(__dirname, '../../tests/e2e/allure-categories.json');
            const categoriesDest = path.resolve(__dirname, '../../tests/e2e/allure-results/categories.json');
            await fs.promises.mkdir(path.dirname(categoriesDest), { recursive: true });
            await fs.promises.copyFile(categoriesSource, categoriesDest).catch(() => {});
        } catch (error) {
            console.warn('Failed to generate flaky report:', error);
        }
    },
};
