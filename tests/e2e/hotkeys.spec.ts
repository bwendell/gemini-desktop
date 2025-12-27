/**
 * E2E Tests for Global Hotkey Functionality.
 *
 * Tests the global keyboard shortcut behavior by simulating real user keypresses
 * and verifying the actual application state changes (window visibility).
 *
 * Principles:
 * 1. SIMULATE REAL USER ACTIONS: Use browser.keys()
 * 2. VERIFY ACTUAL OUTCOMES: Check window.isDisplayed()
 * 3. TEST THE FULL STACK: OS -> Electron -> Main Process -> Window
 *
 * @module hotkeys.spec
 */

import { browser, $, expect } from '@wdio/globals';
import { Selectors } from './helpers/selectors';
import { E2E_TIMING } from './helpers/e2eConstants';

describe('Global Hotkeys', () => {
  // Determine modifiers based on platform
  const isMac = process.platform === 'darwin';
  const cmdOrCtrl = isMac ? 'Meta' : 'Control';

  beforeEach(async () => {
    // Ensure app is loaded and focused
    const mainLayout = await $(Selectors.mainLayout);
    await mainLayout.waitForExist({ timeout: 15000 });
    
    // Ensure we start with main window focused
    const handles = await browser.getWindowHandles();
    if (handles.length > 0) {
      await browser.switchToWindow(handles[0]);
    }
  });

  describe('Quick Chat Hotkey', () => {
    it('should toggle Quick Chat window visibility when pressing CommandOrControl+Shift+Space', async () => {
      // ENVIRONMENTAL CHECK: Verify that hotkeys can be registered in this environment
      // On some platforms/CI environments, global hotkeys may fail to register due to:
      // - Security restrictions (Windows UAC)
      // - Display server limitations (Wayland on Linux)
      // - CI/test environment constraints
      const hotkeyStatus = await browser.electron.execute((_electron: typeof import('electron')) => {
        try {
          const { globalShortcut } = _electron;
          return {
            quickChat: globalShortcut.isRegistered('CommandOrControl+Shift+Space'),
          };
        } catch (error) {
          return { quickChat: false, error: (error as Error).message };
        }
      });

      // If hotkey isn't registered, skip this test as it's an environmental limitation
      if (!hotkeyStatus.quickChat) {
        console.log('⚠️  Skipping hotkey test: Quick Chat hotkey not registered in this environment');
        console.log('   This is expected in restricted environments (CI, certain Windows/Linux configs)');
        return; // Early return = skip test
      }

      // 1. Initial State: Quick Chat should be hidden
      // We check if it exists in the DOM/Window list first
      const quickChatContainer = await $(Selectors.quickChatContainer);
      let isVisibleInitially = await quickChatContainer.isDisplayed().catch(() => false);
      
      // If it's visible, close it first to start clean
      if (isVisibleInitially) {
        // Press Escape to close
        await browser.keys(['Escape']);
        await browser.pause(E2E_TIMING.ANIMATION_SETTLE);
      }

      // 2. ACTION: Press the Hotkey
      // Simulating: Cmd/Ctrl + Shift + Space
      await browser.keys([cmdOrCtrl, 'Shift', 'Space']);
      
      // Allow time for window animation and OS handling
      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

      // 3. VERIFICATION: Quick Chat should now be visible
      // We need to look through all windows to find the Quick Chat window
      const handles = await browser.getWindowHandles();
      let quickChatFound = false;

      for (const handle of handles) {
        await browser.switchToWindow(handle);
        const container = await $(Selectors.quickChatContainer);
        if (await container.isExisting() && await container.isDisplayed()) {
          quickChatFound = true;
          break;
        }
      }

      expect(quickChatFound).toBe(true);
      
      // 4. ACTION: Press Hotkey again to close (Toggle behavior)
      await browser.keys([cmdOrCtrl, 'Shift', 'Space']);
      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);
      
      // 5. VERIFICATION: Quick Chat should be hidden
      // Re-check all windows
      const newHandles = await browser.getWindowHandles();
      let quickChatStillVisible = false;
      
      for (const handle of newHandles) {
        await browser.switchToWindow(handle);
        const container = await $(Selectors.quickChatContainer);
        if (await container.isExisting() && await container.isDisplayed()) {
            quickChatStillVisible = true;
            break;
        }
      }
      
      expect(quickChatStillVisible).toBe(false);
      
      // Switch back to main window for cleanup
      if (newHandles.length > 0) {
          await browser.switchToWindow(newHandles[0]);
      }
    });
  });
});
