/**
 * E2E Test: System Tray Functionality
 *
 * Tests the system tray icon and context menu behavior across platforms.
 *
 * Verifies:
 * 1. Tray icon is created on app startup
 * 2. Tray click restores window from tray
 * 3. Tray has correct tooltip
 * 4. Tray "Show" action restores window
 * 5. Tray "Quit" action exits app (skipped - causes session issues)
 *
 * Cross-platform: Windows, macOS, Linux
 *
 * @module tray.spec
 */

import { browser, $, expect } from '@wdio/globals';
import { Selectors } from './helpers/selectors';
import { E2ELogger } from './helpers/logger';
import {
  getTrayState,
  simulateTrayClick,
  clickTrayMenuItem,
  getTrayTooltip,
  verifyTrayCreated,
} from './helpers/trayActions';
import { isWindowVisible, isWindowMinimized } from './helpers/windowStateActions';
import { closeWindow } from './helpers/windowStateActions';

describe('System Tray Functionality', () => {
  beforeEach(async () => {
    // Ensure app is loaded
    const mainLayout = await $(Selectors.mainLayout);
    await mainLayout.waitForExist({ timeout: 15000 });
  });

  describe('Tray Icon Creation', () => {
    it('should create tray icon on app startup', async () => {
      const trayExists = await verifyTrayCreated();

      expect(trayExists).toBe(true);
      E2ELogger.info('tray', 'Tray icon verified as existing');
    });

    it('should have correct tooltip on tray icon', async () => {
      const tooltip = await getTrayTooltip();

      // Tooltip should be set (from TRAY_TOOLTIP constant)
      expect(tooltip).not.toBeNull();
      expect(tooltip).toContain('Gemini');

      E2ELogger.info('tray', `Tray tooltip: "${tooltip}"`);
    });

    it('should report tray state correctly', async () => {
      const state = await getTrayState();

      expect(state.exists).toBe(true);
      expect(state.isDestroyed).toBe(false);
      expect(state.tooltip).toBeTruthy();

      E2ELogger.info('tray', `Tray state: ${JSON.stringify(state)}`);
    });
  });

  describe('Tray Click Behavior', () => {
    it('should restore window when tray icon is clicked', async () => {
      // 1. First hide window to tray
      await closeWindow(); // This triggers hide-to-tray behavior
      await browser.pause(500);

      // Verify window is hidden
      const visibleAfterClose = await isWindowVisible();
      expect(visibleAfterClose).toBe(false);

      // 2. Click the tray icon
      await simulateTrayClick();
      await browser.pause(500);

      // 3. Window should be visible again
      const visibleAfterTrayClick = await isWindowVisible();
      expect(visibleAfterTrayClick).toBe(true);

      E2ELogger.info('tray', 'Tray click restored window successfully');
    });
  });

  describe('Tray Context Menu Actions', () => {
    it('should restore window when "Show" menu item is clicked', async () => {
      // 1. Hide window to tray
      await closeWindow();
      await browser.pause(500);

      // Verify hidden
      const visibleAfterClose = await isWindowVisible();
      expect(visibleAfterClose).toBe(false);

      // 2. Click "Show" menu item
      await clickTrayMenuItem('show');
      await browser.pause(500);

      // 3. Window should be visible
      const visibleAfterShow = await isWindowVisible();
      expect(visibleAfterShow).toBe(true);

      E2ELogger.info('tray', 'Show menu item restored window successfully');
    });

    // Note: We skip testing "Quit" because it would terminate the app
    // and break the E2E session. The quit functionality is tested
    // via unit tests in trayManager.test.ts
    it.skip('should quit app when "Quit" menu item is clicked', async () => {
      // This would call: await clickTrayMenuItem('quit');
      // But we can't test this without ending the session
    });
  });

  describe('Tray Integration with Window State', () => {
    it('should work correctly after multiple hide/restore cycles', async () => {
      // Cycle 1: Hide and restore
      await closeWindow();
      await browser.pause(300);
      await simulateTrayClick();
      await browser.pause(300);

      let isVisible = await isWindowVisible();
      expect(isVisible).toBe(true);

      // Cycle 2: Hide and restore via menu
      await closeWindow();
      await browser.pause(300);
      await clickTrayMenuItem('show');
      await browser.pause(300);

      isVisible = await isWindowVisible();
      expect(isVisible).toBe(true);

      // Cycle 3: Hide and restore via click again
      await closeWindow();
      await browser.pause(300);
      await simulateTrayClick();
      await browser.pause(300);

      isVisible = await isWindowVisible();
      expect(isVisible).toBe(true);

      E2ELogger.info('tray', 'Multiple hide/restore cycles completed successfully');
    });

    it('should keep tray icon after window is hidden', async () => {
      // Hide window
      await closeWindow();
      await browser.pause(300);

      // Tray should still exist
      const trayExists = await verifyTrayCreated();
      expect(trayExists).toBe(true);

      // Restore window for cleanup
      await simulateTrayClick();
      await browser.pause(300);

      E2ELogger.info('tray', 'Tray icon persists when window is hidden');
    });
  });
});
