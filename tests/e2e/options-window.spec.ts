import { browser, $, expect } from '@wdio/globals';

describe('Options Window Features', () => {
    it('should open options window with correct window controls', async () => {
        // 1. Open File menu
        const menuBar = await $('.titlebar-menu-bar');
        await menuBar.waitForExist();

        const fileButton = await $('[data-testid="menu-button-File"]');
        await fileButton.click();

        // 2. Click "Options"
        const optionsItem = await $('[data-testid="menu-item-Options"]');
        await optionsItem.waitForExist();
        await expect(optionsItem).toBeEnabled();

        // Debug: Ensure API exists
        const hasApi = await browser.execute(() => !!window.electronAPI && typeof window.electronAPI.openOptions === 'function');
        expect(hasApi).toBe(true);

        await optionsItem.click();

        // 3. Switch to the new window
        // Wait for new window to appear
        await browser.waitUntil(async () => {
            const handles = await browser.getWindowHandles();
            return handles.length === 2;
        }, { timeout: 5000, timeoutMsg: 'Options window did not open' });

        const handles = await browser.getWindowHandles();
        const optionsWindowHandle = handles[1]; // Index 1 is likely the new window

        // Pause briefly to allow window to fully initialize
        await browser.pause(1000);

        // Switch context
        await browser.switchToWindow(optionsWindowHandle);

        // 4. Verify Custom Titlebar Elements
        const titlebar = await $('.options-titlebar');
        await expect(titlebar).toExist();

        // 5. Verify Controls: Minimize and Close should exist, Maximize should NOT
        // We verify this by counting buttons in the controls container
        const controlsContainer = await $('.options-window-controls');
        await expect(controlsContainer).toBeDisplayed();

        const buttons = await controlsContainer.$$('button');
        // Should only be Minimize and Close
        expect(buttons.length).toBe(2);

        const minimizeBtn = await $('[data-testid="options-minimize-button"]');
        const closeBtn = await $('[data-testid="options-close-button"]');

        await expect(minimizeBtn).toBeDisplayed();
        await expect(closeBtn).toBeDisplayed();

        // Double check no maximize button exists by any reasonable selector
        const maximizeBtn = await $('[data-testid="options-maximize-button"]');
        await expect(maximizeBtn).not.toExist();

        // 6. Close the options window
        await closeBtn.click();

        // 7. Verify correct window closing behavior
        // Wait for window count to drop to 1
        await browser.waitUntil(async () => {
            const currentHandles = await browser.getWindowHandles();
            return currentHandles.length === 1;
        }, { timeout: 5000, timeoutMsg: 'Options window did not close, or extra windows remain' });

        const finalHandles = await browser.getWindowHandles();
        expect(finalHandles.length).toBe(1);

        // Verify the remaining window is the main window
        // Note: handles[0] is typically the first window opened
        expect(finalHandles[0]).toBe(handles[0]);

        // Switch back just to be safe and verify state
        await browser.switchToWindow(finalHandles[0]);
        const title = await browser.getTitle();
        // The main window title might be 'Gemini' or empty depending on load state, 
        // but we just want to ensure we can interact with it.
        expect(title).toBeDefined();
    });
});
