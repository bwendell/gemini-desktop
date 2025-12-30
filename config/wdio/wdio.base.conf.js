/**
 * Base WebdriverIO configuration for Electron E2E testing.
 *
 * This file contains shared configuration used by all test groups.
 * Group-specific configurations extend this file and define their own 'specs' array.
 */

import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Path to the Electron main entry (compiled from TypeScript)
export const electronMainPath = path.resolve(__dirname, '../../dist-electron/main/main.cjs');

export const baseConfig = {
  // specs: [] <- To be defined in group configs

  maxInstances: 1,

  // Use Electron service with appEntryPoint
  services: [
    [
      'electron',
      {
        appEntryPoint: electronMainPath,
        appArgs: process.env.CI
          ? [
              ...(process.platform === 'linux' ? ['--no-sandbox', '--disable-setuid-sandbox'] : []),
              '--disable-dev-shm-usage',
              '--disable-gpu',
              '--enable-logging',
              '--test-auto-update',
              '--e2e-disable-auto-submit',
            ]
          : ['--test-auto-update', '--e2e-disable-auto-submit'],
        // Ubuntu 24.04+ requires AppArmor profile for Electron (Linux only)
        // See: https://github.com/electron/electron/issues/41066
        apparmorAutoInstall: process.env.CI && process.platform === 'linux' ? 'sudo' : false,
        // Enable built-in XVFB support for headless Linux environments
        // This properly propagates the virtual display to worker processes
        // (xvfb-run wrapper does NOT work because workers are forked without DISPLAY)
        ...(process.platform === 'linux' && process.env.CI
          ? {
              autoXvfb: true,
              xvfbAutoInstall: true,
              xvfbAutoInstallMode: 'sudo',
            }
          : {}),
      },
    ],
  ],

  // Capabilities for Electron
  capabilities: [
    {
      browserName: 'electron',
      maxInstances: 1, // Force sequential execution within the group
    },
  ],

  // Framework & Reporters
  reporters: ['spec'],
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 90000, // Increased from 60s for stability
  },

  // Retry failed spec files to handle flaky tests
  specFileRetries: 1,
  specFileRetriesDelay: 2,
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
  connectionRetryTimeout: process.platform === 'linux' ? 180000 : 120000,
  connectionRetryCount: 3,

  // Xvfb is handled by xvfb-run in CI workflow for Linux

  // Wait for app to fully load before starting tests
  before: async function (capabilities, specs) {
    // Add a short delay to ensure React has time to mount
    // Increased wait time for CI environments to prevent race conditions
    await new Promise((resolve) => setTimeout(resolve, 5000));
  },

  // Ensure the app quits after tests
  after: async function () {
    await browser.electron.execute((electron) => electron.app.quit());
  },
};
