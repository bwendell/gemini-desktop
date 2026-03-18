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
import { acceleratorFromKeyInput } from '../../../shared/utils/acceleratorUtils';
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
    return <kbd className={`keycap ${isModifier ? 'modifier' : ''} ${isSymbol ? 'symbol' : ''}`}>{keyLabel}</kbd>;
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
    const inputRef = useRef<HTMLButtonElement>(null);
    const captureRequestIdRef = useRef(0);
    const captureAbortControllerRef = useRef<AbortController | null>(null);
    const isWindows = window.electronAPI?.platform === 'win32';

    useEffect(() => {
        return () => {
            captureAbortControllerRef.current?.abort();
            captureAbortControllerRef.current = null;
            if (window.electronAPI?.cancelHotkeyCapture) {
                window.electronAPI.cancelHotkeyCapture();
            }
        };
    }, []);

    // Focus the input when entering recording mode
    useEffect(() => {
        if (isRecording && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isRecording]);

    useEffect(() => {
        if (!isRecording || !isWindows || !window.electronAPI?.captureNextHotkey) {
            return;
        }

        const requestId = captureRequestIdRef.current + 1;
        captureRequestIdRef.current = requestId;
        const abortController = new AbortController();
        captureAbortControllerRef.current = abortController;

        void window.electronAPI
            .captureNextHotkey()
            .then((result) => {
                if (abortController.signal.aborted || captureRequestIdRef.current !== requestId) {
                    return;
                }

                if (result.status === 'captured' && result.accelerator) {
                    onAcceleratorChange(hotkeyId, result.accelerator);
                }

                setIsRecording(false);
            })
            .catch(() => {
                if (abortController.signal.aborted || captureRequestIdRef.current !== requestId) {
                    return;
                }

                setIsRecording(false);
            });

        return () => {
            abortController.abort();
            if (captureAbortControllerRef.current === abortController) {
                captureAbortControllerRef.current = null;
            }
        };
    }, [hotkeyId, isRecording, isWindows, onAcceleratorChange]);

    // Handle key down during recording
    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            if (!isRecording) return;

            event.preventDefault();
            event.stopPropagation();

            // Escape cancels recording
            if (event.key === 'Escape') {
                if (window.electronAPI?.cancelHotkeyCapture) {
                    window.electronAPI.cancelHotkeyCapture();
                }
                setIsRecording(false);
                return;
            }

            if (isWindows) {
                return;
            }

            const accelerator = acceleratorFromKeyInput({
                ctrlKey: event.ctrlKey,
                metaKey: event.metaKey,
                altKey: event.altKey,
                shiftKey: event.shiftKey,
                key: event.key,
                code: event.code,
            });
            if (accelerator) {
                onAcceleratorChange(hotkeyId, accelerator);
                setIsRecording(false);
            }
        },
        [hotkeyId, isRecording, isWindows, onAcceleratorChange]
    );

    // Handle blur - stop recording
    const handleBlur = useCallback(() => {
        if (window.electronAPI?.cancelHotkeyCapture) {
            window.electronAPI.cancelHotkeyCapture();
        }
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
                    type="button"
                    className="reset-button"
                    onClick={resetToDefault}
                    disabled={disabled}
                    aria-label="Reset to default"
                    title="Reset to default"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <title>Reset to default</title>
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                    </svg>
                </button>
            )}
            <button
                ref={inputRef}
                type="button"
                className={`keycap-container ${isRecording ? 'recording' : ''}`}
                onClick={startRecording}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                tabIndex={disabled ? -1 : 0}
                aria-label={`Keyboard shortcut: ${keyParts.join(' + ')}. Click to change.`}
                aria-disabled={disabled}
                disabled={disabled}
            >
                {isRecording ? (
                    <span className="recording-prompt">
                        <span className="recording-dot" />
                        Press keys...
                    </span>
                ) : (
                    <div className="keycaps">
                        {keyParts.map((part, index) => (
                            <React.Fragment
                                key={`${part}-${keyParts.slice(0, index).filter((existingPart) => existingPart === part).length}`}
                            >
                                {index > 0 && <span className="key-separator">+</span>}
                                <Keycap keyLabel={part} isModifier={index < keyParts.length - 1} />
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </button>
        </div>
    );
}
