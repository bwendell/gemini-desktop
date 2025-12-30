/**
 * E2E Test: Auto-Update Error Recovery
 *
 * Tests error handling and recovery flows for the auto-update feature.
 *
 * User Workflows Covered:
 * 1. Network error → Manual retry → Success
 * 2. Error toast display and dismissal
 * 3. Multiple errors in sequence
 *
 * @module auto-update-error-recovery.spec
 */

/// <reference path="./helpers/wdio-electron.d.ts" />

import { browser, $, expect } from '@wdio/globals';
import { getPlatform, E2EPlatform } from './helpers/platform';
import { E2ELogger } from './helpers/logger';
import { E2E_TIMING } from './helpers/e2eConstants';

// ============================================================================
// Test Suite
// ============================================================================

describe('Auto-Update Error Recovery', () => {
  let platform: E2EPlatform;

  before(async () => {
    platform = await getPlatform();
    E2ELogger.info('auto-update-error-recovery', `Platform: ${platform.toUpperCase()}`);
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
  // Error Display
  // ========================================================================

  describe('Error Toast Display', () => {
    it('should display error toast with clear message', async () => {
      // Trigger error
      await browser.execute(() => {
        // @ts-ignore
        window.__testUpdateToast.showError('Network connection failed');
      });

      const toast = await $('[data-testid="update-toast"]');
      await toast.waitForDisplayed();

      const title = await $('[data-testid="update-toast-title"]');
      expect(await title.getText()).toBe('Update Error');

      const message = await $('[data-testid="update-toast-message"]');
      expect(await message.getText()).toContain('Network connection failed');

      E2ELogger.info('auto-update-error-recovery', 'Error toast displayed correctly');
    });

    it('should allow dismissing error toast', async () => {
      // Show error
      await browser.execute(() => {
        // @ts-ignore
        window.__testUpdateToast.showError('Test error');
      });

      const toast = await $('[data-testid="update-toast"]');
      await toast.waitForDisplayed();
      // Wait for entry animation to complete (200ms) before trying to dismiss
      await browser.pause(300);

      // Dismiss
      const dismissBtn = await $('[data-testid="update-toast-dismiss"]');
      await dismissBtn.click();
      // Wait for toast to be hidden (animation takes ~200ms)
      await toast.waitForDisplayed({ reverse: true, timeout: 3000 });

      E2ELogger.info('auto-update-error-recovery', 'Error toast dismissed successfully');
    });
  });

  // ========================================================================
  // Error Recovery Flows
  // ========================================================================

  describe('Error Recovery', () => {
    it('should allow retry after network error', async () => {
      // GIVEN: User receives a network error
      await browser.execute(() => {
        // @ts-ignore
        window.__testUpdateToast.showError('Network error during update check');
      });

      const toast = await $('[data-testid="update-toast"]');
      await toast.waitForDisplayed();
      expect(await toast.isDisplayed()).toBe(true);

      // WHEN: User dismisses error and manually checks again
      const dismissBtn = await $('[data-testid="update-toast-dismiss"]');
      await dismissBtn.click();
      await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);

      // Simulate successful retry (in real scenario, would trigger actual check)
      await browser.execute(() => {
        // @ts-ignore
        window.__testUpdateToast.showAvailable('2.0.0');
      });

      await toast.waitForDisplayed();

      // THEN: Should show update available
      const title = await $('[data-testid="update-toast-title"]');
      expect(await title.getText()).toBe('Update Available');

      E2ELogger.info('auto-update-error-recovery', 'Retry after error succeeded');
    });

    it('should handle multiple errors in sequence', async () => {
      // First error
      await browser.execute(() => {
        // @ts-ignore
        window.__testUpdateToast.showError('First error');
      });

      const toast = await $('[data-testid="update-toast"]');
      await toast.waitForDisplayed();

      let message = await $('[data-testid="update-toast-message"]');
      expect(await message.getText()).toContain('First error');

      // Dismiss
      const dismissBtn = await $('[data-testid="update-toast-dismiss"]');
      await dismissBtn.click();
      await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);

      // Second error
      await browser.execute(() => {
        // @ts-ignore
        window.__testUpdateToast.showError('Second error');
      });

      await toast.waitForDisplayed();
      message = await $('[data-testid="update-toast-message"]');
      expect(await message.getText()).toContain('Second error');

      E2ELogger.info('auto-update-error-recovery', 'Multiple errors handled correctly');
    });

    it('should not display badge for errors', async () => {
      // Show error
      await browser.execute(() => {
        // @ts-ignore
        window.__testUpdateToast.showError('Update failed');
      });

      const toast = await $('[data-testid="update-toast"]');
      await toast.waitForDisplayed();

      // Badge should NOT appear for errors
      const badge = await $('[data-testid="update-badge"]');
      expect(await badge.isExisting()).toBe(false);

      E2ELogger.info('auto-update-error-recovery', 'No badge for errors (correct)');
    });
  });

  // ========================================================================
  // Error Types
  // ========================================================================

  describe('Different Error Types', () => {
    it('should handle download failure error', async () => {
      await browser.execute(() => {
        // @ts-ignore
        window.__testUpdateToast.showError('Failed to download update: Connection timed out');
      });

      const toast = await $('[data-testid="update-toast"]');
      await toast.waitForDisplayed();

      const message = await $('[data-testid="update-toast-message"]');
      expect(await message.getText()).toContain('Failed to download update');
      expect(await message.getText()).toContain('Connection timed out');

      E2ELogger.info('auto-update-error-recovery', 'Download failure error displayed');
    });

    it('should handle generic error with fallback message', async () => {
      // Trigger with null error message
      await browser.execute(() => {
        // @ts-ignore
        window.__testUpdateToast.showError(null);
      });

      const toast = await $('[data-testid="update-toast"]');
      await toast.waitForDisplayed();

      const message = await $('[data-testid="update-toast-message"]');
      const text = await message.getText();

      // Should show default fallback
      expect(text).toContain('error');

      E2ELogger.info('auto-update-error-recovery', 'Fallback error message displayed');
    });

    it('should handle insufficient disk space error', async () => {
      await browser.execute(() => {
        // @ts-ignore
        window.__testUpdateToast.showError('Insufficient disk space to download update');
      });

      const toast = await $('[data-testid="update-toast"]');
      await toast.waitForDisplayed();

      const message = await $('[data-testid="update-toast-message"]');
      expect(await message.getText()).toContain('Insufficient disk space');

      E2ELogger.info('auto-update-error-recovery', 'Disk space error displayed');
    });
  });

  // ========================================================================
  // Error State Transitions
  // ========================================================================

  describe('Error State Transitions', () => {
    it('should transition from available to error correctly', async () => {
      // Start with update available
      await browser.execute(() => {
        // @ts-ignore
        window.__testUpdateToast.showAvailable('2.0.0');
      });

      const toast = await $('[data-testid="update-toast"]');
      await toast.waitForDisplayed();

      let title = await $('[data-testid="update-toast-title"]');
      expect(await title.getText()).toBe('Update Available');

      // Dismiss
      const dismissBtn1 = await $('[data-testid="update-toast-dismiss"]');
      await dismissBtn1.click();
      await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);

      // Then error occurs
      await browser.execute(() => {
        // @ts-ignore
        window.__testUpdateToast.showError('Download interrupted');
      });

      await toast.waitForDisplayed();
      title = await $('[data-testid="update-toast-title"]');
      expect(await title.getText()).toBe('Update Error');

      E2ELogger.info('auto-update-error-recovery', 'Transition from available to error succeeded');
    });

    it('should transition from error to downloaded correctly', async () => {
      // Start with error
      await browser.execute(() => {
        // @ts-ignore
        window.__testUpdateToast.showError('Temporary error');
      });

      const toast = await $('[data-testid="update-toast"]');
      await toast.waitForDisplayed();

      // Dismiss
      const dismissBtn = await $('[data-testid="update-toast-dismiss"]');
      await dismissBtn.click();
      await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);

      // Then update succeeds
      await browser.execute(() => {
        // @ts-ignore
        window.__testUpdateToast.showDownloaded('2.0.0');
      });

      await toast.waitForDisplayed();
      const title = await $('[data-testid="update-toast-title"]');
      expect(await title.getText()).toBe('Update Ready');

      // Should have Restart Now button
      const restartBtn = await $('[data-testid="update-toast-restart"]');
      expect(await restartBtn.isDisplayed()).toBe(true);

      E2ELogger.info('auto-update-error-recovery', 'Transition from error to downloaded succeeded');
    });
  });
});
