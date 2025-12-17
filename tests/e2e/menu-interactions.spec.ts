/**
 * E2E Test: Menu Interactions (Sequential)
 * 
 * Validates clicking through menus opens and closes dropdowns correctly.
 * 
 * Platform-aware: Skips on macOS since custom menu bar is not rendered.
 */

import { browser, $, expect } from '@wdio/globals';
import { usesCustomControls } from './helpers/platform';
import { Selectors } from './helpers/selectors';
import { E2ELogger } from './helpers/logger';

describe('Menu Interactions (Sequential)', () => {
    beforeEach(async () => {
        if (!(await usesCustomControls())) {
            E2ELogger.info('menu-interactions', 'Skipping - macOS uses native menu bar');
            return;
        }
    });

    it('should open the main window if not already present', async () => {
        // Just verify we have a window by checking for the titlebar.
        const titlebar = await $(Selectors.titlebar);
        await titlebar.waitForExist({ timeout: 10000 });
        await expect(titlebar).toBeExisting();
    });

    it('should verify File menu interactions', async () => {
        if (!(await usesCustomControls())) {
            return; // Skip on macOS
        }

        const fileButton = await $(Selectors.menuButton('File'));
        await fileButton.waitForExist();

        // 1. Click File Menu
        await fileButton.click();

        // 2. Verify Dropdown Exists
        const dropdown = await $(Selectors.menuDropdown);
        await dropdown.waitForExist({ timeout: 2000 });
        await expect(dropdown).toBeDisplayed();

        // 3. Verify "Options..." item exists
        const optionsItem = await $(Selectors.menuItem('Options'));
        await expect(optionsItem).toBeExisting();

        // 4. Click out (click titlebar) to close
        await $(Selectors.titlebar).click();

        // 5. Verify dropdown closes
        await dropdown.waitForExist({ reverse: true, timeout: 2000 });
        await expect(dropdown).not.toBeDisplayed();
    });

    it('should verify View menu interactions', async () => {
        if (!(await usesCustomControls())) {
            return; // Skip on macOS
        }

        const viewButton = await $(Selectors.menuButton('View'));
        await viewButton.waitForExist();

        // 1. Click View Menu
        await viewButton.click();

        // 2. Verify Dropdown Exists
        const dropdown = await $(Selectors.menuDropdown);
        await dropdown.waitForExist({ timeout: 2000 });
        await expect(dropdown).toBeDisplayed();

        // 3. Click out to close
        await $(Selectors.titlebar).click();

        // 4. Verify dropdown closes
        await dropdown.waitForExist({ reverse: true, timeout: 2000 });
        await expect(dropdown).not.toBeDisplayed();
    });

    it('should verify About (Help) menu interactions', async () => {
        if (!(await usesCustomControls())) {
            return; // Skip on macOS
        }

        // User requested "About" menu, which is under "Help"
        const helpButton = await $(Selectors.menuButton('Help'));
        await helpButton.waitForExist();

        // 1. Click Help Menu
        await helpButton.click();

        // 2. Verify Dropdown Exists
        const dropdown = await $(Selectors.menuDropdown);
        await dropdown.waitForExist({ timeout: 2000 });
        await expect(dropdown).toBeDisplayed();

        // 3. Verify "About Gemini Desktop" item exists
        const aboutItem = await $(Selectors.menuItem('About Gemini Desktop'));
        await expect(aboutItem).toBeExisting();

        // 4. Click out to close
        await $(Selectors.titlebar).click();

        // 5. Verify dropdown closes
        await dropdown.waitForExist({ reverse: true, timeout: 2000 });
        await expect(dropdown).not.toBeDisplayed();
    });
});
