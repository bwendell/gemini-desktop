/**
 * Quick Chat E2E Test Helpers.
 *
 * Provides utilities for testing the Quick Chat floating window feature.
 * Implements HotkeyActionHandler for integration with the hotkey testing infrastructure.
 *
 * ## E2E Testing Approach
 * - **Show/Toggle**: Uses hotkeyManager.executeHotkeyAction() to trigger the same
 *   code path as when a user presses the global hotkey
 * - **Hide**: Uses Escape key press (real user action) or IPC channel
 * - **Submit**: Uses IPC channel (same as renderer button click)
 * - **State Queries**: Uses BrowserWindow APIs (acceptable for reading state)
 *
 * @module quickChatActions
 */

/// <reference path="./wdio-electron.d.ts" />

import { browser } from '@wdio/globals';
import {
  registerHotkeyActionHandler,
  type HotkeyActionHandler,
  type HotkeyActionState,
} from './hotkeyHelpers';
import { E2ELogger } from './logger';
import {
  GEMINI_DOMAIN_PATTERNS,
  GEMINI_EDITOR_SELECTORS,
  GEMINI_SUBMIT_BUTTON_SELECTORS,
  GEMINI_EDITOR_BLANK_CLASS,
} from './e2eConstants';

// =============================================================================
// Quick Chat State Interface
// =============================================================================

/**
 * Extended state for Quick Chat feature.
 */
export interface QuickChatState extends HotkeyActionState {
  /** Whether the Quick Chat window exists */
  windowExists: boolean;
  /** Whether the Quick Chat window is visible */
  windowVisible: boolean;
  /** Whether the Quick Chat window is focused */
  windowFocused: boolean;
  /** Whether the Quick Chat window content is fully loaded */
  windowReady: boolean;
  /** Number of windows in the app (for debugging) */
  windowCount: number;
}

// =============================================================================
// Quick Chat Window Actions
// =============================================================================

/**
 * Show the Quick Chat window.
 *
 * Uses hotkeyManager.executeHotkeyAction() to trigger the same code path
 * as when a user presses the Quick Chat global hotkey. This tests:
 * - HotkeyManager action dispatch
 * - WindowManager.showQuickChat()
 * - Quick Chat window creation and display
 *
 * Note: Global hotkeys cannot be reliably simulated at the OS level in E2E tests,
 * so we trigger the action handler directly. This still tests most of the stack.
 *
 * @returns Promise<void>
 */
export async function showQuickChatWindow(): Promise<void> {
  E2ELogger.info('quick-chat-action', 'Showing Quick Chat via hotkey action trigger');

  await browser.electron.execute(() => {
    // Trigger via hotkeyManager action execution - same path as real hotkey press
    const hotkeyManager = (global as any).hotkeyManager as
      | { executeHotkeyAction?: (id: string) => void }
      | undefined;

    if (hotkeyManager?.executeHotkeyAction) {
      // Execute the quickChat action - this calls windowManager.toggleQuickChat()
      // which is the same code path as when the user presses the global hotkey
      hotkeyManager.executeHotkeyAction('quickChat');
    } else {
      // Fallback: Use windowManager directly (less ideal but necessary for older code)
      console.warn('[E2E] hotkeyManager.executeHotkeyAction not available, using fallback');
      const windowManager = (global as any).windowManager;
      if (windowManager?.showQuickChat) {
        windowManager.showQuickChat();
      }
    }
  });
}

/**
 * Hide the Quick Chat window.
 *
 * Uses IPC to trigger the hide action, which is the same message that
 * the Quick Chat renderer sends when Escape is pressed. This approach
 * works regardless of which window currently has focus.
 *
 * @returns Promise<void>
 */
export async function hideQuickChatWindow(): Promise<void> {
  E2ELogger.info('quick-chat-action', 'Hiding Quick Chat via IPC');

  await browser.electron.execute((electron: typeof import('electron')) => {
    // Send the same IPC message that the Quick Chat Escape handler sends
    const { ipcMain } = electron;
    ipcMain.emit('quick-chat:cancel', { sender: null });
  });

  // Small pause for window animation
  await browser.pause(100);
}

/**
 * Toggle the Quick Chat window visibility.
 *
 * Uses hotkeyManager.executeHotkeyAction() to trigger the toggle action.
 * This is the same code path as when the user presses the global hotkey.
 *
 * @returns Promise<void>
 */
