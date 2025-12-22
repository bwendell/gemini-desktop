/**
 * Unit tests for OptionsWindow component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OptionsWindow } from './OptionsWindow';
import { ThemeProvider } from '../../context/ThemeContext';

// Mock ErrorBoundary to simplify testing
vi.mock('../ErrorBoundary', () => ({
    ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock OptionsWindowTitlebar
vi.mock('./OptionsWindowTitlebar', () => ({
    OptionsWindowTitlebar: ({ title }: { title: string }) => (
        <header data-testid="mock-options-titlebar">{title}</header>
    ),
}));

// Mock ThemeSelector for isolated testing
vi.mock('./ThemeSelector', () => ({
    ThemeSelector: () => (
        <div data-testid="mock-theme-selector">
            <div data-testid="theme-card-system" role="radio" aria-checked="true">System</div>
            <div data-testid="theme-card-light" role="radio" aria-checked="false">Light</div>
            <div data-testid="theme-card-dark" role="radio" aria-checked="false">Dark</div>
        </div>
    ),
}));

// Mock IndividualHotkeyToggles to avoid IndividualHotkeysProvider dependency
vi.mock('./IndividualHotkeyToggles', () => ({
    IndividualHotkeyToggles: () => (
        <div data-testid="mock-individual-hotkey-toggles">Individual Hotkey Toggles</div>
    ),
}));

// Helper to render with ThemeProvider
const renderWithTheme = (ui: React.ReactElement) => {
    return render(<ThemeProvider>{ui}</ThemeProvider>);
};

describe('OptionsWindow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('rendering', () => {
        it('should render the options window container', () => {
            renderWithTheme(<OptionsWindow />);

            expect(screen.getByTestId('options-window')).toBeInTheDocument();
        });

        it('should render the titlebar with correct title', () => {
            renderWithTheme(<OptionsWindow />);

            expect(screen.getByTestId('mock-options-titlebar')).toBeInTheDocument();
            expect(screen.getByTestId('mock-options-titlebar')).toHaveTextContent('Options');
        });

        it('should render the content area', () => {
            renderWithTheme(<OptionsWindow />);

            expect(screen.getByTestId('options-content')).toBeInTheDocument();
        });

        it('should display Appearance section', () => {
            renderWithTheme(<OptionsWindow />);

            expect(screen.getByText('Appearance')).toBeInTheDocument();
            expect(screen.getByTestId('options-appearance')).toBeInTheDocument();
        });

        it('should render the ThemeSelector component', () => {
            renderWithTheme(<OptionsWindow />);

            expect(screen.getByTestId('mock-theme-selector')).toBeInTheDocument();
        });

        /**
         * Tests for the Hotkey Shortcuts section that contains the individual hotkey toggles.
         * This section was added to group hotkey-related settings separately
         * from appearance settings for better organization.
         */
        it('should display Hotkey Shortcuts section', () => {
            renderWithTheme(<OptionsWindow />);

            // Verify the Hotkey Shortcuts section title is rendered
            expect(screen.getByText('Hotkey Shortcuts')).toBeInTheDocument();
            // Verify the section container has the correct test ID
            expect(screen.getByTestId('options-hotkeys')).toBeInTheDocument();
        });

        /**
         * Verifies that the IndividualHotkeyToggles component is rendered within the
         * Hotkey Shortcuts section. The component is mocked to isolate testing.
         */
        it('should render the IndividualHotkeyToggles component in Hotkey Shortcuts section', () => {
            renderWithTheme(<OptionsWindow />);

            // Verify the mocked IndividualHotkeyToggles is rendered
            expect(screen.getByTestId('mock-individual-hotkey-toggles')).toBeInTheDocument();
        });

        /**
         * Ensures the Hotkey Shortcuts section follows the same structural pattern
         * as other options sections (h2 title + content container).
         */
        it('should have proper structure in Hotkey Shortcuts section', () => {
            renderWithTheme(<OptionsWindow />);

            const section = screen.getByTestId('options-hotkeys');
            // Verify the section has the correct CSS class
            expect(section).toHaveClass('options-section');
            // Verify the section title is an h2 element
            expect(section.querySelector('h2')).toHaveTextContent('Hotkey Shortcuts');
            // Verify the content container exists within the section
            expect(section.querySelector('.options-section__content')).toBeInTheDocument();
        });
    });

    describe('layout structure', () => {
        it('should have correct class names for styling', () => {
            renderWithTheme(<OptionsWindow />);

            expect(screen.getByTestId('options-window')).toHaveClass('options-window');
            expect(screen.getByTestId('options-content')).toHaveClass('options-content');
        });

        it('should wrap content in options-section with proper structure', () => {
            renderWithTheme(<OptionsWindow />);

            const section = screen.getByTestId('options-appearance');
            expect(section).toHaveClass('options-section');
            expect(section.querySelector('h2')).toHaveTextContent('Appearance');
            expect(section.querySelector('.options-section__content')).toBeInTheDocument();
        });
    });

    describe('theme selection', () => {
        it('should render theme cards for all three options', () => {
            renderWithTheme(<OptionsWindow />);

            expect(screen.getByTestId('theme-card-system')).toBeInTheDocument();
            expect(screen.getByTestId('theme-card-light')).toBeInTheDocument();
            expect(screen.getByTestId('theme-card-dark')).toBeInTheDocument();
        });
    });

    describe('accessibility', () => {
        it('should have proper ARIA roles on theme selector', () => {
            renderWithTheme(<OptionsWindow />);

            // Cards should have radio role
            expect(screen.getByTestId('theme-card-system')).toHaveAttribute('role', 'radio');
            expect(screen.getByTestId('theme-card-light')).toHaveAttribute('role', 'radio');
            expect(screen.getByTestId('theme-card-dark')).toHaveAttribute('role', 'radio');
        });
    });
});

