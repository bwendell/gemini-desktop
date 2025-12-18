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

import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from './types';

// Expose window control APIs to renderer
const electronAPI: ElectronAPI = {
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
     * @returns True if maximized
     */
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

    /**
     * Open the options/settings window.
     * @param tab - Optional tab to open ('settings' or 'about')
     */
    openOptions: (tab) => ipcRenderer.send('open-options-window', tab),

    /**
     * Open Google sign-in in a new BrowserWindow.
     * Returns a promise that resolves when the window is closed.
     * @returns Promise that resolves when sign-in window closes
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
     * @returns Theme data with preference and effective theme
     */
    getTheme: () => ipcRenderer.invoke('theme:get'),

    /**
     * Set the theme preference.
     * @param theme - The theme to set (light, dark, or system)
     */
    setTheme: (theme) => ipcRenderer.send('theme:set', theme),

    /**
     * Subscribe to theme change events from other windows.
     * @param callback - Function to call when theme changes
     * @returns Cleanup function to unsubscribe
     */
    onThemeChanged: (callback) => {
        const subscription = (_event: Electron.IpcRendererEvent, themeData: Parameters<typeof callback>[0]) =>
            callback(themeData);
        ipcRenderer.on('theme:changed', subscription);

        // Return cleanup function for React useEffect
        return () => {
            ipcRenderer.removeListener('theme:changed', subscription);
        };
    }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Log that preload successfully executed (helps with debugging)
console.log('[Preload] Electron API exposed to renderer');
