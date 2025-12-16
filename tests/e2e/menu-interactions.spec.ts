import { browser, $, expect } from '@wdio/globals';

describe('Menu Interactions (Sequential)', () => {
    // This test assumes the app is already running and potentially in a state left by previous tests.
    // However, WDIO usually restarts the session unless `sharedStore` or specific config is used.
    // Given the request "Run after existing tests", we ensure this runs last.

    it('should open the main window if not already present', async () => {
        // Just verify we have a window by checking for the titlebar.
        // In proper E2E with Electron service, the app starts automatically.

        const titlebar = await $('.titlebar');
        await titlebar.waitForExist({ timeout: 10000 });
        await expect(titlebar).toBeExisting();
    });

    it('should verify File menu interactions', async () => {
        const fileButton = await $('button[data-testid="menu-button-File"]');
        await fileButton.waitForExist();

        // 1. Click File Menu
        await fileButton.click();

        // 2. Verify Dropdown Exists
        const dropdown = await $('.titlebar-menu-dropdown');
        await dropdown.waitForExist({ timeout: 2000 });
        await expect(dropdown).toBeDisplayed();

        // 3. Verify "Options..." item exists
        // Use data-testid selector which is resilient to text content changes (if ID remains stable) or just better practice
        const optionsItem = await $('button[data-testid="menu-item-Options"]');
        await expect(optionsItem).toBeExisting();

        // 4. Click out (click titlebar) to close
        await $('.titlebar').click();

        // 5. Verify dropdown closes
        await dropdown.waitForExist({ reverse: true, timeout: 2000 });
        await expect(dropdown).not.toBeDisplayed();
    });

    it('should verify View menu interactions', async () => {
        const viewButton = await $('button[data-testid="menu-button-View"]');
        await viewButton.waitForExist();

        // 1. Click View Menu
        await viewButton.click();

        // 2. Verify Dropdown Exists
        const dropdown = await $('.titlebar-menu-dropdown');
        await dropdown.waitForExist({ timeout: 2000 });
        await expect(dropdown).toBeDisplayed();

        // 3. Click out to close
        await $('.titlebar').click();

        // 4. Verify dropdown closes
        await dropdown.waitForExist({ reverse: true, timeout: 2000 });
        await expect(dropdown).not.toBeDisplayed();
    });

    it('should verify About (Help) menu interactions', async () => {
        // User requested "About" menu, which is under "Help"
        const helpButton = await $('button[data-testid="menu-button-Help"]');
        await helpButton.waitForExist();

        // 1. Click Help Menu
        await helpButton.click();

        // 2. Verify Dropdown Exists
        const dropdown = await $('.titlebar-menu-dropdown');
        await dropdown.waitForExist({ timeout: 2000 });
        await expect(dropdown).toBeDisplayed();

        // 3. Verify "About Gemini Desktop" item exists
        const aboutItem = await $('button[data-testid="menu-item-About Gemini Desktop"]');
        await expect(aboutItem).toBeExisting();

        // 4. Click out to close
        await $('.titlebar').click();

        // 5. Verify dropdown closes
        await dropdown.waitForExist({ reverse: true, timeout: 2000 });
        await expect(dropdown).not.toBeDisplayed();
    });
});
