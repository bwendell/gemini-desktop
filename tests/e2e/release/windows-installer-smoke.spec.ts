import { browser, expect } from '@wdio/globals';

import { ensureSingleWindow, waitForAppReady } from '../helpers/workflows';
import {
    findUnifiedInstallerPath,
    getInstalledWindowsAppPath,
    hasInstallerFixtures,
} from '../helpers/windowsInstaller';

const describeWindowsInstaller = process.platform === 'win32' ? describe : describe.skip;

describeWindowsInstaller('Windows unified installer smoke', () => {
    before(function () {
        if (!hasInstallerFixtures()) {
            this.skip();
        }
    });

    beforeEach(async () => {
        await waitForAppReady();
    });

    afterEach(async () => {
        await ensureSingleWindow();
    });

    it('installs the unified installer and launches the installed app', async () => {
        expect(findUnifiedInstallerPath()).toContain('-installer.exe');

        const appInfo = await browser.electron.execute((electron) => ({
            exePath: electron.app.getPath('exe'),
            isPackaged: electron.app.isPackaged,
            version: electron.app.getVersion(),
        }));

        expect(appInfo.isPackaged).toBe(true);
        expect(appInfo.version).toMatch(/^\d+\.\d+\.\d+/);
        expect(appInfo.exePath.toLowerCase()).toBe(getInstalledWindowsAppPath().toLowerCase());
    });
});
