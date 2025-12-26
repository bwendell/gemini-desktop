/**
 * Unit tests for acceleratorUtils.
 *
 * Tests validation, parsing, formatting, and normalization of keyboard accelerator strings.
 *
 * @module acceleratorUtils.test
 */

import { describe, it, expect } from 'vitest';
import {
  parseAccelerator,
  isValidAccelerator,
  keyEventToAccelerator,
  formatAcceleratorForDisplay,
  normalizeAccelerator,
} from '../../../src/shared/utils/acceleratorUtils';

describe('acceleratorUtils', () => {
  // ==========================================================================
  // parseAccelerator
  // ==========================================================================

  describe('parseAccelerator', () => {
    it('should parse a simple accelerator', () => {
      const result = parseAccelerator('CommandOrControl+T');
      expect(result.modifiers).toEqual(['CommandOrControl']);
      expect(result.key).toBe('T');
    });

    it('should parse accelerator with multiple modifiers', () => {
      const result = parseAccelerator('CommandOrControl+Shift+T');
      expect(result.modifiers).toEqual(['CommandOrControl', 'Shift']);
      expect(result.key).toBe('T');
    });

    it('should parse accelerator with Alt modifier', () => {
      const result = parseAccelerator('CommandOrControl+Alt+E');
      expect(result.modifiers).toEqual(['CommandOrControl', 'Alt']);
      expect(result.key).toBe('E');
    });

    it('should parse accelerator with Space key', () => {
      const result = parseAccelerator('CommandOrControl+Shift+Space');
      expect(result.modifiers).toEqual(['CommandOrControl', 'Shift']);
      expect(result.key).toBe('Space');
    });

    it('should parse accelerator with function key', () => {
      const result = parseAccelerator('CommandOrControl+F12');
      expect(result.modifiers).toEqual(['CommandOrControl']);
      expect(result.key).toBe('F12');
    });

    it('should handle Ctrl shorthand', () => {
      const result = parseAccelerator('Ctrl+Shift+A');
      expect(result.modifiers).toEqual(['Ctrl', 'Shift']);
      expect(result.key).toBe('A');
    });

    it('should handle whitespace around parts', () => {
      const result = parseAccelerator(' CommandOrControl + Shift + T ');
      expect(result.modifiers).toEqual(['CommandOrControl', 'Shift']);
      expect(result.key).toBe('T');
    });
  });

  // ==========================================================================
  // isValidAccelerator
  // ==========================================================================

  describe('isValidAccelerator', () => {
    describe('valid accelerators', () => {
      it('should accept CommandOrControl+T', () => {
        expect(isValidAccelerator('CommandOrControl+T')).toBe(true);
      });

      it('should accept CommandOrControl+Shift+T', () => {
        expect(isValidAccelerator('CommandOrControl+Shift+T')).toBe(true);
      });

      it('should accept CommandOrControl+Alt+E', () => {
        expect(isValidAccelerator('CommandOrControl+Alt+E')).toBe(true);
      });

      it('should accept CommandOrControl+Shift+Space', () => {
        expect(isValidAccelerator('CommandOrControl+Shift+Space')).toBe(true);
      });

      it('should accept Ctrl+F1', () => {
        expect(isValidAccelerator('Ctrl+F1')).toBe(true);
      });

      it('should accept Alt+Tab', () => {
        expect(isValidAccelerator('Alt+Tab')).toBe(true);
      });

      it('should accept Shift+F5', () => {
        expect(isValidAccelerator('Shift+F5')).toBe(true);
      });

      it('should accept accelerators with numbers', () => {
        expect(isValidAccelerator('CommandOrControl+1')).toBe(true);
      });

      it('should accept accelerators with arrow keys', () => {
        expect(isValidAccelerator('CommandOrControl+Up')).toBe(true);
        expect(isValidAccelerator('Alt+Left')).toBe(true);
      });
    });

    describe('invalid accelerators', () => {
      it('should reject empty string', () => {
        expect(isValidAccelerator('')).toBe(false);
      });

      it('should reject null/undefined', () => {
        expect(isValidAccelerator(null as unknown as string)).toBe(false);
        expect(isValidAccelerator(undefined as unknown as string)).toBe(false);
      });

      it('should reject modifier-only accelerators', () => {
        expect(isValidAccelerator('Shift')).toBe(false);
        expect(isValidAccelerator('CommandOrControl+Shift')).toBe(false);
      });

      it('should reject key-only accelerators (no modifier)', () => {
        expect(isValidAccelerator('T')).toBe(false);
        expect(isValidAccelerator('Space')).toBe(false);
      });

      it('should reject invalid modifier names', () => {
        expect(isValidAccelerator('InvalidMod+T')).toBe(false);
      });

      it('should reject invalid key names', () => {
        expect(isValidAccelerator('CommandOrControl+InvalidKey')).toBe(false);
      });
    });
  });

  // ==========================================================================
  // keyEventToAccelerator
  // ==========================================================================

  describe('keyEventToAccelerator', () => {
    const createKeyboardEvent = (options: {
      code: string;
      key: string;
      ctrlKey?: boolean;
      metaKey?: boolean;
      altKey?: boolean;
      shiftKey?: boolean;
    }): KeyboardEvent => {
      return {
        code: options.code,
        key: options.key,
        ctrlKey: options.ctrlKey ?? false,
        metaKey: options.metaKey ?? false,
        altKey: options.altKey ?? false,
        shiftKey: options.shiftKey ?? false,
      } as KeyboardEvent;
    };

    it('should convert Ctrl+T to CommandOrControl+T', () => {
      const event = createKeyboardEvent({
        code: 'KeyT',
        key: 't',
        ctrlKey: true,
      });
      expect(keyEventToAccelerator(event)).toBe('CommandOrControl+T');
    });

    it('should convert Cmd+T to CommandOrControl+T', () => {
      const event = createKeyboardEvent({
        code: 'KeyT',
        key: 't',
        metaKey: true,
      });
      expect(keyEventToAccelerator(event)).toBe('CommandOrControl+T');
    });

    it('should convert Ctrl+Shift+T', () => {
      const event = createKeyboardEvent({
        code: 'KeyT',
        key: 'T',
        ctrlKey: true,
        shiftKey: true,
      });
      expect(keyEventToAccelerator(event)).toBe('CommandOrControl+Shift+T');
    });

    it('should convert Ctrl+Alt+E', () => {
      const event = createKeyboardEvent({
        code: 'KeyE',
        key: 'e',
        ctrlKey: true,
        altKey: true,
      });
      expect(keyEventToAccelerator(event)).toBe('CommandOrControl+Alt+E');
    });

    it('should convert Ctrl+Shift+Space', () => {
      const event = createKeyboardEvent({
        code: 'Space',
        key: ' ',
        ctrlKey: true,
        shiftKey: true,
      });
      expect(keyEventToAccelerator(event)).toBe('CommandOrControl+Shift+Space');
    });

    it('should convert function keys', () => {
      const event = createKeyboardEvent({
        code: 'F12',
        key: 'F12',
        ctrlKey: true,
      });
      expect(keyEventToAccelerator(event)).toBe('CommandOrControl+F12');
    });

    it('should convert digit keys', () => {
      const event = createKeyboardEvent({
        code: 'Digit1',
        key: '1',
        ctrlKey: true,
      });
      expect(keyEventToAccelerator(event)).toBe('CommandOrControl+1');
    });

    it('should convert arrow keys', () => {
      const event = createKeyboardEvent({
        code: 'ArrowUp',
        key: 'ArrowUp',
        ctrlKey: true,
      });
      expect(keyEventToAccelerator(event)).toBe('CommandOrControl+Up');
    });

    it('should convert escape key', () => {
      const event = createKeyboardEvent({
        code: 'Escape',
        key: 'Escape',
        ctrlKey: true,
      });
      expect(keyEventToAccelerator(event)).toBe('CommandOrControl+Escape');
    });

    it('should convert Home/End keys', () => {
      const homeEvent = createKeyboardEvent({
        code: 'Home',
        key: 'Home',
        ctrlKey: true,
      });
      expect(keyEventToAccelerator(homeEvent)).toBe('CommandOrControl+Home');

      const endEvent = createKeyboardEvent({
        code: 'End',
        key: 'End',
        ctrlKey: true,
      });
      expect(keyEventToAccelerator(endEvent)).toBe('CommandOrControl+End');
    });
  });

  // ==========================================================================
  // formatAcceleratorForDisplay
  // ==========================================================================

  describe('formatAcceleratorForDisplay', () => {
    describe('on macOS (darwin)', () => {
      it('should convert CommandOrControl to Cmd', () => {
        expect(formatAcceleratorForDisplay('CommandOrControl+T', 'darwin')).toBe('Cmd+T');
      });

      it('should convert CmdOrCtrl to Cmd', () => {
        expect(formatAcceleratorForDisplay('CmdOrCtrl+Shift+T', 'darwin')).toBe(
          'Cmd+Shift+T'
        );
      });

      it('should keep Alt as Alt', () => {
        expect(formatAcceleratorForDisplay('CommandOrControl+Alt+E', 'darwin')).toBe(
          'Cmd+Alt+E'
        );
      });

      it('should convert Meta to Cmd', () => {
        expect(formatAcceleratorForDisplay('Meta+T', 'darwin')).toBe('Cmd+T');
      });
    });

    describe('on Windows (win32)', () => {
      it('should convert CommandOrControl to Ctrl', () => {
        expect(formatAcceleratorForDisplay('CommandOrControl+T', 'win32')).toBe('Ctrl+T');
      });

      it('should convert CmdOrCtrl to Ctrl', () => {
        expect(formatAcceleratorForDisplay('CmdOrCtrl+Shift+T', 'win32')).toBe(
          'Ctrl+Shift+T'
        );
      });

      it('should convert Command to Ctrl', () => {
        expect(formatAcceleratorForDisplay('Command+T', 'win32')).toBe('Ctrl+T');
      });

      it('should convert Meta to Win', () => {
        expect(formatAcceleratorForDisplay('Meta+T', 'win32')).toBe('Win+T');
      });
    });

    describe('on Linux', () => {
      it('should convert CommandOrControl to Ctrl', () => {
        expect(formatAcceleratorForDisplay('CommandOrControl+T', 'linux')).toBe('Ctrl+T');
      });

      it('should convert Meta to Win', () => {
        expect(formatAcceleratorForDisplay('Meta+T', 'linux')).toBe('Win+T');
      });
    });

    it('should handle empty string', () => {
      expect(formatAcceleratorForDisplay('', 'darwin')).toBe('');
    });
  });

  // ==========================================================================
  // normalizeAccelerator
  // ==========================================================================

  describe('normalizeAccelerator', () => {
    it('should normalize Ctrl to CommandOrControl', () => {
      expect(normalizeAccelerator('Ctrl+T')).toBe('CommandOrControl+T');
    });

    it('should normalize Command to CommandOrControl', () => {
      expect(normalizeAccelerator('Command+T')).toBe('CommandOrControl+T');
    });

    it('should normalize CmdOrCtrl to CommandOrControl', () => {
      expect(normalizeAccelerator('CmdOrCtrl+Shift+T')).toBe('CommandOrControl+Shift+T');
    });

    it('should normalize Option to Alt', () => {
      expect(normalizeAccelerator('Option+T')).toBe('Alt+T');
    });

    it('should sort modifiers in consistent order', () => {
      // Shift before CommandOrControl should be reordered
      expect(normalizeAccelerator('Shift+Ctrl+T')).toBe('CommandOrControl+Shift+T');
      // Alt in the middle
      expect(normalizeAccelerator('Alt+Shift+Ctrl+T')).toBe('CommandOrControl+Alt+Shift+T');
    });

    it('should uppercase single character keys', () => {
      expect(normalizeAccelerator('CommandOrControl+t')).toBe('CommandOrControl+T');
    });

    it('should preserve multi-character key names', () => {
      expect(normalizeAccelerator('CommandOrControl+Space')).toBe('CommandOrControl+Space');
      expect(normalizeAccelerator('CommandOrControl+F12')).toBe('CommandOrControl+F12');
    });

    it('should remove duplicate modifiers', () => {
      expect(normalizeAccelerator('Ctrl+Control+T')).toBe('CommandOrControl+T');
    });
  });
});
