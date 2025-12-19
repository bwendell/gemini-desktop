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
    await browser.electron.execute((electron: typeof import('electron')) => {
        const windows = electron.BrowserWindow.getAllWindows();
        const mainWindow = windows.find(w => !w.isDestroyed() && w.getTitle() !== '');

        if (mainWindow) {
            // Access windowManager through the app's global state
            // This assumes the main process has stored it globally
            const { app } = electron;
            const windowManager = (app as unknown as { windowManager?: { showQuickChat: () => void } }).windowManager;
            if (windowManager?.showQuickChat) {
                windowManager.showQuickChat();
            }
        }
    });
}

/**
 * Hide the Quick Chat window.
 * 
 * @returns Promise<void>
 */
export async function hideQuickChatWindow(): Promise<void> {
    await browser.electron.execute((electron: typeof import('electron')) => {
        const { app } = electron;
        const windowManager = (app as unknown as { windowManager?: { hideQuickChat: () => void } }).windowManager;
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
    await browser.electron.execute((electron: typeof import('electron')) => {
        const { app } = electron;
        const windowManager = (app as unknown as { windowManager?: { toggleQuickChat: () => void } }).windowManager;
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
        const { app, BrowserWindow } = electron;
        const windowManager = (app as unknown as {
            windowManager?: {
                getQuickChatWindow: () => Electron.BrowserWindow | null
            }
        }).windowManager;

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
        (electron: typeof import('electron'), submittedText: string) => {
            const { app } = electron;

            // Type-safe access to windowManager (inline cast - can't use imports in serialized context)
            const windowManager = (app as unknown as {
                windowManager?: {
                    hideQuickChat?: () => void;
                    focusMainWindow?: () => void;
                }
            }).windowManager;

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

            // Access IpcManager to trigger text injection (inline cast)
            const ipcManager = (app as unknown as {
                ipcManager?: {
                    _injectTextIntoGemini?: (text: string) => Promise<void>;
                }
            }).ipcManager;

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
        (electron: typeof import('electron'), domains: string[]) => {
            const { app } = electron;
            const windowManager = (app as unknown as {
                windowManager?: {
                    getMainWindow: () => Electron.BrowserWindow | null;
                }
            }).windowManager;

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
