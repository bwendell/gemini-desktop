/**
 * Unit tests for CapsuleToggle component.
 * 
 * This test suite validates the CapsuleToggle component which provides a 
 * pill-shaped toggle switch used for settings like the hotkey toggle.
 * 
 * ## Test Coverage
 * 
 * - **Rendering**: Label, description, custom testId, switch element
 * - **Checked state**: Visual state matching aria-checked attribute
 * - **Click interactions**: Toggle on/off via mouse clicks
 * - **Keyboard accessibility**: Enter/Space key support, key filtering
 * - **Disabled state**: Click/keyboard blocking, visual disabled state
 * - **ARIA accessibility**: role="switch", aria-labelledby, aria-describedby
 * 
 * ## Testing Approach
 * 
 * Uses @testing-library/react with fireEvent for user interactions.
 * Each test renders the component with specific props and verifies:
 * - DOM element existence (via data-testid and getByText)
 * - ARIA attributes (via toHaveAttribute)
 * - CSS classes (via toHaveClass)
 * - Callback invocations (via mock function assertions)
 * 
 * ## Accessibility Testing
 * 
 * Special focus on WAI-ARIA Switch pattern compliance:
 * - `role="switch"` for screen reader announcement
 * - `aria-checked` state synchronization
 * - `aria-labelledby` / `aria-describedby` associations
 * - Keyboard interaction (Enter, Space)
 * 
 * @module CapsuleToggle.test
 * @see CapsuleToggle - The component being tested
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CapsuleToggle } from './CapsuleToggle';

// ============================================================================
// Test Suite
// ============================================================================

describe('CapsuleToggle', () => {
    /** Mock onChange callback for verifying toggle interactions */
    let mockOnChange: ReturnType<typeof vi.fn>;

    /**
     * Set up fresh mock before each test.
     */
    beforeEach(() => {
        vi.clearAllMocks();
        mockOnChange = vi.fn();
    });

    // ========================================================================
    // Rendering Tests
    // ========================================================================

    describe('rendering', () => {

        it('should render the toggle with label', () => {
            render(
                <CapsuleToggle
                    checked={false}
                    onChange={mockOnChange}
                    label="Test Label"
                />
            );

            expect(screen.getByText('Test Label')).toBeInTheDocument();
            expect(screen.getByTestId('capsule-toggle')).toBeInTheDocument();
        });

        it('should render the switch element', () => {
            render(
                <CapsuleToggle
                    checked={false}
                    onChange={mockOnChange}
                    label="Test Label"
                />
            );

            expect(screen.getByTestId('capsule-toggle-switch')).toBeInTheDocument();
        });

        it('should render description when provided', () => {
            render(
                <CapsuleToggle
                    checked={false}
                    onChange={mockOnChange}
                    label="Test Label"
                    description="Test description text"
                />
            );

            expect(screen.getByText('Test description text')).toBeInTheDocument();
        });

        it('should not render description when not provided', () => {
            render(
                <CapsuleToggle
                    checked={false}
                    onChange={mockOnChange}
                    label="Test Label"
                />
            );

            expect(screen.queryByText('Test description text')).not.toBeInTheDocument();
        });

        it('should use custom testId when provided', () => {
            render(
                <CapsuleToggle
                    checked={false}
                    onChange={mockOnChange}
                    label="Test Label"
                    testId="custom-toggle"
                />
            );

            expect(screen.getByTestId('custom-toggle')).toBeInTheDocument();
            expect(screen.getByTestId('custom-toggle-switch')).toBeInTheDocument();
        });
    });

    describe('checked state', () => {
        it('should show unchecked state when checked is false', () => {
            render(
                <CapsuleToggle
                    checked={false}
                    onChange={mockOnChange}
                    label="Test Label"
                />
            );

            const switchElement = screen.getByTestId('capsule-toggle-switch');
            expect(switchElement).toHaveAttribute('aria-checked', 'false');
            expect(switchElement).not.toHaveClass('capsule-toggle__switch--checked');
        });

        it('should show checked state when checked is true', () => {
            render(
                <CapsuleToggle
                    checked={true}
                    onChange={mockOnChange}
                    label="Test Label"
                />
            );

            const switchElement = screen.getByTestId('capsule-toggle-switch');
            expect(switchElement).toHaveAttribute('aria-checked', 'true');
            expect(switchElement).toHaveClass('capsule-toggle__switch--checked');
        });
    });

    describe('click interactions', () => {
        it('should call onChange with true when clicked while unchecked', () => {
            render(
                <CapsuleToggle
                    checked={false}
                    onChange={mockOnChange}
                    label="Test Label"
                />
            );

            fireEvent.click(screen.getByTestId('capsule-toggle-switch'));
            expect(mockOnChange).toHaveBeenCalledWith(true);
            expect(mockOnChange).toHaveBeenCalledTimes(1);
        });

        it('should call onChange with false when clicked while checked', () => {
            render(
                <CapsuleToggle
                    checked={true}
                    onChange={mockOnChange}
                    label="Test Label"
                />
            );

            fireEvent.click(screen.getByTestId('capsule-toggle-switch'));
            expect(mockOnChange).toHaveBeenCalledWith(false);
            expect(mockOnChange).toHaveBeenCalledTimes(1);
        });
    });

    describe('keyboard accessibility', () => {
        it('should toggle on Enter key press', () => {
            render(
                <CapsuleToggle
                    checked={false}
                    onChange={mockOnChange}
                    label="Test Label"
                />
            );

            const switchElement = screen.getByTestId('capsule-toggle-switch');
            fireEvent.keyDown(switchElement, { key: 'Enter' });

            expect(mockOnChange).toHaveBeenCalledWith(true);
        });

        it('should toggle on Space key press', () => {
            render(
                <CapsuleToggle
                    checked={false}
                    onChange={mockOnChange}
                    label="Test Label"
                />
            );

            const switchElement = screen.getByTestId('capsule-toggle-switch');
            fireEvent.keyDown(switchElement, { key: ' ' });

            expect(mockOnChange).toHaveBeenCalledWith(true);
        });

        it('should not toggle on other key presses', () => {
            render(
                <CapsuleToggle
                    checked={false}
                    onChange={mockOnChange}
                    label="Test Label"
                />
            );

            const switchElement = screen.getByTestId('capsule-toggle-switch');
            fireEvent.keyDown(switchElement, { key: 'Tab' });
            fireEvent.keyDown(switchElement, { key: 'Escape' });
            fireEvent.keyDown(switchElement, { key: 'a' });

            expect(mockOnChange).not.toHaveBeenCalled();
        });
    });

    describe('disabled state', () => {
        it('should not call onChange when clicked while disabled', () => {
            render(
                <CapsuleToggle
                    checked={false}
                    onChange={mockOnChange}
                    label="Test Label"
                    disabled={true}
                />
            );

            fireEvent.click(screen.getByTestId('capsule-toggle-switch'));
            expect(mockOnChange).not.toHaveBeenCalled();
        });

        it('should not toggle on keyboard when disabled', () => {
            render(
                <CapsuleToggle
                    checked={false}
                    onChange={mockOnChange}
                    label="Test Label"
                    disabled={true}
                />
            );

            const switchElement = screen.getByTestId('capsule-toggle-switch');
            fireEvent.keyDown(switchElement, { key: 'Enter' });
            fireEvent.keyDown(switchElement, { key: ' ' });

            expect(mockOnChange).not.toHaveBeenCalled();
        });

        it('should have disabled class when disabled', () => {
            render(
                <CapsuleToggle
                    checked={false}
                    onChange={mockOnChange}
                    label="Test Label"
                    disabled={true}
                />
            );

            expect(screen.getByTestId('capsule-toggle')).toHaveClass('capsule-toggle--disabled');
        });

        it('should set aria-disabled on switch when disabled', () => {
            render(
                <CapsuleToggle
                    checked={false}
                    onChange={mockOnChange}
                    label="Test Label"
                    disabled={true}
                />
            );

            const switchElement = screen.getByTestId('capsule-toggle-switch');
            expect(switchElement).toHaveAttribute('aria-disabled', 'true');
            expect(switchElement).toBeDisabled();
        });
    });

    describe('accessibility', () => {
        it('should have role="switch" on the button', () => {
            render(
                <CapsuleToggle
                    checked={false}
                    onChange={mockOnChange}
                    label="Test Label"
                />
            );

            const switchElement = screen.getByTestId('capsule-toggle-switch');
            expect(switchElement).toHaveAttribute('role', 'switch');
        });

        it('should be associated with label via aria-labelledby', () => {
            render(
                <CapsuleToggle
                    checked={false}
                    onChange={mockOnChange}
                    label="Test Label"
                    testId="my-toggle"
                />
            );

            const switchElement = screen.getByTestId('my-toggle-switch');
            expect(switchElement).toHaveAttribute('aria-labelledby', 'my-toggle-label');
        });

        it('should be associated with description via aria-describedby when provided', () => {
            render(
                <CapsuleToggle
                    checked={false}
                    onChange={mockOnChange}
                    label="Test Label"
                    description="Help text"
                    testId="my-toggle"
                />
            );

            const switchElement = screen.getByTestId('my-toggle-switch');
            expect(switchElement).toHaveAttribute('aria-describedby', 'my-toggle-description');
        });

        it('should not have aria-describedby when description is not provided', () => {
            render(
                <CapsuleToggle
                    checked={false}
                    onChange={mockOnChange}
                    label="Test Label"
                    testId="my-toggle"
                />
            );

            const switchElement = screen.getByTestId('my-toggle-switch');
            expect(switchElement).not.toHaveAttribute('aria-describedby');
        });
    });
});
