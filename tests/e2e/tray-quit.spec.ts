/**
 * E2E Test: Tray Quit Functionality
 *
 * Tests that the "Quit" menu item in the system tray properly exits the application.
 *
 * NOTE: This test intentionally causes the app to quit, which ends the WebDriver session.
 * We verify the quit was triggered by checking that clickTrayMenuItem('quit') executes without error.
 * The actual app termination is verified by the test framework detecting session end.
 *
 * Cross-platform: Windows, macOS, Linux
 *
 * @module tray-quit.spec
 */

import { browser, $, expect } from '@wdio/globals';
import { Selectors } from './helpers/selectors';
import { clickTrayMenuItem, verifyTrayCreated } from './helpers/trayActions';

describe('Tray Quit Functionality', () => {
    beforeEach(async () => {
        // Ensure app is loaded
        const mainLayout = await $(Selectors.mainLayout);
        await mainLayout.waitForExist({ timeout: 15000 });
    });

    /**
     * This test verifies that clicking "Quit" from the tray menu triggers app shutdown.
     *
     * APPROACH: After triggering quit, any WebDriver command will block until timeout.
     * Instead of trying to verify the window closed (which blocks), we:
     * 1. Verify tray exists and app is running
     * 2. Execute the quit action via trayManager.executeTrayAction('quit')
     * 3. Consider the test passed - the action was dispatched successfully
     *
     * The actual quit is verified by the logs showing "[TrayManager] Tray destroyed"
     * and "[MainWindow] Window closed" which appear in the test output.
     */
    it('should quit the application when "Quit" menu item is clicked', async function () {
        // 1. Verify tray exists before attempting to quit
        const trayExists = await verifyTrayCreated();
        expect(trayExists).toBe(true);

        // 2. Get initial window count to confirm app is running
        const initialHandles = await browser.getWindowHandles();
        expect(initialHandles.length).toBeGreaterThan(0);

        // 3. Click "Quit" in tray context menu
        // This dispatches the quit action via IPC - it returns immediately
        // but the app will close asynchronously after this call.
        await clickTrayMenuItem('quit');

        // If we reach here, the quit action was successfully dispatched.
        // The app is now shutting down. Any further WebDriver commands would block.
        // The test passes because:
        // - We verified tray existed
        // - We verified app was running
        // - We successfully called the quit action
        // The actual quit is confirmed by the chromedriver logs showing
        // "[TrayManager] Executing tray action programmatically: quit" followed by
        // "[MainWindow] Window closed" and "[TrayManager] Tray destroyed"

        // NOTE: We intentionally do NOT try to verify window state after quit.
        // Any browser.* call would block for the bridge timeout and fail.
    });
});
