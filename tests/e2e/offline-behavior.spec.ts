/**
 * E2E Test: Offline Behavior
 *
 * Verifies how the app handles network connectivity issues.
 * USES CDP via Electron Debugger to simulate offline state reliably.
 */

/// <reference path="./helpers/wdio-electron.d.ts" />

import { browser, expect, $ } from '@wdio/globals';
import { E2ELogger } from './helpers/logger';
import { expectElementDisplayed, expectElementNotDisplayed } from './helpers/assertions';

// ============================================================================
// CDP Network Emulation Helpers
// ============================================================================

/**
 * Sets the network emulation state via Chrome DevTools Protocol.
 * @param offline - Whether to simulate offline mode
 */
async function setNetworkEmulation(offline: boolean): Promise<void> {
  await browser.electron.execute(async (electron, args) => {
    const wins = electron.BrowserWindow.getAllWindows();
    const wc = wins[0].webContents;
    try {
      if (!wc.debugger.isAttached()) wc.debugger.attach('1.3');
      if (offline) {
        await wc.debugger.sendCommand('Network.enable');
      }
      await wc.debugger.sendCommand('Network.emulateNetworkConditions', {
        offline,
        latency: 0,
        downloadThroughput: offline ? 0 : -1,
        uploadThroughput: offline ? 0 : -1
      });
    } catch (e) {
      console.error('CDP Error:', e);
    }
  }, { offline });
}

/**
 * Waits for the renderer to recognize the network state change.
 * @param expectedOnline - Whether the renderer should report being online
 */
async function waitForNetworkStateChange(expectedOnline: boolean): Promise<void> {
  await browser.waitUntil(
    async () => {
      return await browser.execute((expected) => navigator.onLine === expected, expectedOnline);
    },
    {
      timeout: 5000,
      timeoutMsg: `Renderer did not update navigator.onLine to ${expectedOnline}`
    }
  );
}

/**
 * Reloads the page.
 */
async function reloadPage(): Promise<void> {
  await browser.execute(() => {
    window.location.reload();
  });
  await browser.pause(2000);
}

/**
 * Checks if the app's webContents has crashed.
 */
async function isAppResponsive(): Promise<boolean> {
  return await browser.electron.execute((electron) => {
    const win = electron.BrowserWindow.getAllWindows()[0];
    return win ? !win.webContents.isCrashed() : false;
  });
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Offline Behavior', () => {
  afterEach(async () => {
    // Ensure network is restored after each test
    await setNetworkEmulation(false);
  });

  it('should handle network loss gracefully', async () => {
    // 1. App starts online
    const title = await browser.getTitle();
    expect(title).not.toBe('');

    // 2. Go offline via CDP
    await setNetworkEmulation(true);
    await waitForNetworkStateChange(false);
    E2ELogger.info('offline', 'Simulated offline mode via CDP');

    // 3. Reload to trigger offline state
    await reloadPage();

    // 4. Verify the OfflineOverlay is visible
    await expectElementDisplayed('[data-testid="offline-overlay"]', { timeout: 10000 });
    
    // Verify SVG icon is present
    await expectElementDisplayed('[data-testid="offline-icon"]');
    
    // Verify Retry button is present and clickable
    const retryButton = await $('[data-testid="offline-retry-button"]');
    expect(await retryButton.isDisplayed()).toBe(true);
    expect(await retryButton.isEnabled()).toBe(true);
    
    E2ELogger.info('offline', 'Verified OfflineOverlay, Icon, and Retry Button are visible');

    // 5. Test Retry button click (should trigger reload)
    await retryButton.click();
    
    // 6. Verify the app is still responsive (not crashed)
    expect(await isAppResponsive()).toBe(true);
    E2ELogger.info('offline', 'App remained responsive after retry click');
  });

  it('should restore functionality when network returns', async () => {
    // 1. Go offline
    await setNetworkEmulation(true);
    await waitForNetworkStateChange(false);

    // 2. Go back online
    await setNetworkEmulation(false);
    await waitForNetworkStateChange(true);
    E2ELogger.info('offline', 'Restored online mode');

    // 3. Refresh and verify app loads
    await reloadPage();
    await browser.pause(1000); // Extra settle time

    const title = await browser.getTitle();
    expect(title).not.toBe('');
    E2ELogger.info('offline', 'App successfully recovered after network restoration');
  });

  it('should reload page and recover when retry button is clicked after connection restored', async () => {
    // 1. Go offline
    await setNetworkEmulation(true);
    await waitForNetworkStateChange(false);
    
    // 2. Verify overlay is visible
    await expectElementDisplayed('[data-testid="offline-overlay"]', { timeout: 10000 });

    // 2a. Reload page while offline to trigger "start offline" error state
    await reloadPage();

    // Wait for reload and overlay to reappear
    await expectElementDisplayed('[data-testid="offline-overlay"]', { timeout: 10000 });

    // 3. Restore network connectivity
    await setNetworkEmulation(false);
    await waitForNetworkStateChange(true);

    // 4. Verify overlay persists until retry (error state is sticky)
    const overlay = await $('[data-testid="offline-overlay"]');
    expect(await overlay.isDisplayed()).toBe(true);

    // 5. Click retry
    const retryButton = await $('[data-testid="offline-retry-button"]');
    await retryButton.click();
    
    // 6. Verify overlay disappears (reload happened and connectivity check passed)
    await expectElementNotDisplayed('[data-testid="offline-overlay"]', { timeout: 15000 });
    
    // 7. Verify gemini iframe is visible
    await expectElementDisplayed('[data-testid="gemini-iframe"]');

    E2ELogger.info('offline', 'Manual retry successfully recovered the app');
  });
});
