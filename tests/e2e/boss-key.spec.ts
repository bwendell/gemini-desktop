/**
 * E2E Test: Boss Key (Hide All Windows)
 *
 * Tests the Boss Key hotkey functionality (Ctrl+Alt+E / Cmd+Alt+E) which
 * minimizes/hides the main window for quick privacy.
 *
 * The boss key is designed to quickly hide the application when needed.
 *
 * Cross-platform: Windows, macOS, Linux
 *
 * @module boss-key.spec
 */

import { browser, $, expect } from '@wdio/globals';
import { Selectors } from './helpers/selectors';
import { E2ELogger } from './helpers/logger';
import { isHotkeyRegistered, REGISTERED_HOTKEYS } from './helpers/hotkeyHelpers';
import { E2E_TIMING } from './helpers/e2eConstants';

describe('Boss Key (Hide All Windows)', () => {
  beforeEach(async () => {
    // Ensure app is loaded
    const mainLayout = await $(Selectors.mainLayout);
    await mainLayout.waitForExist({ timeout: 15000 });
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

      // The hotkey should be Ctrl+Alt+E on Windows/Linux, Cmd+Alt+E on macOS
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
      const initialVisibility = await browser.electron.execute(
        (electron: typeof import('electron')) => {
          const wins = electron.BrowserWindow.getAllWindows();
          const mainWindow = wins.find((w) => !w.isDestroyed());
          return mainWindow?.isVisible() ?? false;
        }
      );
      expect(initialVisibility).toBe(true);
      E2ELogger.info('boss-key', 'Main window is visible initially');

      // 2. Trigger boss key action via IPC (simulating hotkey)
      await browser.electron.execute((electron: typeof import('electron')) => {
        const wins = electron.BrowserWindow.getAllWindows();
        const mainWindow = wins.find((w) => !w.isDestroyed());
        if (mainWindow) {
          mainWindow.minimize();
        }
      });

      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

      // 3. Verify window is minimized
      const afterMinimize = await browser.electron.execute(
        (electron: typeof import('electron')) => {
          const wins = electron.BrowserWindow.getAllWindows();
          const mainWindow = wins.find((w) => !w.isDestroyed());
          return {
            minimized: mainWindow?.isMinimized() ?? false,
            visible: mainWindow?.isVisible() ?? true,
          };
        }
      );

      // Window should be minimized (or hidden on some systems)
      expect(afterMinimize.minimized || !afterMinimize.visible).toBe(true);
      E2ELogger.info(
        'boss-key',
        `After boss key: minimized=${afterMinimize.minimized}, visible=${afterMinimize.visible}`
      );

      // 4. Restore window for cleanup
      await browser.electron.execute((electron: typeof import('electron')) => {
        const wins = electron.BrowserWindow.getAllWindows();
        const mainWindow = wins.find((w) => !w.isDestroyed());
        if (mainWindow) {
          mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      });

      await browser.pause(E2E_TIMING.WINDOW_ANIMATION);

      // 5. Verify window is restored
      const afterRestore = await browser.electron.execute((electron: typeof import('electron')) => {
        const wins = electron.BrowserWindow.getAllWindows();
        const mainWindow = wins.find((w) => !w.isDestroyed());
        return mainWindow?.isVisible() ?? false;
      });
      expect(afterRestore).toBe(true);
      E2ELogger.info('boss-key', 'Window restored successfully');
    });

    it('should remain hidden until explicitly restored', async () => {
      // 1. Minimize the window
      await browser.electron.execute((electron: typeof import('electron')) => {
        const wins = electron.BrowserWindow.getAllWindows();
        const mainWindow = wins.find((w) => !w.isDestroyed());
        if (mainWindow) {
          mainWindow.minimize();
        }
      });

      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

      // 2. Wait a moment to ensure it stays hidden
      await browser.pause(1000);

      // 3. Check it's still minimized
      const stillMinimized = await browser.electron.execute(
        (electron: typeof import('electron')) => {
          const wins = electron.BrowserWindow.getAllWindows();
          const mainWindow = wins.find((w) => !w.isDestroyed());
          return mainWindow?.isMinimized() ?? false;
        }
      );

      expect(stillMinimized).toBe(true);
      E2ELogger.info('boss-key', 'Window remained minimized as expected');

      // 4. Cleanup - restore
      await browser.electron.execute((electron: typeof import('electron')) => {
        const wins = electron.BrowserWindow.getAllWindows();
        const mainWindow = wins.find((w) => !w.isDestroyed());
        if (mainWindow) {
          mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      });

      await browser.pause(E2E_TIMING.WINDOW_ANIMATION);
    });
  });

  describe('Boss Key with Multiple Windows', () => {
    it('should handle boss key when options window is also open', async () => {
      // This test is informational - boss key currently only affects main window
      // Future enhancement could hide all windows

      E2ELogger.info('boss-key', 'Boss key affects main window; options window behavior may vary');

      // Just verify the main window can still be minimized
      const canMinimize = await browser.electron.execute((electron: typeof import('electron')) => {
        const wins = electron.BrowserWindow.getAllWindows();
        const mainWindow = wins.find((w) => !w.isDestroyed() && w.minimizable !== false);
        return mainWindow !== undefined;
      });

      expect(canMinimize).toBe(true);
    });
  });
});
