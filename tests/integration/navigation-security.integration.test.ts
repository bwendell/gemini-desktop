import { browser, expect } from '@wdio/globals';

describe('Navigation Security Integration', () => {
    before(async () => {
        await browser.waitUntil(async () => (await browser.getWindowHandles()).length > 0);
    });

    it('should block navigation to external URLs in main window', async () => {
        const initialUrl = await browser.getUrl();
        const externalUrl = 'https://www.example.com/';

        // Attempt to navigate main window
        await browser.execute((url) => {
            window.location.href = url;
        }, externalUrl);

        // Wait a small amount to allow potential nav
        await browser.pause(1500);

        // URL should NOT have changed to example.com
        const currentUrl = await browser.getUrl();
        expect(currentUrl).not.toContain('example.com');
        expect(currentUrl).toBe(initialUrl); // Should remain on app page
    });

    it('should delegate generic window.open(external) to shell/native browser', async () => {
        // We can't easily verifying 'shell.openExternal' was called without mocking 'shell' 
        // in the main process, which is hard in a compiled integration test without 
        // specialized hooks.
        // HOWEVER, we CAN verify that a NEW WINDOW was NOT created in Electron.
        // If it opened in Electron, we'd see a 2nd handle.
        // If it opened in Chrome/System, Electron sees 1 handle.

        const externalUrl = 'https://www.wikipedia.org/';

        await browser.execute((url) => {
            window.open(url, '_blank');
        }, externalUrl);

        await browser.pause(1000);

        const handles = await browser.getWindowHandles();
        expect(handles.length).toBe(1); // Still just main window
    });
});
