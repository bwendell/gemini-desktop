import os from 'node:os';
import path from 'node:path';

import { baseConfig, electronMainPath } from './wdio.base.conf.js';
import { getAppArgs, linuxServiceConfig } from './electron-args.js';

const isWindowsInstallerLane = process.platform === 'win32';
const defaultInstalledExe = path.join(
    os.tmpdir(),
    'gemini-desktop-installer-smoke',
    'Gemini Desktop',
    'Gemini Desktop.exe'
);

const installerServiceOptions = isWindowsInstallerLane
    ? {
          appBinaryPath: process.env.WINDOWS_INSTALLED_APP_PATH || defaultInstalledExe,
          appArgs: getAppArgs('--test-auto-update', '--test-text-prediction'),
      }
    : {
          appEntryPoint: electronMainPath,
          appArgs: getAppArgs('--test-auto-update', '--test-text-prediction'),
      };

export const config = {
    ...baseConfig,
    specs: [
        '../../tests/e2e/release/windows-installer-smoke.spec.ts',
        '../../tests/e2e/release/windows-upgrade-x64.spec.ts',
        '../../tests/e2e/release/windows-upgrade-arm64.spec.ts',
    ],
    services: [
        [
            'electron',
            {
                ...installerServiceOptions,
                ...linuxServiceConfig,
            },
        ],
    ],
    onPrepare: async () => {
        await baseConfig.onPrepare?.();
        console.log(
            `[Release Installer E2E] ${isWindowsInstallerLane ? 'Running Windows installer validation' : 'Installer execution is skipped outside Windows'}`
        );
    },
};
