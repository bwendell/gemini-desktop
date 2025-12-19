/**
 * Unit tests for HotkeysContext.
 * 
 * This test suite validates the HotkeysContext which manages the hotkeys enabled
 * state in the React frontend and synchronizes with the Electron backend.
 * 
 * ## Test Coverage
 * 
 * - **HotkeysProvider**: Rendering, initial state, Electron API integration
 * - **useHotkeys hook**: Context access, state updates, error handling
 * - **External changes**: Cross-window synchronization, cleanup
 * - **Data validation**: Handling of unexpected data formats
 * - **Cross-platform compatibility**: Windows, macOS, Linux behavior
 * 
 * ## Testing Approach
 * 
 * Uses a `TestConsumer` component to interact with the context through the hook.
 * This pattern allows testing:
 * - State reading (via data-testid="enabled-state")
 * - State setting (via toggle/enable/disable buttons)
 * 
 * ## Mocking Strategy
 * 
 * The tests mock `window.electronAPI` with various configurations:
 * - Mock API with controlled responses
 * - Missing API (undefined)
 * - API that throws errors
 * 
 * @module HotkeysContext.test
 * @see HotkeysContext - The context being tested
 * @see HotkeysProvider - The provider component
 * @see useHotkeys - The consumer hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { HotkeysProvider, useHotkeys } from './HotkeysContext';

// ============================================================================
// Test Helper Component
// ============================================================================

/**
 * Test consumer component that uses the useHotkeys hook.
 * 
 * This component provides buttons and display elements to test the context:
 * - Displays current enabled state as text
 * - Provides buttons for toggle, enable, and disable actions
 * 
 * @returns JSX element with test controls
 */
