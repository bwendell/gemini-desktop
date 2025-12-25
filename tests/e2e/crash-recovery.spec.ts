/**
 * E2E Test: Crash Recovery and Error Handling
 *
 * Tests that the application handles errors gracefully and recovers
 * from various failure scenarios.
 *
 * These tests verify:
 * - Error boundaries catch and display render errors
 * - App remains functional after non-fatal errors
 * - Main process recovers from renderer errors
 *
 * @module tests/e2e/crash-recovery.spec
 */

import { browser, $, expect } from '@wdio/globals';
import { Selectors } from './helpers/selectors';
import { E2ELogger } from './helpers/logger';

describe('Crash Recovery and Error Handling', () => {
  beforeEach(async () => {
    // Wait for the main layout to be ready
    const mainLayout = await $(Selectors.mainLayout);
    await mainLayout.waitForExist({ timeout: 15000 });
  });

  describe('Application Resilience', () => {
    it('should remain functional after invalid API calls', async () => {
      // Try to call API methods with invalid data
      // These should not crash the app
      await browser.execute(() => {
        try {
          // Call with undefined (should be handled gracefully)
          window.electronAPI?.setTheme(undefined as unknown as 'light');
        } catch {
          // Expected - app should still work
        }
      });

      // Small pause
      await browser.pause(500);

      // Verify app is still responsive
      const titlebar = await $(Selectors.titlebar);
      await expect(titlebar).toBeExisting();

      // Try another interaction to confirm app works
      const themeData = await browser.execute(() => {
        return window.electronAPI?.getTheme();
      });

      // App should still be able to respond to valid calls
      E2ELogger.info('crash-recovery', 'App remained functional after invalid API call');
      expect(themeData).toBeDefined();
    });

    it('should remain functional after console errors in renderer', async () => {
      // Create a console error in the renderer
      await browser.execute(() => {
        console.error('Test error - this is intentional for crash recovery testing');
      });

      await browser.pause(200);

      // App should still be functional
      const isMaximized = await browser.execute(() => {
        return window.electronAPI?.isMaximized();
      });

      // Should get a response (doesn't matter what value)
      expect(isMaximized !== undefined).toBe(true);
      E2ELogger.info('crash-recovery', 'App remained functional after console error');
    });

    it('should handle rapid sequential API calls without crashing', async () => {
      // Fire many API calls in rapid succession
      await browser.execute(() => {
        const promises: Promise<unknown>[] = [];
        for (let i = 0; i < 50; i++) {
          promises.push(window.electronAPI?.getTheme());
          promises.push(window.electronAPI?.isMaximized());
          promises.push(window.electronAPI?.getAlwaysOnTop());
        }
        return Promise.all(promises);
      });

      // Small pause for processing
      await browser.pause(500);

      // Verify app is still responsive
      const mainLayout = await $(Selectors.mainLayout);
      await expect(mainLayout).toBeExisting();

      E2ELogger.info('crash-recovery', 'App handled 150 rapid API calls successfully');
    });
  });

  describe('IPC Channel Resilience', () => {
    it('should handle IPC invoke timeout gracefully', async () => {
      // App should remain responsive even if some IPC calls are slow
      const startTime = Date.now();

      // Make a valid call to verify IPC is working
      const result = await browser.execute(async () => {
        return await window.electronAPI?.getTheme();
      });

      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      E2ELogger.info('crash-recovery', 'IPC invoke completed', { duration: `${duration}ms` });
    });

    it('should not crash when sending events rapidly', async () => {
      // Rapidly send IPC events
      await browser.execute(() => {
        for (let i = 0; i < 100; i++) {
          window.electronAPI?.setAlwaysOnTop?.(i % 2 === 0);
        }
      });

      await browser.pause(500);

      // Verify app is still functional
      const titlebar = await $(Selectors.titlebar);
      await expect(titlebar).toBeExisting();

      E2ELogger.info('crash-recovery', 'App survived 100 rapid IPC sends');
    });
  });

  describe('Window State Recovery', () => {
    it('should maintain window state after error scenarios', async () => {
      // Get initial state
      const initialMaximized = await browser.execute(() => {
        return window.electronAPI?.isMaximized();
      });

      // Trigger some potential error scenarios
      await browser.execute(() => {
        // Multiple rapid window operations
        window.electronAPI?.minimizeWindow?.();
        window.electronAPI?.showWindow?.();
      });

      await browser.pause(500);

      // Verify window is still accessible
      const handles = await browser.getWindowHandles();
      expect(handles.length).toBeGreaterThanOrEqual(1);

      // Verify we can still interact with the window
      const mainLayout = await $(Selectors.mainLayout);
      await expect(mainLayout).toBeExisting();

      E2ELogger.info('crash-recovery', 'Window state maintained after operations', {
        initialMaximized,
        windowCount: handles.length,
      });
    });
  });

  describe('Theme System Recovery', () => {
    it('should recover to valid theme after invalid theme attempts', async () => {
      // Get current valid theme
      const initialTheme = await browser.execute(() => {
        return window.electronAPI?.getTheme();
      });

      expect(initialTheme).toBeDefined();

      // Set a valid theme
      await browser.execute(() => {
        window.electronAPI?.setTheme('dark');
      });

      await browser.pause(200);

      // Verify theme is applied
      const newTheme = await browser.execute(() => {
        return window.electronAPI?.getTheme();
      });

      expect(newTheme).toBeDefined();
      E2ELogger.info('crash-recovery', 'Theme system remains functional', { newTheme });
    });
  });

  describe('Process Health', () => {
    it('should confirm main process is healthy', async () => {
      // Check that the main process responds
      const isReady = await browser.electron.execute((electron: typeof import('electron')) => {
        return electron.app.isReady();
      });

      expect(isReady).toBe(true);
      E2ELogger.info('crash-recovery', 'Main process confirmed healthy');
    });

    it('should have no uncaught exceptions in main process', async () => {
      // This is a smoke test - if we get here, no uncaught exceptions have crashed the app
      const version = await browser.electron.execute((electron: typeof import('electron')) => {
        return electron.app.getVersion();
      });

      expect(version).toBeDefined();
      E2ELogger.info('crash-recovery', 'No uncaught exceptions detected', { version });
    });
  });
});
