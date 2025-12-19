import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { OptionsWindow } from './OptionsWindow';

// Mock child components to isolate window logic
vi.mock('./OptionsWindowTitlebar', () => ({
    OptionsWindowTitlebar: ({ title }: any) => <div data-testid="mock-titlebar">{title}</div>
}));
vi.mock('./ThemeSelector', () => ({
    ThemeSelector: () => <div data-testid="mock-theme-selector">Theme Selector</div>
}));
vi.mock('./AboutSection', () => ({
    AboutSection: () => <div data-testid="mock-about-section">About Section</div>
}));
vi.mock('./HotkeyToggle', () => ({
    HotkeyToggle: () => <div data-testid="mock-hotkey-toggle">Hotkey Toggle</div>
}));
vi.mock('../ErrorBoundary', () => ({
    ErrorBoundary: ({ children }: any) => <div>{children}</div>
}));

describe('OptionsWindow Coverage', () => {

    beforeEach(() => {
        window.location.hash = '';
    });

    it('initializes to "about" tab when hash is #about', () => {
        window.location.hash = '#about';
        render(<OptionsWindow />);
        expect(screen.getByTestId('mock-about-section')).toBeInTheDocument();
        expect(screen.getByTestId('mock-titlebar')).toHaveTextContent('About');
    });

    it('updates tab when hash changes externally', async () => {
        render(<OptionsWindow />);
        expect(screen.queryByTestId('mock-theme-selector')).toBeInTheDocument();

        // Simulate external hash change
        await act(async () => {
            window.location.hash = '#about';
            window.dispatchEvent(new HashChangeEvent('hashchange'));
        });

        expect(screen.getByTestId('mock-about-section')).toBeInTheDocument();
    });

    it('updates hash when tab is clicked', () => {
        render(<OptionsWindow />);

        fireEvent.click(screen.getByText('About'));

        expect(window.location.hash).toBe('#about');
        expect(screen.getByTestId('mock-about-section')).toBeInTheDocument();
    });
});
