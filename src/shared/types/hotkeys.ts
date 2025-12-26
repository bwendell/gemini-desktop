/**
 * Hotkey Types
 *
 * Shared types for hotkey management across main and renderer processes.
 */

/**
 * Identifiers for individual hotkey features.
 */
export type HotkeyId = 'alwaysOnTop' | 'bossKey' | 'quickChat';

/**
 * All valid hotkey IDs as an array for iteration and validation.
 */
export const HOTKEY_IDS: HotkeyId[] = ['alwaysOnTop', 'bossKey', 'quickChat'];

/**
 * Individual hotkey settings returned from main process.
 * Each key represents a hotkey feature's enabled state.
 */
export interface IndividualHotkeySettings {
  /** Always on Top toggle hotkey enabled state */
  alwaysOnTop: boolean;
  /** Boss Key / Minimize hotkey enabled state */
  bossKey: boolean;
  /** Quick Chat toggle hotkey enabled state */
  quickChat: boolean;
}

/**
 * Configuration for a single hotkey, including its enabled state and accelerator.
 */
export interface HotkeyConfig {
  /** Whether the hotkey is enabled */
  enabled: boolean;
  /** The keyboard accelerator string (e.g., 'CommandOrControl+Shift+T') */
  accelerator: string;
}

/**
 * Complete hotkey settings with both enabled state and accelerator for each hotkey.
 */
export interface HotkeySettings {
  alwaysOnTop: HotkeyConfig;
  bossKey: HotkeyConfig;
  quickChat: HotkeyConfig;
}

/**
 * Accelerator settings for persistence.
 * Maps hotkey IDs to their accelerator strings.
 */
export type HotkeyAccelerators = Record<HotkeyId, string>;

/**
 * Default accelerators for each hotkey.
 * Used when no custom accelerator is configured.
 */
export const DEFAULT_ACCELERATORS: HotkeyAccelerators = {
  alwaysOnTop: 'CommandOrControl+Alt+T',
  bossKey: 'CommandOrControl+Alt+E',
  quickChat: 'CommandOrControl+Shift+Space',
};
