/**
 * Base WebdriverIO configuration for Electron E2E testing.
 *
 * This file contains shared configuration used by all test groups.
 * Group-specific configurations extend this file and define their own 'specs' array.
 */

import path from 'path';
import { promises as fs } from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import {
    chromedriverCapabilities,
    ensureArmChromedriver,
    getAppArgs,
    linuxServiceConfig,
    killOrphanElectronProcesses,
} from './electron-args.js';
import { getChromedriverOptions } from './chromedriver-options.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const chromedriverOptions = getChromedriverOptions();
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
                cdpBridgeTimeout: 120000,
                cdpBridgeWaitInterval: 1000,
                cdpBridgeRetryCount: 12,
                ...linuxServiceConfig,
            },
        ],
    ],

    // Capabilities for Electron
    capabilities: [
        {
            browserName: 'electron',
            'wdio:chromedriverOptions': {
                ...chromedriverOptions,
                ...(chromedriverCapabilities['wdio:chromedriverOptions'] ?? {}),
            },
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
    onPrepare: async () => {
        await ensureArmChromedriver();
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

    // Clear test execution breadcrumbs at test start
    beforeTest: async function (test, context) {
        // Import inside hook to avoid circular dependencies
        // Guard against import failures with safe fallback logger
        let testLogger;
        try {
            const imported = await import('../../tests/e2e/helpers/testLogger.ts');
            testLogger = imported.testLogger;
        } catch (error) {
            // Fallback logger with no-op clear/dump methods
            testLogger = { clear: () => {}, dump: () => '' };
        }
        testLogger.clear();

        try {
            const imported = await import('../../tests/e2e/helpers/failureContext.ts');
            if (typeof imported.installRendererErrorInterceptor === 'function') {
                await imported.installRendererErrorInterceptor();
            }
        } catch (error) {}
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

    // Capture screenshot, DOM snapshot, and breadcrumb trail on test failure
    afterTest: async function (test, context, { error, result, duration, passed, retries }) {
        // Import inside hook to avoid circular dependencies
        // Guard against import failures with safe fallback logger
        let testLogger;
        try {
            const imported = await import('../../tests/e2e/helpers/testLogger.ts');
            testLogger = imported.testLogger;
        } catch (error) {
            // Fallback logger with no-op dump method
            testLogger = { dump: () => '' };
        }

        // Dump breadcrumbs on failure
        if (!passed) {
            const breadcrumbOutput = testLogger.dump();
            console.log(breadcrumbOutput);
        }

        if (!passed) {
            let screenshotPath;
            let domPath;
            try {
                const sanitizeSegment = (value, fallback) =>
                    String(value ?? fallback)
                        .replace(/[<>:"/\\|?*]/g, '_')
                        .replace(/\s+/g, '-')
                        .replace(/[. ]+$/g, '')
                        .slice(0, 80);
                const sanitizedSpecName = sanitizeSegment(test?.parent, 'unknown-spec');
                const sanitizedTestTitle = sanitizeSegment(test?.title, 'unknown-test');
                const retryAttempt = typeof retries === 'number' ? retries : (retries?.attempts ?? 0);
                const attemptNum = retryAttempt + 1;
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const baseFilename = `${sanitizedSpecName}-${sanitizedTestTitle}-attempt-${attemptNum}-${timestamp}`;
                screenshotPath = path.join(__dirname, '../../tests/e2e/screenshots', `${baseFilename}.png`);
                domPath = path.join(__dirname, '../../tests/e2e/screenshots', `${baseFilename}.html`);

                await fs.mkdir(path.dirname(screenshotPath), { recursive: true });

                await browser.saveScreenshot(screenshotPath);
                console.log(`Screenshot saved: ${screenshotPath}`);

                const domSnapshot = await browser.execute(() => document.documentElement.outerHTML);
                await fs.writeFile(domPath, String(domSnapshot ?? ''), 'utf8');
                console.log(`DOM snapshot saved: ${domPath}`);
            } catch (captureError) {
                console.warn('Failed to capture test failure artifacts:', captureError?.message);
            }

            if (screenshotPath && domPath) {
                try {
                    const imported = await import('../../tests/e2e/helpers/failureContext.ts');
                    if (typeof imported.captureFailureContext === 'function') {
                        const contextData = await imported.captureFailureContext(
                            test,
                            context ?? {},
                            { error, result, duration, passed, retries },
                            {
                                screenshotPath,
                                domSnapshotPath: domPath,
                            }
                        );
                        const contextPath = screenshotPath.replace('.png', '.failure-context.json');
                        await fs.writeFile(contextPath, JSON.stringify(contextData, null, 2), 'utf8');
                        console.log(`Failure context saved: ${contextPath}`);
                    }
                } catch (contextError) {
                    console.warn('Failed to capture failure context:', contextError?.message);
                }
            }
        }
    },
};
