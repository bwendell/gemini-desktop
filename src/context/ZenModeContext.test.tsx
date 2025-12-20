/**
 * Unit tests for ZenModeContext.
 * 
 * This test suite validates the ZenModeContext which manages the Zen Mode enabled
 * state in the React frontend and synchronizes with the Electron backend.
 * 
 * ## Test Coverage
 * 
 * - **ZenModeProvider**: Rendering, initial state, Electron API integration
 * - **useZenMode hook**: Context access, state updates, error handling
 * - **External changes**: Cross-window synchronization, cleanup
 * - **Data validation**: Handling of unexpected data formats
 * 
 * ## Testing Approach
 * 
 * Uses a `TestConsumer` component to interact with the context through the hook.
 * This pattern allows testing:
 * - State reading (via data-testid="enabled-state")
 * - State setting (via toggle/enable/disable buttons)
 * 
 * @module ZenModeContext.test
 * @see ZenModeContext - The context being tested
 * @see ZenModeProvider - The provider component
 * @see useZenMode - The consumer hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { ZenModeProvider, useZenMode } from './ZenModeContext';

// ============================================================================
// Test Helper Component
// ============================================================================

/**
 * Test consumer component that uses the useZenMode hook.
 */
function TestConsumer() {
    const { enabled, setEnabled } = useZenMode();
    return (
        <div>
            <span data-testid="enabled-state">{enabled ? 'enabled' : 'disabled'}</span>
            <button data-testid="toggle-btn" onClick={() => setEnabled(!enabled)}>
                Toggle
            </button>
            <button data-testid="enable-btn" onClick={() => setEnabled(true)}>
                Enable
            </button>
            <button data-testid="disable-btn" onClick={() => setEnabled(false)}>
                Disable
            </button>
        </div>
    );
}

// ============================================================================
// Test Suite
// ============================================================================

