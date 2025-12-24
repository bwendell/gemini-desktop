import { browser, expect } from '@wdio/globals';

describe('Authentication Flow Integration', () => {
    before(async () => {
        await browser.waitUntil(async () => (await browser.getWindowHandles()).length > 0);
    });

    it('should open a dedicated Auth Window for Google OAuth URLs', async () => {
        // Trigger window.open in renderer with a Google Accounts URL
        // explicit accounts.google.com URL which MainWindow matches as OAuth
        const oauthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=123&response_type=code&redirect_uri=http://localhost&scope=email';

        await browser.execute((url) => {
            window.open(url, '_blank');
        }, oauthUrl);

        // Wait for new window
        await browser.waitUntil(async () => {
            const handles = await browser.getWindowHandles();
            return handles.length === 2;
        }, { timeout: 5000, timeoutMsg: 'Auth window did not open' });

        const handles = await browser.getWindowHandles();
        expect(handles.length).toBe(2);

        // Switch to new window and verify properties
        // The auth window should NOT have the standard DevTools enabled or complex preload if simplistic,
        // but mostly we check it exists.
        await browser.switchToWindow(handles[1]);
        const url = await browser.getUrl();
        expect(url).toContain('accounts.google.com');
    });

    it('should cleanup Auth Window when closed', async () => {
        // Close the current window (Auth Window)
        await browser.closeWindow();

        // Wait for handle to disappear
        await browser.waitUntil(async () => {
            const handles = await browser.getWindowHandles();
            return handles.length === 1;
        }, { timeout: 5000 });

        const handles = await browser.getWindowHandles();
        expect(handles.length).toBe(1);

        // Switch back to main
        await browser.switchToWindow(handles[0]);
    });
});