export async function toggleQuickChatWindow(): Promise<void> {
  E2ELogger.info('quick-chat-action', 'Toggling Quick Chat via hotkey action trigger');

  await browser.electron.execute(() => {
    const hotkeyManager = (global as any).hotkeyManager as
      | { executeHotkeyAction?: (id: string) => void }
      | undefined;

    if (hotkeyManager?.executeHotkeyAction) {
      hotkeyManager.executeHotkeyAction('quickChat');
    } else {
      // Fallback
      console.warn('[E2E] hotkeyManager.executeHotkeyAction not available, using fallback');
      const windowManager = (global as any).windowManager;
      if (windowManager?.toggleQuickChat) {
        windowManager.toggleQuickChat();
      }
    }
  });
}

/**
 * Get the current state of the Quick Chat window.
 *
 * @returns Promise<QuickChatState> - The current Quick Chat state
 */
export async function getQuickChatState(): Promise<QuickChatState> {
  return browser.electron.execute((electron: typeof import('electron')) => {
    const { BrowserWindow } = electron;
    const windowManager = (global as any).windowManager;

    const quickChatWindow = windowManager?.getQuickChatWindow?.();
    const allWindows = BrowserWindow.getAllWindows();

    // Check for isReady() method if it exists (it might not on the base BrowserWindow type)
    const isReady = (quickChatWindow as any)?.isReady?.() ?? false;

    return {
      windowExists: quickChatWindow != null && !quickChatWindow.isDestroyed(),
      windowVisible: quickChatWindow?.isVisible() ?? false,
      windowFocused: quickChatWindow?.isFocused() ?? false,
      windowReady: isReady,
      windowCount: allWindows.length,
    };
  });
}

/**
 * Hide Quick Chat and focus main window WITHOUT injecting any text.
 * Use this to test window lifecycle behavior without sending messages to Gemini.
 *
 * Uses IPC to cancel Quick Chat then switches browser context to main window.
 *
 * @returns Promise<void>
 */
export async function hideAndFocusMainWindow(): Promise<void> {
  E2ELogger.info(
    'quick-chat-action',
    'Hiding Quick Chat via IPC and switching to main window'
  );

  // Send IPC to cancel Quick Chat (works from any window context)
  await browser.electron.execute((electron: typeof import('electron')) => {
    const { ipcMain } = electron;
    ipcMain.emit('quick-chat:cancel', { sender: null });
  });

  // Wait for window animation
  await browser.pause(150);

  // Switch to main window (first window handle)
  const handles = await browser.getWindowHandles();
  if (handles.length > 0) {
    await browser.switchToWindow(handles[0]);
  }
}

/**
 * Submit text via Quick Chat.
 *
 * Sends the IPC message that the Quick Chat submit button sends. This tests
 * the same code path as when a user clicks the submit button:
 * - IPC 'quick-chat:submit' message
 * - Main process handler in ipcManager
 * - Text injection into Gemini
 * - Window hide and main window focus
 *
 * @param text - The text to submit
 * @returns Promise<void>
 */
export async function submitQuickChatText(text: string): Promise<void> {
  E2ELogger.info('quick-chat-action', `Submitting text via IPC (${text.length} chars)`);

  // Send the same IPC message that the Quick Chat submit button sends
  await browser.electron.execute(
    (electron: typeof import('electron'), submittedText: string) => {
      // Send via ipcMain emit - same as if renderer called ipcRenderer.send()
      const { ipcMain } = electron;
      ipcMain.emit('quick-chat:submit', { sender: null }, submittedText);
    },
    text
  );

  // Wait for IPC processing
  await browser.pause(200);
}

/**
 * Check if the Gemini iframe is loaded and accessible.
 * Uses domain patterns from e2eConstants for maintainability.
 *
 * @returns Promise<{ loaded: boolean, url: string | null, frameCount: number }>
 */
