/**
 * E2E Test: Offline Behavior
 *
 * Verifies how the app handles network connectivity issues.
 * USES Electron's session.setOfflineMode(true) to simulate offline state.
 */

import { browser, expect, $ } from '@wdio/globals';
import { E2ELogger } from './helpers/logger';

describe('Offline Behavior', () => {
  afterEach(async () => {
    // Ensure network is restored after each test
    await browser.electron.execute((electron) => {
      const wins = electron.BrowserWindow.getAllWindows();
      wins.forEach((win) => {
        win.webContents.session.setOfflineMode(false);
      });
    });
  });

  it('should handle network loss gracefully', async () => {
    // 1. App starts online
    const title = await browser.getTitle();
    expect(title).not.toBe('');

    // 2. Go offline
    // We set Electron session to offline AND manually dispatch the event
    // because setOfflineMode doesn't always trigger the renderer event reliably in tests
    await browser.electron.execute((electron) => {
      const wins = electron.BrowserWindow.getAllWindows();
      wins.forEach((win) => {
        win.webContents.session.setOfflineMode(true);
      });
    });

    await browser.execute(() => {
      window.dispatchEvent(new Event('offline'));
    });

    E2ELogger.info('offline', 'Simulated offline mode');

    // 3. Attempt to refresh or navigate (should fail or show offline indicator)
    // Note: Gemini's own UI handles offline, we verify Electron doesn't crash
    await browser.execute(() => {
      window.location.reload();
      // Dispatch again after reload just in case, though reload might clear it.
      // But for this test, we just want to see the overlay if the app survives.
      setTimeout(() => window.dispatchEvent(new Event('offline')), 500);
    });

    await browser.pause(2000);

    // 4. Verify the OfflineOverlay is visible
    const overlay = await $('[data-testid="offline-overlay"]');
    await overlay.waitForDisplayed({ timeout: 5000 });
    expect(await overlay.isDisplayed()).toBe(true);
    E2ELogger.info('offline', 'Verified OfflineOverlay is visible when offline');

    // We also verify the app is still responsive
    const isResponsive = await browser.electron.execute((electron) => {
      const win = electron.BrowserWindow.getAllWindows()[0];
      return win ? !win.webContents.isCrashed() : false;
    });
    expect(isResponsive).toBe(true);
    E2ELogger.info('offline', 'App remained responsive after refresh in offline mode');
  });

  it('should restore functionality when network returns', async () => {
    // 1. Go offline
    await browser.electron.execute((electron) => {
      const wins = electron.BrowserWindow.getAllWindows();
      wins.forEach((win) => {
        win.webContents.session.setOfflineMode(true);
      });
    });

    // 2. Go back online
    await browser.electron.execute((electron) => {
      const wins = electron.BrowserWindow.getAllWindows();
      wins.forEach((win) => {
        win.webContents.session.setOfflineMode(false);
      });
    });
    E2ELogger.info('offline', 'Restored online mode');

    // 3. Refresh and verify app loads
    await browser.execute(() => {
      window.location.reload();
    });

    await browser.pause(3000);

    const title = await browser.getTitle();
    expect(title).not.toBe('');
    E2ELogger.info('offline', 'App successfully recovered after network restoration');
  });
});
