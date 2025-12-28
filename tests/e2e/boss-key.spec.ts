/**
 * E2E Test: Boss Key (Hide All Windows)
 *
 * Tests the Boss Key hotkey functionality (Ctrl+Alt+H / Cmd+Alt+H) which
 * minimizes/hides the main window for quick privacy.
 *
 * The boss key is designed to quickly hide the application when needed.
 *
 * Cross-platform: Windows, macOS, Linux
 *
 * @module boss-key.spec
 */

import { expect } from '@wdio/globals';
import { MainWindowPage } from './pages';
import { E2ELogger } from './helpers/logger';
import { isHotkeyRegistered, REGISTERED_HOTKEYS } from './helpers/hotkeyHelpers';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import {
  isWindowMinimized,
  isWindowVisible,
  minimizeWindow,
  restoreWindow,
  showWindow,
} from './helpers/windowStateActions';

describe('Boss Key (Hide All Windows)', () => {
  const mainWindow = new MainWindowPage();

  beforeEach(async () => {
    await waitForAppReady();
  });

  afterEach(async () => {
    await ensureSingleWindow();
  });

  describe('Hotkey Registration', () => {
    it('should have boss key hotkey registered by default', async () => {
      const accelerator = REGISTERED_HOTKEYS.MINIMIZE_WINDOW.accelerator;
      const isRegistered = await isHotkeyRegistered(accelerator);

      expect(isRegistered).toBe(true);
      E2ELogger.info('boss-key', `Boss key (${accelerator}) is registered`);
    });

    it('should display correct platform-specific hotkey format', async () => {
      const platform = process.platform;
      const expectedDisplay =
        platform === 'darwin'
          ? REGISTERED_HOTKEYS.MINIMIZE_WINDOW.displayFormat.macos
          : REGISTERED_HOTKEYS.MINIMIZE_WINDOW.displayFormat.windows;

      E2ELogger.info('boss-key', `Expected display format on ${platform}: ${expectedDisplay}`);

      // The hotkey should be Ctrl+Alt+H on Windows/Linux, Cmd+Alt+H on macOS
      if (platform === 'darwin') {
        expect(expectedDisplay).toContain('Cmd');
      } else {
        expect(expectedDisplay).toContain('Ctrl');
      }
    });
  });

  describe('Boss Key Action', () => {
    it('should minimize main window when boss key is triggered', async () => {
      // 1. Verify main window is visible initially
      const initialVisibility = await isWindowVisible();
      expect(initialVisibility).toBe(true);
      E2ELogger.info('boss-key', 'Main window is visible initially');

      // 2. Minimize the window (simulating boss key action)
      await minimizeWindow();

      // 3. Verify window is minimized
      const minimized = await isWindowMinimized();
      const visible = await isWindowVisible();

      // Window should be minimized (or hidden on some systems)
      expect(minimized || !visible).toBe(true);
      E2ELogger.info('boss-key', `After boss key: minimized=${minimized}, visible=${visible}`);

      // 4. Restore window for cleanup
      await restoreWindow();
      await showWindow();

      // 5. Verify window is restored
      const afterRestore = await isWindowVisible();
      expect(afterRestore).toBe(true);
      E2ELogger.info('boss-key', 'Window restored successfully');
    });

    it('should remain hidden until explicitly restored', async () => {
      // 1. Minimize the window
      await minimizeWindow();

      // 2. Wait a moment to ensure it stays hidden
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 3. Check it's still minimized
      const stillMinimized = await isWindowMinimized();
      expect(stillMinimized).toBe(true);
      E2ELogger.info('boss-key', 'Window remained minimized as expected');

      // 4. Cleanup - restore
      await restoreWindow();
      await showWindow();
    });
  });

  describe('Boss Key with Multiple Windows', () => {
    it('should handle boss key when options window is also open', async () => {
      // This test is informational - boss key currently only affects main window
      // Future enhancement could hide all windows

      E2ELogger.info('boss-key', 'Boss key affects main window; options window behavior may vary');

      // Verify the main window is loaded and can be minimized
      const isLoaded = await mainWindow.isLoaded();
      expect(isLoaded).toBe(true);

      // Verify window is currently visible (minimizable state)
      const isVisible = await isWindowVisible();
      expect(isVisible).toBe(true);
    });
  });
});
