/**
 * E2E Test: Memory Stability
 *
 * Tests for memory leaks and stability under repeated operations.
 * Uses process.memoryUsage() to track heap growth over time.
 *
 * These tests help detect:
 * - Memory leaks from event listener accumulation
 * - Memory leaks from window open/close cycles
 * - Memory leaks from repeated theme switches
 *
 * @module tests/e2e/memory-stability.spec
 */

import { browser, $, expect } from '@wdio/globals';
import { Selectors } from './helpers/selectors';
import { E2ELogger } from './helpers/logger';
import { clickMenuItemById } from './helpers/menuActions';
import { waitForWindowCount } from './helpers/windowActions';
import { usesCustomControls } from './helpers/platform';

interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

/**
 * Get current memory usage from the main process
 */
async function getMemoryUsage(): Promise<MemoryUsage> {
  return await browser.electron.execute((electron: typeof import('electron')) => {
    return process.memoryUsage() as MemoryUsage;
  });
}

/**
 * Format bytes to MB for readable output
 */
function formatMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

describe('Memory Stability', () => {
  beforeEach(async () => {
    // Wait for the main layout to be ready
    const mainLayout = await $(Selectors.mainLayout);
    await mainLayout.waitForExist({ timeout: 15000 });
  });

  describe('Baseline Memory', () => {
    it('should have reasonable initial memory usage', async () => {
      const memory = await getMemoryUsage();

      E2ELogger.info('memory-stability', 'Initial memory usage', {
        heapUsed: formatMB(memory.heapUsed),
        heapTotal: formatMB(memory.heapTotal),
        rss: formatMB(memory.rss),
      });

      // Electron app should use less than 500MB heap initially
      // This is a sanity check, not a strict requirement
      expect(memory.heapUsed).toBeLessThan(500 * 1024 * 1024);
    });
  });

  describe.skip('Window Open/Close Cycles', () => {
    // NOTE: This test is skipped due to pre-existing flakiness with options window opening.
    // The underlying issue is in options-window.spec.ts and needs investigation separately.
    it('should not leak memory when opening and closing options window repeatedly', async function () {
      this.timeout(60000); // Long running test

      if (!(await usesCustomControls())) {
        // Skip on macOS since menu is different
        E2ELogger.info('memory-stability', 'Skipping window cycle test on macOS');
        return;
      }

      const initialMemory = await getMemoryUsage();
      E2ELogger.info('memory-stability', 'Memory before window cycles', {
        heapUsed: formatMB(initialMemory.heapUsed),
      });

      const iterations = 5;

      for (let i = 0; i < iterations; i++) {
        // Open options window
        await clickMenuItemById('menu-file-options');
        await waitForWindowCount(2, 5000);

        // Small pause to let it initialize
        await browser.pause(300);

        // Close options window
        const handles = await browser.getWindowHandles();
        // Switch to options window (second one)
        await browser.switchToWindow(handles[1]);
        await browser.closeWindow();

        // Switch back to main window
        const remainingHandles = await browser.getWindowHandles();
        await browser.switchToWindow(remainingHandles[0]);

        // Wait for window to be fully closed
        await waitForWindowCount(1, 3000);
      }

      // Force garbage collection by waiting
      await browser.pause(1000);

      const finalMemory = await getMemoryUsage();
      E2ELogger.info('memory-stability', `Memory after ${iterations} window cycles`, {
        heapUsed: formatMB(finalMemory.heapUsed),
      });

      // Memory should not have grown by more than 50MB across all cycles
      // This allows for some normal variation while catching major leaks
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      E2ELogger.info('memory-stability', 'Memory growth', {
        growth: formatMB(memoryGrowth),
      });

      // If memory grew more than 50MB, that's concerning
      // But we allow for some growth due to caching
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Theme Toggle Stability', () => {
    it('should not leak memory when toggling theme repeatedly', async () => {
      const initialMemory = await getMemoryUsage();
      E2ELogger.info('memory-stability', 'Memory before theme toggles', {
        heapUsed: formatMB(initialMemory.heapUsed),
      });

      const themes = ['dark', 'light', 'system'];
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        for (const theme of themes) {
          await browser.execute((t) => {
            window.electronAPI?.setTheme(t as 'light' | 'dark' | 'system');
          }, theme);
          await browser.pause(100);
        }
      }

      // Force garbage collection by waiting
      await browser.pause(1000);

      const finalMemory = await getMemoryUsage();
      E2ELogger.info('memory-stability', `Memory after ${iterations * themes.length} theme toggles`, {
        heapUsed: formatMB(finalMemory.heapUsed),
      });

      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      E2ELogger.info('memory-stability', 'Memory growth from theme toggles', {
        growth: formatMB(memoryGrowth),
      });

      // Theme toggles should cause minimal memory growth (< 20MB)
      expect(memoryGrowth).toBeLessThan(20 * 1024 * 1024);
    });
  });

  describe('Extended Session Stability', () => {
    it('should remain stable during extended simulated use', async function () {
      this.timeout(90000); // Very long running test

      const memorySnapshots: MemoryUsage[] = [];

      // Take initial snapshot
      memorySnapshots.push(await getMemoryUsage());
      E2ELogger.info('memory-stability', 'Starting extended session test');

      // Simulate regular usage patterns
      for (let round = 0; round < 3; round++) {
        // Toggle theme
        await browser.execute(() => {
          const themes = ['light', 'dark', 'system'] as const;
          const randomTheme = themes[Math.floor(Math.random() * themes.length)];
          window.electronAPI?.setTheme(randomTheme);
        });
        await browser.pause(500);

        // Take memory snapshot
        memorySnapshots.push(await getMemoryUsage());
      }

      // Analyze memory trend
      const heapValues = memorySnapshots.map((m) => m.heapUsed);
      const minHeap = Math.min(...heapValues);
      const maxHeap = Math.max(...heapValues);
      const avgHeap = heapValues.reduce((a, b) => a + b, 0) / heapValues.length;

      E2ELogger.info('memory-stability', 'Extended session memory analysis', {
        samples: memorySnapshots.length,
        min: formatMB(minHeap),
        max: formatMB(maxHeap),
        avg: formatMB(avgHeap),
        range: formatMB(maxHeap - minHeap),
      });

      // Memory range should stay within 100MB during normal operation
      // This accounts for normal GC cycles while catching significant leaks
      expect(maxHeap - minHeap).toBeLessThan(100 * 1024 * 1024);
    });
  });
});
