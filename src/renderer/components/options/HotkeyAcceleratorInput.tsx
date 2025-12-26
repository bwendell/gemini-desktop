/**
 * HotkeyAcceleratorInput Component
 *
 * An input component for editing hotkey accelerators with a recording mode.
 * When recording, the user can press their desired key combination
 * and it will be captured and formatted as an Electron accelerator string.
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
 * Format an accelerator for display based on platform.
 */
function formatAcceleratorForDisplay(accelerator: string): string {
  if (!accelerator) return '';

  const isMac = window.electronAPI?.platform === 'darwin';

  let display = accelerator;

  if (isMac) {
    display = display.replace(/CommandOrControl|CmdOrCtrl/g, '⌘');
    display = display.replace(/Control|Ctrl/g, '⌃');
    display = display.replace(/Alt|Option/g, '⌥');
    display = display.replace(/Shift/g, '⇧');
    display = display.replace(/\+/g, '');
  } else {
    display = display.replace(/CommandOrControl|CmdOrCtrl/g, 'Ctrl');
    display = display.replace(/\+/g, ' + ');
  }

  return display;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Input component for editing hotkey accelerators.
 *
 * Features:
 * - Recording mode for capturing key combinations
 * - Platform-aware display formatting
 * - Reset to default functionality
 * - Disabled state when hotkey is disabled
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

  const displayValue = formatAcceleratorForDisplay(currentAccelerator);
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
          ↩️
        </button>
      )}
      <div
        ref={inputRef}
        className={`accelerator-display ${isRecording ? 'recording' : ''}`}
        onClick={startRecording}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label={`Keyboard shortcut: ${displayValue}. Click to change.`}
        aria-disabled={disabled}
      >
        {isRecording ? (
          <span className="recording-prompt">Press keys...</span>
        ) : (
          <span className="accelerator-text">{displayValue}</span>
        )}
      </div>
    </div>
  );
}
