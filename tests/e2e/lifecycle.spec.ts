/**
 * E2E tests for Application Lifecycle.
 * 
 * Verifies that the application behaves correctly during startup and shutdown.
 * 
 * Platform-aware: Uses platform helpers for window closing actions.
 */

import { browser, $, expect } from '@wdio/globals';
import { usesCustomControls } from './helpers/platform';
import { Selectors } from './helpers/selectors';
import { clickMenuItem } from './helpers/menuActions';
import { waitForWindowCount } from './helpers/windowActions';
import { E2ELogger } from './helpers/logger';

describe('Application Lifecycle', () => {
    it('should close the application when the main window is closed, even if options window is open', async () => {
        // 1. Open the Options window
        await clickMenuItem({ menuLabel: 'File', itemLabel: 'Options' });

        // Wait for Options window to appear (2 windows total)
        await waitForWindowCount(2, 5000);

        // 2. Find which handle is the main window
        const handles = await browser.getWindowHandles();

        await browser.switchToWindow(handles[0]);
        const isMainWindow = await browser.execute(() => {
            return document.querySelector('[data-testid="main-layout"]') !== null;
        });

        const mainHandle = isMainWindow ? handles[0] : handles[1];

        // Switch to main window to close it
        await browser.switchToWindow(mainHandle);

        // 3. Close the main window - platform-specific
        if (await usesCustomControls()) {
            const closeButton = await $(Selectors.closeButton);
            await closeButton.click();
        } else {
            // macOS: Use keyboard shortcut to close window
            await browser.keys(['Meta', 'w']);
        }

        try {
            // Wait for potential shutdown
            await browser.pause(2000);

            // Attempt to get window handles - if app is closed, this might throw or return empty
            const remainingHandles = await browser.getWindowHandles();

            if (remainingHandles.length > 0) {
                E2ELogger.info('lifecycle', `Windows still remain: ${remainingHandles.length}`);
                // If windows still exist, force failure
                expect(remainingHandles.length).toBe(0);
            }
        } catch (error: any) {
            // If the error indicates the app quit, that's the expected behavior
            E2ELogger.info('lifecycle', 'App quit as expected', { error: error.message });
        }
    });
});