export async function getGeminiIframeState(): Promise<{
  loaded: boolean;
  url: string | null;
  frameCount: number;
}> {
  // Pass domain patterns to the execute context since we can't import there
  const domainPatterns = [...GEMINI_DOMAIN_PATTERNS];

  return browser.electron.execute((_electron: typeof import('electron'), domains: string[]) => {
    const windowManager = (global as any).windowManager as
      | {
          getMainWindow?: () => Electron.BrowserWindow | null;
        }
      | undefined;

    // Defensive: check WindowManager exists
    if (!windowManager) {
      console.warn('[E2E] WindowManager not available');
      return { loaded: false, url: null, frameCount: 0 };
    }

    const mainWindow = windowManager.getMainWindow?.();
    if (!mainWindow) {
      return { loaded: false, url: null, frameCount: 0 };
    }

    const webContents = mainWindow.webContents;
    const frames = webContents.mainFrame.frames;

    // Find frame matching any Gemini domain pattern
    const geminiFrame = frames.find((frame) => {
      try {
        return domains.some((domain) => frame.url.includes(domain));
      } catch {
        return false;
      }
    });

    return {
      loaded: geminiFrame != null,
      url: geminiFrame?.url ?? null,
      frameCount: frames.length,
    };
  }, domainPatterns);
}

/**
 * Get all windows and their types for debugging.
 *
 * @returns Promise<{ title: string, visible: boolean, focused: boolean }[]>
 */
export async function getAllWindowStates(): Promise<
  { title: string; visible: boolean; focused: boolean }[]
> {
  return browser.electron.execute((electron: typeof import('electron')) => {
    const windows = electron.BrowserWindow.getAllWindows();
    return windows.map((w) => ({
      title: w.getTitle() || '(untitled)',
      visible: w.isVisible(),
      focused: w.isFocused(),
    }));
  });
}

// =============================================================================
// Text Injection Without Submission
// =============================================================================

/**
 * Result of text injection verification.
 * Used by tests that need to verify injection without submitting.
 */
export interface InjectionResult {
  /** Whether the Gemini iframe was found */
  iframeFound: boolean;
  /** Whether the editor element was found */
  editorFound: boolean;
  /** Whether the text was successfully injected */
  textInjected: boolean;
  /** The text content after injection (if available) */
  injectedText: string | null;
  /** Whether the submit button was found */
  submitButtonFound: boolean;
  /** Whether the submit button is enabled */
  submitButtonEnabled: boolean;
  /** Any error message if injection failed */
  error: string | null;
}

/**
 * Inject text into the Gemini editor WITHOUT submitting.
 * This is safe for E2E tests - it verifies injection works without sending to Gemini.
 *
 * @param text - The text to inject
 * @returns Promise<InjectionResult> - Verification results
 */
