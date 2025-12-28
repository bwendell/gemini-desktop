/**
 * E2E Test: Minimize-to-Tray Workflow
 *
 * Tests the hide-to-tray functionality via close button click.
 * Uses real user actions (clicking close button) instead of internal API calls.
 *
 * Verifies:
 * 1. Close button triggers hide-to-tray (not quit)
 * 2. Window is hidden to tray (not just minimized)
 * 3. Can restore from tray after hiding
 * 4. Tray icon persists when window is hidden
 * 5. Multiple hide/restore cycles work correctly
 *
 * Cross-platform: Windows, macOS, Linux
 *
 * @module minimize-to-tray.spec
 */

import { expect } from '@wdio/globals';
import { TrayPage } from './pages';
import { E2ELogger } from './helpers/logger';
import { waitForAppReady } from './helpers/workflows';
import { isMacOS } from './helpers/platform';

describe('Minimize-to-Tray Workflow', () => {
  const tray = new TrayPage();

  beforeEach(async () => {
    // Ensure app is loaded and window is visible
    await waitForAppReady();

    // Make sure window is visible before each test
    const visible = await tray.isWindowVisible();
    if (!visible) {
      await tray.clickAndWaitForWindow();
    }
  });

  afterEach(async () => {
    // Restore window after each test
    const visible = await tray.isWindowVisible();
    if (!visible) {
      await tray.clickAndWaitForWindow();
    }
  });

  describe('Close Button Triggers Hide-to-Tray', () => {
    it('should hide window to tray when close button is clicked', async () => {
      // Verify window is visible initially
      const initialVisible = await tray.isWindowVisible();
      expect(initialVisible).toBe(true);

      // Click close button (triggers hide-to-tray)
      await tray.hideViaCloseButton();

      // Window should be hidden
      const hiddenToTray = await tray.isHiddenToTray();
      expect(hiddenToTray).toBe(true);

      E2ELogger.info('minimize-to-tray', 'Window hidden to tray via close button');
    });

    it('should not be minimized to taskbar (hidden vs minimized)', async () => {
      // Click close button to hide
      await tray.hideViaCloseButton();

      // Should NOT be minimized (minimized is different from hidden)
      const isMinimized = await tray.isWindowMinimized();
      expect(isMinimized).toBe(false);

      // Should not be visible
      const isVisible = await tray.isWindowVisible();
      expect(isVisible).toBe(false);

      E2ELogger.info('minimize-to-tray', 'Window is hidden, not minimized');
    });

    it('should skip taskbar on Windows/Linux when hidden to tray', async () => {
      // Skip on macOS (no taskbar concept)
      if (await isMacOS()) {
        E2ELogger.info('minimize-to-tray', 'Skipping taskbar test on macOS');
        return;
      }

      // Skip on Linux CI (Xvfb limitations)
      if (await tray.isLinuxCI()) {
        E2ELogger.info('minimize-to-tray', 'Skipping taskbar test on Linux CI');
        return;
      }

      // Click close button to hide
      await tray.hideViaCloseButton();

      // Should skip taskbar
      const skipTaskbar = await tray.isSkipTaskbar();
      expect(skipTaskbar).toBe(true);

      E2ELogger.info('minimize-to-tray', 'Window is skipping taskbar');
    });
  });

  describe('Restore from Tray After Hiding', () => {
    it('should restore window from tray after close button hide', async () => {
      // 1. Hide to tray via close button
      await tray.hideViaCloseButton();

      // Verify hidden
      const hiddenAfterMinimize = await tray.isHiddenToTray();
      expect(hiddenAfterMinimize).toBe(true);

      // 2. Click tray to restore
      await tray.clickAndWaitForWindow();

      // 3. Window should be visible again
      const visibleAfterRestore = await tray.isWindowVisible();
      expect(visibleAfterRestore).toBe(true);

      E2ELogger.info('minimize-to-tray', 'Window restored from tray after hide');
    });

    it('should restore taskbar visibility on Windows/Linux', async () => {
      // Skip on macOS
      if (await isMacOS()) {
        return;
      }

      // Skip on Linux CI
      if (await tray.isLinuxCI()) {
        return;
      }

      // 1. Hide to tray via close button
      await tray.hideViaCloseButton();

      // 2. Restore via tray click
      await tray.clickAndWaitForWindow();

      // 3. Should NOT skip taskbar anymore
      const skipTaskbar = await tray.isSkipTaskbar();
      expect(skipTaskbar).toBe(false);

      E2ELogger.info('minimize-to-tray', 'Taskbar visibility restored after restore');
    });
  });

  describe('Tray Icon Persists', () => {
    it('should keep tray icon visible after hiding to tray', async () => {
      // Hide to tray via close button
      await tray.hideViaCloseButton();

      // Tray should still exist
      const trayExists = await tray.isCreated();
      expect(trayExists).toBe(true);

      E2ELogger.info('minimize-to-tray', 'Tray icon persists when window is hidden');
    });
  });

  describe('Multiple Hide/Restore Cycles', () => {
    it('should handle multiple hide/restore cycles via close button', async () => {
      // Cycle 1
      await tray.hideViaCloseButton();
      let hidden = await tray.isHiddenToTray();
      expect(hidden).toBe(true);

      await tray.clickAndWaitForWindow();
      let visible = await tray.isWindowVisible();
      expect(visible).toBe(true);

      // Cycle 2
      await tray.hideViaCloseButton();
      hidden = await tray.isHiddenToTray();
      expect(hidden).toBe(true);

      await tray.clickAndWaitForWindow();
      visible = await tray.isWindowVisible();
      expect(visible).toBe(true);

      E2ELogger.info('minimize-to-tray', 'Multiple hide/restore cycles successful');
    });
  });
});