describe('ZenModeContext', () => {
    /** Store original electronAPI for restoration after tests */
    let originalElectronAPI: typeof window.electronAPI;

    beforeEach(() => {
        vi.clearAllMocks();
        originalElectronAPI = window.electronAPI;
    });

    afterEach(() => {
        window.electronAPI = originalElectronAPI;
    });

    // ========================================================================
    // ZenModeProvider Tests
    // ========================================================================

    describe('ZenModeProvider', () => {

        it('should render children', () => {
            render(
                <ZenModeProvider>
                    <div data-testid="child">Child Content</div>
                </ZenModeProvider>
            );

            expect(screen.getByTestId('child')).toBeInTheDocument();
        });

        it('should provide default enabled state as false', async () => {
            render(
                <ZenModeProvider>
                    <TestConsumer />
                </ZenModeProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('enabled-state')).toHaveTextContent('disabled');
            });
        });

        it('should load initial state from Electron API', async () => {
            // Mock API to return enabled
            window.electronAPI = {
                ...window.electronAPI,
                getZenMode: vi.fn().mockResolvedValue({ enabled: true }),
                onZenModeChanged: vi.fn().mockReturnValue(() => { }),
            } as any;

            render(
                <ZenModeProvider>
                    <TestConsumer />
                </ZenModeProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('enabled-state')).toHaveTextContent('enabled');
            });
        });

        it('should handle missing Electron API gracefully', async () => {
            window.electronAPI = undefined as any;

            render(
                <ZenModeProvider>
                    <TestConsumer />
                </ZenModeProvider>
            );

            // Should default to disabled
            await waitFor(() => {
                expect(screen.getByTestId('enabled-state')).toHaveTextContent('disabled');
            });
        });

        it('should handle Electron API errors gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            window.electronAPI = {
                ...window.electronAPI,
                getZenMode: vi.fn().mockRejectedValue(new Error('API Error')),
                onZenModeChanged: vi.fn().mockReturnValue(() => { }),
            } as any;

            render(
                <ZenModeProvider>
                    <TestConsumer />
                </ZenModeProvider>
            );

            // Should still render with default
            await waitFor(() => {
                expect(screen.getByTestId('enabled-state')).toHaveTextContent('disabled');
            });

            consoleSpy.mockRestore();
        });
    });

    describe('useZenMode hook', () => {
        it('should throw error when used outside provider', () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });

            expect(() => {
                render(<TestConsumer />);
            }).toThrow('useZenMode must be used within a ZenModeProvider');

            consoleError.mockRestore();
        });

        it('should provide setEnabled function', async () => {
            render(
                <ZenModeProvider>
                    <TestConsumer />
                </ZenModeProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('enabled-state')).toHaveTextContent('disabled');
            });

            // Click enable button
            await act(async () => {
                screen.getByTestId('enable-btn').click();
            });

            expect(screen.getByTestId('enabled-state')).toHaveTextContent('enabled');
        });

        it('should call Electron API when setEnabled is called', async () => {
            const mockSetZenMode = vi.fn();
            window.electronAPI = {
                ...window.electronAPI,
                getZenMode: vi.fn().mockResolvedValue({ enabled: false }),
                setZenMode: mockSetZenMode,
                onZenModeChanged: vi.fn().mockReturnValue(() => { }),
            } as any;

            render(
                <ZenModeProvider>
                    <TestConsumer />
                </ZenModeProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('enabled-state')).toHaveTextContent('disabled');
            });

            await act(async () => {
                screen.getByTestId('enable-btn').click();
            });

            expect(mockSetZenMode).toHaveBeenCalledWith(true);
        });

        it('should handle setZenMode errors gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            window.electronAPI = {
                ...window.electronAPI,
                getZenMode: vi.fn().mockResolvedValue({ enabled: false }),
                setZenMode: vi.fn().mockImplementation(() => { throw new Error('Set failed'); }),
                onZenModeChanged: vi.fn().mockReturnValue(() => { }),
            } as any;

            render(
                <ZenModeProvider>
                    <TestConsumer />
                </ZenModeProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('enabled-state')).toHaveTextContent('disabled');
            });

            // Should not throw, just log error
            await act(async () => {
                screen.getByTestId('enable-btn').click();
            });

            // State should still update locally
            expect(screen.getByTestId('enabled-state')).toHaveTextContent('enabled');

            consoleSpy.mockRestore();
        });
    });

    describe('external changes', () => {
        it('should subscribe to onZenModeChanged', async () => {
            const mockOnZenModeChanged = vi.fn().mockReturnValue(() => { });

            window.electronAPI = {
                ...window.electronAPI,
                getZenMode: vi.fn().mockResolvedValue({ enabled: false }),
                onZenModeChanged: mockOnZenModeChanged,
            } as any;

            render(
                <ZenModeProvider>
                    <TestConsumer />
                </ZenModeProvider>
            );

            await waitFor(() => {
                expect(mockOnZenModeChanged).toHaveBeenCalled();
            });
        });

        it('should update state when external change event received', async () => {
            let changeCallback: ((data: { enabled: boolean }) => void) | null = null;

            window.electronAPI = {
                ...window.electronAPI,
                getZenMode: vi.fn().mockResolvedValue({ enabled: false }),
                onZenModeChanged: vi.fn().mockImplementation((cb) => {
                    changeCallback = cb;
                    return () => { };
                }),
            } as any;

            render(
                <ZenModeProvider>
                    <TestConsumer />
                </ZenModeProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('enabled-state')).toHaveTextContent('disabled');
            });

            // Simulate external change (e.g., from hotkey)
            await act(async () => {
                changeCallback?.({ enabled: true });
            });

            expect(screen.getByTestId('enabled-state')).toHaveTextContent('enabled');
        });

        it('should cleanup subscription on unmount', async () => {
            const mockCleanup = vi.fn();

            window.electronAPI = {
                ...window.electronAPI,
                getZenMode: vi.fn().mockResolvedValue({ enabled: false }),
                onZenModeChanged: vi.fn().mockReturnValue(mockCleanup),
            } as any;

            const { unmount } = render(
                <ZenModeProvider>
                    <TestConsumer />
                </ZenModeProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('enabled-state')).toBeInTheDocument();
            });

            unmount();

            expect(mockCleanup).toHaveBeenCalled();
        });
    });

    describe('data validation', () => {
        it('should handle unexpected data format gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            window.electronAPI = {
                ...window.electronAPI,
                getZenMode: vi.fn().mockResolvedValue({ invalid: 'data' }),
                onZenModeChanged: vi.fn().mockReturnValue(() => { }),
            } as any;

            render(
                <ZenModeProvider>
                    <TestConsumer />
                </ZenModeProvider>
            );

            // Should still work with default
            await waitFor(() => {
                expect(screen.getByTestId('enabled-state')).toHaveTextContent('disabled');
            });

            consoleSpy.mockRestore();
        });
    });
});
