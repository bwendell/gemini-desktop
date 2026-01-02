import { browser, expect } from '@wdio/globals';

/**
 * Toast Provider Integration Tests
 *
 * Tests the integration of ToastProvider with the application:
 * - Provider renders children correctly
 * - ToastContainer renders inside provider
 * - Nested components can access useToast()
 * - Provider hierarchy (ThemeProvider → ToastProvider → UpdateToastProvider)
 * - Multiple ToastProviders don't conflict
 */
describe('Toast Provider Integration', () => {
  before(async () => {
    // Wait for the app to be ready
    await browser.waitUntil(
      async () => {
        const handles = await browser.getWindowHandles();
        return handles.length > 0;
      },
      {
        timeout: 30000,
        timeoutMsg: 'No window handles found after 30s',
      }
    );
  });

  describe('Provider Rendering', () => {
    it('7.5.1.1 - should render children within ToastProvider', async () => {
      // Verify the main app content rendered (children of ToastProvider)
      const webviewContainer = await browser.$('[data-testid="webview-container"]');
      const exists = await webviewContainer.isExisting();
      expect(exists).toBe(true);
    });

    it('7.5.1.2 - should render ToastContainer inside provider', async () => {
      // The ToastContainer should be present in the DOM even when empty
      const toastContainer = await browser.$('[data-testid="toast-container"]');
      const exists = await toastContainer.isExisting();
      expect(exists).toBe(true);

      // Verify it has the correct ARIA attributes
      const ariaLabel = await toastContainer.getAttribute('aria-label');
      expect(ariaLabel).toBe('Notifications');

      const role = await toastContainer.getAttribute('role');
      expect(role).toBe('region');
    });
  });

  describe('Context Access', () => {
    it('7.5.1.3 - should allow nested components to access useToast()', async () => {
      // The __toastTestHelpers prove that useToast() is accessible
      // from within the app component tree
      const hasToastHelper = await browser.execute(() => {
        const win = window as any;
        return (
          typeof win.__toastTestHelpers === 'object' &&
          typeof win.__toastTestHelpers.showToast === 'function' &&
          typeof win.__toastTestHelpers.showSuccess === 'function' &&
          typeof win.__toastTestHelpers.showError === 'function' &&
          typeof win.__toastTestHelpers.showInfo === 'function' &&
          typeof win.__toastTestHelpers.showWarning === 'function' &&
          typeof win.__toastTestHelpers.dismissAll === 'function'
        );
      });
      expect(hasToastHelper).toBe(true);
    });

    it('should show and dismiss a toast via useToast()', async () => {
      // Use the __toastTestHelpers to show a toast
      const toastId = await browser.execute(() => {
        const win = window as any;
        return win.__toastTestHelpers.showSuccess('Integration test toast');
      });

      expect(typeof toastId).toBe('string');
      expect(toastId.length).toBeGreaterThan(0);

      // Wait for toast to appear
      const toast = await browser.$('.toast');
      await toast.waitForExist({ timeout: 2000 });

      // Verify toast content
      const toastMessage = await browser.$('.toast__message');
      const messageText = await toastMessage.getText();
      expect(messageText).toBe('Integration test toast');

      // Dismiss all toasts
      await browser.execute(() => {
        const win = window as any;
        win.__toastTestHelpers.dismissAll();
      });

      // Verify toast is removed
      await toast.waitForExist({ timeout: 2000, reverse: true });
    });
  });

  describe('Provider Hierarchy', () => {
    it('7.5.1.4 - should verify ThemeProvider → ToastProvider → UpdateToastProvider nesting', async () => {
      // Test that the provider hierarchy is correct by checking:
      // 1. Theme context works (ThemeProvider is outer)
      // 2. Toast context works (ToastProvider is middle)
      // 3. Update toast context works (UpdateToastProvider is inner)

      const result = await browser.execute(() => {
        const win = window as any;

        // Check theme functionality works
        const themeWorks = typeof win.electronAPI?.getTheme === 'function';

        // Check toast functionality works via test helpers
        const toastWorks =
          typeof win.__toastTestHelpers === 'object' &&
          typeof win.__toastTestHelpers.showToast === 'function';

        // Check update toast dev helpers exist
        const updateToastWorks =
          typeof win.__testUpdateToast === 'object' &&
          typeof win.__testUpdateToast.showAvailable === 'function';

        return {
          themeWorks,
          toastWorks,
          updateToastWorks,
        };
      });

      expect(result.themeWorks).toBe(true);
      expect(result.toastWorks).toBe(true);
      expect(result.updateToastWorks).toBe(true);
    });

    it('should verify UpdateToastContext can use ToastContext (proper nesting)', async () => {
      // Trigger an update notification via the dev helper
      await browser.execute(() => {
        (window as any).__testUpdateToast.showAvailable('2.0.0');
      });

      // Wait for update toast to appear with robust polling
      await browser.waitUntil(
        async () => {
          const toasts = await browser.$$('.toast');
          return toasts.length > 0;
        },
        { timeout: 5000, interval: 500, timeoutMsg: 'Update toast did not appear' }
      );

      // Verify it's an info toast (as mapped from 'available')
      const isInfo = await browser.execute(() => {
        const toastEl = document.querySelector('.toast');
        return toastEl?.classList.contains('toast--info');
      });
      expect(isInfo).toBe(true);

      // Cleanup
      await browser.execute(() => {
        (window as any).__toastTestHelpers.dismissAll();
      });

      // Wait for removal
      await browser.waitUntil(
        async () => {
          const toasts = await browser.$$('.toast');
          return toasts.length === 0;
        },
        { timeout: 5000, interval: 500, timeoutMsg: 'Toast was not removed' }
      );
    });
  });

  describe('Multiple Providers', () => {
    it('7.5.1.5 - should not have conflicts with the single ToastProvider', async () => {
      // Test that multiple toasts can be created sequentially
      await browser.execute(() => {
        const win = window as any;
        win.__toastTestHelpers.showInfo('First toast');
        win.__toastTestHelpers.showSuccess('Second toast');
        win.__toastTestHelpers.showWarning('Third toast');
      });

      await browser.waitUntil(
        async () => {
          const toasts = await browser.$$('.toast');
          return toasts.length === 3;
        },
        { timeout: 5000, interval: 500 }
      );

      // Cleanup
      await browser.execute(() => {
        (window as any).__toastTestHelpers.dismissAll();
      });

      await browser.waitUntil(
        async () => {
          const toasts = await browser.$$('.toast');
          return toasts.length === 0;
        },
        { timeout: 5000, interval: 500 }
      );
    });

    it('should handle rapid toast creation without conflicts', async () => {
      // Create many toasts rapidly
      await browser.execute(() => {
        const win = window as any;
        for (let i = 0; i < 7; i++) {
          win.__toastTestHelpers.showInfo(`Toast ${i + 1}`);
        }
      });

      // Should respect MAX_VISIBLE_TOASTS (which is 5)
      await browser.waitUntil(
        async () => {
          const toasts = await browser.$$('.toast');
          return toasts.length === 5;
        },
        { timeout: 5000, interval: 500, timeoutMsg: 'Expected 5 visible toasts' }
      );

      // Cleanup
      await browser.execute(() => {
        (window as any).__toastTestHelpers.dismissAll();
      });

      await browser.waitUntil(
        async () => {
          const toasts = await browser.$$('.toast');
          return toasts.length === 0;
        },
        { timeout: 5000, interval: 500, timeoutMsg: 'Expected 0 toasts' }
      );
    });
  });
});
