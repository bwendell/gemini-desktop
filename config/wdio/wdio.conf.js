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
const electronMainPath = path.resolve(__dirname, '../../dist-electron/main/main.cjs');

export const config = {
  specs: [
    // =========================================================================
    // Startup & Initialization
    // =========================================================================
    '../../tests/e2e/app-startup.spec.ts',
    '../../tests/e2e/first-run.spec.ts',
    '../../tests/e2e/auto-update-init.spec.ts',

    // =========================================================================
    // Window Management
    // =========================================================================
    '../../tests/e2e/always-on-top.spec.ts',
    '../../tests/e2e/boss-key.spec.ts',
    '../../tests/e2e/dependent-windows.spec.ts',
    '../../tests/e2e/window-bounds.spec.ts',
    '../../tests/e2e/window-controls.spec.ts',
    '../../tests/e2e/window-state.spec.ts',
    '../../tests/e2e/window-titlebar.spec.ts',
    '../../tests/e2e/window-management-edge-cases.spec.ts',

    // =========================================================================
    // Menu & Context Menu
    // =========================================================================
    '../../tests/e2e/menu_bar.spec.ts',
    '../../tests/e2e/menu-actions.spec.ts',
    '../../tests/e2e/menu-interactions.spec.ts',
    '../../tests/e2e/context-menu.spec.ts',

    // =========================================================================
    // Hotkeys
    // =========================================================================
    '../../tests/e2e/hotkeys.spec.ts',
    '../../tests/e2e/hotkey-registration.spec.ts',
    '../../tests/e2e/hotkey-toggle.spec.ts',

    // =========================================================================
    // Quick Chat
    // =========================================================================
    '../../tests/e2e/quick-chat.spec.ts',
    '../../tests/e2e/quick-chat-full-workflow.spec.ts',

    // =========================================================================
    // Options & Settings
    // =========================================================================
    '../../tests/e2e/options-window.spec.ts',
    '../../tests/e2e/options-tabs.spec.ts',
    '../../tests/e2e/settings-persistence.spec.ts',

    // =========================================================================
    // Theme
    // =========================================================================
    '../../tests/e2e/theme.spec.ts',
    '../../tests/e2e/theme-selector-visual.spec.ts',
    '../../tests/e2e/theme-selector-keyboard.spec.ts',

    // =========================================================================
    // Authentication & External Links
    // =========================================================================
    '../../tests/e2e/auth.spec.ts',
    '../../tests/e2e/oauth-links.spec.ts',
    '../../tests/e2e/external-links.spec.ts',

    // =========================================================================
    // Tray & Minimize
    // =========================================================================
    '../../tests/e2e/tray.spec.ts',
    '../../tests/e2e/tray-quit.spec.ts',
    '../../tests/e2e/minimize-to-tray.spec.ts',

    // =========================================================================
    // Auto-Update
    // =========================================================================
    '../../tests/e2e/auto-update-error-recovery.spec.ts',
    '../../tests/e2e/auto-update-happy-path.spec.ts',
    '../../tests/e2e/auto-update-interactions.spec.ts',
    '../../tests/e2e/auto-update-persistence.spec.ts',
    '../../tests/e2e/auto-update-platform.spec.ts',
    '../../tests/e2e/auto-update-startup.spec.ts',
    '../../tests/e2e/auto-update-toggle.spec.ts',
    '../../tests/e2e/auto-update-tray.spec.ts',

    // =========================================================================
    // Error Recovery & Stability
    // =========================================================================
    '../../tests/e2e/fatal-error-recovery.spec.ts',
    '../../tests/e2e/offline-behavior.spec.ts',

    // =========================================================================
    // Session & Persistence
    // =========================================================================
    '../../tests/e2e/session-persistence.spec.ts',
    '../../tests/e2e/single-instance.spec.ts',

    // =========================================================================
    // Webview & Content
    // =========================================================================
    '../../tests/e2e/webview-content.spec.ts',

    // =========================================================================
    // Platform-Specific (macOS) - Self-skip on other platforms
    // =========================================================================
    '../../tests/e2e/macos-dock.spec.ts',
    '../../tests/e2e/macos-menu.spec.ts',
    '../../tests/e2e/macos-window-behavior.spec.ts',

    // =========================================================================
    // System Integration
    // =========================================================================
    '../../tests/e2e/microphone-permission.spec.ts',
  ],
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
      maxInstances: 1, // Force sequential execution
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
  connectionRetryTimeout: 120000,
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
