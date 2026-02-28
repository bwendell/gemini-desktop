import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { baseConfig } from './wdio.base.conf.js';
import { ensureArmChromedriver, getAppArgs, linuxServiceConfig } from './electron-args.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

function getReleaseBinaryPath() {
    const releaseDir = path.resolve(__dirname, '../../release');
    const platform = process.platform;

    let binaryPath;

    switch (platform) {
        case 'win32':
            binaryPath = path.join(releaseDir, 'win-unpacked', 'Gemini Desktop.exe');
            break;
        case 'darwin':
            binaryPath = path.join(releaseDir, 'mac', 'Gemini Desktop.app', 'Contents', 'MacOS', 'Gemini Desktop');
            if (!fs.existsSync(binaryPath)) {
                binaryPath = path.join(
                    releaseDir,
                    'mac-arm64',
                    'Gemini Desktop.app',
                    'Contents',
                    'MacOS',
                    'Gemini Desktop'
                );
            }
            break;
        case 'linux':
            binaryPath =
                process.arch === 'arm64'
                    ? path.join(releaseDir, 'linux-arm64-unpacked', 'gemini-desktop')
                    : path.join(releaseDir, 'linux-unpacked', 'gemini-desktop');
            if (!fs.existsSync(binaryPath)) {
                binaryPath = path.join(
                    releaseDir,
                    process.arch === 'arm64' ? 'linux-unpacked' : 'linux-arm64-unpacked',
                    'gemini-desktop'
                );
            }
            break;
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }

    if (!fs.existsSync(binaryPath)) {
        throw new Error(
            `Release binary not found at: ${binaryPath}\n` +
                `Please run 'npm run electron:build' first to create a packaged build.`
        );
    }

    console.log(`[Release E2E] Using binary: ${binaryPath}`);
    return binaryPath;
}

export const config = {
    ...baseConfig,
    specs: [
        '../../tests/e2e/app-startup.spec.ts',
        '../../tests/e2e/menu_bar.spec.ts',
        '../../tests/e2e/options-window.spec.ts',
        '../../tests/e2e/theme.spec.ts',
        '../../tests/e2e/theme-selector-visual.spec.ts',
        '../../tests/e2e/theme-selector-keyboard.spec.ts',
        '../../tests/e2e/window-controls.spec.ts',
        '../../tests/e2e/window-bounds.spec.ts',
        '../../tests/e2e/tray.spec.ts',
        '../../tests/e2e/minimize-to-tray.spec.ts',
        '../../tests/e2e/options-tabs.spec.ts',
        '../../tests/e2e/settings-persistence.spec.ts',
        '../../tests/e2e/context-menu.spec.ts',
        '../../tests/e2e/external-links.spec.ts',
        '../../tests/e2e/release/*.spec.ts',
    ],
    exclude: [],
    services: [
        [
            'electron',
            {
                appBinaryPath: getReleaseBinaryPath(),
                appArgs: getAppArgs('--test-auto-update', '--test-text-prediction', '--e2e-disable-auto-submit'),
                ...linuxServiceConfig,
            },
        ],
    ],
    onPrepare: async () => {
        await ensureArmChromedriver();
        console.log('[Release E2E] Testing packaged release build...');
    },
};
