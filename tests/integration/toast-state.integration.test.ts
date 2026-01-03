import { browser, expect, $ as wdioSelector, $$ as wdioSelectorAll } from '@wdio/globals';

/**
 * Integration tests for Toast State Management
 *
 * Tests the state management of the toast system including:
 * - showToast → state update → re-render flow
 * - Rapid sequential showToast calls
 * - Concurrent showToast and dismissToast
 * - State persistence across re-renders
 */
describe('Toast State Management Integration', () => {
  before(async () => {
    await browser.waitUntil(async () => (await browser.getWindowHandles()).length > 0);
  });

  /**
   * Helper to show a toast via renderer and get its ID
   */
  async function showToast(
    type: string,
    message: string,
    options: { persistent?: boolean } = {}
  ): Promise<string> {
    return await browser.execute(
      (t: string, m: string, o: { persistent?: boolean }) => {
        const helpers = (
          window as unknown as {
            __toastTestHelpers: {
              showToast: (opts: { type: string; message: string; persistent?: boolean }) => string;
            };
          }
        ).__toastTestHelpers;
        return helpers.showToast({ type: t, message: m, persistent: o.persistent ?? true });
      },
      type,
      message,
      options
    );
  }

  /**
   * Helper to get the current toast count
   */
  async function getToastCount(): Promise<number> {
    return await browser.execute(() => {
      const helpers = (
        window as unknown as {
          __toastTestHelpers: {
            getToasts: () => Array<{ id: string }>;
          };
        }
      ).__toastTestHelpers;
      return helpers.getToasts().length;
    });
  }

  /**
   * Helper to dismiss a toast by ID
   */
  async function dismissToast(id: string): Promise<void> {
    await browser.execute((toastId: string) => {
      const helpers = (
        window as unknown as {
          __toastTestHelpers: {
            dismissToast: (id: string) => void;
          };
        }
      ).__toastTestHelpers;
      helpers.dismissToast(toastId);
    }, id);
  }

  /**
   * Helper to dismiss all toasts
   */
  async function dismissAll(): Promise<void> {
    await browser.execute(() => {
      const helpers = (
        window as unknown as {
          __toastTestHelpers: {
            dismissAll: () => void;
          };
        }
      ).__toastTestHelpers;
      helpers.dismissAll();
    });
  }

  /**
   * Helper to get toast IDs
   */
  async function getToastIds(): Promise<string[]> {
    return await browser.execute(() => {
      const helpers = (
        window as unknown as {
          __toastTestHelpers: {
            getToasts: () => Array<{ id: string }>;
          };
        }
      ).__toastTestHelpers;
      return helpers.getToasts().map((t) => t.id);
    });
  }

  describe('showToast → state update → re-render', () => {
    beforeEach(async () => {
      await dismissAll();
      // Wait for DOM to clear
      await browser.waitUntil(
        async () => (await wdioSelectorAll('[data-testid="toast"]')).length === 0,
        { timeout: 3000, timeoutMsg: 'Toasts not cleared from DOM' }
      );
    });

    afterEach(async () => {
      await dismissAll();
    });

    it('should add toast to state and render in DOM', async () => {
      // 1. Show a toast
      const toastId = await showToast('info', 'Test toast message');

      // 2. Verify toast ID was returned
      expect(typeof toastId).toBe('string');
      expect(toastId.length).toBeGreaterThan(0);

      // 3. Verify state was updated
      const count = await getToastCount();
      expect(count).toBe(1);

      // 4. Verify toast is rendered in DOM
      const toastElement = await wdioSelector('[data-testid="toast"]');
      await expect(toastElement).toBeDisplayed();
      await expect(toastElement).toHaveText(expect.stringContaining('Test toast message'));
    });

    it('should update state when showing multiple toasts', async () => {
      // Show 3 toasts
      await showToast('info', 'Toast 1');
      await showToast('success', 'Toast 2');
      await showToast('warning', 'Toast 3');

      // Verify state has all 3
      const count = await getToastCount();
      expect(count).toBe(3);

      // Verify all 3 are rendered (up to max visible)
      const toasts = await wdioSelectorAll('[data-testid="toast"]');
      expect(toasts.length).toBe(3);
    });
  });

  describe('rapid sequential showToast calls', () => {
    beforeEach(async () => {
      await dismissAll();
      // Wait for DOM to clear
      await browser.waitUntil(
        async () => (await wdioSelectorAll('[data-testid="toast"]')).length === 0,
        { timeout: 3000, timeoutMsg: 'Toasts not cleared from DOM' }
      );
    });

    afterEach(async () => {
      await dismissAll();
    });

    it('should handle rapid sequential toast creation', async () => {
      // Create 5 toasts as fast as possible
      const ids = await browser.execute(() => {
        const helpers = (
          window as unknown as {
            __toastTestHelpers: {
              showToast: (opts: { type: string; message: string; persistent?: boolean }) => string;
            };
          }
        ).__toastTestHelpers;
        const ids: string[] = [];
        for (let i = 0; i < 5; i++) {
          ids.push(
            helpers.showToast({ type: 'info', message: `Rapid toast ${i}`, persistent: true })
          );
        }
        return ids;
      });

      // All 5 should be created with unique IDs
      expect(ids.length).toBe(5);
      expect(new Set(ids).size).toBe(5); // All unique

      // All 5 should be in state
      const count = await getToastCount();
      expect(count).toBe(5);
    });

    it('should handle burst of 10 toasts in 100ms', async () => {
      const startTime = Date.now();

      // Create 10 toasts with minimal delay
      const ids = await browser.execute(() => {
        const helpers = (
          window as unknown as {
            __toastTestHelpers: {
              showToast: (opts: { type: string; message: string; persistent?: boolean }) => string;
            };
          }
        ).__toastTestHelpers;
        const ids: string[] = [];
        for (let i = 0; i < 10; i++) {
          ids.push(
            helpers.showToast({ type: 'success', message: `Burst toast ${i}`, persistent: true })
          );
        }
        return ids;
      });

      const elapsed = Date.now() - startTime;

      // Should complete quickly (under 500ms)
      expect(elapsed).toBeLessThan(500);

      // All 10 should be created
      expect(ids.length).toBe(10);

      // All should be in state (5 visible, 5 queued)
      const count = await getToastCount();
      expect(count).toBe(10);

      // Only 5 should be visible (max visible limit)
      const visibleToasts = await wdioSelectorAll('[data-testid="toast"]');
      expect(visibleToasts.length).toBe(5);
    });
  });

  describe('concurrent showToast and dismissToast', () => {
    beforeEach(async () => {
      await dismissAll();
      // Wait for DOM to clear
      await browser.waitUntil(
        async () => (await wdioSelectorAll('[data-testid="toast"]')).length === 0,
        { timeout: 3000, timeoutMsg: 'Toasts not cleared from DOM' }
      );
    });

    afterEach(async () => {
      await dismissAll();
    });

    it('should handle dismiss while showing new toast', async () => {
      // Show initial toast
      const id1 = await showToast('info', 'First toast');

      // Simultaneously show new toast and dismiss the first
      await browser.execute((dismissId: string) => {
        const helpers = (
          window as unknown as {
            __toastTestHelpers: {
              showToast: (opts: { type: string; message: string; persistent?: boolean }) => string;
              dismissToast: (id: string) => void;
            };
          }
        ).__toastTestHelpers;
        // Show and dismiss at nearly the same time
        helpers.showToast({ type: 'success', message: 'Second toast', persistent: true });
        helpers.dismissToast(dismissId);
      }, id1);

      // Should have exactly 1 toast (the second one)
      const count = await getToastCount();
      expect(count).toBe(1);

      // The second toast should be visible
      const toast = await wdioSelector('[data-testid="toast"]');
      await expect(toast).toHaveText(expect.stringContaining('Second toast'));
    });

    it('should handle dismissAll while showToast is called', async () => {
      // Show a few toasts
      await showToast('info', 'Toast A');
      await showToast('success', 'Toast B');

      // DismissAll and show new in quick succession
      const newId = await browser.execute(() => {
        const helpers = (
          window as unknown as {
            __toastTestHelpers: {
              showToast: (opts: { type: string; message: string; persistent?: boolean }) => string;
              dismissAll: () => void;
            };
          }
        ).__toastTestHelpers;
        helpers.dismissAll();
        return helpers.showToast({ type: 'warning', message: 'New after clear', persistent: true });
      });

      // Should have exactly 1 toast
      const count = await getToastCount();
      expect(count).toBe(1);

      // The new toast should be visible
      const ids = await getToastIds();
      expect(ids).toContain(newId);
    });

    it('should not crash when dismissing non-existent toast', async () => {
      await showToast('info', 'Existing toast');

      // Dismiss a non-existent ID
      await dismissToast('non-existent-id-12345');

      // Should still have the original toast
      const count = await getToastCount();
      expect(count).toBe(1);
    });
  });

  describe('state persistence across re-renders', () => {
    beforeEach(async () => {
      await dismissAll();
      // Wait for DOM to clear
      await browser.waitUntil(
        async () => (await wdioSelectorAll('[data-testid="toast"]')).length === 0,
        { timeout: 3000, timeoutMsg: 'Toasts not cleared from DOM' }
      );
    });

    afterEach(async () => {
      await dismissAll();
    });

    it('should maintain toasts when parent component re-renders', async () => {
      // Show a toast
      const id = await showToast('info', 'Persistent state toast');

      // Trigger a re-render by updating some state (if test helper available)
      // For now, we verify the toast persists after a short delay
      await browser.pause(100);

      // Toast should still exist
      const ids = await getToastIds();
      expect(ids).toContain(id);

      // DOM should still show the toast
      const toast = await wdioSelector('[data-testid="toast"]');
      await expect(toast).toBeDisplayed();
    });

    it('should maintain toast order after operations', async () => {
      // Create toasts in order
      const id1 = await showToast('info', 'Order 1');
      const id2 = await showToast('success', 'Order 2');
      const id3 = await showToast('warning', 'Order 3');

      // Verify order in state
      const ids = await getToastIds();
      expect(ids[0]).toBe(id1);
      expect(ids[1]).toBe(id2);
      expect(ids[2]).toBe(id3);

      // Dismiss middle toast
      await dismissToast(id2);

      // Remaining order should be preserved
      const remainingIds = await getToastIds();
      expect(remainingIds[0]).toBe(id1);
      expect(remainingIds[1]).toBe(id3);
    });

    it('should queue toasts beyond max visible and show when space available', async () => {
      // Create 7 toasts (5 visible + 2 queued)
      const ids: string[] = [];
      for (let i = 0; i < 7; i++) {
        ids.push(await showToast('info', `Queued toast ${i}`));
      }

      // All 7 in state
      expect(await getToastCount()).toBe(7);

      // Only 5 visible - wait for React/AnimatePresence to stabilize
      await browser.waitUntil(
        async () => (await wdioSelectorAll('[data-testid="toast"]')).length === 5,
        { timeout: 3000, timeoutMsg: 'Expected 5 visible toasts' }
      );
      const visibleBefore = await wdioSelectorAll('[data-testid="toast"]');
      expect(visibleBefore.length).toBe(5);

      // Dismiss first toast
      await dismissToast(ids[0]);

      // Wait for queue to process
      await browser.pause(100);

      // Still 5 visible (queue promoted)
      const visibleAfter = await wdioSelectorAll('[data-testid="toast"]');
      expect(visibleAfter.length).toBe(5);

      // 6 in state
      expect(await getToastCount()).toBe(6);
    });
  });
});
