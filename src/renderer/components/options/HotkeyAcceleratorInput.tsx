/**
 * HotkeyAcceleratorInput Component
 *
 * An input component for editing hotkey accelerators with a recording mode.
 * Displays keys as individual styled "keycaps" for a polished, professional look.
 *
 * @module HotkeyAcceleratorInput
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { HotkeyId } from '../../context/IndividualHotkeysContext';
import './hotkeyAcceleratorInput.css';

// ============================================================================
// Types
// ============================================================================

interface HotkeyAcceleratorInputProps {
  /** The hotkey ID this input is for */
  hotkeyId: HotkeyId;
  /** Current accelerator string */
  currentAccelerator: string;
  /** Whether the input is disabled (hotkey is disabled) */
  disabled: boolean;
  /** Callback when the accelerator changes */
  onAcceleratorChange: (id: HotkeyId, accelerator: string) => void;
  /** Default accelerator for reset functionality */
  defaultAccelerator: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert a keyboard event to an Electron accelerator string.
 */
function keyEventToAccelerator(event: React.KeyboardEvent): string | null {
  const parts: string[] = [];

  // Must have at least one modifier
  if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
    return null;
  }

  // Add modifiers (use CommandOrControl for cross-platform)
  if (event.ctrlKey || event.metaKey) {
    parts.push('CommandOrControl');
  }
  if (event.altKey) {
    parts.push('Alt');
  }
  if (event.shiftKey) {
    parts.push('Shift');
  }

  // Skip if only modifier keys are pressed
  const modifierKeys = ['Control', 'Meta', 'Alt', 'Shift', 'CapsLock', 'NumLock', 'ScrollLock'];
  if (modifierKeys.includes(event.key)) {
    return null;
  }

  // Get the main key
  let key = '';

  if (event.code.startsWith('Key')) {
    key = event.code.slice(3); // KeyA -> A
  } else if (event.code.startsWith('Digit')) {
    key = event.code.slice(5); // Digit1 -> 1
  } else if (event.code === 'Space') {
    key = 'Space';
  } else if (event.code === 'Enter') {
    key = 'Enter';
  } else if (event.code === 'Escape') {
    return null; // Escape cancels recording
  } else if (event.code === 'Tab') {
    key = 'Tab';
  } else if (event.code === 'Backspace') {
    key = 'Backspace';
  } else if (event.code === 'Delete') {
    key = 'Delete';
  } else if (event.code.startsWith('Arrow')) {
    key = event.code.slice(5); // ArrowUp -> Up
  } else if (event.code.startsWith('F') && /^F\d{1,2}$/.test(event.code)) {
    key = event.code; // F1-F24
  } else if (event.code === 'Home') {
    key = 'Home';
  } else if (event.code === 'End') {
    key = 'End';
  } else if (event.code === 'PageUp') {
    key = 'PageUp';
  } else if (event.code === 'PageDown') {
    key = 'PageDown';
  } else {
    // Use the key value for other keys
    key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
  }

  if (!key) {
    return null;
  }

  parts.push(key);
  return parts.join('+');
}

/**
 * Parse an accelerator string into individual key parts for display.
 */
function parseAcceleratorParts(accelerator: string): string[] {
  if (!accelerator) return [];

  const isMac = window.electronAPI?.platform === 'darwin';
  const parts = accelerator.split('+');

  return parts.map((part) => {
    // Convert to display-friendly format
    switch (part) {
      case 'CommandOrControl':
      case 'CmdOrCtrl':
        return isMac ? '⌘' : 'Ctrl';
      case 'Control':
      case 'Ctrl':
        return isMac ? '⌃' : 'Ctrl';
      case 'Alt':
      case 'Option':
        return isMac ? '⌥' : 'Alt';
      case 'Shift':
        return isMac ? '⇧' : 'Shift';
      case 'Meta':
      case 'Command':
      case 'Cmd':
        return '⌘';
      case 'Space':
        return '␣';
      default:
        return part;
    }
  });
}

// ============================================================================
// Keycap Component
// ============================================================================

interface KeycapProps {
  keyLabel: string;
  isModifier?: boolean;
}

function Keycap({ keyLabel, isModifier = false }: KeycapProps) {
  const isSymbol = /^[⌘⌃⌥⇧␣]$/.test(keyLabel);
  return (
    <kbd className={`keycap ${isModifier ? 'modifier' : ''} ${isSymbol ? 'symbol' : ''}`}>
      {keyLabel}
    </kbd>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Input component for editing hotkey accelerators.
 *
 * Features:
 * - Recording mode for capturing key combinations
 * - Keycap-style display with individual key elements
 * - Platform-aware display formatting
 * - Reset to default functionality
 */
export function HotkeyAcceleratorInput({
  hotkeyId,
  currentAccelerator,
  disabled,
  onAcceleratorChange,
  defaultAccelerator,
}: HotkeyAcceleratorInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<HTMLDivElement>(null);

  // Focus the input when entering recording mode
  useEffect(() => {
    if (isRecording && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isRecording]);

  // Handle key down during recording
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isRecording) return;

      event.preventDefault();
      event.stopPropagation();

      // Escape cancels recording
      if (event.key === 'Escape') {
        setIsRecording(false);
        return;
      }

      const accelerator = keyEventToAccelerator(event);
      if (accelerator) {
        onAcceleratorChange(hotkeyId, accelerator);
        setIsRecording(false);
      }
    },
    [isRecording, hotkeyId, onAcceleratorChange]
  );

  // Handle blur - stop recording
  const handleBlur = useCallback(() => {
    setIsRecording(false);
  }, []);

  // Start recording
  const startRecording = useCallback(() => {
    if (!disabled) {
      setIsRecording(true);
    }
  }, [disabled]);

  // Reset to default
  const resetToDefault = useCallback(() => {
    if (!disabled && currentAccelerator !== defaultAccelerator) {
      onAcceleratorChange(hotkeyId, defaultAccelerator);
    }
  }, [disabled, currentAccelerator, defaultAccelerator, hotkeyId, onAcceleratorChange]);

  const keyParts = parseAcceleratorParts(currentAccelerator);
  const isDefault = currentAccelerator === defaultAccelerator;

  return (
    <div className={`hotkey-accelerator-input ${disabled ? 'disabled' : ''}`}>
      {!isDefault && (
        <button
          className="reset-button"
          onClick={resetToDefault}
          disabled={disabled}
          aria-label="Reset to default"
          title="Reset to default"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      )}
      <div
        ref={inputRef}
        className={`keycap-container ${isRecording ? 'recording' : ''}`}
        onClick={startRecording}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label={`Keyboard shortcut: ${keyParts.join(' + ')}. Click to change.`}
        aria-disabled={disabled}
      >
        {isRecording ? (
          <span className="recording-prompt">
            <span className="recording-dot" />
            Press keys...
          </span>
        ) : (
          <div className="keycaps">
            {keyParts.map((part, index) => (
              <React.Fragment key={index}>
                {index > 0 && <span className="key-separator">+</span>}
                <Keycap keyLabel={part} isModifier={index < keyParts.length - 1} />
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
