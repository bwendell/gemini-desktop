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
    GEMINI_DOMAIN
} from '../utils/constants';
import { InjectionScriptBuilder, DEFAULT_INJECTION_CONFIG, InjectionResult } from '../utils/injectionScript';
import { createLogger } from '../utils/logger';
import type WindowManager from './windowManager';
import type HotkeyManager from './hotkeyManager';
import type { ThemePreference, ThemeData, IndividualHotkeySettings, HotkeyId, Logger } from '../types';

/**
 * User preferences structure for settings store.
 */
interface UserPreferences extends Record<string, unknown> {
    theme: ThemePreference;
    alwaysOnTop: boolean;
    // Individual hotkey settings
    hotkeyAlwaysOnTop: boolean;
    hotkeyBossKey: boolean;
    hotkeyQuickChat: boolean;
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
                alwaysOnTop: false,
                // Individual hotkey defaults
                hotkeyAlwaysOnTop: true,
                hotkeyBossKey: true,
                hotkeyQuickChat: true,
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
     * Initialize always-on-top state from stored preference.
     * Called after window is created.
     * @private
     */
    private _initializeAlwaysOnTop(): void {
        try {
            const savedAlwaysOnTop = this.store.get('alwaysOnTop') ?? false;
            if (savedAlwaysOnTop) {
                this.windowManager.setAlwaysOnTop(true);
                this.logger.log('Always on top initialized to: enabled');
            }
        } catch (error) {
            this.logger.error('Failed to initialize always on top:', error);
        }
    }

