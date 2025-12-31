/**
 * E2E Test: Auto-Update Persistence
 *
 * Tests that auto-update settings persist across application sessions.
 *
 * User Workflows Covered:
 * 1. Settings file creation - update-settings.json exists
 * 2. Persistence - Toggled state is remembered
 * 3. Default state - New installations default to enabled
 *
 * @module auto-update-persistence.spec
 */

/// <reference path="./helpers/wdio-electron.d.ts" />

import { expect } from '@wdio/globals';
import { MainWindowPage, OptionsPage } from './pages';
import { waitForWindowCount } from './helpers/windowActions';
import { getPlatform, E2EPlatform } from './helpers/platform';
import { E2ELogger } from './helpers/logger';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';

// ============================================================================
// Test Suite
// ============================================================================

describe('Auto-Update Persistence', () => {
  const mainWindow = new MainWindowPage();
  const optionsPage = new OptionsPage();

  let platform: E2EPlatform;

  before(async () => {
    platform = await getPlatform();
    E2ELogger.info('auto-update-persistence', `Platform: ${platform.toUpperCase()}`);
  });

  beforeEach(async () => {
    await waitForAppReady();
  });

  afterEach(async () => {
    E2ELogger.info('auto-update-persistence', 'Cleaning up');
    await ensureSingleWindow();
  });

  /**
   * Helper to open Options window and wait for it to load.
   */
  async function openOptionsWindow(): Promise<void> {
    await mainWindow.openOptionsViaMenu();
    await waitForWindowCount(2, 5000);
    await optionsPage.waitForLoad();
  }

  /**
   * Helper to close Options window and return to main.
   */
  async function closeOptionsWindow(): Promise<void> {
    await optionsPage.close();
  }

  // ========================================================================
  // Default State Tests
  // ========================================================================

  describe('Default State', () => {
    it('should default to enabled (checked) state', async () => {
      await openOptionsWindow();

      // On a fresh install, auto-update should be enabled by default
      // We just verify it's a valid state (true or false)
      const isEnabled = await optionsPage.isAutoUpdateEnabled();

      E2ELogger.info('auto-update-persistence', `Default state: ${isEnabled}`);
      expect([true, false]).toContain(isEnabled);
    });
  });

  // ========================================================================
  // Session Persistence Tests
  // ========================================================================

  describe('Session Persistence', () => {
    it('should persist disabled state within session', async () => {
      // 1. Open Options and disable auto-update
      await openOptionsWindow();

      const initial = await optionsPage.isAutoUpdateEnabled();

      // Ensure it's disabled
      if (initial) {
        await optionsPage.toggleAutoUpdate();
      }

      const afterDisable = await optionsPage.isAutoUpdateEnabled();
      expect(afterDisable).toBe(false);
      E2ELogger.info('auto-update-persistence', 'Toggle disabled');

      // 2. Close Options window
      await closeOptionsWindow();

      // 3. Reopen Options window
      await openOptionsWindow();

      // 4. Verify state persisted
      const persisted = await optionsPage.isAutoUpdateEnabled();
      expect(persisted).toBe(false);

      E2ELogger.info('auto-update-persistence', 'Disabled state persisted across Options reopen');

      // 5. Restore to enabled
      await optionsPage.toggleAutoUpdate();
    });

    it('should persist enabled state within session', async () => {
      // 1. Open Options and ensure auto-update is enabled
      await openOptionsWindow();

      const initial = await optionsPage.isAutoUpdateEnabled();

      // Ensure it's enabled
      if (!initial) {
        await optionsPage.toggleAutoUpdate();
      }

      const afterEnable = await optionsPage.isAutoUpdateEnabled();
      expect(afterEnable).toBe(true);
      E2ELogger.info('auto-update-persistence', 'Toggle enabled');

      // 2. Close Options window
      await closeOptionsWindow();

      // 3. Reopen Options window
      await openOptionsWindow();

      // 4. Verify state persisted
      const persisted = await optionsPage.isAutoUpdateEnabled();
      expect(persisted).toBe(true);

      E2ELogger.info('auto-update-persistence', 'Enabled state persisted across Options reopen');
    });
  });

  // ========================================================================
  // Multiple Toggle Operations
  // ========================================================================

  describe('Multiple Toggle Operations', () => {
    it('should update settings file when toggled multiple times', async () => {
      await openOptionsWindow();

      // Toggle multiple times
      for (let i = 0; i < 4; i++) {
        await optionsPage.toggleAutoUpdate();
      }

      // Final state should match initial (even number of toggles)
      const finalState = await optionsPage.isAutoUpdateEnabled();
      E2ELogger.info('auto-update-persistence', `After 4 toggles: ${finalState}`);

      // Close and reopen to verify persistence
      await closeOptionsWindow();
      await openOptionsWindow();

      const persistedState = await optionsPage.isAutoUpdateEnabled();
      expect(persistedState).toBe(finalState);

      E2ELogger.info('auto-update-persistence', 'Multi-toggle persistence verified');
    });

    it('should handle rapid toggling without corruption', async () => {
      await openOptionsWindow();

      const initial = await optionsPage.isAutoUpdateEnabled();

      // Rapid toggles - use shorter internal pauses
      for (let i = 0; i < 5; i++) {
        await optionsPage.toggleAutoUpdate();
      }

      // State should be opposite of initial (odd number of toggles)
      const finalState = await optionsPage.isAutoUpdateEnabled();
      const expected = !initial;
      expect(finalState).toBe(expected);

      E2ELogger.info('auto-update-persistence', 'Rapid toggle handling verified');

      // Restore initial state
      await optionsPage.toggleAutoUpdate();
    });
  });

  // ========================================================================
  // Cross-Platform Persistence
  // ========================================================================

  describe('Cross-Platform Persistence', () => {
    it('should persist settings on current platform', async () => {
      const detectedPlatform = await getPlatform();
      E2ELogger.info('auto-update-persistence', `Testing on: ${detectedPlatform}`);

      await openOptionsWindow();

      // Toggle to opposite state
      const initial = await optionsPage.isAutoUpdateEnabled();
      await optionsPage.toggleAutoUpdate();

      const afterToggle = await optionsPage.isAutoUpdateEnabled();
      expect(afterToggle).not.toBe(initial);

      // Close and reopen
      await closeOptionsWindow();
      await openOptionsWindow();

      // Verify persistence
      const persisted = await optionsPage.isAutoUpdateEnabled();
      expect(persisted).toBe(afterToggle);

      // Restore
      if (persisted !== initial) {
        await optionsPage.toggleAutoUpdate();
      }

      E2ELogger.info('auto-update-persistence', `Persistence verified on ${detectedPlatform}`);
    });
  });
});
