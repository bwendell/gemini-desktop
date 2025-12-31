/**
 * E2E Test: Always On Top
 *
 * Consolidated tests for the "Always On Top" feature.
 * Tests all aspects of the feature including:
 * - Menu and hotkey toggle
 * - Menu-hotkey synchronization
 * - Z-order verification
 * - State operations (minimize, maximize, restore)
 * - Tray interaction
 * - Window resize and move
 * - Settings persistence
 * - Multi-window interactions
 * - Edge cases
 */

import { browser, expect } from '@wdio/globals';
import { waitForWindowCount, closeCurrentWindow } from './helpers/windowActions';
import { closeAllSecondaryWindows } from './helpers/WindowManagerHelper';
import { ensureSingleWindow } from './helpers/workflows';
import { MainWindowPage } from './pages/MainWindowPage';
import { OptionsPage } from './pages/OptionsPage';
import { E2ELogger } from './helpers/logger';
import { getPlatform, isMacOS, isWindows, isLinux, isLinuxCI } from './helpers/platform';
import { E2E_TIMING } from './helpers/e2eConstants';
import {
  getAlwaysOnTopState,
  getWindowAlwaysOnTopState,
  setAlwaysOnTop,
  toggleAlwaysOnTopViaMenu,
  pressAlwaysOnTopHotkey,
  resetAlwaysOnTopState,
  getModifierKey,
} from './helpers/alwaysOnTopActions';
import {
  isWindowMinimized,
  isWindowMaximized,
  isWindowFullScreen,
  isWindowVisible,
  minimizeWindow,
  maximizeWindow,
  restoreWindow,
  hideWindow,
  showWindow,
} from './helpers/windowStateActions';
import { readUserPreferences, UserPreferencesData } from './helpers/persistenceActions';

// ============================================================================
// Local Helper Functions
// ============================================================================

/**
 * Set fullscreen mode.
 */
async function setFullScreen(fullscreen: boolean): Promise<void> {
  await browser.electron.execute((electron, fs) => {
    const mainWindow = electron.BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.setFullScreen(fs);
    }
  }, fullscreen);
}

/**
 * Get current window bounds.
 */
async function getWindowBounds(): Promise<{ x: number; y: number; width: number; height: number }> {
  return browser.electron.execute((electron) => {
    const mainWindow = electron.BrowserWindow.getAllWindows()[0];
    if (!mainWindow) {
      return { x: 0, y: 0, width: 800, height: 600 };
    }
    const bounds = mainWindow.getBounds();
    return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
  });
}

/**
 * Set window bounds.
 */