    /**
     * Set up all IPC handlers.
     * Call this after app is ready.
     */
    setupIpcHandlers(): void {
        this._setupWindowHandlers();
        this._setupThemeHandlers();
        this._setupIndividualHotkeyHandlers();
        this._setupAlwaysOnTopHandlers();
        this._setupAppHandlers();
        this._setupQuickChatHandlers();

        // Listen for internal changes (from hotkeys or menu)
        this.windowManager.on('always-on-top-changed', this._handleAlwaysOnTopChanged.bind(this));

        // Initialize settings that require window to exist
        this._initializeAlwaysOnTop();

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

        // Show/Restore window (e.g., from tray or helper)
        ipcMain.on(IPC_CHANNELS.WINDOW_SHOW, () => {
            try {
                this.windowManager.restoreFromTray();
            } catch (error) {
                this.logger.error('Error showing window:', error);
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
     * Set up individual hotkey IPC handlers.
     * Manages per-hotkey enabled/disabled state and synchronization across windows.
     * @private
     */
    private _setupIndividualHotkeyHandlers(): void {
        // Get current individual hotkey settings
        ipcMain.handle(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_GET, (): IndividualHotkeySettings => {
            try {
                return this._getIndividualHotkeySettings();
            } catch (error) {
                this.logger.error('Error getting individual hotkeys state:', error);
                return { alwaysOnTop: true, bossKey: true, quickChat: true };
            }
        });

        // Set individual hotkey enabled state
        ipcMain.on(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_SET, (_event, id: HotkeyId, enabled: boolean) => {
            try {
                // Validate inputs
                const validIds: HotkeyId[] = ['alwaysOnTop', 'bossKey', 'quickChat'];
                if (!validIds.includes(id)) {
                    this.logger.warn(`Invalid hotkey id: ${id}`);
                    return;
                }
                if (typeof enabled !== 'boolean') {
                    this.logger.warn(`Invalid enabled value: ${enabled}`);
                    return;
                }

                // Persist preference
                this._setIndividualHotkeySetting(id, enabled);

                // Update HotkeyManager if available
                if (this.hotkeyManager) {
                    this.hotkeyManager.setIndividualEnabled(id, enabled);
                }

                this.logger.log(`Individual hotkey ${id} set to: ${enabled}`);

                // Broadcast to all windows
                this._broadcastIndividualHotkeyChange();
            } catch (error) {
                this.logger.error('Error setting individual hotkey:', {
                    error: (error as Error).message,
                    id,
                    enabled
                });
            }
        });
    }

    /**
     * Get individual hotkey settings from store.
     * @private
     */
    private _getIndividualHotkeySettings(): IndividualHotkeySettings {
        return {
            alwaysOnTop: this.store.get('hotkeyAlwaysOnTop') ?? true,
            bossKey: this.store.get('hotkeyBossKey') ?? true,
            quickChat: this.store.get('hotkeyQuickChat') ?? true,
        };
    }

    /**
     * Set an individual hotkey setting in the store.
     * @private
     */
    private _setIndividualHotkeySetting(id: HotkeyId, enabled: boolean): void {
        switch (id) {
            case 'alwaysOnTop':
                this.store.set('hotkeyAlwaysOnTop', enabled);
                break;
            case 'bossKey':
                this.store.set('hotkeyBossKey', enabled);
                break;
            case 'quickChat':
                this.store.set('hotkeyQuickChat', enabled);
                break;
        }
    }

    /**
     * Broadcast individual hotkey settings change to all open windows.
     * @private
     */
    private _broadcastIndividualHotkeyChange(): void {
        const settings = this._getIndividualHotkeySettings();
        const windows = BrowserWindow.getAllWindows();

        windows.forEach(win => {
            try {
                if (!win.isDestroyed()) {
                    win.webContents.send(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_CHANGED, settings);
                }
            } catch (error) {
                this.logger.error('Error broadcasting individual hotkey change to window:', {
                    error: (error as Error).message,
                    windowId: win.id
                });
            }
        });
    }

    /**
     * Set up Always On Top IPC handlers.
     * @private
     */
    private _setupAlwaysOnTopHandlers(): void {
        // Get current always-on-top state
        ipcMain.handle(IPC_CHANNELS.ALWAYS_ON_TOP_GET, (): { enabled: boolean } => {
            try {
                const enabled = this.store.get('alwaysOnTop') ?? false;
                return { enabled };
            } catch (error) {
                this.logger.error('Error getting always on top state:', error);
                return { enabled: false };
            }
        });

        // Set always-on-top state
        ipcMain.on(IPC_CHANNELS.ALWAYS_ON_TOP_SET, (_event, enabled: boolean) => {
            try {
                // Validate enabled value
                if (typeof enabled !== 'boolean') {
                    this.logger.warn(`Invalid alwaysOnTop value: ${enabled}`);
                    return;
                }

                // Update WindowManager - this will emit 'always-on-top-changed'
                // which IPC Manager listens to for persistence and broadcasting
                this.windowManager.setAlwaysOnTop(enabled);

                this.logger.log(`Always on top requested: ${enabled}`);
            } catch (error) {
                this.logger.error('Error setting always on top:', {
                    error: (error as Error).message,
                    requestedEnabled: enabled
                });
            }
        });
    }

    /**
     * Handle always-on-top state changes from WindowManager.
     * Persists the state and broadcasts to all windows.
     * @private
     * @param enabled - New always-on-top state
     */
    private _handleAlwaysOnTopChanged(enabled: boolean): void {
        try {
            // Persist preference
            this.store.set('alwaysOnTop', enabled);

            this.logger.log(`Always on top changed to: ${enabled} (persisted and broadcasting)`);

            // Broadcast to all windows
            this._broadcastAlwaysOnTopChange(enabled);
        } catch (error) {
            this.logger.error('Error handling always on top change:', {
                error: (error as Error).message,
                enabled
            });
        }
    }

    /**
     * Broadcast always-on-top change to all open windows.
     * @private
     * @param enabled - Whether always-on-top is enabled
     */
    private _broadcastAlwaysOnTopChange(enabled: boolean): void {
        const windows = BrowserWindow.getAllWindows();

        windows.forEach(win => {
            try {
                if (!win.isDestroyed()) {
                    win.webContents.send(IPC_CHANNELS.ALWAYS_ON_TOP_CHANGED, { enabled });
                }
            } catch (error) {
                this.logger.error('Error broadcasting always on top change to window:', {
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
     * @param config - Optional injection configuration override
     * @private
     */
    private async _injectTextIntoGemini(
        text: string,
        config: Partial<typeof DEFAULT_INJECTION_CONFIG> = {}
    ): Promise<void> {
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

        // Build the injection script using the builder pattern
        const injectionScript = new InjectionScriptBuilder()
            .withText(text)
            .withConfig(config)
            .build();

        try {
            const result = await geminiFrame.executeJavaScript(injectionScript) as InjectionResult;

            if (result?.success) {
                this.logger.log('Text injected into Gemini successfully');
            } else {
                this.logger.error('Injection script returned failure:', result?.error);
            }
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
