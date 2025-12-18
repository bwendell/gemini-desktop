/**
 * E2E Test: General Menu Actions
 * 
 * Verifies standard menu items like "About" and "Reload".
 * Uses the industry-standard ID-based approach for menu testing.
 */

import { browser, $, expect } from '@wdio/globals';
import { clickMenuItemById } from './helpers/menuActions';
import { waitForWindowCount, closeCurrentWindow } from './helpers/windowActions';

describe('General Menu Actions', () => {

    it('should open About tab in Options window when clicking "About Gemini Desktop"', async () => {
        // 1. Click Help -> About using menu ID
        await clickMenuItemById('menu-help-about');

        // 2. Wait for Options window
        await waitForWindowCount(2);

        // 3. Switch to Options window
        const handles = await browser.getWindowHandles();
        const optionsHandle = handles[1];
        await browser.switchToWindow(optionsHandle);

        // 4. Verify URL hash is #about
        const url = await browser.getUrl();
        expect(url).toContain('#about');

        // 5. Verify the titlebar shows "About"
        const titlebarTitle = await $('[data-testid="options-titlebar-title"]');
        await expect(titlebarTitle).toHaveText('About');

        // Cleanup
        await closeCurrentWindow();
        await browser.switchToWindow(handles[0]);
    });

    it('should reload the page when clicking View -> Reload', async () => {
        // 1. Inject a variable into the window to track state
        await browser.execute(() => {
            (window as any).__e2e_test_var = 'loaded';
        });

        const valBefore = await browser.execute(() => (window as any).__e2e_test_var);
        expect(valBefore).toBe('loaded');

        // 2. Trigger Reload using menu ID
        await clickMenuItemById('menu-view-reload');

        // 3. Wait for reload to complete
        await browser.pause(1000);

        // 4. Verify variable is GONE (undefined) because page reloaded
        const valAfter = await browser.execute(() => (window as any).__e2e_test_var);
        expect(valAfter).toBeFalsy();
    });
});
