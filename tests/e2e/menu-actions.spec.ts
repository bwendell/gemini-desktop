/**
 * E2E Test: General Menu Actions
 *
 * Verifies standard menu items like "About" and "Reload".
 * Uses the industry-standard ID-based approach for menu testing.
 */

import { browser, expect } from '@wdio/globals';
import { MainWindowPage, OptionsPage } from './pages';
import { waitForWindowCount } from './helpers/windowActions';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { expectUrlHash } from './helpers/assertions';
import { isMacOS } from './helpers/platform';
import { waitForDuration } from './helpers/waitUtilities';

describe('General Menu Actions', () => {
    const mainWindow = new MainWindowPage();
    const optionsPage = new OptionsPage();

    beforeEach(async () => {
        await waitForAppReady();
    });

    afterEach(async () => {
        await ensureSingleWindow();
    });

    it('should open About tab in Options window when clicking "About Gemini Desktop"', async () => {
        // 1. Click Help -> About using MainWindowPage
        await mainWindow.openAboutViaMenu();

        // 2. Wait for Options window
        await waitForWindowCount(2);

        // 3. Wait for Options page to load
        await optionsPage.waitForLoad();

        // 4. Verify URL hash is #about
        await expectUrlHash('#about');

        // 5. Verify the About tab is active
        expect(await optionsPage.isAboutTabActive()).toBe(true);

        // Cleanup - close options window
        await optionsPage.close();
    });

    it('should reload the page when clicking View -> Reload', async function () {
        // SKIP on macOS: Programmatically clicking Electron native menu items with
        // `role: 'reload'` via `item.click()` doesn't fire the role action.
        // This is a known Electron limitation for role-based menu items.
        // The reload functionality works correctly for real user interactions.
        if (await isMacOS()) {
            this.skip();
        }

        // 1. Inject a variable into the window to track state
        await browser.execute(() => {
            (window as any).__e2e_test_var = 'loaded';
        });

        const valBefore = await browser.execute(() => (window as any).__e2e_test_var);
        expect(valBefore).toBe('loaded');

        // 2. Trigger Reload using MainWindowPage menu action
        await mainWindow.clickMenuById('menu-view-reload');

        // 3. Wait for reload to complete
        await waitForDuration(1000, 'Page reload');

        // 4. Verify variable is GONE (undefined) because page reloaded
        const valAfter = await browser.execute(() => (window as any).__e2e_test_var);
        expect(valAfter).toBeFalsy();
    });
});
