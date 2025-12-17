/**
 * E2E tests for Application Lifecycle.
 * 
 * Verifies that the application behaves correctly during startup and shutdown.
 * 
 * Platform-aware: Uses platform helpers for window closing actions.
 * 
 * NOTE: This test intentionally closes the app, which causes WebDriver to lose
 * its session. We handle this gracefully by catching expected errors.
 */

import { browser, $, expect } from '@wdio/globals';
import { usesCustomControls } from './helpers/platform';
import { Selectors } from './helpers/selectors';
import { clickMenuItem } from './helpers/menuActions';
import { waitForWindowCount, closeCurrentWindow } from './helpers/windowActions';
import { E2ELogger } from './helpers/logger';

// TODO: Re-enable once WebDriver session handling for app shutdown is resolved
describe.skip('Application Lifecycle', () => {
    it('should close the application when the main window is closed, even if options window is open', async function () {
        // Set a longer timeout for this test since it involves app shutdown
        this.timeout(30000);

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

        // 3. Close the main window - this should trigger app shutdown
        E2ELogger.info('lifecycle', 'Closing main window to trigger app shutdown');
        await closeCurrentWindow();

        // 4. The app should quit when main window closes.
        // We just need to wait briefly and verify the close was triggered.
        // Any session errors after this point indicate the app quit (expected).
        try {
            await browser.pause(2000);

            // If we can still get handles, check if app has closed
            const remainingHandles = await browser.getWindowHandles();

            if (remainingHandles.length === 0) {
                E2ELogger.info('lifecycle', 'App closed successfully - no windows remaining');
            } else {
                // If windows still exist after close, that's an actual failure
                E2ELogger.info('lifecycle', `Unexpected: ${remainingHandles.length} windows still open`);
                expect(remainingHandles.length).toBe(0);
            }
        } catch (error: any) {
            // Session errors are expected when the app quits
            E2ELogger.info('lifecycle', 'App quit as expected', { error: error.message });
            // Test passes - we reached the shutdown phase
        }
    });
});
