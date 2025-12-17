/**
 * E2E tests for Application Lifecycle.
 * 
 * Verifies that the application behaves correctly during startup and shutdown.
 */

import { browser, $, expect } from '@wdio/globals';

describe('Application Lifecycle', () => {
    it('should close the application when the main window is closed, even if options window is open', async () => {
        // 1. Open the Options window
        const menuBar = await $('.titlebar-menu-bar');
        await menuBar.waitForExist();

        const fileButton = await $('[data-testid="menu-button-File"]');
        await fileButton.click();

        const optionsItem = await $('[data-testid="menu-item-Options"]');
        await optionsItem.waitForExist();
        await optionsItem.click();

        // Wait for Options window to appear (2 windows total)
        await browser.waitUntil(async () => {
            return (await browser.getWindowHandles()).length === 2;
        }, { timeout: 5000, timeoutMsg: 'Options window did not open' });

        // 2. Close the MAIN window
        // We need to identify which handle is the main window.
        // Usually the first one, but let's be safe.
        const handles = await browser.getWindowHandles();

        // Switch to the first handle and check if it's the main window
        await browser.switchToWindow(handles[0]);
        const isMainWindow = await browser.execute(() => {
            return document.querySelector('[data-testid="main-layout"]') !== null;
        });

        const mainHandle = isMainWindow ? handles[0] : handles[1];
        const optionsHandle = isMainWindow ? handles[1] : handles[0];

        // Switch to main window to close it
        await browser.switchToWindow(mainHandle);

        // Click the close button on the custom titlebar (Main window uses WindowControls component)
        const closeButton = await $('[data-testid="close-button"]');

        try {
            await closeButton.click();

            // Wait for potential shutdown
            await browser.pause(2000);

            // Attempt to get window handles - if app is closed, this might throw or return empty
            const remainingHandles = await browser.getWindowHandles();

            if (remainingHandles.length > 0) {
                console.log('Windows still match:', remainingHandles.length);
                // If windows still exist, check if it's just the options window or something else
                // But since we expect QUIT, any window is a failure unless it's about to close.
                // Force failure if windows remain
                expect(remainingHandles.length).toBe(0);
            }
        } catch (error: any) {
            // If the error is "session not created" or "Chrome instance exited", it means the app quit successfully!
            const msg = error.message || '';
            throw error;
        }
    });
});
