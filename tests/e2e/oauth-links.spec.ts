import { browser, expect } from '@wdio/globals';

/**
 * E2E tests for link handling.
 * 
 * Verifies that:
 * - Gemini domain links open in new Electron windows
 * - External links open in system browser
 */
describe('Link Handling', () => {
    it('should open non-Google external links in system browser (not new Electron window)', async () => {
        // Inject a mock external link (non-Google)
        await browser.execute(() => {
            const link = document.createElement('a');
            link.href = 'https://example.com';
            link.target = '_blank';
            link.textContent = 'External Link';
            link.id = 'mock-external-link';
            link.style.cssText = 'position:fixed;top:150px;left:100px;z-index:9999;background:red;padding:20px;color:white;';
            document.body.appendChild(link);
        });

        const link = await browser.$('#mock-external-link');
        await expect(link).toBeDisplayed();

        // Get initial window handles
        const initialHandles = await browser.getWindowHandles();

        // Click the external link
        await link.click();

        // Wait briefly
        await browser.pause(500);

        // External links should NOT open a new Electron window
        const newHandles = await browser.getWindowHandles();
        expect(newHandles.length).toBe(initialHandles.length);

        // The current page URL should not have changed to example.com
        const currentUrl = await browser.getUrl();
        expect(currentUrl).not.toContain('example.com');
    });

    it('should handle Gemini domain links internally (in Electron window)', async () => {
        // Inject a mock Gemini subdomain link
        await browser.execute(() => {
            const link = document.createElement('a');
            link.href = 'https://gemini.google.com/share/abc123';
            link.target = '_blank';
            link.textContent = 'Share Gemini Chat';
            link.id = 'mock-gemini-link';
            link.style.cssText = 'position:fixed;top:200px;left:100px;z-index:9999;background:green;padding:20px;color:white;';
            document.body.appendChild(link);
        });

        const link = await browser.$('#mock-gemini-link');
        await expect(link).toBeDisplayed();

        const initialHandles = await browser.getWindowHandles();

        await link.click();
        await browser.pause(1000);

        const newHandles = await browser.getWindowHandles();

        // Gemini links should open in new Electron window
        expect(newHandles.length).toBeGreaterThan(initialHandles.length);

        // Clean up
        if (newHandles.length > initialHandles.length) {
            const newWindowHandle = newHandles.find(h => !initialHandles.includes(h));
            if (newWindowHandle) {
                await browser.switchToWindow(newWindowHandle);
                await browser.closeWindow();
                await browser.switchToWindow(initialHandles[0]);
            }
        }
    });
});
