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
const { ipcMain, BrowserWindow, nativeTheme } = require('electron');
const SettingsStore = require('../store.cjs');
const { GOOGLE_ACCOUNTS_URL } = require('../utils/constants.cjs');
const { createLogger } = require('../utils/logger.cjs');

const logger = createLogger('[IpcManager]');

/**
 * Valid theme values for the application.
 * @typedef {'light' | 'dark' | 'system'} ThemePreference
 */

/**
 * Theme data structure returned to renderer.
 * @typedef {Object} ThemeData
 * @property {ThemePreference} preference - User's theme preference
 * @property {'light' | 'dark'} effectiveTheme - Resolved theme based on system
 */

/**
 * Manages IPC communication between main and renderer processes.
 * Handles window controls, theme management, and app-specific channels.
 */
class IpcManager {
    /**
     * Creates a new IpcManager instance.
     * @param {import('./windowManager.cjs')} windowManager - The window manager instance
     */
    constructor(windowManager) {
        this.windowManager = windowManager;
        this.store = new SettingsStore({
            configName: 'user-preferences',
            defaults: {
                theme: 'system'
            }
        });

        // Initialize native theme on startup
        this._initializeNativeTheme();

        logger.log('Initialized');
    }

    /**
     * Initialize nativeTheme based on stored preference.
     * @private
     */
    _initializeNativeTheme() {
        try {
            const savedTheme = this.store.get('theme') || 'system';
            nativeTheme.themeSource = savedTheme;
            logger.log(`Native theme initialized to: ${savedTheme}`);
        } catch (error) {
            logger.error('Failed to initialize native theme:', error);
        }
    }

    /**
     * Set up all IPC handlers.
     * Call this after app is ready.
     */
    setupIpcHandlers() {
        this._setupWindowHandlers();
        this._setupThemeHandlers();
        this._setupAppHandlers();

        logger.log('All IPC handlers registered');
    }

    /**
     * Get the window from an IPC event safely.
     * @private
     * @param {Electron.IpcMainEvent | Electron.IpcMainInvokeEvent} event - IPC event
     * @returns {Electron.BrowserWindow | null} The window or null if not found
     */
    _getWindowFromEvent(event) {
        try {
            return BrowserWindow.fromWebContents(event.sender);
        } catch (error) {
            logger.error('Failed to get window from event:', error);
            return null;
        }
    }

    /**
     * Set up window control handlers (minimize, maximize, close).
     * Cross-platform compatible - works on Windows, macOS, and Linux.
     * @private
     */
    _setupWindowHandlers() {
        // Minimize window
        ipcMain.on('window-minimize', (event) => {
            const win = this._getWindowFromEvent(event);
            if (win) {
                try {
                    win.minimize();
                } catch (error) {
                    logger.error('Error minimizing window:', {
                        error: error.message,
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
                    logger.error('Error toggling maximize:', {
                        error: error.message,
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
                    logger.error('Error closing window:', {
                        error: error.message,
                        windowId: win.id
                    });
                }
            }
        });

        // Check if window is maximized
        ipcMain.handle('window-is-maximized', (event) => {
            const win = this._getWindowFromEvent(event);
            if (!win) return false;

            try {
                return win.isMaximized();
            } catch (error) {
                logger.error('Error checking maximized state:', error);
                return false;
            }
        });
    }

    /**
     * Set up theme-related IPC handlers.
     * Manages theme persistence and synchronization across windows.
     * @private
     */
    _setupThemeHandlers() {
        // Get current theme preference and effective theme
        ipcMain.handle('theme:get', () => {
            try {
                const preference = this.store.get('theme') || 'system';
                const effectiveTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
                return { preference, effectiveTheme };
            } catch (error) {
                logger.error('Error getting theme:', error);
                return { preference: 'system', effectiveTheme: 'dark' };
            }
        });

        // Set theme preference
        ipcMain.on('theme:set', (event, theme) => {
            try {
                // Validate theme value
                const validThemes = ['light', 'dark', 'system'];
                if (!validThemes.includes(theme)) {
                    logger.warn(`Invalid theme value: ${theme}`);
                    return;
                }

                // Persist preference
                this.store.set('theme', theme);

                // Update native theme (affects nativeTheme.shouldUseDarkColors)
                nativeTheme.themeSource = theme;

                // Compute effective theme after nativeTheme update
                const effectiveTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';

                logger.log(`Theme set to: ${theme} (effective: ${effectiveTheme})`);

                // Broadcast to all windows
                this._broadcastThemeChange(theme, effectiveTheme);
            } catch (error) {
                logger.error('Error setting theme:', {
                    error: error.message,
                    requestedTheme: theme
                });
            }
        });
    }

    /**
     * Broadcast theme change to all open windows.
     * @private
     * @param {ThemePreference} preference - The theme preference
     * @param {'light' | 'dark'} effectiveTheme - The resolved effective theme
     */
    _broadcastThemeChange(preference, effectiveTheme) {
        const windows = BrowserWindow.getAllWindows();

        windows.forEach(win => {
            try {
                if (!win.isDestroyed()) {
                    win.webContents.send('theme:changed', { preference, effectiveTheme });
                }
            } catch (error) {
                logger.error('Error broadcasting theme to window:', {
                    error: error.message,
                    windowId: win.id
                });
            }
        });
    }

    /**
     * Set up application-specific handlers.
     * @private
     */
    _setupAppHandlers() {
        // Open options window
        ipcMain.on('open-options-window', () => {
            try {
                this.windowManager.createOptionsWindow();
            } catch (error) {
                logger.error('Error opening options window:', error);
            }
        });

        // Open Google sign-in using WindowManager's createAuthWindow
        ipcMain.handle('open-google-signin', async () => {
            try {
                const authWindow = this.windowManager.createAuthWindow(GOOGLE_ACCOUNTS_URL);

                // Return a promise that resolves when window is closed
                return new Promise((resolve) => {
                    authWindow.on('closed', () => resolve());
                });
            } catch (error) {
                logger.error('Error opening Google sign-in:', error);
                throw error;
            }
        });
    }
}

module.exports = IpcManager;
