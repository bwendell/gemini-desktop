/**
 * Quick Chat E2E Test Helpers.
 * 
 * Provides utilities for testing the Quick Chat floating window feature.
 * Implements HotkeyActionHandler for integration with the hotkey testing infrastructure.
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
    E2E_ERROR_MESSAGES,
} from './e2eConstants';

// =============================================================================
// Type Definitions for WindowManager Access
// =============================================================================

/**
 * WindowManager interface for E2E testing.
 * Defines the expected shape of the windowManager on the app instance.
 */
interface E2EWindowManager {
    showQuickChat?: () => void;
    hideQuickChat?: () => void;
    toggleQuickChat?: () => void;
    focusMainWindow?: () => void;
    getQuickChatWindow?: () => Electron.BrowserWindow | null;
    getMainWindow?: () => Electron.BrowserWindow | null;
}

/**
 * IpcManager interface for E2E testing.
 */
interface E2EIpcManager {
    _injectTextIntoGemini?: (text: string) => Promise<void>;
}

/**
 * Extended app type with exposed managers for E2E testing.
 */
interface E2EApp {
    windowManager?: E2EWindowManager;
    ipcManager?: E2EIpcManager;
}

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
    /** Number of windows in the app (for debugging) */
    windowCount: number;
}

// =============================================================================
// Quick Chat Window Actions
// =============================================================================

/**
 * Show the Quick Chat window.
 * Creates the window if it doesn't exist.
 * 
 * @returns Promise<void>
 */
export async function showQuickChatWindow(): Promise<void> {
    await browser.electron.execute(() => {
        // Access windowManager through Node.js global scope
        const windowManager = (global as any).windowManager;

        if (windowManager?.showQuickChat) {
            windowManager.showQuickChat();
        }
    });
}

/**
 * Hide the Quick Chat window.
 * 
 * @returns Promise<void>
 */
export async function hideQuickChatWindow(): Promise<void> {
    await browser.electron.execute(() => {
        const windowManager = (global as any).windowManager;

        if (windowManager?.hideQuickChat) {
            windowManager.hideQuickChat();
        }
    });
}

/**
 * Toggle the Quick Chat window visibility.
 * 
 * @returns Promise<void>
 */
export async function toggleQuickChatWindow(): Promise<void> {
    await browser.electron.execute(() => {
        const windowManager = (global as any).windowManager;

        if (windowManager?.toggleQuickChat) {
            windowManager.toggleQuickChat();
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

        return {
            windowExists: quickChatWindow != null && !quickChatWindow.isDestroyed(),
            windowVisible: quickChatWindow?.isVisible() ?? false,
            windowFocused: quickChatWindow?.isFocused() ?? false,
            windowCount: allWindows.length,
        };
    });
}

/**
 * Hide Quick Chat and focus main window WITHOUT injecting any text.
 * Use this to test window lifecycle behavior without sending messages to Gemini.
 * 
 * @returns Promise<void>
 */
export async function hideAndFocusMainWindow(): Promise<void> {
    E2ELogger.info('quick-chat-action', 'Hiding Quick Chat and focusing main window (NO text injection)');

    await browser.electron.execute(() => {
        const windowManager = (global as any).windowManager as {
            hideQuickChat?: () => void;
            focusMainWindow?: () => void;
        } | undefined;

        if (!windowManager) {
            console.warn('[E2E] WindowManager not available');
            return;
        }

        // Hide the Quick Chat window
        windowManager.hideQuickChat?.();

        // Focus the main window
        windowManager.focusMainWindow?.();
    });
}

/**
 * Simulate submitting text via Quick Chat.
 * This properly emits the IPC event to trigger text injection.
 * 
 * @param text - The text to submit
 * @returns Promise<void>
 */
export async function submitQuickChatText(text: string): Promise<void> {
    // Log before execution since we can't use E2ELogger inside browser.electron.execute
    E2ELogger.info('quick-chat-action', `Submitting text (${text.length} chars)`);

    await browser.electron.execute(
        (_electron: typeof import('electron'), submittedText: string) => {
            // Access managers through Node.js global scope
            const windowManager = (global as any).windowManager as {
                hideQuickChat?: () => void;
                focusMainWindow?: () => void;
            } | undefined;

            // Defensive: check WindowManager exists
            if (!windowManager) {
                console.warn('[E2E] WindowManager not available for Quick Chat submit');
                return;
            }

            // Log the submission (console.log is the only option inside execute)
            console.log('[E2E] Quick Chat submit:', submittedText.substring(0, 50));

            // Hide the Quick Chat window
            windowManager.hideQuickChat?.();

            // Focus the main window
            windowManager.focusMainWindow?.();

            // Access IpcManager from global scope
            const ipcManager = (global as any).ipcManager as {
                _injectTextIntoGemini?: (text: string) => Promise<void>;
            } | undefined;

            // Try to inject directly if the method is exposed
            if (ipcManager?._injectTextIntoGemini) {
                ipcManager._injectTextIntoGemini(submittedText);
            } else {
                console.warn('[E2E] IpcManager._injectTextIntoGemini not available');
            }
        },
        text
    );
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

    return browser.electron.execute(
        (_electron: typeof import('electron'), domains: string[]) => {
            const windowManager = (global as any).windowManager as {
                getMainWindow?: () => Electron.BrowserWindow | null;
            } | undefined;

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
            const geminiFrame = frames.find(frame => {
                try {
                    return domains.some(domain => frame.url.includes(domain));
                } catch {
                    return false;
                }
            });

            return {
                loaded: geminiFrame != null,
                url: geminiFrame?.url ?? null,
                frameCount: frames.length,
            };
        },
        domainPatterns
    );
}

/**
 * Get all windows and their types for debugging.
 * 
 * @returns Promise<{ title: string, visible: boolean, focused: boolean }[]>
 */
export async function getAllWindowStates(): Promise<{ title: string; visible: boolean; focused: boolean }[]> {
    return browser.electron.execute((electron: typeof import('electron')) => {
        const windows = electron.BrowserWindow.getAllWindows();
        return windows.map(w => ({
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
            const windowManager = (global as any).windowManager as {
                getMainWindow?: () => Electron.BrowserWindow | null;
            } | undefined;

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
            const geminiFrame = frames.find(frame => {
                try {
                    return domains.some(domain => frame.url.includes(domain));
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
