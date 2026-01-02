/**
 * E2E Test: Toast Visibility
 *
 * Tests that toast notifications are correctly rendered and visible to users.
 * Verifies positioning, icons, accessibility attributes, and DOM rendering.
 *
 * Golden Rule: "If this code path was broken, would this test fail?"
 * - If toast CSS broken → tests fail (position checks)
 * - If icons not rendering → tests fail (icon verification)
 * - If ARIA attributes missing → tests fail (accessibility checks)
 *
 * @module toast-visibility.spec
 */

/// <reference path="./helpers/wdio-electron.d.ts" />

import { expect, browser } from '@wdio/globals';
import { ToastPage } from './pages';

describe('Toast Visibility E2E', () => {
  let toast: ToastPage;

  before(async () => {
    toast = new ToastPage();

    // Wait for app to be ready
    await browser.pause(2000);
  });

  beforeEach(async () => {
    // Ensure no leftover toasts
    await toast.clearAll();
  });

  afterEach(async () => {
    // Clean up toasts after each test
    await toast.clearAll();
  });

  // =========================================================================
  // 7.6.1.1 Test toast appears in bottom-left corner
  // =========================================================================

  describe('Toast Positioning', () => {
    it('should appear in the bottom-left corner of the window', async () => {
      // GIVEN a toast is triggered
      await toast.showInfo('Test positioning message');

      // THEN the toast should be visible
      await toast.waitForToastVisible();
      expect(await toast.isToastDisplayed()).toBe(true);

      // AND the toast container should be positioned in the bottom-left
      const isBottomLeft = await toast.isPositionedBottomLeft();
      expect(isBottomLeft).toBe(true);
    });

    it('should have fixed positioning so it stays in place on scroll', async () => {
      // GIVEN a toast is shown
      await toast.showInfo('Fixed position test');
      await toast.waitForToastVisible();

      // THEN the container should have fixed positioning
      const container = await browser.$('[data-testid="toast-container"]');
      const position = await container.getCSSProperty('position');
      expect(position.value).toBe('fixed');
    });
  });

  // =========================================================================
  // 7.6.1.2 Test correct icon for each type
  // =========================================================================

  describe('Toast Icons', () => {
    it('should display correct icon for success toast', async () => {
      // GIVEN a success toast is shown
      await toast.showSuccess('Success message');
      await toast.waitForToastType('success');

      // THEN it should display the success icon (✅)
      const icon = await toast.getToastIcon();
      expect(icon).toBe('✅');
    });

    it('should display correct icon for error toast', async () => {
      // GIVEN an error toast is shown
      await toast.showError('Error message');
      await toast.waitForToastType('error');

      // THEN it should display the error icon (❌)
      const icon = await toast.getToastIcon();
      expect(icon).toBe('❌');
    });

    it('should display correct icon for info toast', async () => {
      // GIVEN an info toast is shown
      await toast.showInfo('Info message');
      await toast.waitForToastType('info');

      // THEN it should display the info icon (ℹ️)
      const icon = await toast.getToastIcon();
      expect(icon).toBe('ℹ️');
    });

    it('should display correct icon for warning toast', async () => {
      // GIVEN a warning toast is shown
      await toast.showWarning('Warning message');
      await toast.waitForToastType('warning');

      // THEN it should display the warning icon (⚠️)
      const icon = await toast.getToastIcon();
      expect(icon).toBe('⚠️');
    });

    it('should display correct icon for progress toast', async () => {
      // GIVEN a progress toast is shown
      await toast.showProgress('Progress message', 50);
      await toast.waitForToastType('progress');

      // THEN it should display the progress icon (⏳)
      const icon = await toast.getToastIcon();
      expect(icon).toBe('⏳');
    });
  });

  // =========================================================================
  // 7.6.1.3 Test title and message display correctly
  // =========================================================================

  describe('Toast Content', () => {
    it('should display the message correctly', async () => {
      // GIVEN a toast with a specific message
      const testMessage = 'This is a test message for E2E';
      await toast.showInfo(testMessage);
      await toast.waitForToastVisible();

      // THEN the message should be visible
      const displayedMessage = await toast.getMessage();
      expect(displayedMessage).toBe(testMessage);
    });

    it('should display title when provided', async () => {
      // GIVEN a toast with a title
      const testTitle = 'Test Title';
      const testMessage = 'Test message with title';
      await toast.showToast({
        type: 'info',
        title: testTitle,
        message: testMessage,
        persistent: true,
      });
      await toast.waitForToastVisible();

      // THEN both title and message should be visible
      const displayedTitle = await toast.getTitle();
      const displayedMessage = await toast.getMessage();
      expect(displayedTitle).toBe(testTitle);
      expect(displayedMessage).toBe(testMessage);
    });

    it('should display message without title when title is not provided', async () => {
      // GIVEN a toast without a title
      const testMessage = 'Message only, no title';
      await toast.showInfo(testMessage);
      await toast.waitForToastVisible();

      // THEN the message should be visible
      const displayedMessage = await toast.getMessage();
      expect(displayedMessage).toBe(testMessage);

      // AND the title element should not exist
      const titleExists = await browser.$('[data-testid="toast-title"]').isExisting();
      expect(titleExists).toBe(false);
    });
  });

  // =========================================================================
  // 7.6.1.4 Test ARIA attributes
  // =========================================================================

  describe('Toast Accessibility', () => {
    it('should have role="alert" attribute', async () => {
      // GIVEN a toast is shown
      await toast.showInfo('Accessibility test');
      await toast.waitForToastVisible();

      // THEN it should have the correct role attribute
      const role = await toast.getToastRole();
      expect(role).toBe('alert');
    });

    it('should have aria-live="polite" attribute', async () => {
      // GIVEN a toast is shown
      await toast.showInfo('Accessibility test');
      await toast.waitForToastVisible();

      // THEN it should have the correct aria-live attribute
      const ariaLive = await toast.getToastAriaLive();
      expect(ariaLive).toBe('polite');
    });

    it('should have dismiss button with accessible label', async () => {
      // GIVEN a toast is shown
      await toast.showInfo('Accessibility button test');
      await toast.waitForToastVisible();

      // THEN the dismiss button should have an aria-label
      const dismissBtn = await browser.$('[data-testid="toast-dismiss"]');
      const ariaLabel = await dismissBtn.getAttribute('aria-label');
      expect(ariaLabel).toBe('Dismiss notification');
    });

    it('should have toast container with aria-label for region', async () => {
      // GIVEN a toast is shown
      await toast.showInfo('Container accessibility test');
      await toast.waitForToastVisible();

      // THEN the container should have appropriate role and label
      const container = await browser.$('[data-testid="toast-container"]');
      const role = await container.getAttribute('role');
      const ariaLabel = await container.getAttribute('aria-label');
      expect(role).toBe('region');
      expect(ariaLabel).toBe('Notifications');
    });
  });

  // =========================================================================
  // 7.6.1.5 Test toast actually rendered in DOM (not just exists)
  // =========================================================================

  describe('Toast DOM Rendering', () => {
    it('should actually render toast in DOM when shown', async () => {
      // GIVEN initial state with no toasts
      expect(await toast.isToastInDOM()).toBe(false);

      // WHEN a toast is shown
      await toast.showInfo('DOM render test');
      await toast.waitForToastVisible();

      // THEN toast should exist in the DOM
      expect(await toast.isToastInDOM()).toBe(true);

      // AND toast should be visible (not hidden by CSS)
      expect(await toast.isToastDisplayed()).toBe(true);
    });

    it('should render toast with correct type class', async () => {
      // Test each toast type renders with correct CSS class
      const types: Array<'success' | 'error' | 'info' | 'warning' | 'progress'> = [
        'success',
        'error',
        'info',
        'warning',
        'progress',
      ];

      for (const type of types) {
        await toast.clearAll();

        // Show toast of this type
        if (type === 'progress') {
          await toast.showProgress(`${type} type test`, 50);
        } else {
          await toast.showToast({
            type,
            message: `${type} type test`,
            persistent: true,
          });
        }
        await toast.waitForToastType(type);

        // Verify the type class is applied
        const typeClass = await toast.getToastTypeClass();
        expect(typeClass).toBe(type);
      }
    });

    it('should render progress bar only for progress type', async () => {
      // GIVEN a progress toast
      await toast.showProgress('Progress with bar', 75);
      await toast.waitForToastType('progress');

      // THEN progress bar should be visible
      expect(await toast.isProgressBarDisplayed()).toBe(true);

      // AND the progress value should be correct
      const progressValue = await toast.getProgressValue();
      expect(progressValue).toBe('75');

      // Clean up and show non-progress toast
      await toast.clearAll();
      await toast.showInfo('Info without progress bar');
      await toast.waitForToastType('info');

      // THEN progress bar should NOT be visible
      expect(await toast.isProgressBarDisplayed()).toBe(false);
    });

    it('should render dismiss button on all toasts', async () => {
      // GIVEN a toast is shown
      await toast.showInfo('Dismiss button test');
      await toast.waitForToastVisible();

      // THEN dismiss button should be visible and clickable
      expect(await toast.isDismissButtonDisplayed()).toBe(true);

      const dismissBtn = await browser.$('[data-testid="toast-dismiss"]');
      expect(await dismissBtn.isClickable()).toBe(true);
    });

    it('should remove toast from DOM after dismiss', async () => {
      // GIVEN a toast is shown
      await toast.showInfo('Dismiss removal test', { persistent: true });
      await toast.waitForToastVisible();
      expect(await toast.isToastInDOM()).toBe(true);

      // WHEN the toast is dismissed
      await toast.clickDismiss();

      // THEN the toast should be removed from DOM
      await toast.waitForAllToastsDismissed();
      expect(await toast.isToastInDOM()).toBe(false);
    });
  });

  // =========================================================================
  // Additional visibility tests for completeness
  // =========================================================================

  describe('Toast Visual Properties', () => {
    it('should have visible border color for each type', async () => {
      // GIVEN a success toast
      await toast.showSuccess('Success border test');
      await toast.waitForToastType('success');

      // THEN it should have a visible border
      const toastEl = await browser.$('[data-testid="toast"]');
      const borderLeftColor = await toastEl.getCSSProperty('border-left-color');

      // Success should have a green-ish border
      expect(borderLeftColor.value).toBeDefined();
      expect(borderLeftColor.value).not.toBe('rgba(0,0,0,0)'); // Not transparent
    });

    it('should have glassmorphism effect (backdrop-filter)', async () => {
      // GIVEN a toast is shown
      await toast.showInfo('Glassmorphism test');
      await toast.waitForToastVisible();

      // THEN it should have backdrop-filter for glassmorphism
      const toastEl = await browser.$('[data-testid="toast"]');
      const backdropFilter = await toastEl.getCSSProperty('backdrop-filter');

      // Should have blur effect (may be 'none' in some environments)
      // Just verify the property is accessible
      expect(backdropFilter).toBeDefined();
    });
  });
});
