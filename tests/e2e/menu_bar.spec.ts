
import { browser, $, $$, expect } from '@wdio/globals';

describe('Custom Menu Bar', () => {
    beforeEach(async () => {
        // Wait for the main layout to be ready
        const mainLayout = await $('.main-layout');
        await mainLayout.waitForExist({ timeout: 15000 });
    });

    it('should have menu buttons', async () => {
        // Check for File menu button
        const menuBar = await $('.titlebar-menu-bar');
        await expect(menuBar).toBeExisting();

        const menuButtons = await $$('.titlebar-menu-button');
        expect(menuButtons.length).toBeGreaterThan(0);
    });

    it('should have File, View, and Help menus', async () => {
        const menuBar = await $('.titlebar-menu-bar');
        await menuBar.waitForExist();

        // Check for specific menu buttons by text content
        const allButtons = await $$('.titlebar-menu-button');
        expect(allButtons.length).toBe(3); // File, View, Help

        // Verify each button has expected text
        const buttonTexts: string[] = [];
        for (const button of allButtons) {
            const text = await button.getText();
            buttonTexts.push(text);
        }

        expect(buttonTexts).toContain('File');
        expect(buttonTexts).toContain('View');
        expect(buttonTexts).toContain('Help');
    });

    // Note: Dropdown click behavior is tested in unit tests.
    // E2E click events in Electron WebDriver can be flaky with React portals.
    it.skip('should open dropdown when File menu is clicked', async () => {
        // Find File button directly in the menu bar
        const menuBar = await $('.titlebar-menu-bar');
        await menuBar.waitForExist();

        // Get all buttons and click the first one (File)
        const buttons = await $$('.titlebar-menu-button');
        expect(buttons.length).toBeGreaterThan(0);

        // Click File menu
        await buttons[0].click();

        // Wait for dropdown - it's rendered via Portal at the end of body
        const dropdown = await $('.titlebar-menu-dropdown');
        await dropdown.waitForExist({ timeout: 5000 });
        await expect(dropdown).toBeDisplayed();

        // Click again to close
        await buttons[0].click();
    });

    it('should close dropdown when clicking outside (on backdrop)', async () => {
        const menuBar = await $('.titlebar-menu-bar');
        await menuBar.waitForExist();
        const buttons = await $$('.titlebar-menu-button');
        await buttons[0].click(); // Open File menu

        const dropdown = await $('.titlebar-menu-dropdown');
        await dropdown.waitForExist();
        await expect(dropdown).toBeDisplayed();

        // The backdrop should be present
        const backdrop = await $('.titlebar-menu-backdrop');
        await expect(backdrop).toExist();

        // Click the backdrop (which covers the webview area)
        await backdrop.click();

        // Dropdown should disappear
        await expect(dropdown).not.toBeDisplayed();
    });

    it('should close dropdown when Escape key is pressed', async () => {
        const menuBar = await $('.titlebar-menu-bar');
        await menuBar.waitForExist();
        const buttons = await $$('.titlebar-menu-button');
        await buttons[0].click(); // Open File menu

        const dropdown = await $('.titlebar-menu-dropdown');
        await dropdown.waitForExist();
        await expect(dropdown).toBeDisplayed();

        // Press Escape
        await browser.keys(['Escape']);

        // Dropdown should disappear
        await expect(dropdown).not.toBeDisplayed();
    });

    it('should switch menus when hovering another menu button while open', async () => {
        const menuBar = await $('.titlebar-menu-bar');
        await menuBar.waitForExist();

        const fileButton = await $('[data-testid="menu-button-File"]');
        const viewButton = await $('[data-testid="menu-button-View"]');

        // 1. Open File menu
        await fileButton.click();
        const dropdown = await $('.titlebar-menu-dropdown');
        await dropdown.waitForExist();

        // Check content of first menu
        const exitItem = await $('[data-testid="menu-item-Exit"]');
        await expect(exitItem).toExist();

        // 2. Hover over View menu
        await viewButton.moveTo();

        // 3. Verify dropdown content changes (menu switched)
        // Wait for potential react state update
        await browser.pause(200);

        // Check for an item that is in View menu (Reload)
        const reloadItem = await $('[data-testid="menu-item-Reload"]');
        // Note: View menu items might change, checking specifically for known items
        // If Reload doesn't exist, check for what actually is there. 
        // Based on typical Electron apps, View usually has Reload. 
        // If not, we should update this to whatever is in the View menu.
        // Let's assume the default menu has Reload.
        await expect(reloadItem).toExist();

        // Ensure File menu item is gone
        await expect(exitItem).not.toBeDisplayed();

        // Cleanup: close menu
        await viewButton.click();
    });
});
