/**
 * IPC Types
 *
 * Type-safe IPC communication interfaces between main and renderer processes.
 * Defines the ElectronAPI that is exposed to the renderer via contextBridge.
 */

import type { ThemeData, ThemePreference } from './theme';
import type { HotkeyId, IndividualHotkeySettings, HotkeyAccelerators, HotkeySettings } from './hotkeys';
import type { UpdateInfo, DownloadProgress } from './updates';

/**
 * Electron API exposed to renderer process via contextBridge.
 * Available as `window.electronAPI` in renderer.
 *
 * This interface defines all IPC methods that can be called from the renderer process.
 */
export interface ElectronAPI {
  // =========================================================================
  // Window Controls
  // =========================================================================

  /** Minimize the current window */
  minimizeWindow: () => void;

  /** Maximize or restore the current window */
  maximizeWindow: () => void;

  /** Close the current window */
  closeWindow: () => void;

  /** Show the current window */
  showWindow: () => void;

  /** Check if the window is currently maximized */
  isMaximized: () => Promise<boolean>;

  /** Open the options/settings window */
  openOptions: (tab?: 'settings' | 'about') => void;

  /** Open Google sign-in window */
  openGoogleSignIn: () => Promise<void>;

  // =========================================================================
  // Platform Detection
  // =========================================================================

  /** Current platform (darwin, win32, linux) */
  platform: NodeJS.Platform;

  /** Always true - indicates running in Electron */
  isElectron: true;

  // =========================================================================
  // Theme API
  // =========================================================================

  /** Get current theme data */
  getTheme: () => Promise<ThemeData>;

  /** Set theme preference */
  setTheme: (theme: ThemePreference) => void;

  /** Listen for theme changes. Returns unsubscribe function. */
  onThemeChanged: (callback: (themeData: ThemeData) => void) => () => void;

  // =========================================================================
  // Quick Chat API
  // =========================================================================

  /** Submit quick chat text to main window */
  submitQuickChat: (text: string) => void;

  /** Hide the quick chat window */
  hideQuickChat: () => void;

  /** Cancel quick chat (hide without submitting) */
  cancelQuickChat: () => void;

  /** Listen for quick chat execution. Returns unsubscribe function. */
  onQuickChatExecute: (callback: (text: string) => void) => () => void;

  // =========================================================================
  // Individual Hotkeys API
  // =========================================================================

  /** Get individual hotkey settings */
  getIndividualHotkeys: () => Promise<IndividualHotkeySettings>;

  /** Set individual hotkey enabled state */
  setIndividualHotkey: (id: HotkeyId, enabled: boolean) => void;

  /** Listen for individual hotkey changes. Returns unsubscribe function. */
  onIndividualHotkeysChanged: (
    callback: (settings: IndividualHotkeySettings) => void
  ) => () => void;

  // =========================================================================
  // Hotkey Accelerators API
  // =========================================================================

  /** Get current hotkey accelerators */
  getHotkeyAccelerators: () => Promise<HotkeyAccelerators>;

  /** Get full hotkey settings (enabled states + accelerators) */
  getFullHotkeySettings: () => Promise<HotkeySettings>;

  /** Set accelerator for a specific hotkey */
  setHotkeyAccelerator: (id: HotkeyId, accelerator: string) => void;

  /** Listen for hotkey accelerator changes. Returns unsubscribe function. */
  onHotkeyAcceleratorsChanged: (
    callback: (accelerators: HotkeyAccelerators) => void
  ) => () => void;

  // =========================================================================
  // Always On Top API
  // =========================================================================

  /** Get always on top state */
  getAlwaysOnTop: () => Promise<{ enabled: boolean }>;

  /** Set always on top state */
  setAlwaysOnTop: (enabled: boolean) => void;

  /** Listen for always on top changes. Returns unsubscribe function. */
  onAlwaysOnTopChanged: (callback: (data: { enabled: boolean }) => void) => () => void;

  // =========================================================================
  // Auto-Update API
  // =========================================================================

  /** Get auto-update enabled state */
  getAutoUpdateEnabled: () => Promise<boolean>;

  /** Set auto-update enabled state */
  setAutoUpdateEnabled: (enabled: boolean) => void;

  /** Manually check for updates */
  checkForUpdates: () => void;

  /** Install downloaded update and restart app */
  installUpdate: () => void;

  /** Listen for update available. Returns unsubscribe function. */
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;

  /** Listen for update downloaded. Returns unsubscribe function. */
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => () => void;

  /** Listen for update errors. Returns unsubscribe function. */
  onUpdateError: (callback: (error: string) => void) => () => void;

  /** Listen for update not available. Returns unsubscribe function. */
  onUpdateNotAvailable: (callback: (info: UpdateInfo) => void) => () => void;

  /** Listen for download progress. Returns unsubscribe function. */
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => () => void;

  // =========================================================================
  // Dev Testing API (only for manual testing in development)
  // =========================================================================

  /** Show test badge (dev only) */
  devShowBadge: (version?: string) => void;

  /** Clear test badge (dev only) */
  devClearBadge: () => void;

  /** Set update enabled (dev only) */
  devSetUpdateEnabled: (enabled: boolean) => void;

  /** Emit mock update event (dev only) */
  devEmitUpdateEvent: (event: string, data: any) => void;

  /** Mock platform (dev only) */
  devMockPlatform: (platform: NodeJS.Platform | null, env: Record<string, string> | null) => void;

  // =========================================================================
  // E2E Testing Helpers
  // =========================================================================

  /** Get tray tooltip (for testing) */
  getTrayTooltip: () => Promise<string>;

  /** Listen for checking for update event. Returns unsubscribe function. */
  onCheckingForUpdate: (callback: () => void) => () => void;

  /** Get last update check timestamp */
  getLastUpdateCheckTime: () => Promise<number>;
}
