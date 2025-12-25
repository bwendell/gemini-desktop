/**
 * Dedicated tests for ThemeContext browser-only fallback paths.
 * 
 * This test file runs WITHOUT any Electron API mocks to specifically test
 * the browser fallback code paths in ThemeContext that use matchMedia
 * for system theme detection.
 * 
 * This is separated from the main ThemeContext.test.tsx to ensure clean
 * isolation and prevent mock contamination between Electron and browser modes.
 */

import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeContext';

// ============================================================================
// Test Component
// ============================================================================

/** Simple test component that exposes theme state */
const TestComponent = () => {
    const { theme, setTheme, currentEffectiveTheme } = useTheme();
    return (
        <div>
            <span data-testid="current-theme">{theme}</span>
            <span data-testid="effective-theme">{currentEffectiveTheme}</span>
            <button onClick={() => setTheme('light')}>Set Light</button>
            <button onClick={() => setTheme('dark')}>Set Dark</button>
            <button onClick={() => setTheme('system')}>Set System</button>
        </div>
    );
};

// ============================================================================
// Browser-Only Tests (No Electron API)
// ============================================================================

describe('ThemeContext - Browser Only Mode', () => {
    /**
     * Store original electronAPI reference if any
     */
    let originalElectronAPI: any;

    beforeEach(() => {
        vi.clearAllMocks();
        document.documentElement.removeAttribute('data-theme');

        // Store any existing electronAPI and remove it
        originalElectronAPI = (window as any).electronAPI;
        delete (window as any).electronAPI;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        // Restore electronAPI if it existed
        if (originalElectronAPI !== undefined) {
            (window as any).electronAPI = originalElectronAPI;
        }
    });

    describe('System Theme Detection via matchMedia', () => {
        it('detects dark mode from matchMedia when no electronAPI', async () => {
            // Mock matchMedia to return dark mode
            const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
                matches: true, // Dark mode
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            await act(async () => {
                render(
                    <ThemeProvider>
                        <TestComponent />
                    </ThemeProvider>
                );
            });

            // Should detect dark mode from matchMedia
            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
            expect(screen.getByTestId('effective-theme')).toHaveTextContent('dark');

            matchMediaSpy.mockRestore();
        });

        it('detects light mode from matchMedia when no electronAPI', async () => {
            // Mock matchMedia to return light mode
            const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
                matches: false, // Light mode (prefers-color-scheme: dark is false)
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            await act(async () => {
                render(
                    <ThemeProvider>
                        <TestComponent />
                    </ThemeProvider>
                );
            });

            // Should detect light mode from matchMedia
            expect(document.documentElement.getAttribute('data-theme')).toBe('light');
            expect(screen.getByTestId('effective-theme')).toHaveTextContent('light');

            matchMediaSpy.mockRestore();
        });
    });

    describe('Theme Changes in Browser-Only Mode', () => {
        it('can switch between themes without Electron API', async () => {
            // Mock matchMedia for initial render
            const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
                matches: false, // Light mode
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            await act(async () => {
                render(
                    <ThemeProvider>
                        <TestComponent />
                    </ThemeProvider>
                );
            });

            // Initially should be light (from matchMedia)
            expect(document.documentElement.getAttribute('data-theme')).toBe('light');

            // Click to set dark theme
            const darkButton = screen.getByText('Set Dark');
            await act(async () => {
                darkButton.click();
            });

            expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

            // Click to set light theme
            const lightButton = screen.getByText('Set Light');
            await act(async () => {
                lightButton.click();
            });

            expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
            expect(document.documentElement.getAttribute('data-theme')).toBe('light');

            matchMediaSpy.mockRestore();
        });

        it('resolves system theme to matchMedia preference', async () => {
            // Mock matchMedia to return dark mode
            const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
                matches: true, // Dark mode
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            await act(async () => {
                render(
                    <ThemeProvider>
                        <TestComponent />
                    </ThemeProvider>
                );
            });

            // Set to light first
            const lightButton = screen.getByText('Set Light');
            await act(async () => {
                lightButton.click();
            });

            expect(document.documentElement.getAttribute('data-theme')).toBe('light');

            // Now set to system - should resolve to dark (from matchMedia)
            const systemButton = screen.getByText('Set System');
            await act(async () => {
                systemButton.click();
            });

            expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

            matchMediaSpy.mockRestore();
        });
    });

    describe('Initialization without electronAPI', () => {
        it('starts with system theme preference when no electronAPI', async () => {
            const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
                matches: true, // Dark mode
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            await act(async () => {
                render(
                    <ThemeProvider>
                        <TestComponent />
                    </ThemeProvider>
                );
            });

            // Default preference should be 'system'
            expect(screen.getByTestId('current-theme')).toHaveTextContent('system');

            matchMediaSpy.mockRestore();
        });
    });
});
