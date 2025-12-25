/**
 * Cross-platform keyboard shortcut actions for E2E testing.
 *
 * ## Architecture
 * - Provides platform-aware keyboard shortcut sending
 * - 'CmdOrCtrl' maps to Command on macOS, Control elsewhere
 * - Extensible shortcut registry for future additions
 *
 * ## Extensibility
 * To add a new keyboard shortcut:
 * 1. Add entry to `KeyboardShortcuts` object
 * 2. Call `sendKeyboardShortcut(KeyboardShortcuts.YOUR_SHORTCUT)`
 *
 * @module keyboardActions
 */
import { browser } from '@wdio/globals';
import { isMacOS } from './platform';
import { E2ELogger } from './logger';

// ============================================================================
// Types
// ============================================================================

/**
 * Keyboard shortcut definition.
 * Uses Electron-style 'CmdOrCtrl' for cross-platform compatibility.
 */
export type KeyboardShortcut = string;

// ============================================================================
// Shortcut Registry
// ============================================================================

/**
 * Pre-defined keyboard shortcuts.
 * Add new shortcuts here for easy reuse across tests.
 */
export const KeyboardShortcuts = {
  // Window controls
  CLOSE_WINDOW: 'CmdOrCtrl+W',
  MINIMIZE: 'CmdOrCtrl+M', // macOS only - minimizes window
  TOGGLE_FULLSCREEN: 'Ctrl+Cmd+F', // macOS fullscreen toggle

  // App shortcuts
  OPTIONS: 'CmdOrCtrl+,',
  NEW_WINDOW: 'CmdOrCtrl+Shift+N',
  RELOAD: 'CmdOrCtrl+R',
  FORCE_RELOAD: 'CmdOrCtrl+Shift+R',
  DEV_TOOLS: 'CmdOrCtrl+Shift+I',

  // Navigation
  QUIT: 'CmdOrCtrl+Q',
} as const;

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Sends a keyboard shortcut, converting platform-specific modifiers.
 *
 * @param shortcut - Shortcut string (e.g., 'CmdOrCtrl+W')
 * @throws Error if shortcut format is invalid
 *
 * @example
 * await sendKeyboardShortcut(KeyboardShortcuts.CLOSE_WINDOW);
 * await sendKeyboardShortcut('CmdOrCtrl+Shift+N');
 */
export async function sendKeyboardShortcut(shortcut: KeyboardShortcut): Promise<void> {
  const mac = await isMacOS();
  const keys = parseShortcut(shortcut, mac);

  E2ELogger.info('keyboardActions', `Sending shortcut: ${shortcut} -> [${keys.join(', ')}]`);

  await browser.keys(keys);
}

/**
 * Parses a shortcut string into an array of keys for WebDriverIO.
 * Handles 'CmdOrCtrl' platform conversion.
 *
 * @param shortcut - The shortcut string
 * @param isMac - Whether running on macOS
 * @returns Array of key names
 * @private
 */
function parseShortcut(shortcut: string, isMac: boolean): string[] {
  const parts = shortcut.split('+');

  return parts.map((part) => {
    const normalized = part.trim();

    switch (normalized.toLowerCase()) {
      case 'cmdorctrl':
        return isMac ? 'Command' : 'Control';
      case 'cmd':
      case 'command':
        return 'Command';
      case 'ctrl':
      case 'control':
        return 'Control';
      case 'shift':
        return 'Shift';
      case 'alt':
      case 'option':
        return isMac ? 'Option' : 'Alt';
      default:
        // Single character keys or special keys (F1, Escape, etc.)
        return normalized;
    }
  });
}

/**
 * Sends a key combination with explicit modifier keys.
 * Lower-level API for custom key combinations.
 *
 * @param modifiers - Array of modifier keys
 * @param key - The main key to press
 */
export async function sendKeyCombo(modifiers: string[], key: string): Promise<void> {
  const keys = [...modifiers, key];
  E2ELogger.info('keyboardActions', `Sending key combo: [${keys.join(', ')}]`);
  await browser.keys(keys);
}
