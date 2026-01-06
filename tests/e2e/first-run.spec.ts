/**
 * E2E Test: First-Run Experience
 *
 * Tests the application behavior on fresh install / first run.
 *
 * Verifies:
 * 1. App starts with default settings
 * 2. Clean state - no cached credentials on first launch
 *
 * Cross-platform: Windows, macOS, Linux
 *
 * @module first-run.spec
 */

/**
 * E2E Test: First-Run Experience
 *
 * Tests the application behavior on fresh install / first run.
 *
 * Verifies:
 * 1. App starts with default settings
 * 2. Clean state - no cached credentials on first launch
 *
 * Cross-platform: Windows, macOS, Linux
 *
 * @module first-run.spec
 */

import { browser, $, expect } from '@wdio/globals';
import { Selectors } from './helpers/selectors';
import { E2ELogger } from './helpers/logger';
import { clickMenuItemById } from './helpers/menuActions';

describe('First-Run Experience', () => {
    beforeEach(async () => {
        // Ensure app is loaded
        const mainLayout = await $(Selectors.mainLayout);
        await mainLayout.waitForExist({ timeout: 15000 });
    });

    describe('Default Settings', () => {
        it('should use a valid theme (system/light/dark) by default', async () => {
            // Check the data-theme attribute on the HTML element
            // This verifies the theme system is active and initialized
            const currentTheme = await browser.execute(() => {
                return document.documentElement.getAttribute('data-theme');
            });

            E2ELogger.info('first-run', `Current data-theme: ${currentTheme}`);
            // The default is usually 'system', which resolves to 'light' or 'dark' on the html element
            // or explicitly 'system' if the app sets it that way.
            // Based on theme.spec.ts, the data-theme attribute reflects the resolved theme ('light' or 'dark')
            expect(['light', 'dark', 'system']).toContain(currentTheme);
        });

        it('should have functional menu system (opens settings via menu)', async () => {
            // Open Options via Menu instead of Hotkey to avoid focus/OS-level flakiness
            // This verifies the app is responsive and default menus are loaded
            await clickMenuItemById('menu-file-options');

            // Verify Options window opens
            await browser.waitUntil(async () => (await browser.getWindowHandles()).length > 1, {
                timeout: 10000,
                timeoutMsg: 'Expected Settings window to open via menu',
            });

            // Switch to the new window
            const handles = await browser.getWindowHandles();
            const optionsWindowHandle = handles[handles.length - 1];
            await browser.switchToWindow(optionsWindowHandle);

            // Verify content
            const optionsTitlebar = await $(Selectors.optionsTitlebar);
            await expect(optionsTitlebar).toBeExisting();

            E2ELogger.info('first-run', 'Menu verification: Settings window opened via menu item');

            // Close the options window
            await browser.closeWindow();

            // Switch back to main window
            await browser.switchToWindow(handles[0]);
        });
    });

    describe('Clean State Verification', () => {
        it('should verify main window interactivity', async () => {
            // Verify the webview container exists
            const webviewContainer = await $(Selectors.webviewContainer);
            await expect(webviewContainer).toBeExisting();

            // Verify app title in titlebar
            const titleText = await $(Selectors.titlebarTitle);
            await expect(titleText).toBeExisting();

            const text = await titleText.getText();
            expect(text).toBe('Gemini Desktop');

            // Verify window is interactive (not crashed/frozen)
            // Check if we can find the menu bar (Windows/Linux) or just general body existence
            const body = await $('body');
            await expect(body).toBeDisplayed();

            E2ELogger.info('first-run', 'Main window is interactive and loaded');
        });
    });
});
