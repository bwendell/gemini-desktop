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
import { GOOGLE_ACCOUNTS_URL } from '../utils/constants';
import { createLogger } from '../utils/logger';
import type WindowManager from './windowManager';
import type { ThemePreference, ThemeData, Logger } from '../types';

/**
 * User preferences structure for settings store.
 */
interface UserPreferences extends Record<string, unknown> {
    theme: ThemePreference;
}

/**
 * Manages IPC communication between main and renderer processes.
 * Handles window controls, theme management, and app-specific channels.
 */
export default class IpcManager {
    private windowManager: WindowManager;
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
        store?: SettingsStore<UserPreferences>,
        logger?: Logger
    ) {
        this.windowManager = windowManager;
        this.store = store || new SettingsStore<UserPreferences>({
            configName: 'user-preferences',
            defaults: {
                theme: 'system'
            }
        });
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
        this._setupAppHandlers();

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
        ipcMain.on('window-minimize', (event) => {
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
        ipcMain.on('window-maximize', (event) => {
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
        ipcMain.on('window-close', (event) => {
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
        ipcMain.handle('window-is-maximized', (event): boolean => {
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
        ipcMain.handle('theme:get', (): ThemeData => {
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
        ipcMain.on('theme:set', (_event, theme: ThemePreference) => {
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
                    win.webContents.send('theme:changed', { preference, effectiveTheme });
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
     * Set up application-specific handlers.
     * @private
     */
    private _setupAppHandlers(): void {
        // Open options window (optionally to a specific tab)
        ipcMain.on('open-options-window', (_event, tab?: 'settings' | 'about') => {
            try {
                this.windowManager.createOptionsWindow(tab);
            } catch (error) {
                this.logger.error('Error opening options window:', error);
            }
        });

        // Open Google sign-in using WindowManager's createAuthWindow
        ipcMain.handle('open-google-signin', async (): Promise<void> => {
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
}