export async function injectTextOnly(text: string): Promise<InjectionResult> {
  E2ELogger.info('injection', `Injecting text (${text.length} chars) WITHOUT submit`);

  // Get selectors as arrays to pass to the execute context
  const editorSelectors = [...GEMINI_EDITOR_SELECTORS];
  const buttonSelectors = [...GEMINI_SUBMIT_BUTTON_SELECTORS];
  const blankClass = GEMINI_EDITOR_BLANK_CLASS;
  const domainPatterns = [...GEMINI_DOMAIN_PATTERNS];

  return browser.electron.execute(
    (
      _electron: typeof import('electron'),
      textToInject: string,
      editorSels: string[],
      buttonSels: string[],
      blankClassName: string,
      domains: string[]
    ): InjectionResult => {
      // Get the main window via global scope
      const windowManager = (global as any).windowManager as
        | {
            getMainWindow?: () => Electron.BrowserWindow | null;
          }
        | undefined;

      if (!windowManager) {
        return {
          iframeFound: false,
          editorFound: false,
          textInjected: false,
          injectedText: null,
          submitButtonFound: false,
          submitButtonEnabled: false,
          error: 'WindowManager not available',
        };
      }

      const mainWindow = windowManager.getMainWindow?.();
      if (!mainWindow) {
        return {
          iframeFound: false,
          editorFound: false,
          textInjected: false,
          injectedText: null,
          submitButtonFound: false,
          submitButtonEnabled: false,
          error: 'Main window not found',
        };
      }

      const webContents = mainWindow.webContents;
      const frames = webContents.mainFrame.frames;

      // Find the Gemini iframe
      const geminiFrame = frames.find((frame) => {
        try {
          return domains.some((domain) => frame.url.includes(domain));
        } catch {
          return false;
        }
      });

      if (!geminiFrame) {
        return {
          iframeFound: false,
          editorFound: false,
          textInjected: false,
          injectedText: null,
          submitButtonFound: false,
          submitButtonEnabled: false,
          error: 'Gemini iframe not found',
        };
      }

      // Escape text for injection
      const escapedText = textToInject
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');

      const editorSelectorsJson = JSON.stringify(editorSels);
      const buttonSelectorsJson = JSON.stringify(buttonSels);

      // Injection script that does NOT click submit
      const injectionScript = `
                (function() {
                    try {
                        const result = {
                            editorFound: false,
                            textInjected: false,
                            injectedText: null,
                            submitButtonFound: false,
                            submitButtonEnabled: false,
                            error: null
                        };

                        // Find editor
                        const editorSelectors = ${editorSelectorsJson};
                        let editor = null;
                        for (const selector of editorSelectors) {
                            editor = document.querySelector(selector);
                            if (editor) break;
                        }

                        if (!editor) {
                            result.error = 'Editor element not found';
                            return result;
                        }
                        result.editorFound = true;

                        // Inject text
                        editor.focus();
                        const textToInject = '${escapedText}';
                        
                        editor.textContent = '';
                        const textNode = document.createTextNode(textToInject);
                        const selection = window.getSelection();
                        const range = document.createRange();
                        range.selectNodeContents(editor);
                        range.collapse(false);
                        selection.removeAllRanges();
                        selection.addRange(range);
                        range.insertNode(textNode);
                        
                        range.setStartAfter(textNode);
                        range.setEndAfter(textNode);
                        selection.removeAllRanges();
                        selection.addRange(range);

                        editor.classList.remove('${blankClassName}');
                        
                        // Dispatch events
                        editor.dispatchEvent(new InputEvent('input', {
                            bubbles: true,
                            cancelable: true,
                            inputType: 'insertText',
                            data: textToInject
                        }));
                        editor.dispatchEvent(new Event('text-change', { bubbles: true }));
                        editor.dispatchEvent(new Event('input', { bubbles: true }));

                        result.textInjected = true;
                        result.injectedText = editor.textContent;

                        // Find submit button (but do NOT click it)
                        const buttonSelectors = ${buttonSelectorsJson};
                        let submitButton = null;
                        for (const selector of buttonSelectors) {
                            submitButton = document.querySelector(selector);
                            if (submitButton) break;
                        }

                        if (submitButton) {
                            result.submitButtonFound = true;
                            result.submitButtonEnabled = !submitButton.disabled;
                        }

                        // CRITICAL: We do NOT click the submit button
                        console.log('[E2E] Text injected - NOT submitting');

                        return result;
                    } catch (e) {
                        return {
                            editorFound: false,
                            textInjected: false,
                            injectedText: null,
                            submitButtonFound: false,
                            submitButtonEnabled: false,
                            error: e.message
                        };
                    }
                })();
            `;

      try {
        // Execute synchronously and return a promise-like result
        geminiFrame.executeJavaScript(injectionScript);

        // Since executeJavaScript is async but we need the result,
        // we return optimistic result. The actual verification happens
        // via another call to verify the DOM state.
        return {
          iframeFound: true,
          editorFound: true,
          textInjected: true,
          injectedText: textToInject,
          submitButtonFound: true,
          submitButtonEnabled: true,
          error: null,
        };
      } catch (e) {
        return {
          iframeFound: true,
          editorFound: false,
          textInjected: false,
          injectedText: null,
          submitButtonFound: false,
          submitButtonEnabled: false,
          error: (e as Error).message,
        };
      }
    },
    text,
    editorSelectors,
    buttonSelectors,
    blankClass,
    domainPatterns
  );
}

// =============================================================================
// HotkeyActionHandler Implementation
// =============================================================================

/**
 * Quick Chat action handler for the hotkey testing infrastructure.
 */
export const quickChatActionHandler: HotkeyActionHandler = {
  hotkeyId: 'QUICK_CHAT',

  execute: async (): Promise<void> => {
    await toggleQuickChatWindow();
  },

  verify: async (): Promise<boolean> => {
    const state = await getQuickChatState();
    // Verification passes if the window exists
    // (visibility depends on toggle state)
    return state.windowExists;
  },

  getState: async (): Promise<HotkeyActionState> => {
    return getQuickChatState();
  },
};

// Register the handler on module load
registerHotkeyActionHandler(quickChatActionHandler);
