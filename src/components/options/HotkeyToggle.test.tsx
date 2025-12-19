/**
 * Unit tests for HotkeyToggle component.
 * 
 * This test suite validates the HotkeyToggle component which provides the
 * user interface for enabling/disabling global hotkey combinations.
 * 
 * ## Test Coverage
 * 
 * - **Rendering**: Component structure, label, description, switch element
 * - **State management**: Checked/unchecked state based on HotkeysContext
 * - **Interactions**: Toggle via click, Electron API calls
 * - **Accessibility**: role="switch", aria-checked, keyboard support
 * 
 * ## Integration Testing Approach
 * 
 * This component requires HotkeysProvider to function. Tests use a 
 * `renderWithProvider` helper to wrap the component in the provider.
 * 
 * The tests mock `window.electronAPI` to control:
 * - Initial state (`getHotkeysEnabled`)
 * - State updates (`setHotkeysEnabled`)
 * - Cross-window sync (`onHotkeysChanged`)
 * 
 * ## Component Architecture
 * 
 * ```
 * HotkeyToggle
 *   └── CapsuleToggle (presentation)
 *         └── HotkeysContext (state via useHotkeys)
 * ```
 * 
 * @module HotkeyToggle.test
 * @see HotkeyToggle - The component being tested
 * @see CapsuleToggle - The underlying toggle component
 * @see HotkeysContext - State management context
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HotkeyToggle } from './HotkeyToggle';
import { HotkeysProvider } from '../../context/HotkeysContext';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Helper function to render component wrapped in HotkeysProvider.
 * Required because HotkeyToggle uses useHotkeys hook internally.
 * 
 * @param ui - React element to render
 * @returns Render result from @testing-library/react
 */
const renderWithProvider = (ui: React.ReactElement) => {
    return render(<HotkeysProvider>{ui}</HotkeysProvider>);
};

// ============================================================================
// Test Suite
// ============================================================================

describe('HotkeyToggle', () => {
    /** Store original electronAPI for restoration after tests */
    let originalElectronAPI: typeof window.electronAPI;

    /**
     * Store original API and set up mocks before each test.
     */
    beforeEach(() => {
        vi.clearAllMocks();
        originalElectronAPI = window.electronAPI;

        // Setup default mock API with enabled hotkeys
        window.electronAPI = {
            ...window.electronAPI,
            getHotkeysEnabled: vi.fn().mockResolvedValue({ enabled: true }),
            setHotkeysEnabled: vi.fn(),
            onHotkeysChanged: vi.fn().mockReturnValue(() => { }),
        } as any;
    });

    /**
     * Restore original API after each test for isolation.
     */
    afterEach(() => {
        window.electronAPI = originalElectronAPI;
    });

    // ========================================================================
    // Rendering Tests
    // ========================================================================

    describe('rendering', () => {

        it('should render the hotkey toggle', async () => {
            renderWithProvider(<HotkeyToggle />);

            await waitFor(() => {
                expect(screen.getByTestId('hotkey-toggle')).toBeInTheDocument();
            });
        });

        it('should display the correct label', async () => {
            renderWithProvider(<HotkeyToggle />);

            await waitFor(() => {
                expect(screen.getByText('Hotkey Combinations')).toBeInTheDocument();
            });
        });

        it('should display the description with keyboard shortcuts', async () => {
            renderWithProvider(<HotkeyToggle />);

            await waitFor(() => {
                expect(screen.getByText(/Enable global keyboard shortcuts/)).toBeInTheDocument();
            });
        });

        it('should render the switch element', async () => {
            renderWithProvider(<HotkeyToggle />);

            await waitFor(() => {
                expect(screen.getByTestId('hotkey-toggle-switch')).toBeInTheDocument();
            });
        });
    });

    describe('state management', () => {
        it('should show checked when hotkeys are enabled', async () => {
            window.electronAPI = {
                ...window.electronAPI,
                getHotkeysEnabled: vi.fn().mockResolvedValue({ enabled: true }),
                onHotkeysChanged: vi.fn().mockReturnValue(() => { }),
            } as any;

            renderWithProvider(<HotkeyToggle />);

            await waitFor(() => {
                const switchEl = screen.getByTestId('hotkey-toggle-switch');
                expect(switchEl).toHaveAttribute('aria-checked', 'true');
            });
        });

        it('should show unchecked when hotkeys are disabled', async () => {
            window.electronAPI = {
                ...window.electronAPI,
                getHotkeysEnabled: vi.fn().mockResolvedValue({ enabled: false }),
                onHotkeysChanged: vi.fn().mockReturnValue(() => { }),
            } as any;

            renderWithProvider(<HotkeyToggle />);

            await waitFor(() => {
                const switchEl = screen.getByTestId('hotkey-toggle-switch');
                expect(switchEl).toHaveAttribute('aria-checked', 'false');
            });
        });
    });

    describe('interactions', () => {
        it('should call setHotkeysEnabled when toggled off', async () => {
            const mockSetHotkeysEnabled = vi.fn();
            window.electronAPI = {
                ...window.electronAPI,
                getHotkeysEnabled: vi.fn().mockResolvedValue({ enabled: true }),
                setHotkeysEnabled: mockSetHotkeysEnabled,
                onHotkeysChanged: vi.fn().mockReturnValue(() => { }),
            } as any;

            renderWithProvider(<HotkeyToggle />);

            await waitFor(() => {
                expect(screen.getByTestId('hotkey-toggle-switch')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('hotkey-toggle-switch'));

            expect(mockSetHotkeysEnabled).toHaveBeenCalledWith(false);
        });

        it('should call setHotkeysEnabled when toggled on', async () => {
            const mockSetHotkeysEnabled = vi.fn();
            window.electronAPI = {
                ...window.electronAPI,
                getHotkeysEnabled: vi.fn().mockResolvedValue({ enabled: false }),
                setHotkeysEnabled: mockSetHotkeysEnabled,
                onHotkeysChanged: vi.fn().mockReturnValue(() => { }),
            } as any;

            renderWithProvider(<HotkeyToggle />);

            await waitFor(() => {
                expect(screen.getByTestId('hotkey-toggle-switch')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('hotkey-toggle-switch'));

            expect(mockSetHotkeysEnabled).toHaveBeenCalledWith(true);
        });
    });

    describe('accessibility', () => {
        it('should have proper role and aria attributes', async () => {
            renderWithProvider(<HotkeyToggle />);

            await waitFor(() => {
                const switchEl = screen.getByTestId('hotkey-toggle-switch');
                expect(switchEl).toHaveAttribute('role', 'switch');
                expect(switchEl).toHaveAttribute('aria-checked');
            });
        });

        it('should be keyboard accessible', async () => {
            const mockSetHotkeysEnabled = vi.fn();
            window.electronAPI = {
                ...window.electronAPI,
                getHotkeysEnabled: vi.fn().mockResolvedValue({ enabled: true }),
                setHotkeysEnabled: mockSetHotkeysEnabled,
                onHotkeysChanged: vi.fn().mockReturnValue(() => { }),
            } as any;

            renderWithProvider(<HotkeyToggle />);

            await waitFor(() => {
                expect(screen.getByTestId('hotkey-toggle-switch')).toBeInTheDocument();
            });

            fireEvent.keyDown(screen.getByTestId('hotkey-toggle-switch'), { key: 'Enter' });

            expect(mockSetHotkeysEnabled).toHaveBeenCalledWith(false);
        });
    });
});
