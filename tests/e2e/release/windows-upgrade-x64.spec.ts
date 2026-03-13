import { browser, expect } from '@wdio/globals';

import { ensureSingleWindow, waitForAppReady } from '../helpers/workflows';

const describeWindowsUpgrade = process.platform === 'win32' ? describe : describe.skip;
const targetVersion = process.env.TARGET_VERSION?.replace(/^v/, '');
const baselineVersion = process.env.WINDOWS_BASELINE_VERSION?.replace(/^v/, '');

describeWindowsUpgrade('Windows x64 upgrade path', () => {
    before(function () {
        if (!process.env.WINDOWS_BASELINE_INSTALLER || !targetVersion || !baselineVersion) {
            this.skip();
        }
    });

    beforeEach(async () => {
        await waitForAppReady();
    });

    afterEach(async () => {
        await ensureSingleWindow();
    });

    it('upgrades an existing x64 install onto the unified Windows release', async () => {
        const version = await browser.electron.execute((electron) => electron.app.getVersion());
        expect(baselineVersion).not.toBe(targetVersion);
        expect(version).toBe(targetVersion);
    });
});
