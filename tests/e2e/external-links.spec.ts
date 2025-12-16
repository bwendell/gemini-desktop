import { browser, $, expect } from '@wdio/globals';

describe('External Link Sanitization', () => {
    it('should open external links in default browser instead of the app', async () => {
        // 1. Inject a mock link into the page
        await browser.execute(() => {
            const link = document.createElement('a');
            link.href = 'https://example.com';
            link.target = '_blank';
            link.textContent = 'External Link';
            link.id = 'mock-external-link';
            link.style.position = 'absolute';
            link.style.top = '100px';
            link.style.left = '100px';
            link.style.zIndex = '9999';
            link.style.background = 'red'; // Make it visible
            link.style.padding = '20px';
            document.body.appendChild(link);
        });

        const link = await $('#mock-external-link');
        await expect(link).toBeDisplayed();

        // 2. Click the link
        await link.click();

        // 3. Verify the internal webview URL does NOT change
        // Since we can't easily check the system browser, we check that a new *electron* window wasn't created
        // and that the current window didn't navigate to example.com

        const currentUrl = await browser.getUrl();
        expect(currentUrl).not.toContain('example.com');

        // Also check window handles - simple check to ensure no new Electron window popped up
        // (default Electron behavior for target=_blank is new window if not handled)
        const handles = await browser.getWindowHandles();
        expect(handles.length).toBe(1);
    });
});