async function setWindowBounds(bounds: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}): Promise<void> {
  await browser.electron.execute((electron, boundsParam) => {
    const mainWindow = electron.BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.setBounds(boundsParam);
    }
  }, bounds);
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Always On Top', () => {
  const mainWindow = new MainWindowPage();
  const optionsPage = new OptionsPage();

  let platform: string;
  let modifierKey: 'Meta' | 'Control';
  let mainWindowHandle: string;
  let originalBounds: { x: number; y: number; width: number; height: number };

  before(async () => {
    platform = await getPlatform();
    modifierKey = await getModifierKey();
    originalBounds = await getWindowBounds();
    const handles = await browser.getWindowHandles();
    mainWindowHandle = handles[0];
    E2ELogger.info('always-on-top', `Platform: ${platform}, Modifier: ${modifierKey}`);
  });

  afterEach(async () => {
    // Ensure window is visible and restored
    await showWindow();
    await restoreWindow();
    await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

    // Exit fullscreen if active
    const isFS = await isWindowFullScreen();
    if (isFS) {
      await setFullScreen(false);
      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);
    }

    // Close any extra windows safely (uses browser.closeWindow() instead of IPC)
    await closeAllSecondaryWindows(mainWindowHandle);

    // Reset always-on-top state
    await resetAlwaysOnTopState();
  });

  // ==========================================================================
  // Menu Toggle
  // ==========================================================================

  describe('Menu Toggle', () => {
    it('should have Always On Top menu item in View menu', async function () {
      if (await isMacOS()) {
        E2ELogger.info(
          'always-on-top',
          'macOS: Skipping menu item visual verification (native menu)'
        );
        return;
      }

      E2ELogger.info('always-on-top', 'Verifying menu item exists');

      await mainWindow.clickMenuById('menu-view-always-on-top');
      await browser.pause(E2E_TIMING.CLEANUP_PAUSE);
      E2ELogger.info('always-on-top', 'Menu item exists and is clickable');

      // Toggle back to original state
      await mainWindow.clickMenuById('menu-view-always-on-top');
      await browser.pause(E2E_TIMING.CLEANUP_PAUSE);
    });

    it('should toggle always on top state when menu item is clicked', async () => {
      E2ELogger.info('always-on-top', 'Testing menu toggle functionality');

      const initialState = await getAlwaysOnTopState();
      const wasEnabled = initialState.enabled;

      await toggleAlwaysOnTopViaMenu();

      const newState = await getAlwaysOnTopState();
      expect(newState.enabled).toBe(!wasEnabled);

      // Toggle back
      await toggleAlwaysOnTopViaMenu();

      const finalState = await getAlwaysOnTopState();
      expect(finalState.enabled).toBe(wasEnabled);
    });

    it('should toggle state multiple times correctly via menu', async () => {
      E2ELogger.info('always-on-top', 'Testing multiple toggle operations');

      const initialState = await getAlwaysOnTopState();
      const startEnabled = initialState.enabled;

      for (let i = 0; i < 3; i++) {
        await toggleAlwaysOnTopViaMenu(E2E_TIMING.CLEANUP_PAUSE);

        const expectedEnabled = i % 2 === 0 ? !startEnabled : startEnabled;
        const currentState = await getAlwaysOnTopState();
        expect(currentState.enabled).toBe(expectedEnabled);
      }

      // Toggle back to original
      await toggleAlwaysOnTopViaMenu(E2E_TIMING.CLEANUP_PAUSE);
    });
  });

  // ==========================================================================
  // Hotkey Toggle
  // ==========================================================================

  // NOTE: Skipped - WebDriver keys do not reliably trigger Electron Menu accelerators in this environment.
  // We verify the Feature via Menu clicks and the Registration via hotkey-toggle.spec.ts.
  describe.skip('Hotkey Toggle', () => {
    it('should toggle always-on-top when hotkey is pressed', async () => {
      E2ELogger.info('always-on-top', 'Testing basic hotkey toggle');

      const initialState = await getAlwaysOnTopState();
      const wasEnabled = initialState.enabled;

      await pressAlwaysOnTopHotkey();

      const newState = await getAlwaysOnTopState();
      expect(newState.enabled).toBe(!wasEnabled);

      // Toggle back
      await pressAlwaysOnTopHotkey();

      const finalState = await getAlwaysOnTopState();
      expect(finalState.enabled).toBe(wasEnabled);
    });

    it('should toggle state when hotkey is pressed multiple times', async () => {
      E2ELogger.info('always-on-top', 'Testing multiple hotkey presses');

      const initialState = await getAlwaysOnTopState();
      const startEnabled = initialState.enabled;

      for (let i = 0; i < 4; i++) {
        await pressAlwaysOnTopHotkey(250);

        const currentState = await getAlwaysOnTopState();
        const expectedEnabled = i % 2 === 0 ? !startEnabled : startEnabled;
        expect(currentState.enabled).toBe(expectedEnabled);
      }

      // After 4 toggles, should be back to start
      const finalState = await getAlwaysOnTopState();
      expect(finalState.enabled).toBe(startEnabled);
    });

    it.skip('should handle rapid hotkey presses without desync', async () => {
      E2ELogger.info('always-on-top', 'Testing rapid toggle stability');

      const initialState = await getAlwaysOnTopState();
      const startEnabled = initialState.enabled;

      // Rapidly press hotkey 5 times
      for (let i = 0; i < 5; i++) {
        await pressAlwaysOnTopHotkey(100);
      }

      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

      // 5 is odd, so final state should be opposite of start
      const finalState = await getAlwaysOnTopState();
      expect(finalState.enabled).toBe(!startEnabled);
    });
  });

  // ==========================================================================
  // Menu-Hotkey Synchronization
  // ==========================================================================

  // NOTE: Application hotkeys tested via focused window keys.
  describe.skip('Menu-Hotkey Synchronization', () => {
    it('should update state when toggled via hotkey', async () => {
      E2ELogger.info('always-on-top', 'Testing hotkey -> state sync');

      const initialState = await getAlwaysOnTopState();
      const wasEnabled = initialState.enabled;

      await pressAlwaysOnTopHotkey();

      const newState = await getAlwaysOnTopState();
      expect(newState.enabled).toBe(!wasEnabled);

      // Restore
      await pressAlwaysOnTopHotkey();
    });

    it('should update state when toggled via menu', async () => {
      E2ELogger.info('always-on-top', 'Testing menu -> state sync');

      const initialState = await getAlwaysOnTopState();
      const wasEnabled = initialState.enabled;

      await toggleAlwaysOnTopViaMenu();

      const newState = await getAlwaysOnTopState();
      expect(newState.enabled).toBe(!wasEnabled);

      // Restore
      await toggleAlwaysOnTopViaMenu();
    });

    it('should remain synced when alternating between menu and hotkey', async () => {
      E2ELogger.info('always-on-top', 'Testing bidirectional sync');

      const initialState = await getAlwaysOnTopState();
      const startEnabled = initialState.enabled;

      // 1. Toggle via hotkey
      await pressAlwaysOnTopHotkey();
      let state = await getAlwaysOnTopState();
      expect(state.enabled).toBe(!startEnabled);

      // 2. Toggle via menu
      await toggleAlwaysOnTopViaMenu();
      state = await getAlwaysOnTopState();
      expect(state.enabled).toBe(startEnabled);

      // 3. Toggle via hotkey again
      await pressAlwaysOnTopHotkey();
      state = await getAlwaysOnTopState();
      expect(state.enabled).toBe(!startEnabled);

      // 4. Toggle via menu to restore
      await toggleAlwaysOnTopViaMenu();
      state = await getAlwaysOnTopState();
      expect(state.enabled).toBe(startEnabled);
    });

    it.skip('should handle rapid alternation between input methods', async () => {
      E2ELogger.info('always-on-top', 'Testing rapid alternation');

      const initialState = await getAlwaysOnTopState();
      const startEnabled = initialState.enabled;

      // Rapidly alternate: hotkey, menu, hotkey, menu, hotkey
      await pressAlwaysOnTopHotkey(E2E_TIMING.CLEANUP_PAUSE);
      await toggleAlwaysOnTopViaMenu(E2E_TIMING.CLEANUP_PAUSE);
      await pressAlwaysOnTopHotkey(E2E_TIMING.CLEANUP_PAUSE);
      await toggleAlwaysOnTopViaMenu(E2E_TIMING.CLEANUP_PAUSE);
      await pressAlwaysOnTopHotkey();

      // After 5 toggles, should be opposite of start
      const finalState = await getAlwaysOnTopState();
      expect(finalState.enabled).toBe(!startEnabled);
    });
  });

  // ==========================================================================
  // Z-Order Verification
  // ==========================================================================

  describe('Z-Order Verification', () => {
    it('should report always-on-top as enabled when set', async () => {
      E2ELogger.info('always-on-top', 'Testing enabled state z-order');

      await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);

      // Verify via renderer API
      const rendererState = await getAlwaysOnTopState();
      expect(rendererState?.enabled).toBe(true);

      // Verify via main process BrowserWindow API
      const mainProcessState = await getWindowAlwaysOnTopState();
      expect(mainProcessState).toBe(true);
    });

    it('should report always-on-top as disabled when unset', async () => {
      E2ELogger.info('always-on-top', 'Testing disabled state z-order');

      await setAlwaysOnTop(false, E2E_TIMING.IPC_ROUND_TRIP);

      const rendererState = await getAlwaysOnTopState();
      expect(rendererState?.enabled).toBe(false);

      const mainProcessState = await getWindowAlwaysOnTopState();
      expect(mainProcessState).toBe(false);
    });

    it('should have renderer and main process states synchronized', async () => {
      E2ELogger.info('always-on-top', 'Testing state synchronization');

      // Test enabled
      await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);
      const rendererEnabled = await getAlwaysOnTopState();
      const mainEnabled = await getWindowAlwaysOnTopState();
      expect(rendererEnabled?.enabled).toBe(mainEnabled);

      // Test disabled
      await setAlwaysOnTop(false, E2E_TIMING.IPC_ROUND_TRIP);
      const rendererDisabled = await getAlwaysOnTopState();
      const mainDisabled = await getWindowAlwaysOnTopState();
      expect(rendererDisabled?.enabled).toBe(mainDisabled);
    });
  });

  // ==========================================================================
  // State Operations
  // ==========================================================================

  describe('State Operations', () => {
    describe('Minimize and Restore', () => {
      it('should maintain always-on-top after minimize/restore', async function () {
        // Skip on Linux CI - Xvfb doesn't support window minimize detection
        if (await isLinuxCI()) {
          E2ELogger.info(
            'always-on-top',
            'Skipping - Linux CI uses headless Xvfb without window manager'
          );
          this.skip();
        }
        E2ELogger.info('always-on-top', 'Testing minimize/restore persistence');

        await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);

        const stateBeforeMinimize = await getAlwaysOnTopState();
        expect(stateBeforeMinimize.enabled).toBe(true);

        await minimizeWindow();
        await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

        const minimized = await isWindowMinimized();
        expect(minimized).toBe(true);

        await restoreWindow();
        await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

        const stateAfterRestore = await getAlwaysOnTopState();
        expect(stateAfterRestore.enabled).toBe(true);
      });

      it('should maintain disabled state after minimize/restore', async () => {
        E2ELogger.info('always-on-top', 'Testing disabled state through minimize/restore');

        await setAlwaysOnTop(false, E2E_TIMING.IPC_ROUND_TRIP);

        await minimizeWindow();
        await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

        await restoreWindow();
        await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

        const stateAfterRestore = await getAlwaysOnTopState();
        expect(stateAfterRestore.enabled).toBe(false);
      });

      it('should maintain state through multiple minimize/restore cycles', async () => {
        E2ELogger.info('always-on-top', 'Testing multiple minimize/restore cycles');

        await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);

        for (let i = 0; i < 3; i++) {
          await minimizeWindow();
          await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

          await restoreWindow();
          await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

          const state = await getAlwaysOnTopState();
          expect(state.enabled).toBe(true);
        }
      });
    });

    describe('Maximize and Restore', () => {
      it('should maintain always-on-top after maximize/restore', async () => {
        E2ELogger.info('always-on-top', 'Testing maximize/restore persistence');

        await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);

        await maximizeWindow();
        await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

        const maximized = await isWindowMaximized();
        if (maximized) {
          const stateWhileMaximized = await getAlwaysOnTopState();
          expect(stateWhileMaximized.enabled).toBe(true);

          await restoreWindow();
          await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

          const stateAfterRestore = await getAlwaysOnTopState();
          expect(stateAfterRestore.enabled).toBe(true);
        }
      });
    });
  });

  // ==========================================================================
  // Tray Interaction
  // ==========================================================================

  describe('Tray Interaction', () => {
    it('should maintain always-on-top after hide/show', async () => {
      E2ELogger.info('always-on-top', 'Testing hide/show persistence');

      await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);

      await hideWindow();
      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

      const visible = await isWindowVisible();
      expect(visible).toBe(false);

      await showWindow();
      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

      const stateAfterShow = await getAlwaysOnTopState();
      expect(stateAfterShow.enabled).toBe(true);
    });

    it('should maintain disabled state after hide/show', async () => {
      E2ELogger.info('always-on-top', 'Testing disabled state through hide/show');

      await setAlwaysOnTop(false, E2E_TIMING.IPC_ROUND_TRIP);

      await hideWindow();
      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);
      await showWindow();
      await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

      const state = await getAlwaysOnTopState();
      expect(state.enabled).toBe(false);
    });

    it('should maintain always-on-top through multiple hide/show cycles', async () => {
      E2ELogger.info('always-on-top', 'Testing multiple hide/show cycles');

      await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);

      for (let i = 0; i < 3; i++) {
        await hideWindow();
        await browser.pause(E2E_TIMING.CYCLE_PAUSE);
        await showWindow();
        await browser.pause(E2E_TIMING.CYCLE_PAUSE);

        const state = await getAlwaysOnTopState();
        expect(state.enabled).toBe(true);
      }
    });
  });

  // ==========================================================================
  // Window Resize and Move
  // ==========================================================================

  describe('Window Resize and Move', () => {
    afterEach(async () => {
      // Restore original bounds
      if (originalBounds) {
        await setWindowBounds(originalBounds);
        await browser.pause(E2E_TIMING.CLEANUP_PAUSE);
      }
    });

    it('should maintain always-on-top after resizing window', async () => {
      E2ELogger.info('always-on-top', 'Testing resize persistence');

      await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);

      const currentBounds = await getWindowBounds();
      await setWindowBounds({
        width: currentBounds.width + 100,
        height: currentBounds.height + 100,
      });
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      const stateAfterResize = await getAlwaysOnTopState();
      expect(stateAfterResize.enabled).toBe(true);
    });

    it('should maintain always-on-top after moving window', async () => {
      E2ELogger.info('always-on-top', 'Testing move persistence');

      await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);

      const currentBounds = await getWindowBounds();
      await setWindowBounds({
        x: currentBounds.x + 50,
        y: currentBounds.y + 50,
      });
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      const stateAfterMove = await getAlwaysOnTopState();
      expect(stateAfterMove.enabled).toBe(true);
    });

    it('should maintain always-on-top through combined resize and move', async () => {
      E2ELogger.info('always-on-top', 'Testing combined resize and move');

      await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);

      const currentBounds = await getWindowBounds();
      await setWindowBounds({
        x: currentBounds.x + 30,
        y: currentBounds.y + 30,
        width: currentBounds.width + 80,
        height: currentBounds.height + 60,
      });
      await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

      const stateAfterBoth = await getAlwaysOnTopState();
      expect(stateAfterBoth.enabled).toBe(true);
    });
  });

  // ==========================================================================
  // Settings Persistence
  // ==========================================================================

  describe('Settings Persistence', () => {
    it('should save enabled state to settings file', async () => {
      E2ELogger.info('always-on-top', 'Testing persistence when enabling');

      await setAlwaysOnTop(true, E2E_TIMING.WINDOW_TRANSITION);

      const settings = await readUserPreferences();
      expect(settings).not.toBeNull();
      expect(settings?.alwaysOnTop).toBe(true);
    });

    it('should save disabled state to settings file', async () => {
      E2ELogger.info('always-on-top', 'Testing persistence when disabling');

      await setAlwaysOnTop(false, E2E_TIMING.WINDOW_TRANSITION);

      const settings = await readUserPreferences();
      expect(settings?.alwaysOnTop).toBe(false);
    });

    it('should update settings file when toggled multiple times', async () => {
      E2ELogger.info('always-on-top', 'Testing multiple toggle persistence');

      // Toggle ON
      await setAlwaysOnTop(true, E2E_TIMING.CYCLE_PAUSE);
      let settings = await readUserPreferences();
      expect(settings?.alwaysOnTop).toBe(true);

      // Toggle OFF
      await setAlwaysOnTop(false, E2E_TIMING.CYCLE_PAUSE);
      settings = await readUserPreferences();
      expect(settings?.alwaysOnTop).toBe(false);
    });

    it('should store alwaysOnTop as boolean in settings.json', async () => {
      E2ELogger.info('always-on-top', 'Validating settings file format');

      await setAlwaysOnTop(true, E2E_TIMING.WINDOW_TRANSITION);

      const settings = await readUserPreferences();
      expect(settings).not.toBeNull();
      expect(typeof settings?.alwaysOnTop).toBe('boolean');
    });

    it('should not corrupt other settings when updating alwaysOnTop', async () => {
      E2ELogger.info('always-on-top', 'Testing settings file integrity');

      const initialSettings = await readUserPreferences();
      const initialTheme = initialSettings?.theme;
      const initialHotkeys = initialSettings?.hotkeyBossKey;

      await setAlwaysOnTop(true, E2E_TIMING.WINDOW_TRANSITION);

      const newSettings = await readUserPreferences();
      expect(newSettings?.theme).toBe(initialTheme);
      expect(newSettings?.hotkeyBossKey).toBe(initialHotkeys);
    });
  });

  // ==========================================================================
  // Multi-Window Interactions
  // ==========================================================================

  describe('Multi-Window Interactions', () => {
    describe('Options Window', () => {
      it('should maintain always-on-top after opening Options window', async () => {
        E2ELogger.info('always-on-top', 'Testing Options window interaction');

        await setAlwaysOnTop(true);

        await mainWindow.openOptionsViaMenu();
        await waitForWindowCount(2, 5000);

        await browser.switchToWindow(mainWindowHandle);
        const state = await getAlwaysOnTopState();
        expect(state.enabled).toBe(true);
      });

      it('should maintain always-on-top after closing Options window', async () => {
        E2ELogger.info('always-on-top', 'Testing Options close behavior');

        await setAlwaysOnTop(true);

        await mainWindow.openOptionsViaMenu();
        await waitForWindowCount(2, 5000);

        const handles = await browser.getWindowHandles();
        const optionsHandle = handles.find((h) => h !== mainWindowHandle) || handles[1];

        await browser.switchToWindow(optionsHandle);
        await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
        await closeCurrentWindow();
        await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

        await browser.switchToWindow(mainWindowHandle);

        const state = await getAlwaysOnTopState();
        expect(state.enabled).toBe(true);
      });

      it('should toggle always-on-top while Options window is open', async () => {
        E2ELogger.info('always-on-top', 'Testing toggle with Options open');

        await mainWindow.openOptionsViaMenu();
        await waitForWindowCount(2, 5000);

        await browser.switchToWindow(mainWindowHandle);
        await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

        await setAlwaysOnTop(true);
        let state = await getAlwaysOnTopState();
        expect(state.enabled).toBe(true);

        await setAlwaysOnTop(false);
        state = await getAlwaysOnTopState();
        expect(state.enabled).toBe(false);
      });
    });

    describe('About Window', () => {
      it('should maintain always-on-top when About window opens', async () => {
        E2ELogger.info('always-on-top', 'Testing About window interaction');

        await setAlwaysOnTop(true);

        await mainWindow.openAboutViaMenu();
        await waitForWindowCount(2, 5000);

        await browser.switchToWindow(mainWindowHandle);
        const state = await getAlwaysOnTopState();
        expect(state.enabled).toBe(true);
      });

      it('should maintain always-on-top after closing About window', async () => {
        E2ELogger.info('always-on-top', 'Testing About window close behavior');

        await setAlwaysOnTop(true);

        await mainWindow.openAboutViaMenu();
        await waitForWindowCount(2, 5000);

        const handles = await browser.getWindowHandles();
        const aboutHandle = handles.find((h) => h !== mainWindowHandle) || handles[1];

        await browser.switchToWindow(aboutHandle);
        await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
        await closeCurrentWindow();
        await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

        await browser.switchToWindow(mainWindowHandle);

        const state = await getAlwaysOnTopState();
        expect(state.enabled).toBe(true);
      });
    });

    describe('Window Independence', () => {
      it('should have main window state independent of Options window', async () => {
        E2ELogger.info('always-on-top', 'Testing window independence');

        await setAlwaysOnTop(true);

        await mainWindow.openOptionsViaMenu();
        await waitForWindowCount(2, 5000);

        const handles = await browser.getWindowHandles();
        const optionsHandle = handles.find((h) => h !== mainWindowHandle) || handles[1];

        await browser.switchToWindow(optionsHandle);
        await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

        // Interact with Options window using Page Object
        await optionsPage.waitForLoad();
        if (await optionsPage.isThemeSelectorDisplayed()) {
          await optionsPage.selectTheme('dark');
        }

        await closeCurrentWindow();
        await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

        await browser.switchToWindow(mainWindowHandle);
        const state = await getAlwaysOnTopState();
        expect(state.enabled).toBe(true);
      });
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    // NOTE: macOS Dock minimization doesn't support window property changes while minimized.
    // Toggling alwaysOnTop while minimized works on Windows/Linux but not macOS.
    describe('Toggle During Minimize', () => {
      it('should toggle always-on-top while window is minimized', async function () {
        if (await isMacOS()) {
          E2ELogger.info(
            'always-on-top',
            'Skipping: macOS does not support alwaysOnTop changes while minimized'
          );
          this.skip();
        }
        // Skip on Linux CI - Xvfb doesn't support window minimize detection
        if (await isLinuxCI()) {
          E2ELogger.info(
            'always-on-top',
            'Skipping - Linux CI uses headless Xvfb without window manager'
          );
          this.skip();
        }
        E2ELogger.info('always-on-top', 'Testing toggle during minimize');

        await setAlwaysOnTop(false, E2E_TIMING.CLEANUP_PAUSE);

        await minimizeWindow();
        await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

        const minimized = await isWindowMinimized();
        expect(minimized).toBe(true);

        // Enable while minimized
        await setAlwaysOnTop(true);

        await restoreWindow();
        await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

        const state = await getWindowAlwaysOnTopState();
        expect(state).toBe(true);
      });

      it('should toggle off while minimized and persist after restore', async function () {
        if (await isMacOS()) {
          E2ELogger.info(
            'always-on-top',
            'Skipping: macOS does not support alwaysOnTop changes while minimized'
          );
          this.skip();
        }
        E2ELogger.info('always-on-top', 'Testing toggle off during minimize');

        await setAlwaysOnTop(true);

        await minimizeWindow();
        await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

        await setAlwaysOnTop(false);

        await restoreWindow();
        await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

        const state = await getWindowAlwaysOnTopState();
        expect(state).toBe(false);
      });
    });

    describe('Fullscreen Mode', () => {
      // Windows doesn't preserve alwaysOnTop state through fullscreen transitions.
      // This is a known platform limitation, not an application bug.
      it('should maintain always-on-top setting through fullscreen toggle', async function () {
        if (await isWindows()) {
          E2ELogger.info('always-on-top', 'Skipping: Windows loses alwaysOnTop through fullscreen');
          this.skip();
        }
        E2ELogger.info('always-on-top', 'Testing fullscreen mode interaction');

        await setAlwaysOnTop(true);

        await setFullScreen(true);
        await browser.pause(E2E_TIMING.MULTI_WINDOW_PAUSE);

        const isFS = await isWindowFullScreen();
        if (isFS) {
          await setFullScreen(false);
          await browser.pause(E2E_TIMING.MULTI_WINDOW_PAUSE);

          const state = await getWindowAlwaysOnTopState();
          expect(state).toBe(true);
        }
      });

      it('should allow toggling always-on-top while in fullscreen (macOS)', async function () {
        if (!(await isMacOS())) {
          return;
        }

        await setFullScreen(true);
        await browser.pause(E2E_TIMING.MULTI_WINDOW_PAUSE);

        const isFS = await isWindowFullScreen();
        if (!isFS) {
          return;
        }

        await setAlwaysOnTop(true);

        await setFullScreen(false);
        await browser.pause(E2E_TIMING.MULTI_WINDOW_PAUSE);

        const finalState = await getWindowAlwaysOnTopState();
        expect(finalState).toBe(true);
      });
    });
  });
});
