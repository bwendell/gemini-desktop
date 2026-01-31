/// <reference path="./helpers/wdio-electron.d.ts" />

import { browser, expect } from '@wdio/globals';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { waitForWindowCount } from './helpers/waitUtilities';

/**
 * E2E tests for link handling.
 *
 * Verifies that:
 * - Gemini domain links open in new Electron windows
 * - External links open in system browser
 */
describe('Link Handling', () => {
    beforeEach(async () => {
        await waitForAppReady();
    });

    afterEach(async () => {
        await ensureSingleWindow();
    });

    it('should open non-Google external links in system browser (not new Electron window)', async () => {
        // Inject a mock external link (non-Google)
        await browser.execute(() => {
            const link = document.createElement('a');
            link.href = 'https://example.com';
            link.target = '_blank';
            link.textContent = 'External Link';
            link.id = 'mock-external-link';
            link.style.cssText =
                'position:fixed;top:150px;left:100px;z-index:9999;background:red;padding:20px;color:white;';
            document.body.appendChild(link);
        });

        const link = await browser.$('#mock-external-link');
        await expect(link).toBeDisplayed();

        // Get initial window handles
        const initialHandles = await browser.getWindowHandles();

        // Click the external link
        await link.click();

        // Wait for window handles to stabilize after link click
        await waitForWindowCount(initialHandles.length, 2000);

        // External links should NOT open a new Electron window
        const newHandles = await browser.getWindowHandles();
        expect(newHandles.length).toBe(initialHandles.length);

        // The current page URL should not have changed to example.com
        const currentUrl = await browser.getUrl();
        expect(currentUrl).not.toContain('example.com');

        // Cleanup: Remove mock link
        await browser.execute(() => {
            const link = document.getElementById('mock-external-link');
            if (link) link.remove();
        });
    });

    it('should handle Gemini domain links internally (in Electron window)', async () => {
        // Inject a mock Gemini subdomain link
        await browser.execute(() => {
            const link = document.createElement('a');
            link.href = 'https://gemini.google.com/share/abc123';
            link.target = '_blank';
            link.textContent = 'Share Gemini Chat';
            link.id = 'mock-gemini-link';
            link.style.cssText =
                'position:fixed;top:200px;left:100px;z-index:9999;background:green;padding:20px;color:white;';
            document.body.appendChild(link);
        });

        const link = await browser.$('#mock-gemini-link');
        await expect(link).toBeDisplayed();

        const initialHandles = await browser.getWindowHandles();

        await link.click();

        // Wait for new Electron window to open after Gemini link click
        await waitForWindowCount(initialHandles.length + 1, 3000);

        const newHandles = await browser.getWindowHandles();

        // Gemini links should open in new Electron window
        expect(newHandles.length).toBeGreaterThan(initialHandles.length);

        // Cleanup: Remove mock link
        await browser.execute(() => {
            const link = document.getElementById('mock-gemini-link');
            if (link) link.remove();
        });
    });
});
