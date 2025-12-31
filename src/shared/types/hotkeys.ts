/**
 * Hotkey Types
 *
 * Shared types for hotkey management across main and renderer processes.
 */

/**
 * Identifiers for individual hotkey features.
 */
export type HotkeyId = 'alwaysOnTop' | 'bossKey' | 'quickChat' | 'printToPdf';

/**
 * All valid hotkey IDs as an array for iteration and validation.
 */
export const HOTKEY_IDS: HotkeyId[] = ['alwaysOnTop', 'bossKey', 'quickChat', 'printToPdf'];

/**
 * Scope of a hotkey determining its registration mechanism.
 * - 'global': Registered via globalShortcut, works system-wide
 * - 'application': Registered via Menu accelerators, works only when app focused
 */
export type HotkeyScope = 'global' | 'application';

/**
 * Hotkeys that work system-wide via Electron's globalShortcut API.
 * These work even when the application is not focused.
 */
export const GLOBAL_HOTKEY_IDS: HotkeyId[] = ['quickChat', 'bossKey'];

/**
 * Hotkeys that work only when the application window is focused.
 * These are registered via Menu accelerators.
 */
export const APPLICATION_HOTKEY_IDS: HotkeyId[] = ['alwaysOnTop', 'printToPdf'];

/**
 * Maps each hotkey ID to its scope.
 */
export const HOTKEY_SCOPE_MAP: Record<HotkeyId, HotkeyScope> = {
  quickChat: 'global',
  bossKey: 'global',
  alwaysOnTop: 'application',
  printToPdf: 'application',
};

/**
 * Get the scope of a hotkey.
 * @param id - The hotkey identifier
 * @returns The scope ('global' or 'application')
 */
export function getHotkeyScope(id: HotkeyId): HotkeyScope {
  return HOTKEY_SCOPE_MAP[id];
}

/**
 * Check if a hotkey is a global hotkey (works system-wide).
 * @param id - The hotkey identifier
 * @returns True if the hotkey is global
 */
export function isGlobalHotkey(id: HotkeyId): boolean {
  return HOTKEY_SCOPE_MAP[id] === 'global';
}

/**
 * Check if a hotkey is an application hotkey (works only when app focused).
 * @param id - The hotkey identifier
 * @returns True if the hotkey is application-scoped
 */
export function isApplicationHotkey(id: HotkeyId): boolean {
  return HOTKEY_SCOPE_MAP[id] === 'application';
}

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
  /** Print to PDF hotkey enabled state */
  printToPdf: boolean;
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
  printToPdf: HotkeyConfig;
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
  // Ctrl+Alt+P = Pin window (always on top)
  // Note: Ctrl+Alt+T conflicts with GNOME terminal shortcut
  alwaysOnTop: 'CommandOrControl+Alt+P',
  // Ctrl+Alt+H = Hide window (boss key)
  // Note: Ctrl+Alt+E was not conflicting but H is more intuitive
  bossKey: 'CommandOrControl+Alt+H',
  // Ctrl+Shift+Space = Quick Chat toggle
  quickChat: 'CommandOrControl+Shift+Space',
  // Ctrl+Shift+P = Print to PDF
  printToPdf: 'CommandOrControl+Shift+P',
};
