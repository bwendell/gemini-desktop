import { expect } from '@wdio/globals';
import { browser } from '@wdio/globals';

describe('Auto-Update Startup Check', () => {
  it('should automatically check for updates on application launch', async () => {
    // GIVEN auto-updates are enabled (default)
    const enabled = await browser.execute(() => {
      return window.electronAPI.getAutoUpdateEnabled();
    });
    expect(enabled).toBe(true);

    // WHEN the application launches (we are already launched, but we can verify the check happened)
    // OR we can wait for it if we are early enough.
    // The check triggers 10s after launch.
    // We set up a listener.

    // Check if it already happened
    const lastCheck = await browser.execute(() => {
      return window.electronAPI.getLastUpdateCheckTime();
    });

    if (lastCheck > 0) {
      expect(lastCheck).toBeGreaterThan(0);
      return; // Already checked
    }

    // If not, wait for it
    const checkHappened = await browser.executeAsync(async (done) => {
      // Wait for up to 15 seconds for the event
      let captured = false;

      const cleanup = window.electronAPI.onCheckingForUpdate(() => {
        captured = true;
        cleanup();
        done(true); // Success
      });

      // Fallback timeout inside the browser context
      setTimeout(async () => {
        if (!captured) {
          cleanup();
          // Final check in case we missed the event but state updated
          const finalCheck = await window.electronAPI.getLastUpdateCheckTime();
          done(finalCheck > 0);
        }
      }, 15000);
    });

    // THEN an update check should automatically trigger
    expect(checkHappened).toBe(true);
  });
});
