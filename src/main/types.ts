/**
 * Shared TypeScript type definitions for Electron application.
 *
 * This file re-exports shared types and defines main-process-specific types.
 * For new code, consider importing directly from '@shared/types' instead.
 */

// =========================================================================
// Re-exports from Shared Types
// =========================================================================

/**
 * Re-export all shared types for backward compatibility.
 * These types are now defined in src/shared/types/ and shared between processes.
 */
export type {
  // Theme types
  ThemePreference,
  ThemeData,

  // Hotkey types
  HotkeyId,
  IndividualHotkeySettings,
  HotkeyConfig,
  HotkeySettings,
  HotkeyAccelerators,

  // Update types
  UpdateInfo,
  DownloadProgress,

  // IPC types
  ElectronAPI,
} from '../shared/types';

// Re-export hotkey constants and scope helpers
export {
  DEFAULT_ACCELERATORS,
  HOTKEY_IDS,
  GLOBAL_HOTKEY_IDS,
  APPLICATION_HOTKEY_IDS,
  HOTKEY_SCOPE_MAP,
  getHotkeyScope,
  isGlobalHotkey,
  isApplicationHotkey,
} from '../shared/types/hotkeys';

// Re-export hotkey scope type
export type { HotkeyScope } from '../shared/types/hotkeys';

// =========================================================================
// Main Process Specific Types
// =========================================================================

/**
 * Settings store options.
 */
export interface SettingsStoreOptions {
  /** Name of the config file (without extension) */
  configName?: string;
  /** Default values for settings */
  defaults?: Record<string, unknown>;
  /** File system module (for testing) */
  fs?: typeof import('fs');
}

/**
 * Logger interface for consistent logging across modules.
 */
export interface Logger {
  log(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
}

// =========================================================================
// Global Type Augmentation
// =========================================================================

/**
 * Augment Window interface to include our Electron API.
 * This provides type safety in renderer process.
 */
declare global {
  interface Window {
    electronAPI: import('../shared/types').ElectronAPI;
  }
}
