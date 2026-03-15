import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { baseConfig } from './wdio.base.conf.js';
import { ensureArmChromedriver, getAppArgs } from './electron-args.js';

if (process.platform !== 'win32') {
    throw new Error('config/wdio/wdio.release.installer.conf.js can only run on Windows hosts.');
}

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const manifestPath = path.resolve(__dirname, '../../release/installer-smoke-manifest.json');
const baseElectronService = baseConfig.services?.find(([name]) => name === 'electron');
const baseElectronServiceOptions = baseElectronService ? baseElectronService[1] : {};
const { appEntryPoint: _omit, ...releaseServiceOptions } = baseElectronServiceOptions;

function getInstalledBinaryPath() {
    if (process.env.INSTALLED_WINDOWS_EXE_PATH) {
        return process.env.INSTALLED_WINDOWS_EXE_PATH;
    }

    if (!fs.existsSync(manifestPath)) {
        throw new Error(
            `Installer smoke manifest not found at ${manifestPath}. Run scripts/run-windows-installer-smoke.cjs first.`
        );
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (!manifest.installedExePath) {
        throw new Error(`installer-smoke-manifest.json does not contain installedExePath: ${manifestPath}`);
    }

    return manifest.installedExePath;
}

export const config = {
    ...baseConfig,
    specs: ['../../tests/e2e/release/windows-installer-smoke.spec.ts'],
    exclude: [],
    services: [
        [
            'electron',
            {
                ...releaseServiceOptions,
                appBinaryPath: getInstalledBinaryPath(),
                appArgs: getAppArgs('--test-auto-update'),
            },
        ],
    ],
    onPrepare: async () => {
        await ensureArmChromedriver();
        console.log('[Release E2E] Testing installed Windows release build...');
    },
};
