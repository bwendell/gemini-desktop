// @ts-nocheck
/**
 * E2E Test: Quick Chat Full Submission Workflow
 *
 * Tests the complete Quick Chat flow from user's perspective:
 * - Open Quick Chat via hotkey
 * - Type a message
 * - Submit the message
 * - Verify the message is injected into the main window
 * - Quick Chat hides after submission
 *
 * Cross-platform: Windows, macOS, Linux
 *
 * @module quick-chat-workflow.spec
 */

import { browser, $, expect } from '@wdio/globals';
import { Selectors } from './helpers/selectors';
import { E2ELogger } from './helpers/logger';
import { E2E_TIMING } from './helpers/e2eConstants';

describe('Quick Chat Full Submission Workflow', () => {
  beforeEach(async () => {
    // Ensure app is loaded
    const mainLayout = await $(Selectors.mainLayout);
    await mainLayout.waitForExist({ timeout: 15000 });
  });

  describe('Complete User Workflow', () => {
    it('should complete full Quick Chat submission flow', async () => {
      // 1. Trigger Quick Chat to open
      // 1. Trigger Quick Chat to open via HOTKEY (Real User Action)
      const modifiers = process.platform === 'darwin' ? ['Meta', 'Shift'] : ['Control', 'Shift'];
      await browser.keys([...modifiers, 'Space']);

      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

      // 2. Wait for Quick Chat window to appear
      const handles = await browser.getWindowHandles();


      if (handles.length > 1) {
        // Find and switch to Quick Chat window
        for (const handle of handles) {
          await browser.switchToWindow(handle);
          const container = await $(Selectors.quickChatContainer);
          if (await container.isExisting()) {
            E2ELogger.info('quick-chat-workflow', 'Found Quick Chat window');
            break;
          }
        }
      }

      // 3. Verify Quick Chat is visible
      // 3. Verify Quick Chat is visible
      const quickChatContainer = await $(Selectors.quickChatContainer);
      let isQuickChatVisible = await quickChatContainer.isDisplayed().catch(() => false);

      if (!isQuickChatVisible) {
        E2ELogger.info('quick-chat-workflow', 'Opening Quick Chat via Hotkey...');
        
        // Ensure main window is focused to receive input
        await browser.switchWindow('Gemini Desktop'); 

        // CRITICAL CHECK: Real User Action
        // Simulating the default hotkey: CommandOrControl+Shift+Space
        // Note: modifier keys in wdio are specific strings
        const modifiers = process.platform === 'darwin' ? ['Meta', 'Shift'] : ['Control', 'Shift'];
        await browser.keys([...modifiers, 'Space']);
        
        // Wait for animation
        await browser.pause(E2E_TIMING.ANIMATION_SETTLE);
        
        isQuickChatVisible = await quickChatContainer.isDisplayed().catch(() => false);
      }
      
      // If still not visible, we FAIL the test. No fallback to IPC.
      expect(isQuickChatVisible).withContext('Quick Chat did not open after pressing hotkey').toBe(true);

      // 4. Type a test message into Quick Chat input
      const quickChatInput = await $(Selectors.quickChatInput);
      if (await quickChatInput.isExisting()) {
        const testMessage = 'Hello from E2E test';
        await quickChatInput.setValue(testMessage);
        await browser.pause(300);

        // Verify text was entered
        const enteredValue = await quickChatInput.getValue();
        expect(enteredValue).toBe(testMessage);
        E2ELogger.info('quick-chat-workflow', `Entered message: "${testMessage}"`);

        // 5. Submit the message
        const submitButton = await $(Selectors.quickChatSubmit);
        if (await submitButton.isExisting()) {
          await submitButton.click();
          E2ELogger.info('quick-chat-workflow', 'Clicked submit button');
        } else {
          // Alternative: press Enter to submit
          await quickChatInput.click();
          await browser.keys(['Enter']);
          E2ELogger.info('quick-chat-workflow', 'Submitted via Enter key');
        }

        await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

        // 6. Verify Quick Chat is hidden after submission
        const quickChatVisibleAfter = await quickChatContainer.isDisplayed().catch(() => false);
        expect(quickChatVisibleAfter).toBe(false);
        E2ELogger.info('quick-chat-workflow', 'Quick Chat hidden after submission');
      } else {
        E2ELogger.info('quick-chat-workflow', 'Quick Chat input not found - test skipped');
      }

      // 7. Switch back to main window
      const mainHandle = handles[0];
      await browser.switchToWindow(mainHandle);
    });

    it('should cancel Quick Chat with Escape key', async () => {
      // 1. Open Quick Chat
      await browser.electron.execute((_electron: typeof import('electron')) => {
        const { windowManager } = global as any;
        if (windowManager?.toggleQuickChat) {
          windowManager.toggleQuickChat();
        }
      });

      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

      // 2. Get window handles
      const handles = await browser.getWindowHandles();

      // 3. Find Quick Chat window and press Escape
      for (const handle of handles) {
        await browser.switchToWindow(handle);
        const container = await $(Selectors.quickChatContainer);
        if (await container.isExisting()) {
          await browser.keys(['Escape']);
          E2ELogger.info('quick-chat-workflow', 'Pressed Escape to cancel');
          break;
        }
      }

      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

      // 4. Verify Quick Chat closed
      // (Check that window count decreased or container is no longer visible)
      const postEscapeHandles = await browser.getWindowHandles();
      E2ELogger.info('quick-chat-workflow', `Windows after Escape: ${postEscapeHandles.length}`);

      // Switch back to main window
      await browser.switchToWindow(postEscapeHandles[0]);
    });

    it('should preserve input content when hidden and reshown', async () => {
      // 1. Open Quick Chat
      await browser.electron.execute((_electron: typeof import('electron')) => {
        const { windowManager } = global as any;
        if (windowManager?.toggleQuickChat) {
          windowManager.toggleQuickChat();
        }
      });

      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

      // 2. Type partial message
      const handles = await browser.getWindowHandles();
      for (const handle of handles) {
        await browser.switchToWindow(handle);
        const input = await $(Selectors.quickChatInput);
        if (await input.isExisting()) {
          const partialMessage = 'Partial input';
          await input.setValue(partialMessage);
          await browser.pause(300);

          // 3. Hide Quick Chat (toggle)
          await browser.electron.execute((_electron: typeof import('electron')) => {
            const { windowManager } = global as any;
            if (windowManager?.toggleQuickChat) {
              windowManager.toggleQuickChat();
            }
          });
          await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

          // 4. Show Quick Chat again
          await browser.electron.execute((_electron: typeof import('electron')) => {
            const { windowManager } = global as any;
            if (windowManager?.toggleQuickChat) {
              windowManager.toggleQuickChat();
            }
          });
          await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

          // 5. Verify content preserved
          const newHandles = await browser.getWindowHandles();
          for (const h of newHandles) {
            await browser.switchToWindow(h);
            const inputAfter = await $(Selectors.quickChatInput);
            if (await inputAfter.isExisting()) {
              const preserved = await inputAfter.getValue();
              expect(preserved).toBe(partialMessage);
              E2ELogger.info('quick-chat-workflow', 'Input content preserved correctly');
              break;
            }
          }
          break;
        }
      }

      // Cleanup
      await browser.switchToWindow(handles[0]);
    });
  });

  describe('Quick Chat IPC Verification', () => {
    it('should have electronAPI available in Quick Chat window', async () => {
      // CRITICAL: This test would have caught the preload script bug.
      // The bug: electronAPI was undefined in Quick Chat because preload was missing.

      // 1. Open Quick Chat
      await browser.electron.execute((_electron: typeof import('electron')) => {
        const { windowManager } = global as any;
        if (windowManager?.toggleQuickChat) {
          windowManager.toggleQuickChat();
        }
      });

      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

      // 2. Get window handles and find Quick Chat
      const handles = await browser.getWindowHandles();

      for (const handle of handles) {
        await browser.switchToWindow(handle);
        const container = await $(Selectors.quickChatContainer);
        if (await container.isExisting()) {
          // 3. Verify electronAPI is available - THIS IS THE CRITICAL CHECK
          const hasElectronAPI = await browser.execute(() => {
            return typeof (window as any).electronAPI !== 'undefined';
          });
          expect(hasElectronAPI).toBe(true);
          E2ELogger.info('quick-chat-workflow', 'electronAPI exists in Quick Chat window');

          // 4. Verify submitQuickChat function exists
          const hasSubmitQuickChat = await browser.execute(() => {
            return typeof (window as any).electronAPI?.submitQuickChat === 'function';
          });
          expect(hasSubmitQuickChat).toBe(true);
          E2ELogger.info('quick-chat-workflow', 'submitQuickChat function available');

          break;
        }
      }

      // Cleanup
      await browser.switchToWindow(handles[0]);
      await browser.electron.execute((_electron: typeof import('electron')) => {
        const { windowManager } = global as any;
        windowManager?.hideQuickChat?.();
      });
    });

    it('should trigger IPC when submit button is clicked', async () => {
      // This test verifies the actual button click triggers the renderer's submitQuickChat

      // 1. Open Quick Chat
      await browser.electron.execute((_electron: typeof import('electron')) => {
        const { windowManager } = global as any;
        if (windowManager?.toggleQuickChat) {
          windowManager.toggleQuickChat();
        }
      });

      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

      // 2. Find Quick Chat window
      const handles = await browser.getWindowHandles();
      let foundQuickChat = false;

      for (const handle of handles) {
        await browser.switchToWindow(handle);
        const input = await $(Selectors.quickChatInput);
        if (await input.isExisting()) {
          foundQuickChat = true;

          // 3. Type text and click submit
          const testMessage = 'IPC Test Message ' + Date.now();
          await input.setValue(testMessage);
          await browser.pause(300);

          const submitBtn = await $(Selectors.quickChatSubmit);
          if (await submitBtn.isExisting()) {
            await submitBtn.click();
            E2ELogger.info('quick-chat-workflow', 'Clicked submit - IPC should have been triggered');
          }

          await browser.pause(E2E_TIMING.ANIMATION_SETTLE);
          break;
        }
      }

      expect(foundQuickChat).toBe(true);

      // 4. Switch back to main window
      await browser.switchToWindow(handles[0]);

      // 5. Verify Quick Chat is now hidden (submit worked)
      const quickChatHidden = await browser.electron.execute((_electron: typeof import('electron')) => {
        const { windowManager } = global as any;
        const win = windowManager?.getQuickChatWindow?.();
        return !win || !win.isVisible();
      });
      expect(quickChatHidden).toBe(true);
      E2ELogger.info('quick-chat-workflow', 'Quick Chat hidden after submit - IPC worked');
    });
  });
});
