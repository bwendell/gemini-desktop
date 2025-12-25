/**
 * CapsuleToggle Component
 * 
 * A reusable pill-shaped toggle switch with smooth animations.
 * Designed to match modern UI patterns with full accessibility support.
 * 
 * ## Visual Design
 * 
 * The toggle consists of:
 * - A track (pill-shaped background)
 * - A thumb (circular indicator that slides)
 * - Label text (positioned to the left)
 * - Optional description text (below the label)
 * 
 * ## Animations
 * 
 * - Thumb slides smoothly when toggled (CSS transform)
 * - Background color transitions for visual feedback
 * - Hover effects on the thumb
 * 
 * ## Accessibility
 * 
 * - Uses `role="switch"` for proper screen reader announcement
 * - `aria-checked` reflects current state
 * - Keyboard support: Space and Enter to toggle
 * - `aria-labelledby` and `aria-describedby` for context
 * - Focus indicator for keyboard navigation
 * 
 * ## Theme Support
 * 
 * Colors are defined using CSS custom properties, allowing the toggle
 * to automatically adapt to light/dark themes.
 * 
 * @module CapsuleToggle
 * @see CapsuleToggle.css - Styles for this component
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <CapsuleToggle
 *     checked={isEnabled}
 *     onChange={setIsEnabled}
 *     label="Enable Feature"
 * />
 * 
 * // With description
 * <CapsuleToggle
 *     checked={isEnabled}
 *     onChange={setIsEnabled}
 *     label="Enable Feature"
 *     description="Turn on this feature for extra functionality"
 * />
 * ```
 */

import React, { useCallback, memo } from 'react';
import './CapsuleToggle.css';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the CapsuleToggle component.
 * 
 * @interface CapsuleToggleProps
 */
export interface CapsuleToggleProps {
    /** Current checked state (true = ON, false = OFF) */
    checked: boolean;

    /** Callback fired when toggle state changes */
    onChange: (checked: boolean) => void;

    /** Primary label text displayed next to the toggle */
    label: string;

    /** Optional secondary description text below the label */
    description?: string;

    /** Whether the toggle is disabled (non-interactive) */
    disabled?: boolean;

    /** Test ID for automated testing (e.g., 'hotkey-toggle') */
    testId?: string;
}

// ============================================================================
// Component
// ============================================================================


/**
 * Capsule (pill-shaped) toggle switch component.
 * 
 * Provides a visually appealing toggle with smooth animations.
 * Accessible via keyboard (Space/Enter to toggle).
 */
export const CapsuleToggle = memo(function CapsuleToggle({
    checked,
    onChange,
    label,
    description,
    disabled = false,
    testId = 'capsule-toggle'
}: CapsuleToggleProps) {
    /**
     * Handle toggle click.
     */
    const handleClick = useCallback(() => {
        if (!disabled) {
            onChange(!checked);
        }
    }, [checked, onChange, disabled]);

    /**
     * Handle keyboard interaction for accessibility.
     * Activates on Enter or Space key press.
     */
    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        if (disabled) return;

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onChange(!checked);
        }
    }, [checked, onChange, disabled]);

    const toggleId = `${testId}-button`;
    const labelId = `${testId}-label`;
    const descriptionId = description ? `${testId}-description` : undefined;

    return (
        <div
            className={`capsule-toggle ${disabled ? 'capsule-toggle--disabled' : ''}`}
            data-testid={testId}
        >
            <div className="capsule-toggle__content">
                <label
                    id={labelId}
                    className="capsule-toggle__label"
                    htmlFor={toggleId}
                >
                    {label}
                </label>
                {description && (
                    <span
                        id={descriptionId}
                        className="capsule-toggle__description"
                    >
                        {description}
                    </span>
                )}
            </div>

            <button
                id={toggleId}
                type="button"
                role="switch"
                aria-checked={checked}
                aria-labelledby={labelId}
                aria-describedby={descriptionId}
                aria-disabled={disabled}
                className={`capsule-toggle__switch ${checked ? 'capsule-toggle__switch--checked' : ''}`}
                onClick={handleClick}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                data-testid={`${testId}-switch`}
            >
                <span className="capsule-toggle__thumb" aria-hidden="true" />
            </button>
        </div>
    );
});

export default CapsuleToggle;
