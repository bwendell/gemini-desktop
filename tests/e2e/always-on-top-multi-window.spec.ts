/**
 * E2E Test: Always On Top - Multi-Window Interactions
 *
 * Tests always-on-top behavior with multiple windows (main, options, auth).
 * Verifies:
 * - Options window interacts correctly with always-on-top main window
 * - Main window always-on-top state is independent of child windows
 * - Cross-platform multi-window behavior
 */

import { browser, $, expect } from '@wdio/globals';
import { clickMenuItemById } from './helpers/menuActions';
import { waitForWindowCount, closeCurrentWindow } from './helpers/windowActions';
import { E2ELogger } from './helpers/logger';
import { getPlatform, isMacOS, isWindows, isLinux } from './helpers/platform';
import { E2E_TIMING } from './helpers/e2eConstants';

declare global {
  interface Window {
    electronAPI: {
      getAlwaysOnTop: () => Promise<{ enabled: boolean }>;
      setAlwaysOnTop: (enabled: boolean) => void;
      closeWindow: () => void;
    };
  }
}

/**
 * Get window always-on-top state from Electron.
 */
async function getWindowAlwaysOnTopState(): Promise<boolean> {
  return browser.electron.execute(() => {
    const { BrowserWindow } = require('electron');
    const mainWindow = BrowserWindow.getAllWindows()[0];
    return mainWindow ? mainWindow.isAlwaysOnTop() : false;
  });
}

