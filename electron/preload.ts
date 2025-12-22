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
    WINDOW_SHOW: 'window-show',
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

    // Always On Top
    ALWAYS_ON_TOP_GET: 'always-on-top:get',
    ALWAYS_ON_TOP_SET: 'always-on-top:set',
    ALWAYS_ON_TOP_CHANGED: 'always-on-top:changed',

    // Individual Hotkeys
    HOTKEYS_INDIVIDUAL_GET: 'hotkeys:individual:get',
    HOTKEYS_INDIVIDUAL_SET: 'hotkeys:individual:set',
    HOTKEYS_INDIVIDUAL_CHANGED: 'hotkeys:individual:changed',
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
     * Show/Restore the main window (e.g. from tray).
     */
    showWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_SHOW),

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
    // Individual Hotkeys API
    // =========================================================================
    // 
    // Provides methods for managing individual hotkey enable/disable.
    // Each hotkey can be independently controlled.
    //
    // Architecture:
    //   UI Toggle → setIndividualHotkey() → IPC → HotkeyManager.setIndividualEnabled()
    //
    // The state is persisted in SettingsStore and synchronized across windows
    // via the 'hotkeys:individual:changed' event.
    // =========================================================================

    /**
     * Get the current individual hotkey settings from the backend.
     * 
     * @returns Promise resolving to IndividualHotkeySettings
     */
    getIndividualHotkeys: () => ipcRenderer.invoke(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_GET),

    /**
     * Set an individual hotkey's enabled state in the backend.
     * 
     * @param id - The hotkey identifier ('alwaysOnTop' | 'bossKey' | 'quickChat')
     * @param enabled - Whether to enable (true) or disable (false) the hotkey
     */
    setIndividualHotkey: (id, enabled) => ipcRenderer.send(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_SET, id, enabled),

    /**
     * Subscribe to individual hotkey settings changes from other windows.
     * 
     * @param callback - Function called with IndividualHotkeySettings when any setting changes
     * @returns Cleanup function to unsubscribe (for use in React useEffect)
     */
    onIndividualHotkeysChanged: (callback) => {
        const subscription = (_event: Electron.IpcRendererEvent, settings: Parameters<typeof callback>[0]) =>
            callback(settings);
        ipcRenderer.on(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_CHANGED, subscription);

        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_CHANGED, subscription);
        };
    },

    // =========================================================================
    // Always On Top API
    // =========================================================================

    /**
     * Get the current always-on-top state.
     * @returns Promise resolving to { enabled: boolean }
     */
    getAlwaysOnTop: () => ipcRenderer.invoke(IPC_CHANNELS.ALWAYS_ON_TOP_GET),

    /**
     * Set the always-on-top state.
     * @param enabled - Whether to enable always-on-top
     */
    setAlwaysOnTop: (enabled) => ipcRenderer.send(IPC_CHANNELS.ALWAYS_ON_TOP_SET, enabled),

    /**
     * Subscribe to always-on-top state changes.
     * @param callback - Function called with { enabled: boolean } when state changes
     * @returns Cleanup function to unsubscribe
     */
    onAlwaysOnTopChanged: (callback) => {
        const subscription = (_event: Electron.IpcRendererEvent, data: Parameters<typeof callback>[0]) =>
            callback(data);
        ipcRenderer.on(IPC_CHANNELS.ALWAYS_ON_TOP_CHANGED, subscription);

        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.ALWAYS_ON_TOP_CHANGED, subscription);
        };
    }

};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Log that preload successfully executed (helps with debugging)
console.log('[Preload] Electron API exposed to renderer');
