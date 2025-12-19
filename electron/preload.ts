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

/**
 * IPC channel names used for main process <-> renderer communication.
 * NOTE: These are duplicated from utils/constants.ts because preload scripts
 * running in sandbox mode cannot use relative imports. If you update these,
 * also update the constants in utils/constants.ts to keep them in sync.
 */
const IPC_CHANNELS = {
    // Window controls
    WINDOW_MINIMIZE: 'window-minimize',
    WINDOW_MAXIMIZE: 'window-maximize',
    WINDOW_CLOSE: 'window-close',
    WINDOW_IS_MAXIMIZED: 'window-is-maximized',

    // Theme
    THEME_GET: 'theme:get',
    THEME_SET: 'theme:set',
    THEME_CHANGED: 'theme:changed',

    // App
    OPEN_OPTIONS: 'open-options-window',
    OPEN_GOOGLE_SIGNIN: 'open-google-signin',

    // Quick Chat
    QUICK_CHAT_SUBMIT: 'quick-chat:submit',
    QUICK_CHAT_HIDE: 'quick-chat:hide',
    QUICK_CHAT_CANCEL: 'quick-chat:cancel',
    QUICK_CHAT_EXECUTE: 'quick-chat:execute',
} as const;

// Expose window control APIs to renderer
const electronAPI: ElectronAPI = {
    // =========================================================================
    // Window Controls
    // Cross-platform window management
    // =========================================================================

    /**
     * Minimize the current window.
     */
    minimizeWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),

    /**
     * Toggle maximize/restore for the current window.
     */
    maximizeWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE),

    /**
     * Close the current window.
     */
    closeWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE),

    /**
     * Check if the current window is maximized.
     * @returns True if maximized
     */
    isMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED),

    /**
     * Open the options/settings window.
     * @param tab - Optional tab to open ('settings' or 'about')
     */
    openOptions: (tab) => ipcRenderer.send(IPC_CHANNELS.OPEN_OPTIONS, tab),

    /**
     * Open Google sign-in in a new BrowserWindow.
     * Returns a promise that resolves when the window is closed.
     * @returns Promise that resolves when sign-in window closes
     */
    openGoogleSignIn: () => ipcRenderer.invoke(IPC_CHANNELS.OPEN_GOOGLE_SIGNIN),

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
    getTheme: () => ipcRenderer.invoke(IPC_CHANNELS.THEME_GET),

    /**
     * Set the theme preference.
     * @param theme - The theme to set (light, dark, or system)
     */
    setTheme: (theme) => ipcRenderer.send(IPC_CHANNELS.THEME_SET, theme),

    /**
     * Subscribe to theme change events from other windows.
     * @param callback - Function to call when theme changes
     * @returns Cleanup function to unsubscribe
     */
    onThemeChanged: (callback) => {
        const subscription = (_event: Electron.IpcRendererEvent, themeData: Parameters<typeof callback>[0]) =>
            callback(themeData);
        ipcRenderer.on(IPC_CHANNELS.THEME_CHANGED, subscription);

        // Return cleanup function for React useEffect
        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.THEME_CHANGED, subscription);
        };
    },

    // =========================================================================
    // Quick Chat API
    // Floating prompt window for quick Gemini interactions
    // =========================================================================

    /**
     * Submit quick chat text to main window.
     * @param text - The prompt text to send
     */
    submitQuickChat: (text) => ipcRenderer.send(IPC_CHANNELS.QUICK_CHAT_SUBMIT, text),

    /**
     * Hide the quick chat window.
     */
    hideQuickChat: () => ipcRenderer.send(IPC_CHANNELS.QUICK_CHAT_HIDE),

    /**
     * Cancel quick chat (hide without action).
     */
    cancelQuickChat: () => ipcRenderer.send(IPC_CHANNELS.QUICK_CHAT_CANCEL),

    /**
     * Subscribe to quick chat execute events (main window receives this).
     * @param callback - Function to call with the prompt text
     * @returns Cleanup function to unsubscribe
     */
    onQuickChatExecute: (callback) => {
        const subscription = (_event: Electron.IpcRendererEvent, text: string) =>
            callback(text);
        ipcRenderer.on(IPC_CHANNELS.QUICK_CHAT_EXECUTE, subscription);

        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.QUICK_CHAT_EXECUTE, subscription);
        };
    },

    // =========================================================================
    // Hotkeys API
    // =========================================================================
    // 
    // Provides methods for managing global hotkey combinations enable/disable.
    // These methods allow the renderer process (UI) to control the hotkey
    // registration state in the main process.
    //
    // Architecture:
    //   UI Toggle → setHotkeysEnabled() → IPC → HotkeyManager.setEnabled()
    //
    // The state is persisted in SettingsStore and synchronized across windows
    // via the 'hotkeys:changed' event.
    // =========================================================================

    /**
     * Get the current hotkeys enabled state from the backend.
     * 
     * This makes a synchronous-style IPC call to the main process to retrieve
     * the current hotkey enabled state from the SettingsStore.
     * 
     * @returns Promise resolving to { enabled: boolean }
     * 
     * @example
     * ```typescript
     * const { enabled } = await window.electronAPI.getHotkeysEnabled();
     * console.log(`Hotkeys are ${enabled ? 'ON' : 'OFF'}`);
     * ```
     */
    getHotkeysEnabled: () => ipcRenderer.invoke('hotkeys:get'),

    /**
     * Set the hotkeys enabled state in the backend.
     * 
     * This sends a one-way IPC message to the main process which:
     * 1. Persists the new state to SettingsStore
     * 2. Calls HotkeyManager.setEnabled() to register/unregister shortcuts
     * 3. Broadcasts 'hotkeys:changed' to all windows for synchronization
     * 
     * @param enabled - Whether to enable (true) or disable (false) hotkeys
     * 
     * @example
     * ```typescript
     * // Disable all global hotkeys
     * window.electronAPI.setHotkeysEnabled(false);
     * ```
     */
    setHotkeysEnabled: (enabled) => ipcRenderer.send('hotkeys:set', enabled),

    /**
     * Subscribe to hotkeys enabled state changes from other windows.
     * 
     * This allows the UI to stay in sync when the hotkey state is changed
     * from another window (e.g., if user has multiple Options windows open).
     * 
     * @param callback - Function called with { enabled: boolean } when state changes
     * @returns Cleanup function to unsubscribe (for use in React useEffect)
     * 
     * @example
     * ```typescript
     * // In a React useEffect
     * useEffect(() => {
     *     const cleanup = window.electronAPI.onHotkeysChanged(({ enabled }) => {
     *         setEnabled(enabled);
     *     });
     *     return cleanup; // Unsubscribe on unmount
     * }, []);
     * ```
     */
    onHotkeysChanged: (callback) => {
        const subscription = (_event: Electron.IpcRendererEvent, data: Parameters<typeof callback>[0]) =>
            callback(data);
        ipcRenderer.on('hotkeys:changed', subscription);

        // Return cleanup function for React useEffect
        return () => {
            ipcRenderer.removeListener('hotkeys:changed', subscription);
        };
    }

};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Log that preload successfully executed (helps with debugging)
console.log('[Preload] Electron API exposed to renderer');
