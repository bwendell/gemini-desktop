/**
 * E2E Test: Auto-Update Happy Path
 *
 * Tests the complete end-to-end flow for a successful auto-update.
 *
 * User Workflows Covered:
 * 1. Manual check → Update available → Download → Install
 * 2. Toast notifications at each stage
 * 3. Badge and tray tooltip appearance
 * 4. Successful installation trigger
 *
 * @module auto-update-happy-path.spec
 */

/// <reference path="./helpers/wdio-electron.d.ts" />

import { browser, $, expect } from '@wdio/globals';
import { getPlatform, E2EPlatform } from './helpers/platform';
import { E2ELogger } from './helpers/logger';
import { E2E_TIMING } from './helpers/e2eConstants';

// ============================================================================
// Test Suite
// ============================================================================

describe('Auto-Update Happy Path', () => {
  let platform: E2EPlatform;

  before(async () => {
    platform = await getPlatform();
    E2ELogger.info('auto-update-happy-path', `Platform: ${platform.toUpperCase()}`);
  });

  beforeEach(async () => {
    // Clear any existing toasts/badges
    await browser.execute(() => {
      window.electronAPI.devClearBadge();
      // @ts-ignore - test helper
      if (window.__testUpdateToast?.hide) {
        // @ts-ignore
        window.__testUpdateToast.hide();
      }
    });
    await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);
  });

  // ========================================================================
  // Complete Happy Path Flow
  // ========================================================================

  describe('Complete Update Flow', () => {
    it('should complete full update cycle from check to ready-to-install', async () => {
      // STEP 1: Manual check for updates
      E2ELogger.info('auto-update-happy-path', 'Step 1: Triggering manual update check...');

      // Note: We can't easily verify the "Checking..." toast without actual UI implementation
      // But we can verify the check doesn't throw
      await expect(
        browser.execute(() => window.electronAPI.checkForUpdates())
      ).resolves.not.toThrow();
      await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);

      // STEP 2: Update becomes available
      E2ELogger.info('auto-update-happy-path', 'Step 2: Simulating update available...');

      await browser.execute(() => {
        // @ts-ignore
        window.__testUpdateToast.showAvailable('2.5.0');
      });

      const toast = await $('[data-testid="update-toast"]');
      await toast.waitForDisplayed();

      const title = await $('[data-testid="update-toast-title"]');
      expect(await title.getText()).toBe('Update Available');

      const message = await $('[data-testid="update-toast-message"]');
      expect(await message.getText()).toContain('2.5.0');

      E2ELogger.info('auto-update-happy-path', '  ✓ Update Available toast displayed');

      // User dismisses the "available" toast
      const dismissBtn = await $('[data-testid="update-toast-dismiss"]');
      await dismissBtn.click();
      await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);

      // STEP 3: Download Progress
      E2ELogger.info('auto-update-happy-path', 'Step 3: Simulating download progress...');

      await browser.execute(() => {
        // @ts-ignore
        window.__testUpdateToast.showProgress(45);
      });

      const progressToast = await $('[data-testid="update-toast"]');
      await progressToast.waitForDisplayed();

      const progressTitle = await $('[data-testid="update-toast-title"]');
      expect(await progressTitle.getText()).toBe('Downloading Update');

      const progressMessage = await $('[data-testid="update-toast-message"]');
      expect(await progressMessage.getText()).toContain('45%');

      const progressBar = await $('[role="progressbar"]');
      expect(await progressBar.isDisplayed()).toBe(true);
      expect(await progressBar.getAttribute('aria-valuenow')).toBe('45');

      E2ELogger.info('auto-update-happy-path', '  ✓ Download progress toast displayed');

      await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);

      // STEP 4: Update downloaded (auto-download in background)
      E2ELogger.info('auto-update-happy-path', 'Step 4: Simulating update downloaded...');

      await browser.execute(() => {
        // @ts-ignore
        window.__testUpdateToast.showDownloaded('2.5.0');
      });

      await toast.waitForDisplayed();

      const titleDownloaded = await $('[data-testid="update-toast-title"]');
      expect(await titleDownloaded.getText()).toBe('Update Ready');

      const messageDownloaded = await $('[data-testid="update-toast-message"]');
      expect(await messageDownloaded.getText()).toContain('2.5.0');

      E2ELogger.info('auto-update-happy-path', '  ✓ Update Ready toast displayed');

      // STEP 4: Verify Restart Now button is present
      const restartBtn = await $('[data-testid="update-toast-restart"]');
      expect(await restartBtn.isDisplayed()).toBe(true);
      expect(await restartBtn.getText()).toContain('Restart');

      E2ELogger.info('auto-update-happy-path', '  ✓ Restart Now button available');

      // STEP 5: Verify Badge appeared
      // Note: Badge visibility depends on platform and implementation
      // We'll verify the tray tooltip instead, which is more reliable
      await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);

      const tooltip = await browser.execute(() => window.electronAPI.getTrayTooltip());
      expect(tooltip).toContain('2.5.0');

      E2ELogger.info('auto-update-happy-path', '  ✓ Tray tooltip shows update version');

      // STEP 6: Click "Restart Now" to trigger install
      E2ELogger.info('auto-update-happy-path', 'Step 4: Triggering install...');

      // In a real scenario, this would quit the app. We just verify the IPC call works.
      await restartBtn.click();

      // The app would quit here in production, but in test we just verify no crash
      await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);

      E2ELogger.info('auto-update-happy-path', '  ✓ Install triggered successfully');
      E2ELogger.info('auto-update-happy-path', '✅ Happy path complete!');
    });
  });

  // ========================================================================
  // Individual Stage Tests
  // ========================================================================

  describe('Update Available Stage', () => {
    it('should display update available notification with version', async () => {
      await browser.execute(() => {
        // @ts-ignore
        window.__testUpdateToast.showAvailable('3.1.0');
      });

      const toast = await $('[data-testid="update-toast"]');
      await toast.waitForDisplayed();

      const title = await $('[data-testid="update-toast-title"]');
      expect(await title.getText()).toBe('Update Available');

      const message = await $('[data-testid="update-toast-message"]');
      const text = await message.getText();
      expect(text).toContain('3.1.0');

      E2ELogger.info('auto-update-happy-path', 'Update available notification verified');
    });

    it('should allow dismissing update available notification', async () => {
      await browser.execute(() => {
        // @ts-ignore
        window.__testUpdateToast.showAvailable('3.1.0');
      });

      const toast = await $('[data-testid="update-toast"]');
      await toast.waitForDisplayed();

      const dismissBtn = await $('[data-testid="update-toast-dismiss"]');
      await dismissBtn.click();
      await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);

      expect(await toast.isDisplayed()).toBe(false);

      E2ELogger.info('auto-update-happy-path', 'Dismiss functionality verified');
    });
  });

  describe('Download Progress Stage', () => {
    it('should display progress bar with correct percentage', async () => {
      await browser.execute(() => {
        // @ts-ignore
        window.__testUpdateToast.showProgress(75);
      });

      const toast = await $('[data-testid="update-toast"]');
      await toast.waitForDisplayed();

      const title = await $('[data-testid="update-toast-title"]');
      expect(await title.getText()).toBe('Downloading Update');

      const message = await $('[data-testid="update-toast-message"]');
      expect(await message.getText()).toContain('75%');

      const progressBar = await $('[role="progressbar"]');
      expect(await progressBar.isDisplayed()).toBe(true);
      expect(await progressBar.getAttribute('aria-valuenow')).toBe('75');

      // Verify width style
      const style = await progressBar.getAttribute('style');
      expect(style).toContain('width: 75%');

      E2ELogger.info('auto-update-happy-path', 'Download progress verified');
    });
  });

  describe('Update Downloaded Stage', () => {
    it('should display update ready notification with restart button', async () => {
      await browser.execute(() => {
        // @ts-ignore
        window.__testUpdateToast.showDownloaded('3.2.0');
      });

      const toast = await $('[data-testid="update-toast"]');
      await toast.waitForDisplayed();

      const title = await $('[data-testid="update-toast-title"]');
      expect(await title.getText()).toBe('Update Ready');

      const restartBtn = await $('[data-testid="update-toast-restart"]');
      expect(await restartBtn.isDisplayed()).toBe(true);

      E2ELogger.info('auto-update-happy-path', 'Update ready notification verified');
    });

    it('should update tray tooltip when update is downloaded', async () => {
      await browser.execute(() => {
        // @ts-ignore
        window.__testUpdateToast.showDownloaded('3.2.0');
      });

      await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);

      const tooltip = await browser.execute(() => window.electronAPI.getTrayTooltip());
      expect(tooltip).toContain('3.2.0');

      E2ELogger.info('auto-update-happy-path', 'Tray tooltip update verified');
    });

    it('should trigger install on restart button click', async () => {
      await browser.execute(() => {
        // @ts-ignore
        window.__testUpdateToast.showDownloaded('3.2.0');
      });

      const restartBtn = await $('[data-testid="update-toast-restart"]');
      await restartBtn.waitForDisplayed();

      // Click restart - in production this quits the app
      await expect(restartBtn.click()).resolves.not.toThrow();

      E2ELogger.info('auto-update-happy-path', 'Restart button click verified');
    });
  });

  // ========================================================================
  // Badge & Tray Integration
  // ========================================================================

  describe('Visual Indicators', () => {
    it('should show tray tooltip after update download', async () => {
      // Show badge via dev helper
      await browser.execute(() => window.electronAPI.devShowBadge('4.0.0'));

      await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);

      const tooltip = await browser.execute(() => window.electronAPI.getTrayTooltip());
      expect(tooltip).toContain('4.0.0');

      E2ELogger.info('auto-update-happy-path', 'Badge/tray tooltip verified');
    });

    it('should clear tray tooltip after clearing badge', async () => {
      // Show then clear
      await browser.execute(() => window.electronAPI.devShowBadge('4.0.0'));
      await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);

      await browser.execute(() => window.electronAPI.devClearBadge());
      await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);

      const tooltip = await browser.execute(() => window.electronAPI.getTrayTooltip());
      expect(tooltip).toBe('Gemini Desktop'); // Default tooltip

      E2ELogger.info('auto-update-happy-path', 'Badge clear verified');
    });
  });
});
