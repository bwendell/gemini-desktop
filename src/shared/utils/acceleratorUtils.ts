/**
 * Accelerator Utilities
 *
 * Utility functions for validating, formatting, and parsing keyboard accelerator strings.
 * These are used across main and renderer processes for hotkey configuration.
 *
 * @module acceleratorUtils
 */

/**
 * Valid modifier keys for accelerators.
 */
export const VALID_MODIFIERS = [
  'Command',
  'Cmd',
  'Control',
  'Ctrl',
  'CommandOrControl',
  'CmdOrCtrl',
  'Alt',
  'Option',
  'AltGr',
  'Shift',
  'Super',
  'Meta',
] as const;

/**
 * Valid non-modifier keys for accelerators.
 * This is not exhaustive but covers common use cases.
 */
export const VALID_KEYS = [
  // Letters
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  // Numbers
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  // Function keys
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  'F13', 'F14', 'F15', 'F16', 'F17', 'F18', 'F19', 'F20', 'F21', 'F22', 'F23', 'F24',
  // Special keys
  'Space', 'Tab', 'Backspace', 'Delete', 'Insert', 'Return', 'Enter', 'Escape', 'Esc',
  'Up', 'Down', 'Left', 'Right',
  'Home', 'End', 'PageUp', 'PageDown',
  'Plus', 'Minus', 'Equal',
  'numadd', 'numsub', 'nummult', 'numdiv',
  'num0', 'num1', 'num2', 'num3', 'num4', 'num5', 'num6', 'num7', 'num8', 'num9',
  'numdec', 'numlock',
  // Punctuation
  '`', '-', '=', '[', ']', '\\', ';', "'", ',', '.', '/',
  'Backquote', 'Minus', 'Equal', 'BracketLeft', 'BracketRight', 'Backslash',
  'Semicolon', 'Quote', 'Comma', 'Period', 'Slash',
  // Media keys
  'MediaPlayPause', 'MediaStop', 'MediaNextTrack', 'MediaPreviousTrack',
  'VolumeUp', 'VolumeDown', 'VolumeMute',
  // Other
  'PrintScreen', 'ScrollLock', 'Pause', 'CapsLock', 'NumLock',
] as const;

/**
 * Result of parsing an accelerator string.
 */
export interface ParsedAccelerator {
  /** Array of modifier keys (e.g., ['CommandOrControl', 'Shift']) */
  modifiers: string[];
  /** The main key (e.g., 'T', 'Space') */
  key: string;
}

/**
 * Parse an accelerator string into its component parts.
 *
 * @param accelerator - The accelerator string (e.g., 'CommandOrControl+Shift+T')
 * @returns Parsed accelerator with modifiers and key
 *
 * @example
 * parseAccelerator('CommandOrControl+Shift+T')
 * // Returns: { modifiers: ['CommandOrControl', 'Shift'], key: 'T' }
 */
export function parseAccelerator(accelerator: string): ParsedAccelerator {
  const parts = accelerator.split('+').map((p) => p.trim());
  const modifiers: string[] = [];
  let key = '';

  for (const part of parts) {
    const isModifier = VALID_MODIFIERS.some(
      (mod) => mod.toLowerCase() === part.toLowerCase()
    );
    if (isModifier) {
      modifiers.push(part);
    } else {
      key = part;
    }
  }

  return { modifiers, key };
}

/**
 * Validate an accelerator string format.
 *
 * Checks that:
 * - The string has at least one modifier and one key
 * - All parts are recognized modifiers or keys
 * - The format is valid (parts separated by '+')
 *
 * @param accelerator - The accelerator string to validate
 * @returns True if the accelerator is valid, false otherwise
 *
 * @example
 * isValidAccelerator('CommandOrControl+Shift+T') // true
 * isValidAccelerator('InvalidMod+X') // false
 * isValidAccelerator('Shift') // false (no key)
 */
export function isValidAccelerator(accelerator: string): boolean {
  if (!accelerator || typeof accelerator !== 'string') {
    return false;
  }

  const trimmed = accelerator.trim();
  if (trimmed.length === 0) {
    return false;
  }

  const { modifiers, key } = parseAccelerator(trimmed);

  // Must have at least one modifier
  if (modifiers.length === 0) {
    return false;
  }

  // Must have a key
  if (!key) {
    return false;
  }

  // Validate modifiers
  const allModifiersValid = modifiers.every((mod) =>
    VALID_MODIFIERS.some((valid) => valid.toLowerCase() === mod.toLowerCase())
  );
  if (!allModifiersValid) {
    return false;
  }

  // Validate key (case-insensitive check)
  const keyValid = VALID_KEYS.some(
    (valid) => valid.toLowerCase() === key.toLowerCase()
  );

  return keyValid;
}

/**
 * Convert a keyboard event to an accelerator string.
 *
 * @param event - The keyboard event from key press
 * @returns The accelerator string representing the key combination
 *
 * @example
 * // User presses Ctrl+Shift+T
 * keyEventToAccelerator(event) // 'CommandOrControl+Shift+T'
 */
