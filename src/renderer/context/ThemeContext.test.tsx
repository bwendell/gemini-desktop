/**
 * Unit tests for ThemeContext.
 * Covers theme initialization, updates, error handling, and cross-window sync.
 */

import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeContext';

// ============================================================================
// Mocks
// ============================================================================

const mockGetTheme = vi.fn();
const mockSetTheme = vi.fn();
const mockOnThemeChanged = vi.fn();

// Augment window type for testing
declare global {
    interface Window {
        electronAPI: any;
    }
}

// ============================================================================
// Test Components
// ============================================================================

/** Test component to consume context */
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
// Tests
// ============================================================================

describe('ThemeContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default mock: new object format
        mockGetTheme.mockResolvedValue({ preference: 'system', effectiveTheme: 'dark' });
        mockOnThemeChanged.mockReturnValue(() => {});
        document.documentElement.removeAttribute('data-theme');

        // Restore electronAPI
        window.electronAPI = {
            getTheme: mockGetTheme,
            setTheme: mockSetTheme,
            onThemeChanged: mockOnThemeChanged,
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Initialization', () => {
        it('initializes with theme from Electron (object format)', async () => {
            mockGetTheme.mockResolvedValue({ preference: 'dark', effectiveTheme: 'dark' });

            await act(async () => {
                render(
                    <ThemeProvider>
                        <TestComponent />
                    </ThemeProvider>
                );
            });

            expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
            expect(screen.getByTestId('effective-theme')).toHaveTextContent('dark');
            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        });

        it.skip('detects dark mode system preference via matchMedia when no electronAPI', async () => {
            // This test runs in ThemeContext.browser.test.tsx for better isolation
            // Mock matchMedia to return dark mode using spyOn (cleaner restoration)
            const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
                matches: true, // Dark mode
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            // @ts-expect-error - Explicitly set electronAPI to undefined to test browser fallback
            window.electronAPI = undefined;

            await act(async () => {
                render(
                    <ThemeProvider>
                        <TestComponent />
                    </ThemeProvider>
                );
            });

            // Should detect dark mode from matchMedia
            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

            matchMediaSpy.mockRestore();
        });

        it('handles legacy string format from getTheme', async () => {
            // Simulate legacy API returning just a string
            mockGetTheme.mockResolvedValue('light');

            await act(async () => {
                render(
                    <ThemeProvider>
                        <TestComponent />
                    </ThemeProvider>
                );
            });

            expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
        });

        it('handles getTheme error gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            mockGetTheme.mockRejectedValue(new Error('IPC failed'));

            await act(async () => {
                render(
                    <ThemeProvider>
                        <TestComponent />
                    </ThemeProvider>
                );
            });

            // Should use system default and still render
            expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it.skip('falls back to browser matchMedia when electronAPI is deleted', async () => {
            // This test runs in ThemeContext.browser.test.tsx for better isolation
            // Mock matchMedia for consistent test results
            const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
                matches: false, // Light mode
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            // @ts-expect-error - Delete electronAPI to test browser fallback
            delete window.electronAPI;

            await act(async () => {
                render(
                    <ThemeProvider>
                        <TestComponent />
                    </ThemeProvider>
                );
            });

            // Should use matchMedia result - light mode
            expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
            expect(document.documentElement.getAttribute('data-theme')).toBe('light');

            matchMediaSpy.mockRestore();
        });
    });

    describe('Theme Updates', () => {
        it('updates theme when set via setTheme', async () => {
            await act(async () => {
                render(
                    <ThemeProvider>
                        <TestComponent />
                    </ThemeProvider>
                );
            });

            const button = screen.getByText('Set Light');
            await act(async () => {
                button.click();
            });

            expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
            expect(mockSetTheme).toHaveBeenCalledWith('light');
        });

        it('updates theme when receiving external change (object format)', async () => {
            let callback: any;
            mockOnThemeChanged.mockImplementation((cb) => {
                callback = cb;
                return () => {};
            });

            await act(async () => {
                render(
                    <ThemeProvider>
                        <TestComponent />
                    </ThemeProvider>
                );
            });

            // Trigger external change with new format
            await act(async () => {
                if (callback) callback({ preference: 'light', effectiveTheme: 'light' });
            });

            expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
            expect(screen.getByTestId('effective-theme')).toHaveTextContent('light');
            expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        });

        it('handles legacy string format in onThemeChanged', async () => {
            let callback: any;
            mockOnThemeChanged.mockImplementation((cb) => {
                callback = cb;
                return () => {};
            });

            await act(async () => {
                render(
                    <ThemeProvider>
                        <TestComponent />
                    </ThemeProvider>
                );
            });

            // Trigger with legacy string format
            await act(async () => {
                if (callback) callback('dark');
            });

            expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
        });

        it('handles system theme preference', async () => {
            mockGetTheme.mockResolvedValue({ preference: 'system', effectiveTheme: 'dark' });

            await act(async () => {
                render(
                    <ThemeProvider>
                        <TestComponent />
                    </ThemeProvider>
                );
            });

            expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
            expect(screen.getByTestId('effective-theme')).toHaveTextContent('dark');
            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        });
    });

    describe('Error Handling', () => {
        it('throws error when useTheme is called outside of ThemeProvider', () => {
            const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const BrokenComponent = () => {
                useTheme();
                return null;
            };

            expect(() => render(<BrokenComponent />)).toThrow('useTheme must be used within a ThemeProvider');

            spy.mockRestore();
        });

        it('handles setTheme error gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            mockSetTheme.mockImplementation(() => {
                throw new Error('IPC error');
            });

            await act(async () => {
                render(
                    <ThemeProvider>
                        <TestComponent />
                    </ThemeProvider>
                );
            });

            const button = screen.getByText('Set Light');
            await act(async () => {
                button.click();
            });

            // Should still update local state even if IPC fails
            expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('Cleanup', () => {
        it('cleans up onThemeChanged subscription on unmount', async () => {
            const cleanupFn = vi.fn();
            mockOnThemeChanged.mockReturnValue(cleanupFn);

            const { unmount } = render(
                <ThemeProvider>
                    <TestComponent />
                </ThemeProvider>
            );

            await act(async () => {
                unmount();
            });

            expect(cleanupFn).toHaveBeenCalled();
        });
    });

    describe('Browser-only mode', () => {
        it.skip('applies theme changes in browser-only mode', async () => {
            // This test runs in ThemeContext.browser.test.tsx for better isolation
            // Mock matchMedia for consistent results
            const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
                matches: false, // Light mode
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            // @ts-expect-error - Set electronAPI to undefined to test browser fallback
            window.electronAPI = undefined;

            await act(async () => {
                render(
                    <ThemeProvider>
                        <TestComponent />
                    </ThemeProvider>
                );
            });

            // Click to change theme in browser-only mode
            const darkButton = screen.getByText('Set Dark');
            await act(async () => {
                darkButton.click();
            });

            expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

            // Also test light
            const lightButton = screen.getByText('Set Light');
            await act(async () => {
                lightButton.click();
            });

            expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
            expect(document.documentElement.getAttribute('data-theme')).toBe('light');

            matchMediaSpy.mockRestore();
        });

        it.skip('handles system theme in browser-only mode', async () => {
            // This test runs in ThemeContext.browser.test.tsx for better isolation
            const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
                matches: true, // Dark mode
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            // @ts-expect-error - Set electronAPI to undefined to test browser fallback
            window.electronAPI = undefined;

            await act(async () => {
                render(
                    <ThemeProvider>
                        <TestComponent />
                    </ThemeProvider>
                );
            });

            // Set to system
            const systemButton = screen.getByText('Set System');
            await act(async () => {
                systemButton.click();
            });

            // Should resolve to matchMedia result (dark)
            expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

            matchMediaSpy.mockRestore();
        });
    });

    describe('Legacy format handling (system theme)', () => {
        it('handles legacy system format in getTheme', async () => {
            mockGetTheme.mockResolvedValue('system');

            await act(async () => {
                render(
                    <ThemeProvider>
                        <TestComponent />
                    </ThemeProvider>
                );
            });

            expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
            // Effective theme should be resolved from matchMedia
            expect(screen.getByTestId('effective-theme')).toBeDefined();
        });

        it('handles legacy system format in onThemeChanged', async () => {
            let callback: any;
            mockOnThemeChanged.mockImplementation((cb) => {
                callback = cb;
                return () => {};
            });

            await act(async () => {
                render(
                    <ThemeProvider>
                        <TestComponent />
                    </ThemeProvider>
                );
            });

            // Trigger with legacy system format
            await act(async () => {
                if (callback) callback('system');
            });

            expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
        });

        it('handles malformed theme data from IPC (partial object)', async () => {
            // Returns object but missing properties - should fall back to legacy handling -> then fail casting -> system default
            mockGetTheme.mockResolvedValue({ preference: 'dark' }); // missing effectiveTheme

            await act(async () => {
                render(
                    <ThemeProvider>
                        <TestComponent />
                    </ThemeProvider>
                );
            });

            expect(screen.getByTestId('current-theme')).toBeInTheDocument();
        });
    });
});
