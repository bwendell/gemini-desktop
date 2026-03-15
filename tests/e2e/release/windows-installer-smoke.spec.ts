import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { browser, expect } from '@wdio/globals';

import { ensureSingleWindow, waitForAppReady } from '../helpers/workflows';
import { getInstalledWindowsExecutablePath, readWindowsInstallerManifest } from '../helpers/windowsInstaller';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.resolve(__dirname, '../../../package.json');
const packageVersion = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).version;

describe('Windows installer smoke', () => {
    beforeEach(async () => {
        await waitForAppReady();
    });

    afterEach(async () => {
        await ensureSingleWindow();
    });

    it('launches the installed Windows build with the expected architecture and version', async () => {
        const expectedArch = process.env.EXPECTED_WINDOWS_ARCH;
        if (!expectedArch) {
            throw new Error('EXPECTED_WINDOWS_ARCH is required for the Windows installer smoke spec.');
        }

        const expectedVersion = process.env.TARGET_VERSION ?? packageVersion;
        const expectedExecutablePath = getInstalledWindowsExecutablePath();
        const installerManifest = readWindowsInstallerManifest();

        const runtimeInfo = await browser.electron.execute((electron) => ({
            arch: process.arch,
            isPackaged: electron.app.isPackaged,
            version: electron.app.getVersion(),
            execPath: process.execPath,
        }));

        expect(runtimeInfo.arch).toBe(expectedArch);
        expect(runtimeInfo.isPackaged).toBe(true);
        expect(runtimeInfo.version).toBe(expectedVersion);
        expect(path.normalize(runtimeInfo.execPath)).toBe(path.normalize(expectedExecutablePath));
        expect(path.normalize(installerManifest.installedExePath ?? '')).toBe(path.normalize(expectedExecutablePath));
    });
});
