/**
 * IPC Manager for the Electron main process.
 * 
 * Centralizes all IPC (Inter-Process Communication) handlers between the
 * renderer and main processes. This architecture enables:
 * - Clean separation of concerns
 * - Easy extension for new IPC channels
 * - Consistent error handling across all handlers
 * - Cross-platform compatibility (Windows, macOS, Linux)
 * 
 * @module IpcManager
 */

import { ipcMain, BrowserWindow, nativeTheme, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import SettingsStore from '../store';
import {
    GOOGLE_ACCOUNTS_URL,
    IPC_CHANNELS,
    GEMINI_DOMAIN,
    GEMINI_EDITOR_SELECTORS,
    GEMINI_SUBMIT_BUTTON_SELECTORS,
    GEMINI_EDITOR_BLANK_CLASS,
    GEMINI_SUBMIT_DELAY_MS
} from '../utils/constants';
import { createLogger } from '../utils/logger';
import type WindowManager from './windowManager';
import type HotkeyManager from './hotkeyManager';
import type { ThemePreference, ThemeData, HotkeysData, Logger } from '../types';

/**
 * User preferences structure for settings store.
 */
interface UserPreferences extends Record<string, unknown> {
    theme: ThemePreference;
    hotkeysEnabled: boolean;
}

/**
 * Manages IPC communication between main and renderer processes.
 * Handles window controls, theme management, and app-specific channels.
 */
export default class IpcManager {
    private windowManager: WindowManager;
    private hotkeyManager: HotkeyManager | null = null;
    private store: SettingsStore<UserPreferences>;
    private logger: Logger;

    /**
     * Creates a new IpcManager instance.
     * @param windowManager - The window manager instance
     * @param store - Optional store instance for testing
     * @param logger - Optional logger instance for testing
     */
    constructor(
        windowManager: WindowManager,
        hotkeyManager?: HotkeyManager | null,
        store?: SettingsStore<UserPreferences>,
        logger?: Logger
    ) {
        this.windowManager = windowManager;
        this.hotkeyManager = hotkeyManager || null;
        /* v8 ignore next 6 -- production fallback, tests always inject dependencies */
        this.store = store || new SettingsStore<UserPreferences>({
            configName: 'user-preferences',
            defaults: {
                theme: 'system',
                hotkeysEnabled: true
            }
        });
        /* v8 ignore next -- production fallback, tests always inject logger */
        this.logger = logger || createLogger('[IpcManager]');

        // Initialize native theme on startup
        this._initializeNativeTheme();

        this.logger.log('Initialized');
    }

    /**
     * Initialize nativeTheme based on stored preference.
     * @private
     */
    private _initializeNativeTheme(): void {
        try {
            const savedTheme = this.store.get('theme') || 'system';
            nativeTheme.themeSource = savedTheme;
            this.logger.log(`Native theme initialized to: ${savedTheme}`);
        } catch (error) {
            this.logger.error('Failed to initialize native theme:', error);
        }
    }

    /**
     * Set up all IPC handlers.
     * Call this after app is ready.
     */
    setupIpcHandlers(): void {
        this._setupWindowHandlers();
        this._setupThemeHandlers();
        this._setupHotkeyHandlers();
        this._setupAppHandlers();
        this._setupQuickChatHandlers();

        this.logger.log('All IPC handlers registered');
    }

    /**
     * Get the window from an IPC event safely.
     * @private
     * @param event - IPC event
     * @returns The window or null if not found
     */
    private _getWindowFromEvent(event: IpcMainEvent | IpcMainInvokeEvent): BrowserWindow | null {
        try {
            return BrowserWindow.fromWebContents(event.sender);
        } catch (error) {
            this.logger.error('Failed to get window from event:', error);
            return null;
        }
    }

    /**
     * Set up window control handlers (minimize, maximize, close).
     * Cross-platform compatible - works on Windows, macOS, and Linux.
     * @private
     */
    private _setupWindowHandlers(): void {
        // Minimize window
        ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, (event) => {
            const win = this._getWindowFromEvent(event);
            if (win) {
                try {
                    win.minimize();
                } catch (error) {
                    this.logger.error('Error minimizing window:', {
                        error: (error as Error).message,
                        windowId: win.id
                    });
                }
            }
        });

        // Maximize/restore window
        ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, (event) => {
            const win = this._getWindowFromEvent(event);
            if (win) {
                try {
                    if (win.isMaximized()) {
                        win.unmaximize();
                    } else {
                        win.maximize();
                    }
                } catch (error) {
                    this.logger.error('Error toggling maximize:', {
                        error: (error as Error).message,
                        windowId: win.id
                    });
                }
            }
        });

        // Close window
        ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, (event) => {
            const win = this._getWindowFromEvent(event);
            if (win) {
                try {
                    win.close();
                } catch (error) {
                    this.logger.error('Error closing window:', {
                        error: (error as Error).message,
                        windowId: win.id
                    });
                }
            }
        });

        // Check if window is maximized
        ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, (event): boolean => {
            const win = this._getWindowFromEvent(event);
            if (!win) return false;

            try {
                return win.isMaximized();
            } catch (error) {
                this.logger.error('Error checking maximized state:', error);
                return false;
            }
        });
    }

    /**
     * Set up theme-related IPC handlers.
     * Manages theme persistence and synchronization across windows.
     * @private
     */
    private _setupThemeHandlers(): void {
        // Get current theme preference and effective theme
        ipcMain.handle(IPC_CHANNELS.THEME_GET, (): ThemeData => {
            try {
                const preference = this.store.get('theme') || 'system';
                const effectiveTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
                return { preference, effectiveTheme };
            } catch (error) {
                this.logger.error('Error getting theme:', error);
                return { preference: 'system', effectiveTheme: 'dark' };
            }
        });

        // Set theme preference
        ipcMain.on(IPC_CHANNELS.THEME_SET, (_event, theme: ThemePreference) => {
            try {
                // Validate theme value
                const validThemes: ThemePreference[] = ['light', 'dark', 'system'];
                if (!validThemes.includes(theme)) {
                    this.logger.warn(`Invalid theme value: ${theme}`);
                    return;
                }

                // Persist preference
                this.store.set('theme', theme);

                // Update native theme (affects nativeTheme.shouldUseDarkColors)
                nativeTheme.themeSource = theme;

                // Compute effective theme after nativeTheme update
                const effectiveTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';

                this.logger.log(`Theme set to: ${theme} (effective: ${effectiveTheme})`);

                // Broadcast to all windows
                this._broadcastThemeChange(theme, effectiveTheme);
            } catch (error) {
                this.logger.error('Error setting theme:', {
                    error: (error as Error).message,
                    requestedTheme: theme
                });
            }
        });
    }

    /**
     * Broadcast theme change to all open windows.
     * @private
     * @param preference - The theme preference
     * @param effectiveTheme - The resolved effective theme
     */
    private _broadcastThemeChange(preference: ThemePreference, effectiveTheme: 'light' | 'dark'): void {
        const windows = BrowserWindow.getAllWindows();

        windows.forEach(win => {
            try {
                if (!win.isDestroyed()) {
                    win.webContents.send(IPC_CHANNELS.THEME_CHANGED, { preference, effectiveTheme });
                }
            } catch (error) {
                this.logger.error('Error broadcasting theme to window:', {
                    error: (error as Error).message,
                    windowId: win.id
                });
            }
        });
    }

    /**
     * Set up hotkey-related IPC handlers.
     * Manages hotkey enabled/disabled state and synchronization across windows.
     * @private
     */
    private _setupHotkeyHandlers(): void {
        // Get current hotkeys enabled state
        ipcMain.handle('hotkeys:get', (): HotkeysData => {
            try {
                const enabled = this.store.get('hotkeysEnabled') ?? true;
                return { enabled };
            } catch (error) {
                this.logger.error('Error getting hotkeys state:', error);
                return { enabled: true };
            }
        });

        // Set hotkeys enabled state
        ipcMain.on('hotkeys:set', (_event, enabled: boolean) => {
            try {
                // Validate enabled value
                if (typeof enabled !== 'boolean') {
                    this.logger.warn(`Invalid hotkeys enabled value: ${enabled}`);
                    return;
                }

                // Persist preference
                this.store.set('hotkeysEnabled', enabled);

                // Update HotkeyManager if available
                if (this.hotkeyManager) {
                    this.hotkeyManager.setEnabled(enabled);
                }

                this.logger.log(`Hotkeys enabled set to: ${enabled}`);

                // Broadcast to all windows
                this._broadcastHotkeysChange(enabled);
            } catch (error) {
                this.logger.error('Error setting hotkeys enabled:', {
                    error: (error as Error).message,
                    requestedEnabled: enabled
                });
            }
        });
    }

    /**
     * Broadcast hotkeys change to all open windows.
     * @private
     * @param enabled - Whether hotkeys are enabled
     */
    private _broadcastHotkeysChange(enabled: boolean): void {
        const windows = BrowserWindow.getAllWindows();

        windows.forEach(win => {
            try {
                if (!win.isDestroyed()) {
                    win.webContents.send('hotkeys:changed', { enabled });
                }
            } catch (error) {
                this.logger.error('Error broadcasting hotkeys change to window:', {
                    error: (error as Error).message,
                    windowId: win.id
                });
            }
        });
    }

    /**
     * Set up application-specific handlers.
     * @private
     */
    private _setupAppHandlers(): void {
        // Open options window (optionally to a specific tab)
        ipcMain.on(IPC_CHANNELS.OPEN_OPTIONS, (_event, tab?: 'settings' | 'about') => {
            try {
                this.windowManager.createOptionsWindow(tab);
            } catch (error) {
                this.logger.error('Error opening options window:', error);
            }
        });

        // Open Google sign-in using WindowManager's createAuthWindow
        ipcMain.handle(IPC_CHANNELS.OPEN_GOOGLE_SIGNIN, async (): Promise<void> => {
            try {
                const authWindow = this.windowManager.createAuthWindow(GOOGLE_ACCOUNTS_URL);

                // Return a promise that resolves when window is closed
                return new Promise((resolve) => {
                    authWindow.on('closed', () => resolve());
                });
            } catch (error) {
                this.logger.error('Error opening Google sign-in:', error);
                throw error;
            }
        });
    }

    /**
     * Inject text into the Gemini chat input and submit it.
     * Uses WebFrame executeJavaScript to run code inside the iframe's context.
     * 
     * @param text - The text to inject and submit
     * @private
     */
    private async _injectTextIntoGemini(text: string): Promise<void> {
        const mainWindow = this.windowManager.getMainWindow();
        if (!mainWindow) {
            this.logger.error('Cannot inject text: main window not found');
            return;
        }

        const webContents = mainWindow.webContents;
        const frames = webContents.mainFrame.frames;

        // Find the Gemini iframe's WebFrame using constant
        const geminiFrame = frames.find(frame => {
            try {
                return frame.url.includes(GEMINI_DOMAIN);
            } catch {
                return false;
            }
        });

        if (!geminiFrame) {
            this.logger.error('Cannot inject text: Gemini iframe not found');
            return;
        }

        // Escape the text for safe JavaScript injection
        const escapedText = text
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r');

        // Serialize constants for use in iframe context
        const editorSelectorsJson = JSON.stringify(GEMINI_EDITOR_SELECTORS);
        const buttonSelectorsJson = JSON.stringify(GEMINI_SUBMIT_BUTTON_SELECTORS);
        const blankClass = GEMINI_EDITOR_BLANK_CLASS;
        const submitDelay = GEMINI_SUBMIT_DELAY_MS;

        // JavaScript to execute inside the Gemini iframe
        // Uses Trusted Types-compatible DOM manipulation (textContent + Selection API)
        const injectionScript = `
            (function() {
                try {
                    // Find the Quill editor's contenteditable div
                    const selectors = ${editorSelectorsJson};
                    
                    let editor = null;
                    for (const selector of selectors) {
                        editor = document.querySelector(selector);
                        if (editor) break;
                    }
                    
                    if (!editor) {
                        console.error('[Quick Chat] Editor element not found');
                        return { success: false, error: 'editor_not_found' };
                    }

                    // Focus and clear the editor
                    editor.focus();
                    const textToInject = '${escapedText}';
                    
                    // Clear using textContent (Trusted Types safe)
                    editor.textContent = '';

                    // Insert text using Selection API (Trusted Types safe)
                    const textNode = document.createTextNode(textToInject);
                    const selection = window.getSelection();
                    const range = document.createRange();
                    range.selectNodeContents(editor);
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    range.insertNode(textNode);
                    
                    // Move cursor to end
                    range.setStartAfter(textNode);
                    range.setEndAfter(textNode);
                    selection.removeAllRanges();
                    selection.addRange(range);

                    // Update editor state
                    editor.classList.remove('${blankClass}');
                    
                    // Dispatch events to notify Angular/Quill
                    editor.dispatchEvent(new InputEvent('input', {
                        bubbles: true,
                        cancelable: true,
                        inputType: 'insertText',
                        data: textToInject
                    }));
                    editor.dispatchEvent(new Event('text-change', { bubbles: true }));
                    editor.dispatchEvent(new Event('input', { bubbles: true }));

                    // Find and click submit button after UI update
                    setTimeout(() => {
                        const buttonSelectors = ${buttonSelectorsJson};
                        
                        let submitButton = null;
                        for (const selector of buttonSelectors) {
                            submitButton = document.querySelector(selector);
                            if (submitButton && !submitButton.disabled) break;
                        }
                        
                        if (submitButton && !submitButton.disabled) {
                            submitButton.click();
                        } else {
                            console.error('[Quick Chat] Submit button not found or disabled');
                        }
                    }, ${submitDelay});

                    return { success: true };
                } catch (e) {
                    console.error('[Quick Chat] Injection error:', e);
                    return { success: false, error: e.message };
                }
            })();
        `;

        try {
            await geminiFrame.executeJavaScript(injectionScript);
            this.logger.log('Text injected into Gemini successfully');
        } catch (error) {
            this.logger.error('Failed to inject text into Gemini:', error);
        }
    }

    /**
     * Set up Quick Chat IPC handlers.
     * Handles communication between Quick Chat window and main window.
     * @private
     */
    private _setupQuickChatHandlers(): void {
        // Submit quick chat text - inject into Gemini and submit
        ipcMain.on(IPC_CHANNELS.QUICK_CHAT_SUBMIT, async (_event, text: string) => {
            try {
                this.logger.log('Quick Chat submit received:', text.substring(0, 50));

                // Hide the Quick Chat window
                this.windowManager.hideQuickChat();

                // Focus the main window
                this.windowManager.focusMainWindow();

                // Inject text into Gemini chat and submit
                await this._injectTextIntoGemini(text);
            } catch (error) {
                this.logger.error('Error handling quick chat submit:', error);
            }
        });

        // Hide Quick Chat window
        ipcMain.on(IPC_CHANNELS.QUICK_CHAT_HIDE, () => {
            try {
                this.windowManager.hideQuickChat();
            } catch (error) {
                this.logger.error('Error hiding quick chat:', error);
            }
        });

        // Cancel Quick Chat (hide without action)
        ipcMain.on(IPC_CHANNELS.QUICK_CHAT_CANCEL, () => {
            try {
                this.windowManager.hideQuickChat();
                this.logger.log('Quick Chat cancelled');
            } catch (error) {
                this.logger.error('Error cancelling quick chat:', error);
            }
        });
    }
}
