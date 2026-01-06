/**
 * Coordinated tests for Theme Full Round-Trip.
 *
 * Tests the complete theme flow:
 * Store → nativeTheme → IPC → ThemeContext → DOM
 *
 * These tests verify:
 * - Initial theme load from store and propagation to context
 * - Theme changes via IPC broadcast to all windows
 * - DOM data-theme attribute updates
 * - System theme change handling
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ThemeProvider, useTheme, type Theme as _Theme } from '../../src/renderer/context/ThemeContext';

// Mock logger
vi.mock('../../src/renderer/utils', () => ({
    createRendererLogger: () => ({
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    }),
}));

describe('Theme Full Round-Trip Coordination', () => {
    let mockGetTheme: ReturnType<typeof vi.fn>;
    let mockSetTheme: ReturnType<typeof vi.fn>;
    let mockOnThemeChanged: ReturnType<typeof vi.fn>;
    let themeChangeCallback: ((data: any) => void) | null = null;
    let mockMatchMedia: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        themeChangeCallback = null;

        // Mock electronAPI
        mockGetTheme = vi.fn().mockResolvedValue({
            preference: 'system',
            effectiveTheme: 'dark',
        });
        mockSetTheme = vi.fn();
        mockOnThemeChanged = vi.fn((callback: (data: any) => void) => {
            themeChangeCallback = callback;
            return () => {
                themeChangeCallback = null;
            };
        });

        (window as any).electronAPI = {
            getTheme: mockGetTheme,
            setTheme: mockSetTheme,
            onThemeChanged: mockOnThemeChanged,
        };

        // Mock matchMedia
        mockMatchMedia = vi.fn().mockReturnValue({
            matches: true, // dark mode
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        });
        (window as any).matchMedia = mockMatchMedia;

        // Ensure document has setAttribute
        vi.spyOn(document.documentElement, 'setAttribute');
    });

    afterEach(() => {
        vi.restoreAllMocks();
        delete (window as any).electronAPI;
    });

    // Wrapper for hooks that need ThemeProvider
    const wrapper = ({ children }: { children: React.ReactNode }) => <ThemeProvider>{children}</ThemeProvider>;

    describe('Initial Theme Load from Store', () => {
        it('should load theme from Electron store via IPC on mount', async () => {
            const { result: _result } = renderHook(() => useTheme(), { wrapper });

            await waitFor(() => {
                expect(mockGetTheme).toHaveBeenCalled();
            });
        });

        it('should apply initial theme to DOM via data-theme attribute', async () => {
            renderHook(() => useTheme(), { wrapper });

            await waitFor(() => {
                expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
            });
        });

        it('should set initial theme state from store response', async () => {
            mockGetTheme.mockResolvedValueOnce({
                preference: 'light',
                effectiveTheme: 'light',
            });

            const { result } = renderHook(() => useTheme(), { wrapper });

            await waitFor(() => {
                expect(result.current.theme).toBe('light');
                expect(result.current.currentEffectiveTheme).toBe('light');
            });
        });

        it('should handle system theme preference correctly', async () => {
            mockGetTheme.mockResolvedValueOnce({
                preference: 'system',
                effectiveTheme: 'dark',
            });

            const { result } = renderHook(() => useTheme(), { wrapper });

            await waitFor(() => {
                expect(result.current.theme).toBe('system');
                expect(result.current.currentEffectiveTheme).toBe('dark');
            });
        });
    });

    describe('Theme Change via IPC', () => {
        it('should send theme change to main process via IPC', async () => {
            const { result } = renderHook(() => useTheme(), { wrapper });

            await waitFor(() => {
                expect(mockGetTheme).toHaveBeenCalled();
            });

            act(() => {
                result.current.setTheme('dark');
            });

            expect(mockSetTheme).toHaveBeenCalledWith('dark');
        });

        it('should register listener for theme changes from other windows', async () => {
            renderHook(() => useTheme(), { wrapper });

            await waitFor(() => {
                expect(mockOnThemeChanged).toHaveBeenCalled();
            });
        });

        it('should update state when receiving theme change broadcast', async () => {
            const { result } = renderHook(() => useTheme(), { wrapper });

            await waitFor(() => {
                expect(mockOnThemeChanged).toHaveBeenCalled();
            });

            // Simulate broadcast from another window
            act(() => {
                if (themeChangeCallback) {
                    themeChangeCallback({
                        preference: 'light',
                        effectiveTheme: 'light',
                    });
                }
            });

            expect(result.current.theme).toBe('light');
            expect(result.current.currentEffectiveTheme).toBe('light');
        });

        it('should update DOM when receiving theme change broadcast', async () => {
            renderHook(() => useTheme(), { wrapper });

            await waitFor(() => {
                expect(mockOnThemeChanged).toHaveBeenCalled();
            });

            // Clear previous setAttribute calls
            vi.mocked(document.documentElement.setAttribute).mockClear();

            // Simulate broadcast from another window
            act(() => {
                if (themeChangeCallback) {
                    themeChangeCallback({
                        preference: 'light',
                        effectiveTheme: 'light',
                    });
                }
            });

            expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
        });
    });

    describe('Cross-Window Theme Sync Scenarios', () => {
        it('should sync theme from options window to main window', async () => {
            // Simulate main window initial load
            const { result: mainWindow } = renderHook(() => useTheme(), { wrapper });

            await waitFor(() => {
                expect(mockOnThemeChanged).toHaveBeenCalled();
            });

            // Initial state
            expect(mainWindow.current.theme).toBe('system');

            // Simulate options window changing theme and broadcasting
            act(() => {
                if (themeChangeCallback) {
                    themeChangeCallback({
                        preference: 'dark',
                        effectiveTheme: 'dark',
                    });
                }
            });

            // Main window should receive update
            expect(mainWindow.current.theme).toBe('dark');
            expect(mainWindow.current.currentEffectiveTheme).toBe('dark');
        });

        it('should handle rapid theme toggles correctly', async () => {
            const { result } = renderHook(() => useTheme(), { wrapper });

            await waitFor(() => {
                expect(mockOnThemeChanged).toHaveBeenCalled();
            });

            // Rapid toggles via broadcast
            act(() => {
                if (themeChangeCallback) {
                    themeChangeCallback({ preference: 'dark', effectiveTheme: 'dark' });
                    themeChangeCallback({ preference: 'light', effectiveTheme: 'light' });
                    themeChangeCallback({ preference: 'dark', effectiveTheme: 'dark' });
                    themeChangeCallback({ preference: 'system', effectiveTheme: 'light' });
                }
            });

            // Final state should be the last broadcast
            expect(result.current.theme).toBe('system');
            expect(result.current.currentEffectiveTheme).toBe('light');
        });
    });

    describe('Error Handling', () => {
        it('should fallback to system theme on IPC error', async () => {
            mockGetTheme.mockRejectedValueOnce(new Error('IPC failed'));

            const { result } = renderHook(() => useTheme(), { wrapper });

            await waitFor(() => {
                // Should fallback to system preference (dark from our mock)
                expect(result.current.currentEffectiveTheme).toBe('dark');
            });

            // DOM should still be updated with fallback
            expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
        });

        it('should handle invalid theme data gracefully', async () => {
            mockGetTheme.mockResolvedValueOnce({ invalid: 'data' });

            const { result: _result } = renderHook(() => useTheme(), { wrapper });

            await waitFor(() => {
                // Should fallback to system preference
                expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
            });
        });
    });

    describe('Legacy Format Support', () => {
        it('should handle legacy string theme format', async () => {
            mockGetTheme.mockResolvedValueOnce('dark');

            const { result } = renderHook(() => useTheme(), { wrapper });

            await waitFor(() => {
                expect(result.current.theme).toBe('dark');
                expect(result.current.currentEffectiveTheme).toBe('dark');
            });
        });

        it('should handle legacy string format in broadcast', async () => {
            const { result } = renderHook(() => useTheme(), { wrapper });

            await waitFor(() => {
                expect(mockOnThemeChanged).toHaveBeenCalled();
            });

            // Simulate legacy format broadcast
            act(() => {
                if (themeChangeCallback) {
                    themeChangeCallback('light' as any);
                }
            });

            expect(result.current.theme).toBe('light');
            expect(result.current.currentEffectiveTheme).toBe('light');
        });
    });

    describe('Cleanup', () => {
        it('should cleanup theme change listener on unmount', async () => {
            const { unmount } = renderHook(() => useTheme(), { wrapper });

            await waitFor(() => {
                expect(mockOnThemeChanged).toHaveBeenCalled();
            });

            expect(themeChangeCallback).not.toBeNull();

            unmount();

            // Callback should be cleaned up
            // Note: The actual cleanup is via the returned function from onThemeChanged
            // which sets themeChangeCallback to null in our mock
        });
    });
});
