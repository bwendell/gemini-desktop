/**
 * E2E Test: External Link Sanitization
 *
 * Tests that external links are properly handled by opening them in the
 * system default browser instead of within the Electron app.
 *
 * This is a security test that verifies:
 * 1. External links with target="_blank" open externally (not in new Electron window)
 * 2. Direct navigation attempts to external URLs are blocked
 *
 * NOTE: DOM injection is used to create test links because there are no
 * guaranteed external links in the Gemini UI. This is an accepted pattern
 * for security boundary testing.
 *
 * Cross-platform: Windows, macOS, Linux
 *
 * @module external-links.spec
 */

import { browser, $, expect } from '@wdio/globals';
import { MainWindowPage } from './pages';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { expectWindowCount } from './helpers/assertions';
import { waitForDuration } from './helpers/waitUtilities';

describe('External Link Sanitization', () => {
    const mainWindow = new MainWindowPage();

    beforeEach(async () => {
        await waitForAppReady();
    });

    afterEach(async () => {
        await ensureSingleWindow();
    });

    it('should open external links in default browser instead of the app', async () => {
        // 1. Inject a mock external link into the page
        // NOTE: This is required for testing because no guaranteed external links exist in the UI
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
            link.style.background = 'red';
            link.style.padding = '20px';
            document.body.appendChild(link);
        });

        // 2. Verify the link is displayed
        const link = await $('#mock-external-link');
        await expect(link).toBeDisplayed();

        // 3. Click the link (real user action)
        await link.click();

        // 4. Allow time for any window creation
        await waitForDuration(500, 'External link window creation check');

        // 5. Verify no new Electron window was opened
        // (External links should open in system browser, not Electron)
        await expectWindowCount(1);

        // 6. Verify the current window URL did not change
        const currentUrl = await browser.getUrl();
        expect(currentUrl).not.toContain('example.com');
    });

    it('should block direct navigation of main window to external URLs', async () => {
        // 1. Get the initial URL
        const initialUrl = await browser.getUrl();

        // 2. Attempt to navigate to an external URL using window.location
        // NOTE: This tests the `will-navigate` handler in WindowManager
        await browser.execute(() => {
            window.location.href = 'https://google.com';
        });

        // 3. Wait for navigation attempt to be processed
        await waitForDuration(1000, 'Navigation attempt processing');

        // 4. Verify the URL did not change to the external site
        const currentUrl = await browser.getUrl();
        expect(currentUrl).toBe(initialUrl);

        // 5. Verify app is still functional
        const isLoaded = await mainWindow.isLoaded();
        expect(isLoaded).toBe(true);
    });
});
