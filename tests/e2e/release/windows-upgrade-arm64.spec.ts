import { browser, expect } from '@wdio/globals';

import { ensureSingleWindow, waitForAppReady } from '../helpers/workflows';

const describeWindowsArm64Upgrade = process.platform === 'win32' ? describe : describe.skip;
const targetVersion = process.env.TARGET_VERSION?.replace(/^v/, '');
const baselineVersion = process.env.WINDOWS_BASELINE_VERSION?.replace(/^v/, '');

describeWindowsArm64Upgrade('Windows ARM64 upgrade path', () => {
    before(function () {
        const hasArm64GateEnv =
            process.env.RUN_WINDOWS_ARM64_VALIDATION === 'true' &&
            Boolean(process.env.WINDOWS_BASELINE_INSTALLER) &&
            Boolean(targetVersion) &&
            Boolean(baselineVersion);

        if (!hasArm64GateEnv) {
            this.skip();
        }
    });

    beforeEach(async () => {
        await waitForAppReady();
    });

    afterEach(async () => {
        await ensureSingleWindow();
    });

    it('upgrades an existing ARM64 install onto the unified Windows release', async () => {
        const version = await browser.electron.execute((electron) => electron.app.getVersion());
        expect(baselineVersion).not.toBe(targetVersion);
        expect(version).toBe(targetVersion);
    });
});