export function keyEventToAccelerator(event: KeyboardEvent): string {
  const parts: string[] = [];

  // Modifiers (use CommandOrControl for cross-platform)
  if (event.ctrlKey || event.metaKey) {
    parts.push('CommandOrControl');
  }
  if (event.altKey) {
    parts.push('Alt');
  }
  if (event.shiftKey) {
    parts.push('Shift');
  }

  // Get the main key
  let key = '';

  // Handle special keys
  if (event.code.startsWith('Key')) {
    // KeyA -> A
    key = event.code.slice(3);
  } else if (event.code.startsWith('Digit')) {
    // Digit1 -> 1
    key = event.code.slice(5);
  } else if (event.code.startsWith('Numpad')) {
    // Numpad0 -> num0
    const numKey = event.code.slice(6);
    if (/^\d$/.test(numKey)) {
      key = `num${numKey}`;
    } else {
      key = `num${numKey.toLowerCase()}`;
    }
  } else if (event.code === 'Space') {
    key = 'Space';
  } else if (event.code === 'Enter') {
    key = 'Enter';
  } else if (event.code === 'Escape') {
    key = 'Escape';
  } else if (event.code === 'Tab') {
    key = 'Tab';
  } else if (event.code === 'Backspace') {
    key = 'Backspace';
  } else if (event.code === 'Delete') {
    key = 'Delete';
  } else if (event.code === 'Insert') {
    key = 'Insert';
  } else if (event.code.startsWith('Arrow')) {
    // ArrowUp -> Up
    key = event.code.slice(5);
  } else if (event.code.startsWith('F') && /^F\d{1,2}$/.test(event.code)) {
    // F1-F24
    key = event.code;
  } else if (event.code === 'Home') {
    key = 'Home';
  } else if (event.code === 'End') {
    key = 'End';
  } else if (event.code === 'PageUp') {
    key = 'PageUp';
  } else if (event.code === 'PageDown') {
    key = 'PageDown';
  } else if (event.code === 'Backquote') {
    key = '`';
  } else if (event.code === 'Minus') {
    key = '-';
  } else if (event.code === 'Equal') {
    key = '=';
  } else if (event.code === 'BracketLeft') {
    key = '[';
  } else if (event.code === 'BracketRight') {
    key = ']';
  } else if (event.code === 'Backslash') {
    key = '\\';
  } else if (event.code === 'Semicolon') {
    key = ';';
  } else if (event.code === 'Quote') {
    key = "'";
  } else if (event.code === 'Comma') {
    key = ',';
  } else if (event.code === 'Period') {
    key = '.';
  } else if (event.code === 'Slash') {
    key = '/';
  } else {
    // Fallback: use the key value
    key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
  }

  if (key) {
    parts.push(key);
  }

  return parts.join('+');
}

/**
 * Format an accelerator string for display based on the platform.
 *
 * Converts internal accelerator format to user-friendly display:
 * - 'CommandOrControl' -> 'Ctrl' (Windows/Linux) or 'Cmd' (macOS)
 * - 'Alt' -> 'Alt' (Windows/Linux) or 'Option' (macOS)
 *
 * @param accelerator - The accelerator string in Electron format
 * @param platform - The current platform ('darwin', 'win32', 'linux')
 * @returns User-friendly display string
 *
 * @example
 * formatAcceleratorForDisplay('CommandOrControl+Shift+T', 'darwin')
 * // Returns: 'Cmd+Shift+T'
 *
 * formatAcceleratorForDisplay('CommandOrControl+Shift+T', 'win32')
 * // Returns: 'Ctrl+Shift+T'
 */
export function formatAcceleratorForDisplay(
  accelerator: string,
  platform: NodeJS.Platform
): string {
  if (!accelerator) return '';

  const isMac = platform === 'darwin';

  let display = accelerator;

  // Replace CommandOrControl and CmdOrCtrl
  if (isMac) {
    display = display.replace(/CommandOrControl|CmdOrCtrl/g, 'Cmd');
    display = display.replace(/Control|Ctrl/g, 'Ctrl'); // Keep Ctrl explicit if used
    display = display.replace(/Command|Cmd/g, 'Cmd');
  } else {
    display = display.replace(/CommandOrControl|CmdOrCtrl/g, 'Ctrl');
    display = display.replace(/Command|Cmd/g, 'Ctrl'); // Map Cmd to Ctrl on non-Mac
    display = display.replace(/Control/g, 'Ctrl');
  }

  // Replace Meta/Super
  if (isMac) {
    display = display.replace(/Meta|Super/g, 'Cmd');
  } else {
    display = display.replace(/Meta|Super/g, 'Win');
  }

  return display;
}

/**
 * Normalize an accelerator string to canonical form.
 *
 * Ensures consistent ordering and casing:
 * - Modifiers in order: CommandOrControl, Alt, Shift
 * - Key in uppercase (for letters)
 *
 * @param accelerator - The accelerator string to normalize
 * @returns Normalized accelerator string
 */
export function normalizeAccelerator(accelerator: string): string {
  const { modifiers, key } = parseAccelerator(accelerator);

  // Normalize modifiers to canonical form
  const normalizedModifiers = modifiers.map((mod) => {
    const lower = mod.toLowerCase();
    if (lower === 'control' || lower === 'ctrl') return 'CommandOrControl';
    if (lower === 'command' || lower === 'cmd') return 'CommandOrControl';
    if (lower === 'cmdorctrl' || lower === 'commandorcontrol') return 'CommandOrControl';
    if (lower === 'option') return 'Alt';
    if (lower === 'meta' || lower === 'super') return 'CommandOrControl';
    if (lower === 'alt') return 'Alt';
    if (lower === 'shift') return 'Shift';
    // Unknown modifier - return as-is with capitalized first letter
    return mod.charAt(0).toUpperCase() + mod.slice(1);
  });

  // Remove duplicates
  const uniqueModifiers = [...new Set(normalizedModifiers)];

  // Sort modifiers in consistent order
  const modifierOrder = ['CommandOrControl', 'Alt', 'Shift'];
  uniqueModifiers.sort((a, b) => {
    const aIndex = modifierOrder.indexOf(a);
    const bIndex = modifierOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  // Normalize key
  const normalizedKey = key.length === 1 ? key.toUpperCase() : key;

  return [...uniqueModifiers, normalizedKey].join('+');
}
