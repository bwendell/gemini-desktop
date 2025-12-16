
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
});
