import { browser, expect } from '@wdio/globals';

import { ensureSingleWindow, waitForAppReady } from '../helpers/workflows';
import { getInstalledWindowsExecutablePath } from '../helpers/windowsInstaller';

describe('Windows upgrade x64', () => {
    beforeEach(async () => {
        await waitForAppReady();
    });

    afterEach(async () => {
        await ensureSingleWindow();
    });

    it('runs the promoted x64 build after upgrading from a baseline installer', async () => {
        if (process.arch !== 'x64') {
            throw new Error(`Expected x64 runtime for upgrade validation, received ${process.arch}`);
        }

        const required = ['BASELINE_INSTALLER_PATH', 'BASELINE_VERSION', 'TARGET_VERSION'];
        for (const key of required) {
            if (!process.env[key]) {
                throw new Error(`${key} is required for the Windows x64 upgrade spec.`);
            }
        }

        if (process.env.BASELINE_VERSION === process.env.TARGET_VERSION) {
            throw new Error('Windows x64 upgrade validation requires BASELINE_VERSION to differ from TARGET_VERSION.');
        }

        const runtimeInfo = await browser.electron.execute((electron) => ({
            arch: process.arch,
            version: electron.app.getVersion(),
            isPackaged: electron.app.isPackaged,
            execPath: process.execPath,
        }));

        expect(runtimeInfo.arch).toBe('x64');
        expect(runtimeInfo.isPackaged).toBe(true);
        expect(runtimeInfo.version).toBe(process.env.TARGET_VERSION);
        expect(runtimeInfo.execPath).toBe(getInstalledWindowsExecutablePath());
    });
});
