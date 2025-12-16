
import { browser, $, $$ } from '@wdio/globals';

describe('Custom Menu Bar', () => {
    it('should show dropdown menus when clicked', async () => {
        // Wait for titlebar to exist
        const titlebar = await $('.titlebar');
        await titlebar.waitForExist();

        // Check for File menu button
        const fileButton = await $('.titlebar-menu-button=File');
        await fileButton.waitForExist();
        await expect(fileButton).toBeDisplayed();

        // Click File menu
        await fileButton.click();

        // Check for dropdown existence
        const dropdown = await $('.titlebar-menu-dropdown');
        await dropdown.waitForExist();
        await expect(dropdown).toBeDisplayed();

        // Check for "Exit" item in File menu
        const exitItem = await $('.titlebar-menu-item .menu-item-label=Exit');
        await expect(exitItem).toExist();

        // Click again to close
        await fileButton.click();
        await expect(dropdown).not.toBeDisplayed();
    });

    it('should open each menu on click', async () => {
        const menuButtons = await $$('.titlebar-menu-button');

        // Iterate through all menu buttons (File, View, Help)
        for (const button of menuButtons) {
            // Click to open
            await button.click();

            const dropdown = await $('.titlebar-menu-dropdown');
            await dropdown.waitForExist();
            await expect(dropdown).toBeDisplayed();

            // Verify at least one item exists
            const item = await $('.titlebar-menu-item');
            await expect(item).toExist();

            // Click again to close
            await button.click();
            await expect(dropdown).not.toBeDisplayed();
        }
    });
});
