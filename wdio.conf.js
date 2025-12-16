/**
 * WebdriverIO configuration for Tauri E2E testing.
 * 
 * Platform Support:
 * - Windows: ✅ Fully supported
 * - Linux: ✅ Fully supported  
 * - macOS: ❌ Not supported (no WKWebView driver available)
 * 
 * @see https://v2.tauri.app/develop/tests/webdriver/
 */

import os from 'os';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Keep track of the tauri-driver child process
let tauriDriver;
let exit = false;

// Determine the path to the compiled application (cross-platform)
const platform = os.platform();
const isWindows = platform === 'win32';
const isMacOS = platform === 'darwin';

// macOS is not supported for E2E tests due to missing WKWebView driver
if (isMacOS) {
    console.warn('⚠️  E2E tests are not supported on macOS (no WKWebView driver available)');
    console.warn('   See: https://v2.tauri.app/develop/tests/webdriver/');
}

const appPath = path.resolve(
    __dirname,
    'src-tauri/target/debug/',
    isWindows ? 'gemini-desktop.exe' : 'gemini-desktop'
);

export const config = {
    // Connect to tauri-driver running on localhost:4444
    host: '127.0.0.1',
    port: 4444,

    // Test specs
    specs: ['./tests/e2e/**/*.spec.ts'],
    maxInstances: 1,

    // Capabilities - use tauri:options for Tauri apps
    capabilities: [
        {
            maxInstances: 1,
            'tauri:options': {
                application: appPath,
            },
        },
    ],

    // Framework & Reporters
    reporters: ['spec'],
    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000,
    },

    // Build the full Tauri app (including frontend) before tests
    onPrepare: () => {
        console.log('Building Tauri application with frontend...');
        // Use 'npm run tauri build -- --debug' to build the complete app
        // This bundles the React frontend and creates the Rust binary
        const result = spawnSync('npm', ['run', 'tauri', 'build', '--', '--debug', '--no-bundle'], {
            stdio: 'inherit',
            shell: true,
        });

        if (result.status !== 0) {
            throw new Error('Failed to build Tauri application');
        }
        console.log('Build complete.');
    },

    // Start tauri-driver before each session
    beforeSession: () => {
        const driverPath = isWindows
            ? path.resolve(os.homedir(), '.cargo', 'bin', 'tauri-driver.exe')
            : path.resolve(os.homedir(), '.cargo', 'bin', 'tauri-driver');

        console.log('Starting tauri-driver...');
        tauriDriver = spawn(driverPath, [], {
            stdio: [null, process.stdout, process.stderr],
        });

        tauriDriver.on('error', (error) => {
            console.error('tauri-driver error:', error);
            process.exit(1);
        });

        tauriDriver.on('exit', (code) => {
            if (!exit) {
                console.error('tauri-driver exited with code:', code);
                process.exit(1);
            }
        });
    },

    // Clean up tauri-driver after session
    afterSession: () => {
        closeTauriDriver();
    },
};

function closeTauriDriver() {
    exit = true;
    tauriDriver?.kill();
}

function onShutdown(fn) {
    const cleanup = () => {
        try {
            fn();
        } finally {
            process.exit();
        }
    };
    process.on('exit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('SIGHUP', cleanup);
    process.on('SIGBREAK', cleanup);
}

// Ensure tauri-driver is closed when our test process exits
onShutdown(() => {
    closeTauriDriver();
});
