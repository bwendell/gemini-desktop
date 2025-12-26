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
import type { ElectronAPI } from '../shared/types';
/**
 * IPC channel names used for main process <-> renderer communication.
 *
 * IMPORTANT: This object is inlined in the preload script because sandboxed
 * renderer processes cannot 'require' external modules. To keep this in sync
 * with the rest of the app, update src/shared/constants/ipc-channels.ts as well.
 *
 * TODO: Implement a proper bundling step for the preload script (e.g. using Vite or esbuild)
 * to allow sharing code without duplication.
 */
export const IPC_CHANNELS = {
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

  // Hotkey Accelerators
  HOTKEYS_ACCELERATOR_GET: 'hotkeys:accelerator:get',
  HOTKEYS_ACCELERATOR_SET: 'hotkeys:accelerator:set',
  HOTKEYS_ACCELERATOR_CHANGED: 'hotkeys:accelerator:changed',
  HOTKEYS_FULL_SETTINGS_GET: 'hotkeys:full-settings:get',

  // Auto-Update
  AUTO_UPDATE_GET_ENABLED: 'auto-update:get-enabled',
  AUTO_UPDATE_SET_ENABLED: 'auto-update:set-enabled',
  AUTO_UPDATE_CHECK: 'auto-update:check',
  AUTO_UPDATE_INSTALL: 'auto-update:install',
  AUTO_UPDATE_GET_LAST_CHECK: 'auto-update:get-last-check',
  AUTO_UPDATE_AVAILABLE: 'auto-update:available',
  AUTO_UPDATE_DOWNLOADED: 'auto-update:downloaded',
  AUTO_UPDATE_ERROR: 'auto-update:error',
  AUTO_UPDATE_CHECKING: 'auto-update:checking',
  AUTO_UPDATE_NOT_AVAILABLE: 'auto-update:not-available',
  AUTO_UPDATE_DOWNLOAD_PROGRESS: 'auto-update:download-progress',

  // Tray
  TRAY_GET_TOOLTIP: 'tray:get-tooltip',

  // Dev Testing (only used in development for manual testing)
  DEV_TEST_SHOW_BADGE: 'dev:test:show-badge',
  DEV_TEST_CLEAR_BADGE: 'dev:test:clear-badge',
  DEV_TEST_SET_UPDATE_ENABLED: 'dev:test:set-update-enabled',
  DEV_TEST_EMIT_UPDATE_EVENT: 'dev:test:emit-update-event',
  DEV_TEST_MOCK_PLATFORM: 'dev:test:mock-platform',
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
    const subscription = (
      _event: Electron.IpcRendererEvent,
      themeData: Parameters<typeof callback>[0]
    ) => callback(themeData);
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
    const subscription = (_event: Electron.IpcRendererEvent, text: string) => callback(text);
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
  setIndividualHotkey: (id, enabled) =>
    ipcRenderer.send(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_SET, id, enabled),

  /**
   * Subscribe to individual hotkey settings changes from other windows.
   *
   * @param callback - Function called with IndividualHotkeySettings when any setting changes
   * @returns Cleanup function to unsubscribe (for use in React useEffect)
   */
  onIndividualHotkeysChanged: (callback) => {
    const subscription = (
      _event: Electron.IpcRendererEvent,
      settings: Parameters<typeof callback>[0]
    ) => callback(settings);
    ipcRenderer.on(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_CHANGED, subscription);

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_CHANGED, subscription);
    };
  },

  // =========================================================================
  // Hotkey Accelerator API
  // =========================================================================

  /**
   * Get the current hotkey accelerators from the backend.
   *
   * @returns Promise resolving to HotkeyAccelerators (Record<HotkeyId, string>)
   */
  getHotkeyAccelerators: () => ipcRenderer.invoke(IPC_CHANNELS.HOTKEYS_ACCELERATOR_GET),

  /**
   * Get full hotkey settings (enabled states + accelerators).
   *
   * @returns Promise resolving to HotkeySettings
   */
  getFullHotkeySettings: () => ipcRenderer.invoke(IPC_CHANNELS.HOTKEYS_FULL_SETTINGS_GET),

  /**
   * Set an accelerator for a specific hotkey.
   *
   * @param id - The hotkey identifier ('alwaysOnTop' | 'bossKey' | 'quickChat')
   * @param accelerator - The new accelerator string (e.g., 'CommandOrControl+Shift+T')
   */
  setHotkeyAccelerator: (id, accelerator) =>
    ipcRenderer.send(IPC_CHANNELS.HOTKEYS_ACCELERATOR_SET, id, accelerator),

  /**
   * Subscribe to hotkey accelerator changes from other windows.
   *
   * @param callback - Function called with HotkeyAccelerators when any accelerator changes
   * @returns Cleanup function to unsubscribe (for use in React useEffect)
   */
  onHotkeyAcceleratorsChanged: (callback) => {
    const subscription = (
      _event: Electron.IpcRendererEvent,
      accelerators: Parameters<typeof callback>[0]
    ) => callback(accelerators);
    ipcRenderer.on(IPC_CHANNELS.HOTKEYS_ACCELERATOR_CHANGED, subscription);

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.HOTKEYS_ACCELERATOR_CHANGED, subscription);
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
    const subscription = (
      _event: Electron.IpcRendererEvent,
      data: Parameters<typeof callback>[0]
    ) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.ALWAYS_ON_TOP_CHANGED, subscription);

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ALWAYS_ON_TOP_CHANGED, subscription);
    };
  },

  // =========================================================================
  // Auto-Update API
  // =========================================================================

  /**
   * Get whether auto-updates are enabled.
   * @returns Promise resolving to boolean
   */
  getAutoUpdateEnabled: () => ipcRenderer.invoke(IPC_CHANNELS.AUTO_UPDATE_GET_ENABLED),

  /**
   * Set whether auto-updates are enabled.
   * @param enabled - Whether to enable auto-updates
   */
  setAutoUpdateEnabled: (enabled) =>
    ipcRenderer.send(IPC_CHANNELS.AUTO_UPDATE_SET_ENABLED, enabled),

  /**
   * Manually check for updates.
   */
  checkForUpdates: () => ipcRenderer.send(IPC_CHANNELS.AUTO_UPDATE_CHECK),

  /**
   * Install a downloaded update (quits app and installs).
   */
  installUpdate: () => ipcRenderer.send(IPC_CHANNELS.AUTO_UPDATE_INSTALL),

  /**
   * Subscribe to update available events.
   * @param callback - Function called with UpdateInfo when update is available
   * @returns Cleanup function to unsubscribe
   */
  onUpdateAvailable: (callback) => {
    const subscription = (
      _event: Electron.IpcRendererEvent,
      info: Parameters<typeof callback>[0]
    ) => callback(info);
    ipcRenderer.on(IPC_CHANNELS.AUTO_UPDATE_AVAILABLE, subscription);

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.AUTO_UPDATE_AVAILABLE, subscription);
    };
  },

  /**
   * Subscribe to update downloaded events.
   * @param callback - Function called with UpdateInfo when update is downloaded
   * @returns Cleanup function to unsubscribe
   */
  onUpdateDownloaded: (callback) => {
    const subscription = (
      _event: Electron.IpcRendererEvent,
      info: Parameters<typeof callback>[0]
    ) => callback(info);
    ipcRenderer.on(IPC_CHANNELS.AUTO_UPDATE_DOWNLOADED, subscription);

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.AUTO_UPDATE_DOWNLOADED, subscription);
    };
  },

  /**
   * Subscribe to update error events.
   * @param callback - Function called with error message
   * @returns Cleanup function to unsubscribe
   */
  onUpdateError: (callback) => {
    const subscription = (_event: Electron.IpcRendererEvent, error: string) => callback(error);
    ipcRenderer.on(IPC_CHANNELS.AUTO_UPDATE_ERROR, subscription);

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.AUTO_UPDATE_ERROR, subscription);
    };
  },

  /**
   * Subscribe to update-not-available events.
   * @param callback - Function called with UpdateInfo when no update is available
   * @returns Cleanup function to unsubscribe
   */
  onUpdateNotAvailable: (callback) => {
    const subscription = (
      _event: Electron.IpcRendererEvent,
      info: Parameters<typeof callback>[0]
    ) => callback(info);
    ipcRenderer.on(IPC_CHANNELS.AUTO_UPDATE_NOT_AVAILABLE, subscription);

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.AUTO_UPDATE_NOT_AVAILABLE, subscription);
    };
  },

  /**
   * Subscribe to download-progress events.
   * @param callback - Function called with progress data during download
   * @returns Cleanup function to unsubscribe
   */
  onDownloadProgress: (callback) => {
    const subscription = (
      _event: Electron.IpcRendererEvent,
      progress: Parameters<typeof callback>[0]
    ) => callback(progress);
    ipcRenderer.on(IPC_CHANNELS.AUTO_UPDATE_DOWNLOAD_PROGRESS, subscription);

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.AUTO_UPDATE_DOWNLOAD_PROGRESS, subscription);
    };
  },

  // =========================================================================
  // Dev Testing API (only for manual testing in development)
  // =========================================================================

  /**
   * Show the native update badge for dev testing.
   * @param version - Optional version string for tray tooltip
   */
  devShowBadge: (version?: string) => ipcRenderer.send(IPC_CHANNELS.DEV_TEST_SHOW_BADGE, version),

  /**
   * Clear the native update badge for dev testing.
   */
  devClearBadge: () => ipcRenderer.send(IPC_CHANNELS.DEV_TEST_CLEAR_BADGE),

  /**
   * Set update enabled state for testing.
   */
  devSetUpdateEnabled: (enabled) =>
    ipcRenderer.send(IPC_CHANNELS.DEV_TEST_SET_UPDATE_ENABLED, enabled),

  /**
   * Emit simulated update event.
   */
  devEmitUpdateEvent: (event, data) =>
    ipcRenderer.send(IPC_CHANNELS.DEV_TEST_EMIT_UPDATE_EVENT, event, data),

  /**
   * Mock platform/env for testing logic.
   */
  devMockPlatform: (platform, env) =>
    ipcRenderer.send(IPC_CHANNELS.DEV_TEST_MOCK_PLATFORM, platform, env),

  // =========================================================================
  // E2E Testing Helpers
  // =========================================================================

  /**
   * Get the current tray tooltip text.
   */
  getTrayTooltip: () => ipcRenderer.invoke(IPC_CHANNELS.TRAY_GET_TOOLTIP),

  /**
   * Subscribe to checking-for-update events.
   */
  onCheckingForUpdate: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on(IPC_CHANNELS.AUTO_UPDATE_CHECKING, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.AUTO_UPDATE_CHECKING, subscription);
    };
  },

  /**
   * Get timestamp of last update check.
   */
  getLastUpdateCheckTime: () => ipcRenderer.invoke(IPC_CHANNELS.AUTO_UPDATE_GET_LAST_CHECK),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Log that preload successfully executed (helps with debugging)
console.log('[Preload] Electron API exposed to renderer');
