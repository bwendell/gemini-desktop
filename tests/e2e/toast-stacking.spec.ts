/**
 * Toast Stacking E2E Tests.
 *
 * Tests the stacking behavior of the toast notification system.
 * Verifies vertical stacking, max visible limit, queuing, and z-order.
 *
 * @see design.md "Toast Stacking Behavior" diagram
 * @module toast-stacking.spec
 */

/// <reference path="./helpers/wdio-electron.d.ts" />

import { browser } from '@wdio/globals';
import { ToastPage } from './pages/ToastPage';
import { E2E_TIMING } from './helpers/e2eConstants';

describe('Toast Stacking E2E', () => {
  let toastPage: ToastPage;

  beforeEach(async () => {
    toastPage = new ToastPage();
    // Clear any existing toasts before each test
    await toastPage.clearAll();
    await browser.pause(E2E_TIMING.ANIMATION_SETTLE);
  });

  afterEach(async () => {
    // Clean up after each test
    await toastPage.clearAll();
  });

  // ===========================================================================
  // 7.6.3.1 - Multiple toasts stack vertically (newest on top)
  // ===========================================================================

  describe('Vertical Stacking', () => {
    it('should stack multiple toasts vertically with newest on top', async () => {
      // Show 3 toasts in sequence
      const ids = await toastPage.showMultipleToasts(3);

      // Wait for animations to settle
      await toastPage.waitForAnimationComplete();

      // Verify all 3 toasts are visible
      const visibleCount = await toastPage.getToastCount();
      expect(visibleCount).toBe(3);

      // Verify toasts are stacked vertically
      const isStacked = await toastPage.areToastsStackedVertically();
      expect(isStacked).toBe(true);

      // Verify order: newest toast should be first in DOM (rendered on top)
      // ToastContainer reverses the array so newest appears first
      const messages = await toastPage.getToastMessagesInOrder();
      expect(messages).toEqual(['Toast 3', 'Toast 2', 'Toast 1']);

      // Verify toast IDs are in reverse order (newest first)
      const foundIds = await toastPage.getToastIdsInOrder();
      expect(foundIds.length).toBe(3);
      // Reverse the created IDs to match expected DOM order
      expect(foundIds).toEqual([...ids].reverse());
    });

    it('should maintain proper spacing between stacked toasts', async () => {
      // Show 3 toasts
      await toastPage.showMultipleToasts(3);
      await toastPage.waitForAnimationComplete();

      // Get positions
      const positions = await toastPage.getToastPositions();
      expect(positions.length).toBe(3);

      // Verify each toast has distinct Y position (no overlap)
      for (let i = 1; i < positions.length; i++) {
        const gap = positions[i].y - (positions[i - 1].y + positions[i - 1].height);
        // There should be some gap between toasts (at least 0, allowing for CSS gap)
        expect(gap).toBeGreaterThanOrEqual(-1); // Allow 1px tolerance for rounding
      }
    });
  });

  // ===========================================================================
  // 7.6.3.2 - Max 5 toasts visible
  // ===========================================================================

  describe('Max Visible Limit', () => {
    it('should show at most 5 toasts at a time', async () => {
      // Create 7 toasts
      await toastPage.showMultipleToasts(7);
      await toastPage.waitForAnimationComplete();

      // Only 5 should be visible in the DOM
      const visibleCount = await toastPage.getToastCount();
      expect(visibleCount).toBe(5);

      // But context should track all 7
      const allToasts = await toastPage.getToasts();
      expect(allToasts.length).toBe(7);
    });

    it('should show the LAST 5 toasts (newest) and hide the first ones', async () => {
      // Create 6 toasts
      const ids = await toastPage.showMultipleToasts(6);
      await toastPage.waitForAnimationComplete();

      // Verify only 5 visible
      const visibleCount = await toastPage.getToastCount();
      expect(visibleCount).toBe(5);

      // The visible toasts should be the LAST 5 created (newest), not first 5
      // In DOM order they'll be reversed: Toast 6, 5, 4, 3, 2
      const visibleIds = await toastPage.getToastIdsInOrder();
      expect(visibleIds.length).toBe(5);

      // The last 5 IDs, reversed for DOM order
      const expectedVisibleIds = ids.slice(1, 6).reverse(); // ids[1-5], newest first
      expect(visibleIds).toEqual(expectedVisibleIds);

      // Toast 1 (oldest, ids[0]) should NOT be visible
      expect(visibleIds).not.toContain(ids[0]);
    });
  });

  // ===========================================================================
  // 7.6.3.3 - Queued toasts appear when visible toast dismissed
  // NOTE: With slice(-5), oldest toasts are "hidden" not "queued"
  // When we dismiss a visible toast, the next oldest becomes visible
  // ===========================================================================

  describe('Queue Behavior', () => {
    it('should show previously hidden toast when a visible toast is dismissed', async () => {
      // Create 6 toasts - Toast 1 is hidden, Toasts 2-6 are visible
      const ids = await toastPage.showMultipleToasts(6);
      await toastPage.waitForAnimationComplete();

      // Verify initial state: 5 visible (toasts 2-6)
      let visibleCount = await toastPage.getToastCount();
      expect(visibleCount).toBe(5);

      // The first toast (ids[0]) should NOT be visible initially
      let visibleIds = await toastPage.getToastIdsInOrder();
      expect(visibleIds).not.toContain(ids[0]);

      // Dismiss the newest visible toast (first in DOM = ids[5])
      await toastPage.dismissToastByIndex(0);
      await toastPage.waitForAnimationComplete();

      // Now Toast 1 (ids[0]) should become visible as we now have only 5 toasts total
      visibleCount = await toastPage.getToastCount();
      expect(visibleCount).toBe(5);

      // After dismissing Toast 6, visible are now Toast 1-5
      visibleIds = await toastPage.getToastIdsInOrder();
      expect(visibleIds).toContain(ids[0]); // Toast 1 is now visible
      expect(visibleIds).not.toContain(ids[5]); // Toast 6 is gone
    });

    it('should maintain 5 visible toasts while dismissing', async () => {
      // Create 7 toasts - Toasts 1-2 hidden, Toasts 3-7 visible
      const ids = await toastPage.showMultipleToasts(7);
      await toastPage.waitForAnimationComplete();

      // Dismiss newest toast (first in DOM = ids[6])
      await toastPage.dismissToastByIndex(0);
      await toastPage.waitForAnimationComplete();

      // Now 6 toasts in context, 5 visible (toasts 2-6)
      let visibleIds = await toastPage.getToastIdsInOrder();
      expect(visibleIds.length).toBe(5);
      expect(visibleIds).toContain(ids[1]); // Toast 2 is now visible
      expect(visibleIds).not.toContain(ids[0]); // Toast 1 still hidden

      // Dismiss another newest toast
      await toastPage.dismissToastByIndex(0);
      await toastPage.waitForAnimationComplete();

      // Now 5 toasts in context, all visible (toasts 1-5)
      visibleIds = await toastPage.getToastIdsInOrder();
      expect(visibleIds.length).toBe(5);
      expect(visibleIds).toContain(ids[0]); // Toast 1 is now visible
    });
  });

  // ===========================================================================
  // 7.6.3.4 - Correct z-order
  // ===========================================================================

  describe('Z-Order', () => {
    it('should have toast container with appropriate z-index', async () => {
      // Show a toast
      await toastPage.showInfo('Z-order test', { persistent: true });
      await toastPage.waitForAnimationComplete();

      // Verify container has high z-index
      const container = await browser.$('[data-testid="toast-container"]');
      const zIndex = await container.getCSSProperty('z-index');

      // z-index should be a high number (typically 9999 or similar for overlays)
      const zValue = parseInt(String(zIndex.value), 10);
      expect(zValue).toBeGreaterThanOrEqual(1000);
    });

    it('should render all toasts at the same z-level within the container', async () => {
      // Show 3 toasts
      await toastPage.showMultipleToasts(3);
      await toastPage.waitForAnimationComplete();

      // All toasts should have the same z-index (or auto, inheriting from container)
      const toasts = await browser.$$('[data-testid="toast"]');
      const zIndices: number[] = [];

      for (const toast of toasts) {
        const zIndex = await toast.getCSSProperty('z-index');
        // z-index: auto resolves to 0 or 'auto'
        const zValue = zIndex.value === 'auto' ? 0 : parseInt(String(zIndex.value), 10);
        zIndices.push(zValue);
      }

      // All toasts should have the same z-index (stacking is handled by DOM order)
      const uniqueZIndices = [...new Set(zIndices)];
      expect(uniqueZIndices.length).toBe(1);
    });
  });

  // ===========================================================================
  // 7.6.3.5 - Dismissing middle toast doesn't break layout
  // ===========================================================================

  describe('Middle Toast Dismissal', () => {
    it('should maintain layout when dismissing a middle toast', async () => {
      // Create 5 toasts (all visible, no hidden)
      const ids = await toastPage.showMultipleToasts(5);
      await toastPage.waitForAnimationComplete();

      // In DOM order: Toast 5, 4, 3, 2, 1 (newest first)
      // ids[4], ids[3], ids[2], ids[1], ids[0]

      // Verify initial layout
      let isStacked = await toastPage.areToastsStackedVertically();
      expect(isStacked).toBe(true);

      // Dismiss the middle toast (index 2 in DOM = ids[2] = Toast 3)
      await toastPage.dismissToastByIndex(2);
      await toastPage.waitForAnimationComplete();

      // Verify 4 toasts remain
      const visibleCount = await toastPage.getToastCount();
      expect(visibleCount).toBe(4);

      // Verify layout is still correct (toasts are still stacked vertically)
      isStacked = await toastPage.areToastsStackedVertically();
      expect(isStacked).toBe(true);

      // Verify the correct toast was removed (ids[2])
      const visibleIds = await toastPage.getToastIdsInOrder();
      expect(visibleIds).not.toContain(ids[2]); // Middle toast should be gone
      expect(visibleIds).toContain(ids[0]); // First should remain
      expect(visibleIds).toContain(ids[4]); // Last should remain
    });

    it('should reflow remaining toasts smoothly after middle dismissal', async () => {
      // Create 4 toasts
      await toastPage.showMultipleToasts(4);
      await toastPage.waitForAnimationComplete();

      // Get initial positions
      const initialPositions = await toastPage.getToastPositions();
      expect(initialPositions.length).toBe(4);

      // Dismiss the second toast (index 1 in DOM)
      await toastPage.dismissToastByIndex(1);
      await toastPage.waitForAnimationComplete();

      // Get final positions
      const finalPositions = await toastPage.getToastPositions();
      expect(finalPositions.length).toBe(3);

      // Verify toasts are still properly stacked
      const isStacked = await toastPage.areToastsStackedVertically();
      expect(isStacked).toBe(true);
    });
  });

  // ===========================================================================
  // 7.6.3.6 - Rapid creation (10 in 500ms) handled
  // ===========================================================================

  describe('Rapid Toast Creation', () => {
    it('should handle rapid toast creation without race conditions', async () => {
      // Create 10 toasts with only 50ms between each (500ms total)
      const ids = await toastPage.showMultipleToasts(10, 50);

      // Wait for all to settle
      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

      // Verify all toasts were tracked
      const allToasts = await toastPage.getToasts();
      expect(allToasts.length).toBe(10);

      // Verify max 5 are visible (the newest 5: toasts 6-10)
      const visibleCount = await toastPage.getToastCount();
      expect(visibleCount).toBe(5);

      // Verify the visible toasts are properly stacked
      const isStacked = await toastPage.areToastsStackedVertically();
      expect(isStacked).toBe(true);

      // Verify IDs are unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });

    it('should create toasts with no delay and handle correctly', async () => {
      // Create 10 toasts with 0ms delay (as fast as possible)
      const ids = await toastPage.showMultipleToasts(10, 0);

      // Wait for rendering
      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

      // All toasts should be tracked
      const allToasts = await toastPage.getToasts();
      expect(allToasts.length).toBe(10);

      // Max 5 visible
      const visibleCount = await toastPage.getToastCount();
      expect(visibleCount).toBe(5);

      // All IDs should be unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });

    it('should properly show newest toasts after rapid dismissals', async () => {
      // Create 8 toasts rapidly
      // Initially: toasts 1-3 hidden, toasts 4-8 visible
      const ids = await toastPage.showMultipleToasts(8, 25);
      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

      // Dismiss 3 toasts from the top (newest)
      for (let i = 0; i < 3; i++) {
        await toastPage.dismissToastByIndex(0);
        await browser.pause(100); // Short pause between dismissals
      }

      await toastPage.waitForAnimationComplete();

      // Should still have 5 visible (toasts 1-5 after dismissing 6,7,8)
      const visibleCount = await toastPage.getToastCount();
      expect(visibleCount).toBe(5);

      // All remaining 5 toasts should be visible
      const visibleIds = await toastPage.getToastIdsInOrder();
      expect(visibleIds.length).toBe(5);

      // The remaining toasts should be ids[0..4] in reverse order
      const expectedIds = ids.slice(0, 5).reverse();
      expect(visibleIds).toEqual(expectedIds);
    });
  });

  // ===========================================================================
  // Additional Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle dismissing all visible toasts', async () => {
      // Create exactly 5 toasts (no hidden)
      await toastPage.showMultipleToasts(5);
      await toastPage.waitForAnimationComplete();

      // Dismiss all 5 from top
      for (let i = 0; i < 5; i++) {
        await toastPage.dismissToastByIndex(0);
        await browser.pause(50);
      }

      await toastPage.waitForAnimationComplete();

      // No toasts should be visible
      const visibleCount = await toastPage.getToastCount();
      expect(visibleCount).toBe(0);

      // Context should also be empty
      const allToasts = await toastPage.getToasts();
      expect(allToasts.length).toBe(0);
    });

    it('should handle single toast correctly', async () => {
      // Show just one toast
      const id = await toastPage.showInfo('Single toast', { persistent: true });
      await toastPage.waitForAnimationComplete();

      // Verify it's visible
      const visibleCount = await toastPage.getToastCount();
      expect(visibleCount).toBe(1);

      // Verify positioning is correct (still in bottom-left)
      const isPositioned = await toastPage.isPositionedBottomLeft();
      expect(isPositioned).toBe(true);

      // Dismiss it
      await toastPage.dismissToastById(id);
      await toastPage.waitForAnimationComplete();

      // No toasts visible
      const finalCount = await toastPage.getToastCount();
      expect(finalCount).toBe(0);
    });

    it('should maintain stack order when types are mixed', async () => {
      // Create toasts of different types
      await toastPage.showSuccess('Success toast', { persistent: true });
      await browser.pause(50);
      await toastPage.showError('Error toast', { persistent: true });
      await browser.pause(50);
      await toastPage.showWarning('Warning toast', { persistent: true });
      await browser.pause(50);
      await toastPage.showInfo('Info toast', { persistent: true });
      await browser.pause(50);

      await toastPage.waitForAnimationComplete();

      // All 4 should be visible
      const visibleCount = await toastPage.getToastCount();
      expect(visibleCount).toBe(4);

      // Verify they're stacked properly
      const isStacked = await toastPage.areToastsStackedVertically();
      expect(isStacked).toBe(true);

      // Verify order - DOM order is newest first (reversed from creation order)
      const messages = await toastPage.getToastMessagesInOrder();
      expect(messages).toEqual(['Info toast', 'Warning toast', 'Error toast', 'Success toast']);
    });
  });
});