describe('Always On Top - Multi-Window Interactions', () => {
  let platform: string;
  let mainWindowHandle: string;

  before(async () => {
    platform = await getPlatform();
    E2ELogger.info('always-on-top-multi-window', `Running on platform: ${platform}`);
  });

  beforeEach(async () => {
    // Store main window handle
    const handles = await browser.getWindowHandles();
    mainWindowHandle = handles[0];

    // Ensure always-on-top is disabled at start
    await browser.execute(() => {
      window.electronAPI?.setAlwaysOnTop?.(false);
    });
    await browser.pause(E2E_TIMING.CLEANUP_PAUSE);
  });

  afterEach(async () => {
    // Close any extra windows
    const handles = await browser.getWindowHandles();
    for (const handle of handles) {
      if (handle !== mainWindowHandle) {
        try {
          await browser.switchToWindow(handle);
          await browser.execute(() => window.electronAPI?.closeWindow?.());
        } catch {
          // Window might already be closed
        }
      }
    }

    // Switch back to main window and reset state
    await browser.switchToWindow(mainWindowHandle);
    await browser.execute(() => {
      window.electronAPI?.setAlwaysOnTop?.(false);
    });
    await browser.pause(E2E_TIMING.CLEANUP_PAUSE);
  });

  describe('Options Window Interaction', () => {
    it('should maintain always-on-top after opening Options window', async () => {
      E2ELogger.info('always-on-top-multi-window', 'Testing Options window interaction');

      // Enable always-on-top
      await browser.execute(() => {
        window.electronAPI?.setAlwaysOnTop?.(true);
      });
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      const stateBeforeOptions = await getWindowAlwaysOnTopState();
      expect(stateBeforeOptions).toBe(true);

      // Open Options window
      await clickMenuItemById('menu-file-options');
      await waitForWindowCount(2, 5000);

      const handles = await browser.getWindowHandles();
      const optionsHandle = handles.find((h) => h !== mainWindowHandle) || handles[1];

      // Switch to Options window
      await browser.switchToWindow(optionsHandle);
      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

      // Verify main window still has always-on-top
      // Need to switch back to main to check
      await browser.switchToWindow(mainWindowHandle);
      const stateWithOptionsOpen = await getWindowAlwaysOnTopState();
      expect(stateWithOptionsOpen).toBe(true);

      E2ELogger.info(
        'always-on-top-multi-window',
        'Main window maintained always-on-top with Options open'
      );
    });

    it('should maintain always-on-top after closing Options window', async () => {
      E2ELogger.info('always-on-top-multi-window', 'Testing Options close behavior');

      // Enable always-on-top
      await browser.execute(() => {
        window.electronAPI?.setAlwaysOnTop?.(true);
      });
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      // Open Options window
      await clickMenuItemById('menu-file-options');
      await waitForWindowCount(2, 5000);

      const handles = await browser.getWindowHandles();
      const optionsHandle = handles.find((h) => h !== mainWindowHandle) || handles[1];

      // Switch to Options and close it
      await browser.switchToWindow(optionsHandle);
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
      await closeCurrentWindow();
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      // Switch back to main
      await browser.switchToWindow(mainWindowHandle);
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      // Verify always-on-top persisted
      const stateAfterClose = await getWindowAlwaysOnTopState();
      expect(stateAfterClose).toBe(true);

      E2ELogger.info('always-on-top-multi-window', 'Always-on-top persisted after Options closed');
    });

    it('should toggle always-on-top while Options window is open', async () => {
      E2ELogger.info('always-on-top-multi-window', 'Testing toggle with Options open');

      // Open Options window first
      await clickMenuItemById('menu-file-options');
      await waitForWindowCount(2, 5000);

      // Switch back to main window
      await browser.switchToWindow(mainWindowHandle);
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      // Enable always-on-top while Options is open
      await browser.execute(() => {
        window.electronAPI?.setAlwaysOnTop?.(true);
      });
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      const enabled = await getWindowAlwaysOnTopState();
      expect(enabled).toBe(true);

      // Disable
      await browser.execute(() => {
        window.electronAPI?.setAlwaysOnTop?.(false);
      });
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      const disabled = await getWindowAlwaysOnTopState();
      expect(disabled).toBe(false);

      E2ELogger.info('always-on-top-multi-window', 'Toggle worked with Options window open');
    });
  });

  describe('Window Independence', () => {
    it('should have main window state independent of Options window', async () => {
      E2ELogger.info('always-on-top-multi-window', 'Testing window independence');

      // Enable always-on-top
      await browser.execute(() => {
        window.electronAPI?.setAlwaysOnTop?.(true);
      });
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      // Open Options window
      await clickMenuItemById('menu-file-options');
      await waitForWindowCount(2, 5000);

      const handles = await browser.getWindowHandles();
      const optionsHandle = handles.find((h) => h !== mainWindowHandle) || handles[1];

      // Switch to Options window
      await browser.switchToWindow(optionsHandle);
      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

      // Do some actions in Options (e.g., click theme)
      const themeCard = await $('[data-testid="theme-card-dark"]');
      if (await themeCard.isExisting()) {
        await themeCard.click();
        await browser.pause(E2E_TIMING.CLEANUP_PAUSE);
      }

      // Close Options
      await closeCurrentWindow();
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      // Verify main window still has always-on-top
      await browser.switchToWindow(mainWindowHandle);
      const state = await getWindowAlwaysOnTopState();
      expect(state).toBe(true);

      E2ELogger.info(
        'always-on-top-multi-window',
        'Main window state is independent of Options window actions'
      );
    });
  });

  describe('Cross-Platform Multi-Window', () => {
    it('should work on Windows', async function () {
      if (!(await isWindows())) {
        E2ELogger.info('always-on-top-multi-window', 'Skipping Windows-specific test');
        return;
      }

      E2ELogger.info('always-on-top-multi-window', 'Testing Windows multi-window');

      await browser.execute(() => {
        window.electronAPI?.setAlwaysOnTop?.(true);
      });
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      await clickMenuItemById('menu-file-options');
      await waitForWindowCount(2, 5000);

      await browser.switchToWindow(mainWindowHandle);
      const state = await getWindowAlwaysOnTopState();
      expect(state).toBe(true);

      E2ELogger.info('always-on-top-multi-window', 'Windows: Multi-window verified');
    });

    it('should work on macOS', async function () {
      if (!(await isMacOS())) {
        E2ELogger.info('always-on-top-multi-window', 'Skipping macOS-specific test');
        return;
      }

      E2ELogger.info('always-on-top-multi-window', 'Testing macOS multi-window');

      await browser.execute(() => {
        window.electronAPI?.setAlwaysOnTop?.(true);
      });
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      await clickMenuItemById('menu-file-options');
      await waitForWindowCount(2, 5000);

      await browser.switchToWindow(mainWindowHandle);
      const state = await getWindowAlwaysOnTopState();
      expect(state).toBe(true);

      E2ELogger.info('always-on-top-multi-window', 'macOS: Multi-window verified');
    });

    it('should work on Linux', async function () {
      if (!(await isLinux())) {
        E2ELogger.info('always-on-top-multi-window', 'Skipping Linux-specific test');
        return;
      }

      E2ELogger.info('always-on-top-multi-window', 'Testing Linux multi-window');

      await browser.execute(() => {
        window.electronAPI?.setAlwaysOnTop?.(true);
      });
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      await clickMenuItemById('menu-file-options');
      await waitForWindowCount(2, 5000);

      await browser.switchToWindow(mainWindowHandle);
      const state = await getWindowAlwaysOnTopState();
      expect(state).toBe(true);

      E2ELogger.info('always-on-top-multi-window', 'Linux: Multi-window verified');
    });
  });

  describe('About Window Interaction', () => {
    it('should maintain always-on-top when About window opens', async () => {
      E2ELogger.info('always-on-top-multi-window', 'Testing About window interaction');

      // Enable always-on-top
      await browser.execute(() => {
        window.electronAPI?.setAlwaysOnTop?.(true);
      });
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      const stateBeforeAbout = await getWindowAlwaysOnTopState();
      expect(stateBeforeAbout).toBe(true);

      // Open About window (Help -> About)
      await clickMenuItemById('menu-help-about');
      await waitForWindowCount(2, 5000);

      const handles = await browser.getWindowHandles();
      const aboutHandle = handles.find((h) => h !== mainWindowHandle) || handles[1];

      // Switch to About window
      await browser.switchToWindow(aboutHandle);
      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

      // Switch back to main to verify state
      await browser.switchToWindow(mainWindowHandle);
      const stateWithAboutOpen = await getWindowAlwaysOnTopState();
      expect(stateWithAboutOpen).toBe(true);

      E2ELogger.info(
        'always-on-top-multi-window',
        'Main window maintained always-on-top with About window open'
      );
    });

    it('should maintain always-on-top after closing About window', async () => {
      E2ELogger.info('always-on-top-multi-window', 'Testing About window close behavior');

      // Enable always-on-top
      await browser.execute(() => {
        window.electronAPI?.setAlwaysOnTop?.(true);
      });
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      // Open About window
      await clickMenuItemById('menu-help-about');
      await waitForWindowCount(2, 5000);

      const handles = await browser.getWindowHandles();
      const aboutHandle = handles.find((h) => h !== mainWindowHandle) || handles[1];

      // Switch to About and close it
      await browser.switchToWindow(aboutHandle);
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
      await closeCurrentWindow();
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      // Switch back to main
      await browser.switchToWindow(mainWindowHandle);
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      // Verify always-on-top persisted
      const stateAfterClose = await getWindowAlwaysOnTopState();
      expect(stateAfterClose).toBe(true);

      E2ELogger.info(
        'always-on-top-multi-window',
        'Always-on-top persisted after About window closed'
      );
    });
  });

  describe('Multiple Child Windows', () => {
    it('should maintain always-on-top with multiple windows open', async () => {
      E2ELogger.info('always-on-top-multi-window', 'Testing multiple child windows');

      // Enable always-on-top
      await browser.execute(() => {
        window.electronAPI?.setAlwaysOnTop?.(true);
      });
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      // Open Options window
      await clickMenuItemById('menu-file-options');
      await waitForWindowCount(2, 5000);

      // Open About window (will open as tab in Options or as new window)
      await browser.switchToWindow(mainWindowHandle);
      await browser.pause(E2E_TIMING.CLEANUP_PAUSE);
      await clickMenuItemById('menu-help-about');

      // Wait for possible third window
      await browser.pause(E2E_TIMING.MULTI_WINDOW_PAUSE);

      // Verify main window still has always-on-top
      await browser.switchToWindow(mainWindowHandle);
      const state = await getWindowAlwaysOnTopState();
      expect(state).toBe(true);

      E2ELogger.info(
        'always-on-top-multi-window',
        'Main window maintained always-on-top with multiple windows'
      );
    });
  });
});
