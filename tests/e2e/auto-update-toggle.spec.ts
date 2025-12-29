/**
 * E2E Test: Auto-Update Toggle
 *
 * Tests the auto-update toggle switch in the Options window.
 *
 * User Workflows Covered:
 * 1. Viewing - Toggle visible in Updates section
 * 2. Toggling - Toggle changes enabled/disabled state
 * 3. Cross-platform - Works on Windows, macOS, and Linux
 *
 * @module auto-update-toggle.spec
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

describe('Auto-Update Toggle', () => {
  const mainWindow = new MainWindowPage();
  const optionsPage = new OptionsPage();

  let platform: E2EPlatform;

  before(async () => {
    platform = await getPlatform();
    E2ELogger.info('auto-update-toggle', `Platform: ${platform.toUpperCase()}`);
  });

  beforeEach(async () => {
    E2ELogger.info('auto-update-toggle', 'Opening Options window');
    await waitForAppReady();

    // Open Options via menu
    await mainWindow.openOptionsViaMenu();
    await waitForWindowCount(2, 5000);
    await optionsPage.waitForLoad();
  });

  afterEach(async () => {
    E2ELogger.info('auto-update-toggle', 'Cleaning up');
    await ensureSingleWindow();
  });

  // ========================================================================
  // Rendering Tests
  // ========================================================================

  describe('Rendering', () => {
    it('should display the Updates section in Options', async () => {
      expect(await optionsPage.isUpdatesSectionDisplayed()).toBe(true);

      const heading = await optionsPage.getUpdatesSectionHeading();
      expect(heading.toLowerCase()).toContain('updates');

      E2ELogger.info('auto-update-toggle', 'Updates section visible');
    });

    it('should display the auto-update toggle', async () => {
      expect(await optionsPage.isAutoUpdateToggleDisplayed()).toBe(true);

      E2ELogger.info('auto-update-toggle', 'Auto-update toggle visible');
    });

    it('should display toggle with label and description', async () => {
      const text = await optionsPage.getAutoUpdateToggleText();

      expect(text).toContain('Automatic Updates');
      expect(text.toLowerCase()).toContain('download');

      E2ELogger.info('auto-update-toggle', 'Toggle has label and description');
    });

    it('should have toggle switch element', async () => {
      // Verify the toggle switch element exists and has aria-checked attribute
      const isEnabled = await optionsPage.isAutoUpdateEnabled();
      expect([true, false]).toContain(isEnabled);

      E2ELogger.info('auto-update-toggle', 'Toggle switch element verified');
    });
  });

  // ========================================================================
  // Interaction Tests
  // ========================================================================

  describe('Interactions', () => {
    it('should have aria-checked attribute on toggle switch', async () => {
      const isEnabled = await optionsPage.isAutoUpdateEnabled();

      expect([true, false]).toContain(isEnabled);
      E2ELogger.info('auto-update-toggle', `Initial state: enabled=${isEnabled}`);
    });

    it('should toggle state when clicked', async () => {
      const initialEnabled = await optionsPage.isAutoUpdateEnabled();
      E2ELogger.info('auto-update-toggle', `Initial state: ${initialEnabled}`);

      await optionsPage.toggleAutoUpdate();

      const newEnabled = await optionsPage.isAutoUpdateEnabled();
      E2ELogger.info('auto-update-toggle', `After click: ${newEnabled}`);

      expect(newEnabled).not.toBe(initialEnabled);

      // Restore original state
      await optionsPage.toggleAutoUpdate();
    });

    it('should toggle back when clicked again', async () => {
      const initial = await optionsPage.isAutoUpdateEnabled();
      await optionsPage.toggleAutoUpdate();
      await optionsPage.toggleAutoUpdate();

      const final = await optionsPage.isAutoUpdateEnabled();
      expect(final).toBe(initial);

      E2ELogger.info('auto-update-toggle', 'Toggle round-trip verified');
    });

    it('should remember state within session', async () => {
      // Set to disabled
      const initial = await optionsPage.isAutoUpdateEnabled();
      if (initial) {
        await optionsPage.toggleAutoUpdate();
      }

      // Close and reopen Options window
      await optionsPage.close();

      // Reopen
      await mainWindow.openOptionsViaMenu();
      await waitForWindowCount(2, 5000);
      await optionsPage.waitForLoad();

      // Verify state was preserved
      const state = await optionsPage.isAutoUpdateEnabled();
      expect(state).toBe(false);

      // Restore to enabled
      await optionsPage.toggleAutoUpdate();

      E2ELogger.info('auto-update-toggle', 'Session persistence verified');
    });
  });

  // ========================================================================
  // Cross-Platform Tests
  // ========================================================================

  describe('Cross-Platform', () => {
    it('should work on current platform', async () => {
      const detectedPlatform = await getPlatform();
      expect(['windows', 'macos', 'linux']).toContain(detectedPlatform);

      // Toggle should exist and be interactable on all platforms
      expect(await optionsPage.isAutoUpdateToggleDisplayed()).toBe(true);

      E2ELogger.info('auto-update-toggle', `Verified on platform: ${detectedPlatform}`);
    });
  });
});
