/**
 * E2E Test: Custom Menu Bar
 *
 * Tests menu bar functionality including dropdowns and hover behavior.
 *
 * Platform-aware: Entire suite skips on macOS since custom menu bar is not rendered.
 */

import { browser, $, $$, expect } from '@wdio/globals';
import { usesCustomControls } from './helpers/platform';
import { Selectors } from './helpers/selectors';
import { E2ELogger } from './helpers/logger';
import { MainWindowPage } from './pages';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { waitForUIState } from './helpers/waitUtilities';

describe('Custom Menu Bar', () => {
    const mainWindow = new MainWindowPage();

    beforeEach(async () => {
        // Skip entire suite on macOS
        if (!(await usesCustomControls())) {
            E2ELogger.info('menu_bar', 'Skipping test - macOS uses native menu bar');
            return;
        }

        await waitForAppReady();
    });

    afterEach(async () => {
        // Skip cleanup on macOS
        if (!(await usesCustomControls())) {
            return;
        }

        await ensureSingleWindow();
    });

    it('should have menu buttons', async () => {
        if (!(await usesCustomControls())) {
            return; // Skip on macOS
        }

        expect(await mainWindow.isMenuBarDisplayed()).toBe(true);

        const menuButtons = await $$('.titlebar-menu-button');
        expect(menuButtons.length).toBeGreaterThan(0);
    });

    it('should have File, View, and Help menus', async () => {
        if (!(await usesCustomControls())) {
            return; // Skip on macOS
        }

        // Wait for menu bar to exist
        const menuBar = await $(mainWindow.menuBarSelector);
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

    it('should open dropdown when File menu is clicked', async () => {
        if (!(await usesCustomControls())) {
            return; // Skip on macOS
        }

        // Open File menu via MainWindowPage
        await mainWindow.openMenu('File');

        // Wait for dropdown - it's rendered via Portal at the end of body
        const dropdown = await $(Selectors.menuDropdown);
        await dropdown.waitForExist({ timeout: 5000 });
        await expect(dropdown).toBeDisplayed();

        // Click File menu again to close
        await mainWindow.openMenu('File');
    });

    it('should close dropdown when clicking outside (on backdrop)', async () => {
        if (!(await usesCustomControls())) {
            return; // Skip on macOS
        }

        // Open File menu
        await mainWindow.openMenu('File');

        const dropdown = await $(Selectors.menuDropdown);
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
        if (!(await usesCustomControls())) {
            return; // Skip on macOS
        }

        // Open File menu
        await mainWindow.openMenu('File');

        const dropdown = await $(Selectors.menuDropdown);
        await dropdown.waitForExist();
        await expect(dropdown).toBeDisplayed();

        // Press Escape
        await browser.keys(['Escape']);

        // Dropdown should disappear
        await expect(dropdown).not.toBeDisplayed();
    });

    it('should switch menus when hovering another menu button while open', async () => {
        if (!(await usesCustomControls())) {
            return; // Skip on macOS
        }

        const fileButton = await $(Selectors.menuButton('File'));
        const viewButton = await $(Selectors.menuButton('View'));

        // 1. Open File menu
        await mainWindow.openMenu('File');
        const dropdown = await $(Selectors.menuDropdown);
        await dropdown.waitForExist();

        // Check content of first menu - Exit item is in File menu
        const exitItem = await $(Selectors.menuItem('Exit'));
        await expect(exitItem).toExist();

        // 2. Hover over View menu
        await viewButton.moveTo();

        // 3. Wait for React state update - check that Reload item (from View menu) appears
        await waitForUIState(
            async () => {
                try {
                    const reloadItem = await $(Selectors.menuItem('Reload'));
                    return await reloadItem.isDisplayed();
                } catch {
                    return false;
                }
            },
            { description: 'Menu switch to View on hover' }
        );

        // Check for an item that is in View menu (Reload)
        const reloadItem = await $(Selectors.menuItem('Reload'));
        await expect(reloadItem).toExist();

        // Ensure File menu item is gone
        await expect(exitItem).not.toBeDisplayed();

        // Cleanup: close menu
        await viewButton.click();
    });
});
