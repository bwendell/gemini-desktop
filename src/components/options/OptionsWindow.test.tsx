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

        it('should display Appearance section with theme options', () => {
            renderWithTheme(<OptionsWindow />);

            expect(screen.getByText('Appearance')).toBeInTheDocument();
            expect(screen.getByTestId('theme-system')).toBeInTheDocument();
            expect(screen.getByTestId('theme-light')).toBeInTheDocument();
            expect(screen.getByTestId('theme-dark')).toBeInTheDocument();
        });
    });

    describe('layout structure', () => {
        it('should have correct class names for styling', () => {
            renderWithTheme(<OptionsWindow />);

            expect(screen.getByTestId('options-window')).toHaveClass('options-window');
            expect(screen.getByTestId('options-content')).toHaveClass('options-content');
        });
    });

    describe('theme selection', () => {
        it('should update theme when light radio is clicked', async () => {
            renderWithTheme(<OptionsWindow />);

            const lightRadio = screen.getByTestId('theme-light');
            fireEvent.click(lightRadio);

            expect(window.electronAPI.setTheme).toHaveBeenCalledWith('light');
        });

        it('should update theme when dark radio is clicked', async () => {
            renderWithTheme(<OptionsWindow />);

            const darkRadio = screen.getByTestId('theme-dark');
            fireEvent.click(darkRadio);

            expect(window.electronAPI.setTheme).toHaveBeenCalledWith('dark');
        });

        it('should update theme when system radio is clicked', async () => {
            renderWithTheme(<OptionsWindow />);

            // First select dark to change from the default 'system'
            const darkRadio = screen.getByTestId('theme-dark');
            fireEvent.click(darkRadio);

            // Then select system
            const systemRadio = screen.getByTestId('theme-system');
            fireEvent.click(systemRadio);

            expect(window.electronAPI.setTheme).toHaveBeenCalledWith('system');
        });
    });
});
