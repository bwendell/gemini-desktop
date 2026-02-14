/**
 * Unit tests for ThemeSelector component.
 *
 * Tests rendering, interaction, accessibility, and visual states.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThemeSelector } from './ThemeSelector';
import { ThemeProvider } from '../../context/ThemeContext';

const renderWithTheme = async (ui: React.ReactElement, initialTheme: 'light' | 'dark' | 'system' = 'system') => {
    if (window.electronAPI) {
        vi.mocked(window.electronAPI.getTheme).mockResolvedValue({
            preference: initialTheme,
            effectiveTheme: initialTheme === 'system' ? 'dark' : initialTheme,
        });
    }
    const result = render(<ThemeProvider>{ui}</ThemeProvider>);
    await waitFor(() => {
        expect(window.electronAPI.getTheme).toHaveBeenCalled();
    });
    return result;
};

describe('ThemeSelector', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('rendering', () => {
        it('should render the theme selector container', async () => {
            await renderWithTheme(<ThemeSelector />);

            expect(screen.getByTestId('theme-selector')).toBeInTheDocument();
        });

        it('should render all three theme cards', async () => {
            await renderWithTheme(<ThemeSelector />);

            expect(screen.getByTestId('theme-card-system')).toBeInTheDocument();
            expect(screen.getByTestId('theme-card-light')).toBeInTheDocument();
            expect(screen.getByTestId('theme-card-dark')).toBeInTheDocument();
        });

        it('should display correct labels for each theme', async () => {
            await renderWithTheme(<ThemeSelector />);

            expect(screen.getByText('System')).toBeInTheDocument();
            expect(screen.getByText('Light')).toBeInTheDocument();
            expect(screen.getByText('Dark')).toBeInTheDocument();
        });
    });

    describe('selection state', () => {
        it('should show checkmark on system card when system theme is selected', async () => {
            await renderWithTheme(<ThemeSelector />, 'system');

            await vi.waitFor(() => {
                expect(screen.getByTestId('theme-checkmark-system')).toBeInTheDocument();
            });
        });

        it('should have correct aria-checked attributes', async () => {
            await renderWithTheme(<ThemeSelector />);

            const systemCard = screen.getByTestId('theme-card-system');
            const lightCard = screen.getByTestId('theme-card-light');
            const darkCard = screen.getByTestId('theme-card-dark');

            expect(systemCard).toHaveAttribute('aria-checked', 'true');
            expect(lightCard).toHaveAttribute('aria-checked', 'false');
            expect(darkCard).toHaveAttribute('aria-checked', 'false');
        });
    });

    describe('interaction', () => {
        it('should call setTheme when light card is clicked', async () => {
            await renderWithTheme(<ThemeSelector />);

            const lightCard = screen.getByTestId('theme-card-light');
            await act(async () => {
                fireEvent.click(lightCard);
            });

            expect(window.electronAPI.setTheme).toHaveBeenCalledWith('light');
        });

        it('should call setTheme when dark card is clicked', async () => {
            await renderWithTheme(<ThemeSelector />);

            const darkCard = screen.getByTestId('theme-card-dark');
            await act(async () => {
                fireEvent.click(darkCard);
            });

            expect(window.electronAPI.setTheme).toHaveBeenCalledWith('dark');
        });

        it('should call setTheme when system card is clicked', async () => {
            await renderWithTheme(<ThemeSelector />);

            const darkCard = screen.getByTestId('theme-card-dark');
            await act(async () => {
                fireEvent.click(darkCard);
            });

            const systemCard = screen.getByTestId('theme-card-system');
            await act(async () => {
                fireEvent.click(systemCard);
            });

            expect(window.electronAPI.setTheme).toHaveBeenCalledWith('system');
        });
    });

    describe('keyboard accessibility', () => {
        it('should have role="radiogroup" on container', async () => {
            await renderWithTheme(<ThemeSelector />);

            const container = screen.getByTestId('theme-selector');
            expect(container).toHaveAttribute('role', 'radiogroup');
        });

        it('should have role="radio" on each card', async () => {
            await renderWithTheme(<ThemeSelector />);

            const systemCard = screen.getByTestId('theme-card-system');
            const lightCard = screen.getByTestId('theme-card-light');
            const darkCard = screen.getByTestId('theme-card-dark');

            expect(systemCard).toHaveAttribute('role', 'radio');
            expect(lightCard).toHaveAttribute('role', 'radio');
            expect(darkCard).toHaveAttribute('role', 'radio');
        });

        it('should have proper aria-label on each card', async () => {
            await renderWithTheme(<ThemeSelector />);

            const systemCard = screen.getByTestId('theme-card-system');
            const lightCard = screen.getByTestId('theme-card-light');
            const darkCard = screen.getByTestId('theme-card-dark');

            expect(systemCard).toHaveAttribute('aria-label', 'System theme');
            expect(lightCard).toHaveAttribute('aria-label', 'Light theme');
            expect(darkCard).toHaveAttribute('aria-label', 'Dark theme');
        });

        it('should be focusable via tabIndex', async () => {
            await renderWithTheme(<ThemeSelector />);

            const systemCard = screen.getByTestId('theme-card-system');
            expect(systemCard).toHaveAttribute('tabIndex', '0');
        });

        it('should activate on Enter key press', async () => {
            await renderWithTheme(<ThemeSelector />);

            const lightCard = screen.getByTestId('theme-card-light');
            lightCard.focus();
            await act(async () => {
                fireEvent.keyDown(lightCard, { key: 'Enter' });
            });

            expect(window.electronAPI.setTheme).toHaveBeenCalledWith('light');
        });

        it('should activate on Space key press', async () => {
            await renderWithTheme(<ThemeSelector />);

            const darkCard = screen.getByTestId('theme-card-dark');
            darkCard.focus();
            await act(async () => {
                fireEvent.keyDown(darkCard, { key: ' ' });
            });

            expect(window.electronAPI.setTheme).toHaveBeenCalledWith('dark');
        });
    });

    describe('visual elements', () => {
        it('should render theme preview for each card', async () => {
            await renderWithTheme(<ThemeSelector />);

            const previews = document.querySelectorAll('.theme-card__preview');
            expect(previews).toHaveLength(3);
        });

        it('should render icons for each theme', async () => {
            await renderWithTheme(<ThemeSelector />);

            const icons = document.querySelectorAll('.theme-card__icon');
            expect(icons).toHaveLength(3);
        });
    });
});
