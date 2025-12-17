/**
 * Electron Preload Script
 * 
 * Exposes safe APIs to the renderer process via contextBridge.
 * This is the secure pattern for Electron IPC - the renderer never
 * has direct access to Node.js or Electron APIs.
 * 
 * Cross-platform: All exposed APIs work on Windows, macOS, and Linux.
 * 
 * Security:
 * - Uses contextBridge for secure context isolation
 * - Only exposes intentionally designed APIs
 * - No direct access to ipcRenderer in renderer process
 * 
 * @module Preload
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * API exposed to the renderer process.
 * Access via `window.electronAPI` in React components.
 * 
 * @typedef {Object} ElectronAPI
 * @property {function(): void} minimizeWindow - Minimize the current window
 * @property {function(): void} maximizeWindow - Toggle maximize/restore
 * @property {function(): void} closeWindow - Close the current window
 * @property {function(): Promise<boolean>} isMaximized - Check if window is maximized
 * @property {function(): void} openOptions - Open the options window
 * @property {string} platform - Current OS platform (win32, darwin, linux)
 * @property {boolean} isElectron - Always true in Electron environment
 * @property {function(): Promise<ThemeData>} getTheme - Get current theme
 * @property {function(theme: string): void} setTheme - Set theme preference
 * @property {function(callback: function): function} onThemeChanged - Subscribe to theme changes
 */

// Expose window control APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
    // =========================================================================
    // Window Controls
    // Cross-platform window management
    // =========================================================================

    /**
     * Minimize the current window.
     */
    minimizeWindow: () => ipcRenderer.send('window-minimize'),

    /**
     * Toggle maximize/restore for the current window.
     */
    maximizeWindow: () => ipcRenderer.send('window-maximize'),

    /**
     * Close the current window.
     */
    closeWindow: () => ipcRenderer.send('window-close'),

    /**
     * Check if the current window is maximized.
     * @returns {Promise<boolean>} True if maximized
     */
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

    /**
     * Open the options/settings window.
     */
    openOptions: () => ipcRenderer.send('open-options-window'),

    /**
     * Open Google sign-in in a new BrowserWindow.
     * Returns a promise that resolves when the window is closed.
     * @returns {Promise<void>}
     */
    openGoogleSignIn: () => ipcRenderer.invoke('open-google-signin'),

    // =========================================================================
    // Platform Detection
    // Enables cross-platform conditional rendering
    // =========================================================================

    /**
     * Current operating system platform.
     * Values: 'win32' (Windows), 'darwin' (macOS), 'linux'
     */
    platform: process.platform,

    /**
     * Flag indicating we're running in Electron.
     * Use for feature detection in components.
     */
    isElectron: true,

    // =========================================================================
    // Theme API
    // Theme preference management and synchronization
    // =========================================================================

    /**
     * Get the current theme preference and effective theme.
     * @returns {Promise<{preference: string, effectiveTheme: string}>}
     */
    getTheme: () => ipcRenderer.invoke('theme:get'),

    /**
     * Set the theme preference.
     * @param {('light'|'dark'|'system')} theme - The theme to set
     */
    setTheme: (theme) => ipcRenderer.send('theme:set', theme),

    /**
     * Subscribe to theme change events from other windows.
     * @param {function({preference: string, effectiveTheme: string}): void} callback 
     * @returns {function(): void} Cleanup function to unsubscribe
     */
    onThemeChanged: (callback) => {
        const subscription = (_event, themeData) => callback(themeData);
        ipcRenderer.on('theme:changed', subscription);

        // Return cleanup function for React useEffect
        return () => {
            ipcRenderer.removeListener('theme:changed', subscription);
        };
    }
});

// Log that preload successfully executed (helps with debugging)
console.log('[Preload] Electron API exposed to renderer');
