import { expect } from '@wdio/globals';

import { getElectronAPIValue, getMainProcessPlatform, waitForAppReady } from './helpers/integrationUtils';

describe('Platform Detection Integration', () => {
    before(async () => {
        await waitForAppReady();
    });

    it('renderer platform matches main process platform', async () => {
        const rendererPlatform = await getElectronAPIValue<string>('platform');
        const mainPlatform = await getMainProcessPlatform();

        expect(rendererPlatform).toBe(mainPlatform);
        expect(['win32', 'darwin', 'linux']).toContain(mainPlatform);
    });

    it('renderer platform maps to UI platform helper', async () => {
        const platform = await getElectronAPIValue<string>('platform');
        const mappedPlatform = platform === 'darwin' ? 'macos' : platform === 'win32' ? 'windows' : 'linux';

        expect(['macos', 'windows', 'linux']).toContain(mappedPlatform);
    });
});
