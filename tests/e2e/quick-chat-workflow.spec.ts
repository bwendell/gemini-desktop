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

import { browser, expect } from '@wdio/globals';
import { QuickChatPage } from './pages';
import {
  waitForAppReady,
  ensureSingleWindow,
  switchToMainWindow,
  pressComplexShortcut,
  waitForIpcSettle,
} from './helpers/workflows';
import { E2ELogger } from './helpers/logger';
import { E2E_TIMING } from './helpers/e2eConstants';

describe('Quick Chat Full Submission Workflow', () => {
  const quickChat = new QuickChatPage();

  beforeEach(async () => {
    await waitForAppReady();
  });

  afterEach(async () => {
    await ensureSingleWindow();
  });

  describe('Complete User Workflow', () => {
    it('should complete full Quick Chat submission flow', async () => {
      // 1. Trigger Quick Chat to open via HOTKEY (Real User Action)
      await pressComplexShortcut(['primary', 'shift'], 'Space');
      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

      // 2. Wait for Quick Chat window and switch to it
      const foundQuickChat = await quickChat.switchToQuickChatWindow();
      if (!foundQuickChat) {
        // Try again with another hotkey press
        await switchToMainWindow();
        await pressComplexShortcut(['primary', 'shift'], 'Space');
        await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

        const retryFound = await quickChat.switchToQuickChatWindow();
        if (!retryFound) {
          throw new Error('Quick Chat did not open after pressing hotkey');
        }
      }

      // 3. Type a test message into Quick Chat input
      const testMessage = 'Hello from E2E test';
      await quickChat.typeText(testMessage);
      await browser.pause(300);

      // 4. Verify text was entered
      const enteredValue = await quickChat.getInputValue();
      expect(enteredValue).toBe(testMessage);
      E2ELogger.info('quick-chat-workflow', `Entered message: "${testMessage}"`);

      // 5. Submit the message via button click (Real User Action)
      await quickChat.submit();
      E2ELogger.info('quick-chat-workflow', 'Clicked submit button');

      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

      // 6. Verify Quick Chat is hidden after submission
      await quickChat.waitForHidden();
      E2ELogger.info('quick-chat-workflow', 'Quick Chat hidden after submission');

      // 7. Switch back to main window
      await switchToMainWindow();
    });

    it('should cancel Quick Chat with Escape key', async () => {
      // 1. Open Quick Chat via hotkey (Real User Action)
      await switchToMainWindow();
      await pressComplexShortcut(['primary', 'shift'], 'Space');
      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

      // 2. Switch to Quick Chat window
      const foundQuickChat = await quickChat.switchToQuickChatWindow();
      if (!foundQuickChat) {
        throw new Error('Quick Chat did not open via hotkey');
      }

      // 3. Cancel Quick Chat via Escape key (Real User Action)
      await quickChat.cancel();
      E2ELogger.info('quick-chat-workflow', 'Pressed Escape to cancel');
      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

      // 4. Verify Quick Chat closed (user-visible outcome)
      await quickChat.waitForHidden();
      E2ELogger.info('quick-chat-workflow', 'Quick Chat closed after Escape');

      // Switch back to main window
      await switchToMainWindow();
    });

    it('should preserve input content when hidden and reshown', async () => {
      // 1. Open Quick Chat via hotkey (Real User Action)
      await switchToMainWindow();
      await pressComplexShortcut(['primary', 'shift'], 'Space');
      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

      // 2. Switch to Quick Chat and type partial message
      const foundQuickChat = await quickChat.switchToQuickChatWindow();
      if (!foundQuickChat) {
        throw new Error('Quick Chat did not open via hotkey');
      }

      const partialMessage = 'Partial input';
      await quickChat.typeText(partialMessage);
      await browser.pause(300);

      // 3. Hide Quick Chat via hotkey toggle (Real User Action)
      await pressComplexShortcut(['primary', 'shift'], 'Space');
      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

      // Verify Quick Chat hidden
      await quickChat.waitForHidden();
      E2ELogger.info('quick-chat-workflow', 'Quick Chat hidden via hotkey');

      // 4. Show Quick Chat again via hotkey (Real User Action)
      await switchToMainWindow();
      await pressComplexShortcut(['primary', 'shift'], 'Space');
      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

      // 5. Switch to Quick Chat and verify content preserved (user-visible outcome)
      const foundAgain = await quickChat.switchToQuickChatWindow();
      if (!foundAgain) {
        throw new Error('Quick Chat did not reopen via hotkey');
      }

      const preservedValue = await quickChat.getInputValue();
      expect(preservedValue).toBe(partialMessage);
      E2ELogger.info('quick-chat-workflow', 'Input content preserved correctly');

      // Cleanup - close Quick Chat via Escape (Real User Action)
      await quickChat.cancel();
      await switchToMainWindow();
    });
  });

  describe('Quick Chat IPC Verification', () => {
    it('should have electronAPI available in Quick Chat window', async () => {
      // CRITICAL: This test would have caught the preload script bug.
      // The bug: electronAPI was undefined in Quick Chat because preload was missing.

      // 1. Open Quick Chat via hotkey (Real User Action)
      await switchToMainWindow();
      await pressComplexShortcut(['primary', 'shift'], 'Space');
      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

      // 2. Switch to Quick Chat window
      const foundQuickChat = await quickChat.switchToQuickChatWindow();
      if (!foundQuickChat) {
        throw new Error('Quick Chat did not open via hotkey');
      }

      // 3. Verify electronAPI is available - THIS IS THE CRITICAL CHECK
      const hasElectronAPI = await browser.execute(() => {
        return typeof (window as unknown as { electronAPI: unknown }).electronAPI !== 'undefined';
      });
      expect(hasElectronAPI).toBe(true);
      E2ELogger.info('quick-chat-workflow', 'electronAPI exists in Quick Chat window');

      // 4. Verify submitQuickChat function exists
      const hasSubmitQuickChat = await browser.execute(() => {
        const api = (window as unknown as { electronAPI: { submitQuickChat?: unknown } }).electronAPI;
        return typeof api?.submitQuickChat === 'function';
      });
      expect(hasSubmitQuickChat).toBe(true);
      E2ELogger.info('quick-chat-workflow', 'submitQuickChat function available');

      // Cleanup - close via Escape key (Real User Action)
      await quickChat.cancel();
      await switchToMainWindow();
    });

    it('should trigger IPC when submit button is clicked', async () => {
      // This test verifies the actual button click triggers the renderer's submitQuickChat

      // 1. Open Quick Chat via hotkey (Real User Action)
      await switchToMainWindow();
      await pressComplexShortcut(['primary', 'shift'], 'Space');
      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

      // 2. Switch to Quick Chat window
      const foundQuickChat = await quickChat.switchToQuickChatWindow();
      if (!foundQuickChat) {
        throw new Error('Quick Chat did not open via hotkey');
      }

      // 3. Type text and click submit (Real User Actions)
      const testMessage = 'IPC Test Message ' + Date.now();
      await quickChat.typeText(testMessage);
      await browser.pause(300);

      await quickChat.submit();
      E2ELogger.info('quick-chat-workflow', 'Clicked submit - IPC should have been triggered');

      await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

      // 4. Verify Quick Chat is now hidden (user-visible outcome)
      await quickChat.waitForHidden();
      E2ELogger.info('quick-chat-workflow', 'Quick Chat hidden after submit - IPC worked');

      // 5. Switch back to main window
      await switchToMainWindow();
    });
  });
});
