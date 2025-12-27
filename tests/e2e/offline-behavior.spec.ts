/**
 * E2E Test: Offline Behavior
 *
 * Verifies how the app handles network connectivity issues.
 * USES CDP via Electron Debugger to simulate offline state reliably.
 */

/// <reference path="./helpers/wdio-electron.d.ts" />

import { browser, expect, $ } from '@wdio/globals';
import { E2ELogger } from './helpers/logger';

describe('Offline Behavior', () => {
  afterEach(async () => {
    // Ensure network is restored after each test
    await browser.electron.execute(async (electron) => {
      const wins = electron.BrowserWindow.getAllWindows();
      const wc = wins[0].webContents;
      try {
          if (!wc.debugger.isAttached()) wc.debugger.attach('1.3');
          await wc.debugger.sendCommand('Network.emulateNetworkConditions', {
            offline: false,
            latency: 0,
            downloadThroughput: -1,
            uploadThroughput: -1
          });
      } catch (e) { console.error('CDP Error:', e); }
    });
  });

  it('should handle network loss gracefully', async () => {
    // 1. App starts online
    const title = await browser.getTitle();
    expect(title).not.toBe('');

    // 2. Go offline via CDP
    await browser.electron.execute(async (electron) => {
      const wins = electron.BrowserWindow.getAllWindows();
      const wc = wins[0].webContents;
      try {
          if (!wc.debugger.isAttached()) wc.debugger.attach('1.3');
          await wc.debugger.sendCommand('Network.enable');
          await wc.debugger.sendCommand('Network.emulateNetworkConditions', {
            offline: true,
            latency: 0,
            downloadThroughput: 0,
            uploadThroughput: 0
          });
      } catch (e) { console.error('CDP Error:', e); }
    });

    // Wait for renderer to recognize offline state
    await browser.waitUntil(async () => {
      return await browser.execute(() => !navigator.onLine);
    }, {
      timeout: 5000,
      timeoutMsg: 'Renderer did not update navigator.onLine to false after CDP emulation'
    });

    E2ELogger.info('offline', 'Simulated offline mode via CDP');

    // 3. Attempt to refresh or navigate (should fail or show offline indicator)
    // Note: Gemini's own UI handles offline, we verify Electron doesn't crash
    // 3. Attempt to refresh (should show offline indicator)
    await browser.execute(() => {
      window.location.reload();
    });

    await browser.pause(2000);

    // 4. Verify the OfflineOverlay is visible
    const overlay = await $('[data-testid="offline-overlay"]');
    await overlay.waitForDisplayed({ timeout: 10000 });
    expect(await overlay.isDisplayed()).toBe(true);
    
    // Verify SVG icon is present
    const icon = await $('[data-testid="offline-icon"]');
    expect(await icon.isDisplayed()).toBe(true);
    
    // Verify Retry button is present and clickable
    const retryButton = await $('[data-testid="offline-retry-button"]');
    expect(await retryButton.isDisplayed()).toBe(true);
    expect(await retryButton.isEnabled()).toBe(true);
    
    E2ELogger.info('offline', 'Verified OfflineOverlay, Icon, and Retry Button are visible');

    // 5. Test Retry button click (should trigger reload)
    // We expect the app to stay partially responsive or reload
    await retryButton.click();
    
    // We also verify the app is still responsive
    const isResponsive = await browser.electron.execute((electron) => {
      const win = electron.BrowserWindow.getAllWindows()[0];
      return win ? !win.webContents.isCrashed() : false;
    });
    expect(isResponsive).toBe(true);
    E2ELogger.info('offline', 'App remained responsive after retry click');
  });

  it('should restore functionality when network returns', async () => {
    // 1. Go offline
    await browser.electron.execute(async (electron) => {
        const wins = electron.BrowserWindow.getAllWindows();
        const wc = wins[0].webContents;
        try {
            if (!wc.debugger.isAttached()) wc.debugger.attach('1.3');
            await wc.debugger.sendCommand('Network.enable');
            await wc.debugger.sendCommand('Network.emulateNetworkConditions', {
              offline: true,
              latency: 0,
              downloadThroughput: 0,
              uploadThroughput: 0
            });
        } catch (e) { console.error('CDP Error:', e); }
      });
  
      await browser.waitUntil(async () => {
        return await browser.execute(() => !navigator.onLine);
      });

    // 2. Go back online
    await browser.electron.execute(async (electron) => {
        const wins = electron.BrowserWindow.getAllWindows();
        const wc = wins[0].webContents;
        try {
            if (!wc.debugger.isAttached()) wc.debugger.attach('1.3');
            await wc.debugger.sendCommand('Network.emulateNetworkConditions', {
                offline: false,
                latency: 0,
                downloadThroughput: -1,
                uploadThroughput: -1
              });
        } catch (e) { console.error('CDP Error:', e); }
      });
      
      await browser.waitUntil(async () => {
        return await browser.execute(() => navigator.onLine);
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
  it('should reload page and recover when retry button is clicked after connection restored', async () => {
    // 1. Go offline
    await browser.electron.execute(async (electron) => {
        const wins = electron.BrowserWindow.getAllWindows();
        const wc = wins[0].webContents;
        try {
            if (!wc.debugger.isAttached()) wc.debugger.attach('1.3');
            await wc.debugger.sendCommand('Network.enable');
            await wc.debugger.sendCommand('Network.emulateNetworkConditions', {
              offline: true,
              latency: 0,
              downloadThroughput: 0,
              uploadThroughput: 0
            });
        } catch (e) { console.error('CDP Error:', e); }
      });
    
      await browser.waitUntil(async () => {
        return await browser.execute(() => !navigator.onLine);
      });
    
    // 2. Verify overlay is visible
    const overlay = await $('[data-testid="offline-overlay"]');
    await overlay.waitForDisplayed({ timeout: 10000 });
    expect(await overlay.isDisplayed()).toBe(true);

    // 2a. Reload page while offline to trigger "start offline" error state
    // This ensures 'error' state is set in useGeminiIframe, so overlay persists even if isOnline becomes true later
    await browser.execute(() => {
        window.location.reload();
    });

    // Wait for reload and overlay to reappear
    const overlayAfterReload = await $('[data-testid="offline-overlay"]');
    await overlayAfterReload.waitForDisplayed({ timeout: 10000 });

    // 3. Restore network connectivity
    await browser.electron.execute(async (electron) => {
        const wins = electron.BrowserWindow.getAllWindows();
        const wc = wins[0].webContents;
        try {
            if (!wc.debugger.isAttached()) wc.debugger.attach('1.3');
            await wc.debugger.sendCommand('Network.emulateNetworkConditions', {
                offline: false,
                latency: 0,
                downloadThroughput: -1,
                uploadThroughput: -1
              });
        } catch (e) { console.error('CDP Error:', e); }
      });
      
      await browser.waitUntil(async () => {
        return await browser.execute(() => navigator.onLine);
      });

    // 4. Verify overlay persists until retry
    // The overlay should stay until the user explicitly attempts to reconnect or autoreload triggers
    expect(await overlay.isDisplayed()).toBe(true);

    // 7. Click retry
    const retryButton = await $('[data-testid="offline-retry-button"]');
    await retryButton.click();
    
    // 8. Verify overlay disappears (implies reload happened and connectivity check passed)
    // We wait for it to disappear
    await overlay.waitForDisplayed({ reverse: true, timeout: 15000 });
    
    // 9. Verify gemini iframe is visible
    const iframe = await $('[data-testid="gemini-iframe"]');
    expect(await iframe.isDisplayed()).toBe(true);

    E2ELogger.info('offline', 'Manual retry successfully recovered the app');
  });
});
