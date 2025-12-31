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

import { expect } from '@wdio/globals';
import { getPlatform, E2EPlatform } from './helpers/platform';
import { E2ELogger } from './helpers/logger';
import { UpdateToastPage } from './pages';

// ============================================================================
// Test Suite
// ============================================================================

describe('Auto-Update Error Recovery', () => {
  let platform: E2EPlatform;
  let updateToast: UpdateToastPage;

  before(async () => {
    platform = await getPlatform();
    updateToast = new UpdateToastPage();
    E2ELogger.info('auto-update-error-recovery', `Platform: ${platform.toUpperCase()}`);
  });

  beforeEach(async () => {
    // Clear any existing toasts/badges
    await updateToast.clearAll();
  });

  // ========================================================================
  // Error Display
  // ========================================================================

  describe('Error Toast Display', () => {
    it('should display error toast with clear message', async () => {
      // Trigger error
      await updateToast.showError('Network connection failed');
      await updateToast.waitForVisible();

      expect(await updateToast.getTitle()).toBe('Update Error');
      expect(await updateToast.getMessage()).toContain('Network connection failed');

      E2ELogger.info('auto-update-error-recovery', 'Error toast displayed correctly');
    });

    it('should allow dismissing error toast', async () => {
      // Show error
      await updateToast.showError('Test error');
      await updateToast.waitForVisible();

      // Dismiss
      await updateToast.dismiss();
      await updateToast.waitForHidden();

      E2ELogger.info('auto-update-error-recovery', 'Error toast dismissed successfully');
    });
  });

  // ========================================================================
  // Error Recovery Flows
  // ========================================================================

  describe('Error Recovery', () => {
    it('should allow retry after network error', async () => {
      // GIVEN: User receives a network error
      await updateToast.showError('Network error during update check');
      await updateToast.waitForVisible();
      expect(await updateToast.isDisplayed()).toBe(true);

      // WHEN: User dismisses error and manually checks again
      await updateToast.dismiss();
      await updateToast.waitForHidden();

      // Simulate successful retry (in real scenario, would trigger actual check)
      await updateToast.showAvailable('2.0.0');
      await updateToast.waitForVisible();

      // THEN: Should show update available
      expect(await updateToast.getTitle()).toBe('Update Available');

      E2ELogger.info('auto-update-error-recovery', 'Retry after error succeeded');
    });

    it('should handle multiple errors in sequence', async () => {
      // First error
      await updateToast.showError('First error');
      await updateToast.waitForVisible();

      expect(await updateToast.getMessage()).toContain('First error');

      // Dismiss
      await updateToast.dismiss();
      await updateToast.waitForHidden();

      // Second error
      await updateToast.showError('Second error');
      await updateToast.waitForVisible();

      expect(await updateToast.getMessage()).toContain('Second error');

      E2ELogger.info('auto-update-error-recovery', 'Multiple errors handled correctly');
    });

    it('should not display badge for errors', async () => {
      // Show error
      await updateToast.showError('Update failed');
      await updateToast.waitForVisible();

      // Badge should NOT appear for errors
      expect(await updateToast.isBadgeExisting()).toBe(false);

      E2ELogger.info('auto-update-error-recovery', 'No badge for errors (correct)');
    });
  });

  // ========================================================================
  // Error Types
  // ========================================================================

  describe('Different Error Types', () => {
    it('should handle download failure error', async () => {
      await updateToast.showError('Failed to download update: Connection timed out');
      await updateToast.waitForVisible();

      const message = await updateToast.getMessage();
      expect(message).toContain('Failed to download update');
      expect(message).toContain('Connection timed out');

      E2ELogger.info('auto-update-error-recovery', 'Download failure error displayed');
    });

    it('should handle generic error with fallback message', async () => {
      // Trigger with null error message
      await updateToast.showError(null);
      await updateToast.waitForVisible();

      const text = await updateToast.getMessage();
      // Should show default fallback
      expect(text).toContain('error');

      E2ELogger.info('auto-update-error-recovery', 'Fallback error message displayed');
    });

    it('should handle insufficient disk space error', async () => {
      await updateToast.showError('Insufficient disk space to download update');
      await updateToast.waitForVisible();

      expect(await updateToast.getMessage()).toContain('Insufficient disk space');

      E2ELogger.info('auto-update-error-recovery', 'Disk space error displayed');
    });
  });

  // ========================================================================
  // Error State Transitions
  // ========================================================================

  describe('Error State Transitions', () => {
    it('should transition from available to error correctly', async () => {
      // Start with update available
      await updateToast.showAvailable('2.0.0');
      await updateToast.waitForVisible();

      expect(await updateToast.getTitle()).toBe('Update Available');

      // Dismiss
      await updateToast.dismiss();
      await updateToast.waitForHidden();

      // Then error occurs
      await updateToast.showError('Download interrupted');
      await updateToast.waitForVisible();

      expect(await updateToast.getTitle()).toBe('Update Error');

      E2ELogger.info('auto-update-error-recovery', 'Transition from available to error succeeded');
    });

    it('should transition from error to downloaded correctly', async () => {
      // Start with error
      await updateToast.showError('Temporary error');
      await updateToast.waitForVisible();

      // Dismiss
      await updateToast.dismiss();
      await updateToast.waitForHidden();

      // Then update succeeds
      await updateToast.showDownloaded('2.0.0');
      await updateToast.waitForVisible();

      expect(await updateToast.getTitle()).toBe('Update Ready');

      // Should have Restart Now button
      expect(await updateToast.isRestartButtonDisplayed()).toBe(true);

      E2ELogger.info('auto-update-error-recovery', 'Transition from error to downloaded succeeded');
    });
  });
});
