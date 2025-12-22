/**
 * Unit tests for IndividualHotkeyToggles component.
 * 
 * Tests the container component that renders toggle switches for each hotkey feature.
 * 
 * @module IndividualHotkeyToggles.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IndividualHotkeyToggles } from './IndividualHotkeyToggles';
import { IndividualHotkeysProvider } from '../../context/IndividualHotkeysContext';

// ============================================================================
// Test Helpers
// ============================================================================

const renderWithProvider = (ui: React.ReactElement) => {
    return render(<IndividualHotkeysProvider>{ui}</IndividualHotkeysProvider>);
};

// ============================================================================
// Test Suite
// ============================================================================

describe('IndividualHotkeyToggles', () => {
    let originalElectronAPI: typeof window.electronAPI;

    beforeEach(() => {
        vi.clearAllMocks();
        originalElectronAPI = window.electronAPI;

        // Default mock
        window.electronAPI = {
            ...window.electronAPI,
            getIndividualHotkeys: vi.fn().mockResolvedValue({
                alwaysOnTop: true,
                bossKey: true,
                quickChat: true,
            }),
            setIndividualHotkey: vi.fn(),
            onIndividualHotkeysChanged: vi.fn().mockReturnValue(() => { }),
            platform: 'win32',
        } as any;
    });

    afterEach(() => {
        window.electronAPI = originalElectronAPI;
    });

    describe('rendering', () => {
        it('should render the container', async () => {
            renderWithProvider(<IndividualHotkeyToggles />);

            await waitFor(() => {
                expect(screen.getByTestId('individual-hotkey-toggles')).toBeInTheDocument();
            });
        });

        it('should render all three hotkey toggles', async () => {
            renderWithProvider(<IndividualHotkeyToggles />);

            await waitFor(() => {
                expect(screen.getByTestId('hotkey-toggle-alwaysOnTop')).toBeInTheDocument();
                expect(screen.getByTestId('hotkey-toggle-bossKey')).toBeInTheDocument();
                expect(screen.getByTestId('hotkey-toggle-quickChat')).toBeInTheDocument();
            });
        });

        it('should display correct labels', async () => {
            renderWithProvider(<IndividualHotkeyToggles />);

            await waitFor(() => {
                expect(screen.getByText('Always on Top')).toBeInTheDocument();
                expect(screen.getByText('Boss Key')).toBeInTheDocument();
                expect(screen.getByText('Quick Chat')).toBeInTheDocument();
            });
        });
    });

    describe('platform-aware shortcuts', () => {
        it('should display Windows shortcuts on Windows', async () => {
            window.electronAPI = {
                ...window.electronAPI,
                platform: 'win32',
            } as any;

            renderWithProvider(<IndividualHotkeyToggles />);

            await waitFor(() => {
                expect(screen.getByText(/Ctrl\+Shift\+T/)).toBeInTheDocument();
                expect(screen.getByText(/Ctrl\+Alt\+E/)).toBeInTheDocument();
                expect(screen.getByText(/Ctrl\+Shift\+Space/)).toBeInTheDocument();
            });
        });

        it('should display Mac shortcuts on macOS', async () => {
            window.electronAPI = {
                ...window.electronAPI,
                platform: 'darwin',
                getIndividualHotkeys: vi.fn().mockResolvedValue({
                    alwaysOnTop: true,
                    bossKey: true,
                    quickChat: true,
                }),
                setIndividualHotkey: vi.fn(),
                onIndividualHotkeysChanged: vi.fn().mockReturnValue(() => { }),
            } as any;

            renderWithProvider(<IndividualHotkeyToggles />);

            await waitFor(() => {
                expect(screen.getByText(/Cmd\+Shift\+T/)).toBeInTheDocument();
                expect(screen.getByText(/Cmd\+Alt\+E/)).toBeInTheDocument();
                expect(screen.getByText(/Cmd\+Shift\+Space/)).toBeInTheDocument();
            });
        });
    });

    describe('toggle state', () => {
        it('should show checked state for enabled hotkeys', async () => {
            window.electronAPI = {
                ...window.electronAPI,
                getIndividualHotkeys: vi.fn().mockResolvedValue({
                    alwaysOnTop: true,
                    bossKey: false,
                    quickChat: true,
                }),
                onIndividualHotkeysChanged: vi.fn().mockReturnValue(() => { }),
            } as any;

            renderWithProvider(<IndividualHotkeyToggles />);

            await waitFor(() => {
                const alwaysOnTopSwitch = screen.getByTestId('hotkey-toggle-alwaysOnTop-switch');
                const bossKeySwitch = screen.getByTestId('hotkey-toggle-bossKey-switch');
                const quickChatSwitch = screen.getByTestId('hotkey-toggle-quickChat-switch');

                expect(alwaysOnTopSwitch).toHaveAttribute('aria-checked', 'true');
                expect(bossKeySwitch).toHaveAttribute('aria-checked', 'false');
                expect(quickChatSwitch).toHaveAttribute('aria-checked', 'true');
            });
        });
    });

    describe('interactions', () => {
        it('should call setIndividualHotkey when toggle is clicked', async () => {
            const mockSetIndividualHotkey = vi.fn();
            window.electronAPI = {
                ...window.electronAPI,
                getIndividualHotkeys: vi.fn().mockResolvedValue({
                    alwaysOnTop: true,
                    bossKey: true,
                    quickChat: true,
                }),
                setIndividualHotkey: mockSetIndividualHotkey,
                onIndividualHotkeysChanged: vi.fn().mockReturnValue(() => { }),
            } as any;

            renderWithProvider(<IndividualHotkeyToggles />);

            await waitFor(() => {
                expect(screen.getByTestId('hotkey-toggle-quickChat-switch')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('hotkey-toggle-quickChat-switch'));

            expect(mockSetIndividualHotkey).toHaveBeenCalledWith('quickChat', false);
        });

        it('should toggle each hotkey independently', async () => {
            const mockSetIndividualHotkey = vi.fn();
            window.electronAPI = {
                ...window.electronAPI,
                getIndividualHotkeys: vi.fn().mockResolvedValue({
                    alwaysOnTop: true,
                    bossKey: true,
                    quickChat: true,
                }),
                setIndividualHotkey: mockSetIndividualHotkey,
                onIndividualHotkeysChanged: vi.fn().mockReturnValue(() => { }),
            } as any;

            renderWithProvider(<IndividualHotkeyToggles />);

            await waitFor(() => {
                expect(screen.getByTestId('hotkey-toggle-alwaysOnTop-switch')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('hotkey-toggle-alwaysOnTop-switch'));
            fireEvent.click(screen.getByTestId('hotkey-toggle-bossKey-switch'));

            expect(mockSetIndividualHotkey).toHaveBeenCalledWith('alwaysOnTop', false);
            expect(mockSetIndividualHotkey).toHaveBeenCalledWith('bossKey', false);
        });
    });

    describe('accessibility', () => {
        it('should have proper role and aria attributes on all toggles', async () => {
            renderWithProvider(<IndividualHotkeyToggles />);

            await waitFor(() => {
                const switches = [
                    screen.getByTestId('hotkey-toggle-alwaysOnTop-switch'),
                    screen.getByTestId('hotkey-toggle-bossKey-switch'),
                    screen.getByTestId('hotkey-toggle-quickChat-switch'),
                ];

                switches.forEach(switchEl => {
                    expect(switchEl).toHaveAttribute('role', 'switch');
                    expect(switchEl).toHaveAttribute('aria-checked');
                });
            });
        });

        it('should be keyboard accessible', async () => {
            const mockSetIndividualHotkey = vi.fn();
            window.electronAPI = {
                ...window.electronAPI,
                getIndividualHotkeys: vi.fn().mockResolvedValue({
                    alwaysOnTop: true,
                    bossKey: true,
                    quickChat: true,
                }),
                setIndividualHotkey: mockSetIndividualHotkey,
                onIndividualHotkeysChanged: vi.fn().mockReturnValue(() => { }),
            } as any;

            renderWithProvider(<IndividualHotkeyToggles />);

            await waitFor(() => {
                expect(screen.getByTestId('hotkey-toggle-bossKey-switch')).toBeInTheDocument();
            });

            fireEvent.keyDown(screen.getByTestId('hotkey-toggle-bossKey-switch'), { key: 'Enter' });

            expect(mockSetIndividualHotkey).toHaveBeenCalledWith('bossKey', false);
        });
    });
});
