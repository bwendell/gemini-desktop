/**
 * E2E Test: Toast Full Workflow (Task 7.6.5)
 *
 * Verifies complete toast notification workflows from trigger to removal.
 * Tests follow the Golden Rule: "If this code path was broken, would this test fail?"
 *
 * Subtasks:
 * - 7.6.5.1 Success Toast: Trigger → appears → auto-dismiss → removed
 * - 7.6.5.2 Error Toast: Trigger → appears → persists 10s → dismiss → removed
 * - 7.6.5.3 Progress Toast: Trigger → appears → progress updates → completion
 * - 7.6.5.4 Multi-Toast: Trigger 3 → all stack → dismiss middle → re-stack
 *
 * @see docs/E2E_TESTING_GUIDELINES.md
 */

import { browser, expect } from '@wdio/globals';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { E2ELogger } from './helpers/logger';
import { E2E_TIMING } from './helpers/e2eConstants';
import { ToastPage } from './pages/ToastPage';

// =============================================================================
// Tests
// =============================================================================

describe('Toast Full Workflow E2E', () => {
  const toastPage = new ToastPage();

  beforeEach(async () => {
    await waitForAppReady();
    // Clear any existing toasts
    await toastPage.dismissAll();
    await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);
  });

  afterEach(async () => {
    await toastPage.dismissAll();
    await ensureSingleWindow();
  });

  // ===========================================================================
  // 7.6.5.1 Success Toast Workflow
  // ===========================================================================

  describe('Success Toast Workflow (7.6.5.1)', () => {
    it('should complete: trigger → appears → auto-dismiss → removed', async () => {
      E2ELogger.info('toast-workflow', 'Starting success toast workflow test');

      // 1. Trigger success toast
      const toastId = await toastPage.showSuccess('Operation completed successfully!', {
        title: 'Success',
      });
      expect(toastId).toBeTruthy();
      E2ELogger.info('toast-workflow', `Created toast with ID: ${toastId}`);

      // 2. Verify toast appears in DOM
      await toastPage.waitForToastVisible();
      const toastCount = await toastPage.getToastCount();
      expect(toastCount).toBe(1);

      // 3. Verify toast has correct content
      const toast = await toastPage.getToastByIndex(0);
      expect(toast).not.toBeNull();
      expect(await toast!.isDisplayed()).toBe(true);

      const toastClass = await toast!.getAttribute('class');
      expect(toastClass).toContain('toast--success');

      // Verify ARIA attributes for accessibility
      const role = await toastPage.getToastRole();
      expect(role).toBe('alert');

      const ariaLive = await toastPage.getToastAriaLive();
      expect(ariaLive).toBe('polite');

      // 4. Wait for auto-dismiss (success duration is 5000ms)
      // We wait a bit longer to account for animation time
      E2ELogger.info('toast-workflow', 'Waiting for auto-dismiss (5s + buffer)...');
      await browser.pause(5500);

      // 5. Verify toast is removed
      const remainingCount = await toastPage.getToastCount();
      expect(remainingCount).toBe(0);

      const contextToasts = await toastPage.getToasts();
      expect(contextToasts.length).toBe(0);

      E2ELogger.info('toast-workflow', '✓ Success toast workflow complete');
    });
  });

  // ===========================================================================
  // 7.6.5.2 Error Toast Workflow
  // ===========================================================================

  describe('Error Toast Workflow (7.6.5.2)', () => {
    it('should: trigger → appears → persists 10s → manual dismiss → removed', async () => {
      E2ELogger.info('toast-workflow', 'Starting error toast workflow test');

      // 1. Trigger error toast
      const toastId = await toastPage.showError('Something went wrong!', {
        title: 'Error',
      });
      expect(toastId).toBeTruthy();

      // 2. Verify toast appears
      await toastPage.waitForToastVisible();
      const toast = await toastPage.getToastByIndex(0);
      expect(toast).not.toBeNull();

      const toastClass = await toast!.getAttribute('class');
      expect(toastClass).toContain('toast--error');

      // 3. Verify toast persists after 5 seconds (success would auto-dismiss by now)
      E2ELogger.info('toast-workflow', 'Verifying error toast persists for 5s...');
      await browser.pause(5500);

      let count = await toastPage.getToastCount();
      expect(count).toBe(1); // Error toast should still be visible
      E2ELogger.info('toast-workflow', 'Toast still visible after 5s ✓');

      // 4. Click dismiss button to manually remove
      E2ELogger.info('toast-workflow', 'Clicking dismiss button...');
      await toastPage.dismissToast(0);
      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

      // 5. Verify toast is removed
      count = await toastPage.getToastCount();
      expect(count).toBe(0);

      E2ELogger.info('toast-workflow', '✓ Error toast workflow complete');
    });

    it('should auto-dismiss after 10 seconds if not manually dismissed', async () => {
      E2ELogger.info('toast-workflow', 'Testing error toast auto-dismiss at 10s');

      // Trigger error toast
      await toastPage.showError('Auto-dismiss test', { title: 'Error' });
      await toastPage.waitForToastVisible();

      // Wait for the full 10s duration + buffer
      E2ELogger.info('toast-workflow', 'Waiting for 10s auto-dismiss...');
      await browser.pause(10500);

      // Verify auto-dismissed
      const count = await toastPage.getToastCount();
      expect(count).toBe(0);

      E2ELogger.info('toast-workflow', '✓ Error toast auto-dismissed after 10s');
    });
  });

  // ===========================================================================
  // 7.6.5.3 Progress Toast Workflow
  // ===========================================================================

  describe('Progress Toast Workflow (7.6.5.3)', () => {
    it('should: trigger → appears → progress updates → completion', async () => {
      E2ELogger.info('toast-workflow', 'Starting progress toast workflow test');

      // 1. Trigger progress toast at 0%
      const toastId = await toastPage.showProgress('Downloading...', 0, {
        title: 'Download Progress',
        id: 'test-progress-toast',
      });
      expect(toastId).toBe('test-progress-toast');

      // 2. Verify toast appears with progress bar
      await toastPage.waitForToastVisible();
      const toast = await toastPage.getToastByIndex(0);
      expect(toast).not.toBeNull();

      const toastClass = await toast!.getAttribute('class');
      expect(toastClass).toContain('toast--progress');

      // Verify progress bar exists
      expect(await toastPage.isProgressBarDisplayed()).toBe(true);

      // Verify initial progress
      let progressValue = await toastPage.getProgressValue();
      expect(parseInt(progressValue ?? '0', 10)).toBe(0);

      // 3. Update progress to 50%
      E2ELogger.info('toast-workflow', 'Updating progress to 50%...');
      await toastPage.showProgress('Downloading...', 50, {
        title: 'Download Progress',
        id: 'test-progress-toast',
      });
      await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);

      // Verify progress updated
      progressValue = await toastPage.getProgressValue();
      expect(parseInt(progressValue ?? '0', 10)).toBe(50);

      // 4. Update progress to 100%
      E2ELogger.info('toast-workflow', 'Updating progress to 100%...');
      await toastPage.showProgress('Download complete!', 100, {
        title: 'Download Progress',
        id: 'test-progress-toast',
      });
      await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);

      progressValue = await toastPage.getProgressValue();
      expect(parseInt(progressValue ?? '0', 10)).toBe(100);

      // 5. Progress toast should NOT auto-dismiss (persistent by default)
      await browser.pause(5500);
      const stillVisible = await toastPage.getToastCount();
      expect(stillVisible).toBe(1);

      // 6. Manually dismiss to complete workflow
      await toastPage.dismissToastById(toastId);
      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

      const finalCount = await toastPage.getToastCount();
      expect(finalCount).toBe(0);

      E2ELogger.info('toast-workflow', '✓ Progress toast workflow complete');
    });
  });

  // ===========================================================================
  // 7.6.5.4 Multi-Toast Workflow
  // ===========================================================================

  describe('Multi-Toast Workflow (7.6.5.4)', () => {
    it('should: trigger 3 → all stack → dismiss middle → re-stack', async () => {
      E2ELogger.info('toast-workflow', 'Starting multi-toast workflow test');

      // 1. Trigger 3 toasts in sequence (all persistent to control timing)
      const toast1Id = await toastPage.showInfo('First toast', {
        title: 'Toast 1',
        persistent: true,
        id: 'multi-toast-1',
      });
      await browser.pause(100);

      const toast2Id = await toastPage.showWarning('Second toast', {
        title: 'Toast 2',
        persistent: true,
        id: 'multi-toast-2',
      });
      await browser.pause(100);

      const toast3Id = await toastPage.showSuccess('Third toast', {
        title: 'Toast 3',
        persistent: true,
        id: 'multi-toast-3',
      });

      await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);

      // 2. Verify all 3 toasts are stacked
      const initialCount = await toastPage.getToastCount();
      expect(initialCount).toBe(3);
      E2ELogger.info('toast-workflow', '3 toasts stacked ✓');

      // Verify stacking order
      const messages = await toastPage.getToastMessagesInOrder();
      expect(messages.length).toBe(3);

      // Verify each toast has correct type using toast classes
      const toasts = await browser.$$('[data-testid="toast"]');
      expect(toasts.length).toBe(3);

      const firstToastClass = await toasts[0].getAttribute('class');
      const secondToastClass = await toasts[1].getAttribute('class');
      const thirdToastClass = await toasts[2].getAttribute('class');

      expect(firstToastClass).toContain('toast--info');
      expect(secondToastClass).toContain('toast--warning');
      expect(thirdToastClass).toContain('toast--success');

      // 3. Dismiss middle toast (toast 2)
      E2ELogger.info('toast-workflow', 'Dismissing middle toast...');
      await toastPage.dismissToastById(toast2Id);
      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

      // 4. Verify remaining toasts re-stack correctly
      const remainingCount = await toastPage.getToastCount();
      expect(remainingCount).toBe(2);

      const remainingToasts = await browser.$$('[data-testid="toast"]');
      expect(remainingToasts.length).toBe(2);

      // Verify the correct toasts remain (info and success)
      const firstRemainingClass = await remainingToasts[0].getAttribute('class');
      const secondRemainingClass = await remainingToasts[1].getAttribute('class');

      expect(firstRemainingClass).toContain('toast--info');
      expect(secondRemainingClass).toContain('toast--success');

      E2ELogger.info('toast-workflow', 'Toast re-stacking verified ✓');

      // 5. Cleanup - dismiss remaining toasts
      await toastPage.dismissToastById(toast1Id);
      await toastPage.dismissToastById(toast3Id);
      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

      const finalCount = await toastPage.getToastCount();
      expect(finalCount).toBe(0);

      E2ELogger.info('toast-workflow', '✓ Multi-toast workflow complete');
    });

    it('should dismiss toasts via click on dismiss button', async () => {
      E2ELogger.info('toast-workflow', 'Testing dismiss via button click');

      // Create 2 persistent toasts
      await toastPage.showInfo('Toast to dismiss', {
        persistent: true,
        id: 'click-dismiss-1',
      });
      await toastPage.showWarning('Another toast', {
        persistent: true,
        id: 'click-dismiss-2',
      });

      await toastPage.waitForToastVisible();
      expect(await toastPage.getToastCount()).toBe(2);

      // Click dismiss on first visible toast (index 0)
      await toastPage.dismissToast(0);
      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

      expect(await toastPage.getToastCount()).toBe(1);

      // Click dismiss on remaining toast
      await toastPage.dismissToast(0);
      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

      expect(await toastPage.getToastCount()).toBe(0);

      E2ELogger.info('toast-workflow', '✓ Click dismiss workflow complete');
    });
  });
});
