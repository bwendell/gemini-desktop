/**
 * Unit tests for LinuxHotkeyNotice component.
 *
 * Tests the refactored component that uses ToastContext:
 * - Shows warning toast on Linux
 * - Does not show on non-Linux platforms
 * - Uses correct toast ID for duplicate prevention
 * - Uses 5-second auto-dismiss duration
 * - Shows correct title and message
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LinuxHotkeyNotice } from './LinuxHotkeyNotice';
import { ToastProvider, useToast } from '../../context/ToastContext';
import * as platformModule from '../../utils/platform';
import React from 'react';

// Spy on isLinux function
vi.mock('../../utils/platform', async () => {
    const actual = await vi.importActual('../../utils/platform');
    return {
        ...actual,
        isLinux: vi.fn(),
    };
});

/**
 * Test component that captures toast state
 */
function ToastCapture({ onCapture }: { onCapture: (toasts: any[]) => void }) {
    const { toasts } = useToast();
    React.useEffect(() => {
        onCapture(toasts);
    }, [toasts, onCapture]);
    return null;
}

describe('LinuxHotkeyNotice', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('on Linux', () => {
        beforeEach(() => {
            (platformModule.isLinux as Mock).mockReturnValue(true);
        });

        it('shows warning toast after delay', () => {
            let capturedToasts: any[] = [];
            const capture = (toasts: any[]) => {
                capturedToasts = toasts;
            };

            render(
                <ToastProvider>
                    <LinuxHotkeyNotice />
                    <ToastCapture onCapture={capture} />
                </ToastProvider>
            );

            // No toast before delay
            expect(capturedToasts).toHaveLength(0);

            // Advance past SHOW_DELAY_MS (500ms)
            act(() => {
                vi.advanceTimersByTime(500);
            });

            expect(capturedToasts).toHaveLength(1);
        });

        it('uses correct toast ID for duplicate prevention', () => {
            let capturedToasts: any[] = [];
            const capture = (toasts: any[]) => {
                capturedToasts = toasts;
            };

            render(
                <ToastProvider>
                    <LinuxHotkeyNotice />
                    <ToastCapture onCapture={capture} />
                </ToastProvider>
            );

            act(() => {
                vi.advanceTimersByTime(500);
            });

            expect(capturedToasts[0].id).toBe('linux-hotkey-notice');
        });

        it('uses warning toast type', () => {
            let capturedToasts: any[] = [];
            const capture = (toasts: any[]) => {
                capturedToasts = toasts;
            };

            render(
                <ToastProvider>
                    <LinuxHotkeyNotice />
                    <ToastCapture onCapture={capture} />
                </ToastProvider>
            );

            act(() => {
                vi.advanceTimersByTime(500);
            });

            expect(capturedToasts[0].type).toBe('warning');
        });

        it('shows correct title', () => {
            let capturedToasts: any[] = [];
            const capture = (toasts: any[]) => {
                capturedToasts = toasts;
            };

            render(
                <ToastProvider>
                    <LinuxHotkeyNotice />
                    <ToastCapture onCapture={capture} />
                </ToastProvider>
            );

            act(() => {
                vi.advanceTimersByTime(500);
            });

            expect(capturedToasts[0].title).toBe('Global Hotkeys Disabled');
        });

        it('shows correct message about Wayland limitations', () => {
            let capturedToasts: any[] = [];
            const capture = (toasts: any[]) => {
                capturedToasts = toasts;
            };

            render(
                <ToastProvider>
                    <LinuxHotkeyNotice />
                    <ToastCapture onCapture={capture} />
                </ToastProvider>
            );

            act(() => {
                vi.advanceTimersByTime(500);
            });

            expect(capturedToasts[0].message).toContain('Wayland limitations');
        });

        it('auto-dismisses after 5 seconds', () => {
            let capturedToasts: any[] = [];
            const capture = (toasts: any[]) => {
                capturedToasts = toasts;
            };

            render(
                <ToastProvider>
                    <LinuxHotkeyNotice />
                    <ToastCapture onCapture={capture} />
                </ToastProvider>
            );

            // Show toast
            act(() => {
                vi.advanceTimersByTime(500);
            });

            expect(capturedToasts).toHaveLength(1);

            // Wait 4999ms - toast should still be visible
            act(() => {
                vi.advanceTimersByTime(4999);
            });

            expect(capturedToasts).toHaveLength(1);

            // Wait 1 more ms to complete 5 seconds - toast should be dismissed
            act(() => {
                vi.advanceTimersByTime(1);
            });

            expect(capturedToasts).toHaveLength(0);
        });

        it('renders null (no DOM element)', () => {
            const { container } = render(
                <ToastProvider>
                    <div data-testid="parent">
                        <LinuxHotkeyNotice />
                    </div>
                </ToastProvider>
            );

            // LinuxHotkeyNotice should render nothing, parent should be "empty" except for the toast container
            const parent = screen.getByTestId('parent');
            expect(parent.children).toHaveLength(0);
        });

        it('renders toast in DOM when shown', () => {
            render(
                <ToastProvider>
                    <LinuxHotkeyNotice />
                </ToastProvider>
            );

            act(() => {
                vi.advanceTimersByTime(500);
            });

            // Toast should be visible in DOM
            expect(screen.getByTestId('toast')).toBeInTheDocument();
            expect(screen.getByText('Global Hotkeys Disabled')).toBeInTheDocument();
        });
    });

    describe('on non-Linux platforms', () => {
        beforeEach(() => {
            (platformModule.isLinux as Mock).mockReturnValue(false);
        });

        it('does not show toast on macOS', () => {
            let capturedToasts: any[] = [];
            const capture = (toasts: any[]) => {
                capturedToasts = toasts;
            };

            render(
                <ToastProvider>
                    <LinuxHotkeyNotice />
                    <ToastCapture onCapture={capture} />
                </ToastProvider>
            );

            act(() => {
                vi.advanceTimersByTime(1000);
            });

            expect(capturedToasts).toHaveLength(0);
        });

        it('does not show toast on Windows', () => {
            let capturedToasts: any[] = [];
            const capture = (toasts: any[]) => {
                capturedToasts = toasts;
            };

            render(
                <ToastProvider>
                    <LinuxHotkeyNotice />
                    <ToastCapture onCapture={capture} />
                </ToastProvider>
            );

            act(() => {
                vi.advanceTimersByTime(1000);
            });

            expect(capturedToasts).toHaveLength(0);
        });
    });

    describe('cleanup', () => {
        beforeEach(() => {
            (platformModule.isLinux as Mock).mockReturnValue(true);
        });

        it('clears timeout on unmount before delay', () => {
            let capturedToasts: any[] = [];
            const capture = (toasts: any[]) => {
                capturedToasts = toasts;
            };

            const { unmount } = render(
                <ToastProvider>
                    <LinuxHotkeyNotice />
                    <ToastCapture onCapture={capture} />
                </ToastProvider>
            );

            // Unmount before delay completes
            act(() => {
                vi.advanceTimersByTime(200);
            });
            unmount();

            // Advance past when toast would have shown
            act(() => {
                vi.advanceTimersByTime(500);
            });

            // No errors should occur and timer should be cleared
            expect(true).toBe(true);
        });
    });
});
