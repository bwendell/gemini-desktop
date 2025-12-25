/**
 * E2E Test: Tray Quit Functionality
 *
 * Tests that the "Quit" menu item in the system tray properly exits the application.
 *
 * NOTE: This test intentionally causes the app to quit, which ends the WebDriver session.
 * We detect successful quit by catching the expected session termination error.
 *
 * Cross-platform: Windows, macOS, Linux
 *
 * @module tray-quit.spec
 */

import { browser, $, expect } from '@wdio/globals';
import { Selectors } from './helpers/selectors';
import { E2ELogger } from './helpers/logger';
import { clickTrayMenuItem, verifyTrayCreated } from './helpers/trayActions';

describe('Tray Quit Functionality', () => {
  beforeEach(async () => {
    // Ensure app is loaded
    const mainLayout = await $(Selectors.mainLayout);
    await mainLayout.waitForExist({ timeout: 15000 });
  });

  /**
   * This test verifies that clicking "Quit" from the tray menu properly exits the app.
   * Since the app quits, WebDriver loses its session, which we handle gracefully.
   */
  it('should quit the application when "Quit" menu item is clicked', async function () {
    // Set a longer timeout for this test since it involves app shutdown
    this.timeout(30000);

    // 1. Verify tray exists before attempting to quit
    const trayExists = await verifyTrayCreated();
    expect(trayExists).toBe(true);
    E2ELogger.info('tray-quit', 'Tray icon verified before quit');

    // 2. Get initial window count
    const initialHandles = await browser.getWindowHandles();
    E2ELogger.info('tray-quit', `Windows before quit: ${initialHandles.length}`);

    // 3. Click "Quit" in tray context menu
    E2ELogger.info('tray-quit', 'Clicking Quit menu item...');

    try {
      await clickTrayMenuItem('quit');

      // Give the app time to process the quit
      await browser.pause(2000);

      // If we get here, try to check window state
      const remainingHandles = await browser.getWindowHandles();

      if (remainingHandles.length === 0) {
        // App closed successfully
        E2ELogger.info('tray-quit', 'App quit successfully - no windows remaining');
      } else {
        // App didn't quit - this is a failure
        E2ELogger.info(
          'tray-quit',
          `FAIL: ${remainingHandles.length} windows still open after quit`
        );
        expect(remainingHandles.length).toBe(0);
      }
    } catch (error: any) {
      // Session termination errors are EXPECTED when the app quits
      // These indicate successful quit behavior
      if (
        error.message.includes('session') ||
        error.message.includes('terminated') ||
        error.message.includes('timeout') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('no such window')
      ) {
        E2ELogger.info('tray-quit', 'App quit successfully (session ended as expected)', {
          error: error.message,
        });
        // Test passes - the app quit as expected
      } else {
        // Unexpected error - rethrow
        E2ELogger.info('tray-quit', 'Unexpected error during quit', { error: error.message });
        throw error;
      }
    }
  });
});