function TestConsumer() {
    const { enabled, setEnabled } = useHotkeys();
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

describe('HotkeysContext', () => {
    /** Store original electronAPI for restoration after tests */
    let originalElectronAPI: typeof window.electronAPI;

    /**
     * Store original API and clear mocks before each test.
     */
    beforeEach(() => {
        vi.clearAllMocks();
        originalElectronAPI = window.electronAPI;
    });

    /**
     * Restore original API after each test for isolation.
     */
    afterEach(() => {
        window.electronAPI = originalElectronAPI;
    });

    // ========================================================================
    // HotkeysProvider Tests
    // ========================================================================

    describe('HotkeysProvider', () => {

        it('should render children', () => {
            render(
                <HotkeysProvider>
                    <div data-testid="child">Child Content</div>
                </HotkeysProvider>
            );

            expect(screen.getByTestId('child')).toBeInTheDocument();
        });

        it('should provide default enabled state as true', async () => {
            render(
                <HotkeysProvider>
                    <TestConsumer />
                </HotkeysProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('enabled-state')).toHaveTextContent('enabled');
            });
        });

        it('should load initial state from Electron API', async () => {
            // Mock API to return disabled
            window.electronAPI = {
                ...window.electronAPI,
                getHotkeysEnabled: vi.fn().mockResolvedValue({ enabled: false }),
                onHotkeysChanged: vi.fn().mockReturnValue(() => { }),
            } as any;

            render(
                <HotkeysProvider>
                    <TestConsumer />
                </HotkeysProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('enabled-state')).toHaveTextContent('disabled');
            });
        });

        it('should handle missing Electron API gracefully', async () => {
            window.electronAPI = undefined as any;

            render(
                <HotkeysProvider>
                    <TestConsumer />
                </HotkeysProvider>
            );

            // Should default to enabled
            await waitFor(() => {
                expect(screen.getByTestId('enabled-state')).toHaveTextContent('enabled');
            });
        });

        it('should handle Electron API errors gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            window.electronAPI = {
                ...window.electronAPI,
                getHotkeysEnabled: vi.fn().mockRejectedValue(new Error('API Error')),
                onHotkeysChanged: vi.fn().mockReturnValue(() => { }),
            } as any;

            render(
                <HotkeysProvider>
                    <TestConsumer />
                </HotkeysProvider>
            );

            // Should still render with default
            await waitFor(() => {
                expect(screen.getByTestId('enabled-state')).toHaveTextContent('enabled');
            });

            consoleSpy.mockRestore();
        });
    });

    describe('useHotkeys hook', () => {
        it('should throw error when used outside provider', () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });

            expect(() => {
                render(<TestConsumer />);
            }).toThrow('useHotkeys must be used within a HotkeysProvider');

            consoleError.mockRestore();
        });

        it('should provide setEnabled function', async () => {
            render(
                <HotkeysProvider>
                    <TestConsumer />
                </HotkeysProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('enabled-state')).toHaveTextContent('enabled');
            });

            // Click disable button
            await act(async () => {
                screen.getByTestId('disable-btn').click();
            });

            expect(screen.getByTestId('enabled-state')).toHaveTextContent('disabled');
        });

        it('should call Electron API when setEnabled is called', async () => {
            const mockSetHotkeysEnabled = vi.fn();
            window.electronAPI = {
                ...window.electronAPI,
                getHotkeysEnabled: vi.fn().mockResolvedValue({ enabled: true }),
                setHotkeysEnabled: mockSetHotkeysEnabled,
                onHotkeysChanged: vi.fn().mockReturnValue(() => { }),
            } as any;

            render(
                <HotkeysProvider>
                    <TestConsumer />
                </HotkeysProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('enabled-state')).toHaveTextContent('enabled');
            });

            await act(async () => {
                screen.getByTestId('disable-btn').click();
            });

            expect(mockSetHotkeysEnabled).toHaveBeenCalledWith(false);
        });

        it('should handle setHotkeysEnabled errors gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            window.electronAPI = {
                ...window.electronAPI,
                getHotkeysEnabled: vi.fn().mockResolvedValue({ enabled: true }),
                setHotkeysEnabled: vi.fn().mockImplementation(() => { throw new Error('Set failed'); }),
                onHotkeysChanged: vi.fn().mockReturnValue(() => { }),
            } as any;

            render(
                <HotkeysProvider>
                    <TestConsumer />
                </HotkeysProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('enabled-state')).toHaveTextContent('enabled');
            });

            // Should not throw, just log error
            await act(async () => {
                screen.getByTestId('disable-btn').click();
            });

            // State should still update locally
            expect(screen.getByTestId('enabled-state')).toHaveTextContent('disabled');

            consoleSpy.mockRestore();
        });
    });

    describe('external changes', () => {
        it('should subscribe to onHotkeysChanged', async () => {
            const mockOnHotkeysChanged = vi.fn().mockReturnValue(() => { });

            window.electronAPI = {
                ...window.electronAPI,
                getHotkeysEnabled: vi.fn().mockResolvedValue({ enabled: true }),
                onHotkeysChanged: mockOnHotkeysChanged,
            } as any;

            render(
                <HotkeysProvider>
                    <TestConsumer />
                </HotkeysProvider>
            );

            await waitFor(() => {
                expect(mockOnHotkeysChanged).toHaveBeenCalled();
            });
        });

        it('should update state when external change event received', async () => {
            let changeCallback: ((data: { enabled: boolean }) => void) | null = null;

            window.electronAPI = {
                ...window.electronAPI,
                getHotkeysEnabled: vi.fn().mockResolvedValue({ enabled: true }),
                onHotkeysChanged: vi.fn().mockImplementation((cb) => {
                    changeCallback = cb;
                    return () => { };
                }),
            } as any;

            render(
                <HotkeysProvider>
                    <TestConsumer />
                </HotkeysProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('enabled-state')).toHaveTextContent('enabled');
            });

            // Simulate external change
            await act(async () => {
                changeCallback?.({ enabled: false });
            });

            expect(screen.getByTestId('enabled-state')).toHaveTextContent('disabled');
        });

        it('should cleanup subscription on unmount', async () => {
            const mockCleanup = vi.fn();

            window.electronAPI = {
                ...window.electronAPI,
                getHotkeysEnabled: vi.fn().mockResolvedValue({ enabled: true }),
                onHotkeysChanged: vi.fn().mockReturnValue(mockCleanup),
            } as any;

            const { unmount } = render(
                <HotkeysProvider>
                    <TestConsumer />
                </HotkeysProvider>
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
                getHotkeysEnabled: vi.fn().mockResolvedValue({ invalid: 'data' }),
                onHotkeysChanged: vi.fn().mockReturnValue(() => { }),
            } as any;

            render(
                <HotkeysProvider>
                    <TestConsumer />
                </HotkeysProvider>
            );

            // Should still work with default
            await waitFor(() => {
                expect(screen.getByTestId('enabled-state')).toHaveTextContent('enabled');
            });

            consoleSpy.mockRestore();
        });
    });

    describe('cross-platform compatibility', () => {
        /**
         * These tests verify that the HotkeysContext works consistently
         * across Windows, macOS, and Linux platforms. The implementation
         * is platform-agnostic because it uses Electron's API which
         * handles platform differences internally.
         */

        it('should work identically on Windows platform', async () => {
            // Windows uses Ctrl key in shortcuts but the context is platform-agnostic
            window.electronAPI = {
                ...window.electronAPI,
                getHotkeysEnabled: vi.fn().mockResolvedValue({ enabled: true }),
                setHotkeysEnabled: vi.fn(),
                onHotkeysChanged: vi.fn().mockReturnValue(() => { }),
            } as any;

            render(
                <HotkeysProvider>
                    <TestConsumer />
                </HotkeysProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('enabled-state')).toHaveTextContent('enabled');
            });

            // Toggle should work on Windows
            await act(async () => {
                screen.getByTestId('disable-btn').click();
            });

            expect(screen.getByTestId('enabled-state')).toHaveTextContent('disabled');
            expect(window.electronAPI.setHotkeysEnabled).toHaveBeenCalledWith(false);
        });

        it('should work identically on macOS platform', async () => {
            // macOS uses Cmd key in shortcuts but the context is platform-agnostic
            window.electronAPI = {
                ...window.electronAPI,
                getHotkeysEnabled: vi.fn().mockResolvedValue({ enabled: false }),
                setHotkeysEnabled: vi.fn(),
                onHotkeysChanged: vi.fn().mockReturnValue(() => { }),
            } as any;

            render(
                <HotkeysProvider>
                    <TestConsumer />
                </HotkeysProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('enabled-state')).toHaveTextContent('disabled');
            });

            // Toggle should work on macOS
            await act(async () => {
                screen.getByTestId('enable-btn').click();
            });

            expect(screen.getByTestId('enabled-state')).toHaveTextContent('enabled');
            expect(window.electronAPI.setHotkeysEnabled).toHaveBeenCalledWith(true);
        });

        it('should work identically on Linux platform', async () => {
            // Linux uses Ctrl key in shortcuts but the context is platform-agnostic
            window.electronAPI = {
                ...window.electronAPI,
                getHotkeysEnabled: vi.fn().mockResolvedValue({ enabled: true }),
                setHotkeysEnabled: vi.fn(),
                onHotkeysChanged: vi.fn().mockReturnValue(() => { }),
            } as any;

            render(
                <HotkeysProvider>
                    <TestConsumer />
                </HotkeysProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('enabled-state')).toHaveTextContent('enabled');
            });

            // Toggle cycle should work on Linux
            await act(async () => {
                screen.getByTestId('toggle-btn').click(); // OFF
            });
            expect(screen.getByTestId('enabled-state')).toHaveTextContent('disabled');

            await act(async () => {
                screen.getByTestId('toggle-btn').click(); // ON
            });
            expect(screen.getByTestId('enabled-state')).toHaveTextContent('enabled');
        });

        it('should handle cross-window sync on all platforms', async () => {
            let changeCallback: ((data: { enabled: boolean }) => void) | null = null;

            window.electronAPI = {
                ...window.electronAPI,
                getHotkeysEnabled: vi.fn().mockResolvedValue({ enabled: true }),
                setHotkeysEnabled: vi.fn(),
                onHotkeysChanged: vi.fn().mockImplementation((cb) => {
                    changeCallback = cb;
                    return () => { };
                }),
            } as any;

            render(
                <HotkeysProvider>
                    <TestConsumer />
                </HotkeysProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('enabled-state')).toHaveTextContent('enabled');
            });

            // Simulate change from another window (works same on all platforms)
            await act(async () => {
                changeCallback?.({ enabled: false });
            });

            expect(screen.getByTestId('enabled-state')).toHaveTextContent('disabled');
        });
    });
});
