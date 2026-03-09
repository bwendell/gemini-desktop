import { browser } from '@wdio/globals';

import {
    closeExtraWindows,
    getMainWindowHandle,
    openOptionsWindow,
    switchToMainWindow,
    waitForSecondaryWindow,
    waitForSingleWindow,
} from './integrationUtils';
import { waitForRendererState } from './waitAdapters';

export async function openOptionsWindowForIntegration(tab: 'settings' | 'about' = 'settings'): Promise<string> {
    const mainWindowHandle = await getMainWindowHandle();
    const optionsHandle = await openOptionsWindow(mainWindowHandle, tab);
    await browser.switchToWindow(optionsHandle);

    await waitForRendererState(async () => (await browser.getUrl()).includes('options'), {
        timeout: 5000,
        timeoutMsg: 'Options window URL did not stabilize',
    });

    return optionsHandle;
}

export async function closeOptionsWindowsForIntegration(): Promise<void> {
    const mainWindowHandle = await getMainWindowHandle();
    await switchToMainWindow(mainWindowHandle);
    await closeExtraWindows({ force: true, timeout: 8000 });
    await waitForSingleWindow(5000);
}

export async function switchToOptionsWindowFromMain(mainWindowHandle: string): Promise<string> {
    const optionsHandle = await waitForSecondaryWindow(mainWindowHandle, 5000);
    await browser.switchToWindow(optionsHandle);
    return optionsHandle;
}
