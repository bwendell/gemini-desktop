/**
 * E2E Test: Options Window Features
 *
 * Tests opening/closing the Options window and verifying controls.
 * 
 * Platform-aware: Uses clickMenuItem helper for cross-platform menu access.
 */

import { browser, $, expect } from '@wdio/globals';
import { usesCustomControls } from './helpers/platform';
import { Selectors } from './helpers/selectors';
import { clickMenuItem } from './helpers/menuActions';
import { waitForWindowCount, switchToWindowByIndex } from './helpers/windowActions';
import { E2ELogger } from './helpers/logger';

declare global {
    interface Window {
        electronAPI: {
            closeWindow: () => void;
        };
    }
}

describe('Options Window Features', () => {
    it('should open options window with correct window controls', async () => {
        // 1. Open Options via menu
        await clickMenuItem({ menuLabel: 'File', itemLabel: 'Options' });

        // 2. Wait for new window
        await waitForWindowCount(2, 5000);
        const handles = await browser.getWindowHandles();
        const optionsWindowHandle = handles[1];

        // Pause briefly to allow window to fully initialize
        await browser.pause(1000);

        // Switch context
        await browser.switchToWindow(optionsWindowHandle);

        // 3. Verify Custom Titlebar exists (present on all platforms for Options window)
        const titlebar = await $(Selectors.optionsTitlebar);
        await expect(titlebar).toExist();

        // 4. Verify window controls - only present on Windows/Linux
        if (await usesCustomControls()) {
            const controlsContainer = await $('.options-window-controls');
            await expect(controlsContainer).toBeDisplayed();

            const buttons = await controlsContainer.$$('button');
            // Should only be Minimize and Close
            expect(buttons.length).toBe(2);

            const minimizeBtn = await $('[data-testid="options-minimize-button"]');
            const closeBtn = await $(Selectors.optionsCloseButton);

            await expect(minimizeBtn).toBeDisplayed();
            await expect(closeBtn).toBeDisplayed();

            // Double check no maximize button exists
            const maximizeBtn = await $('[data-testid="options-maximize-button"]');
            await expect(maximizeBtn).not.toExist();

            // 5. Close the options window via close button
            await closeBtn.click();
        } else {
            E2ELogger.info('options-window', 'Skipping custom controls check on macOS');
            // Close via exposed API for reliability (Cmd+W can be flaky in CI)
            await browser.execute(() => window.electronAPI.closeWindow());
        }

        // 6. Verify correct window closing behavior
        await waitForWindowCount(1, 5000);

        const finalHandles = await browser.getWindowHandles();
        expect(finalHandles.length).toBe(1);

        // Verify the remaining window is the main window
        expect(finalHandles[0]).toBe(handles[0]);

        // Switch back just to be safe
        await browser.switchToWindow(finalHandles[0]);
        const title = await browser.getTitle();
        expect(title).toBeDefined();
    });
});
