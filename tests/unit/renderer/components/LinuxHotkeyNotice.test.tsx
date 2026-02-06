/**
 * Unit tests for LinuxHotkeyNotice component.
 * Tests conditional toast behavior based on platform hotkey status.
 *
 * Target: 100% coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { LinuxHotkeyNotice } from '../../../../src/renderer/components/toast/LinuxHotkeyNotice';
import type { PlatformHotkeyStatus } from '../../../../src/shared/types/hotkeys';

// Mock dependencies
vi.mock('../../../../src/renderer/utils/platform', () => ({
    isLinux: vi.fn(),
}));

vi.mock('../../../../src/renderer/context/ToastContext', () => ({
    useToast: vi.fn(),
}));

// Import mocks after vi.mock
import { isLinux } from '../../../../src/renderer/utils/platform';
import { useToast } from '../../../../src/renderer/context/ToastContext';

// Helper to flush promises
const flushPromises = () => new Promise(setImmediate);

describe('LinuxHotkeyNotice', () => {
    const mockShowWarning = vi.fn();
    let originalElectronAPI: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock for useToast
        vi.mocked(useToast).mockReturnValue({
            showWarning: mockShowWarning,
            showToast: vi.fn(),
            dismissToast: vi.fn(),
            dismissAll: vi.fn(),
            toasts: [],
            showSuccess: vi.fn(),
            showError: vi.fn(),
            showInfo: vi.fn(),
        });

        // Store original and add getPlatformHotkeyStatus to electronAPI mock
        const win = globalThis.window as any;
        originalElectronAPI = win?.electronAPI;
        if (win?.electronAPI) {
            win.electronAPI = {
                ...win.electronAPI,
                getPlatformHotkeyStatus: vi.fn(),
            };
        }
    });

    afterEach(() => {
        // Restore original electronAPI
        const win = globalThis.window as any;
        if (win) {
            win.electronAPI = originalElectronAPI;
        }
    });

    describe('non-Linux platforms', () => {
        it('should not show toast on non-Linux', async () => {
            vi.mocked(isLinux).mockReturnValue(false);

            render(<LinuxHotkeyNotice />);

            // Wait sufficient time for any timers
            await act(async () => {
                await new Promise((r) => setTimeout(r, 1200));
            });

            expect(mockShowWarning).not.toHaveBeenCalled();
        });
    });

    describe('Wayland with portal support', () => {
        beforeEach(() => {
            vi.mocked(isLinux).mockReturnValue(true);
        });

        it('should NOT show toast when all hotkeys succeed (silent success)', async () => {
            const successStatus: PlatformHotkeyStatus = {
                waylandStatus: {
                    isWayland: true,
                    desktopEnvironment: 'kde',
                    deVersion: '5.27.0',
                    portalAvailable: true,
                    portalMethod: 'chromium-flag',
                },
                registrationResults: [
                    { hotkeyId: 'quickChat', success: true },
                    { hotkeyId: 'bossKey', success: true },
                ],
                globalHotkeysEnabled: true,
            };

            const win = globalThis.window as any;
            win.electronAPI.getPlatformHotkeyStatus.mockResolvedValue(successStatus);

            render(<LinuxHotkeyNotice />);

            // Wait for timeout (1000ms) + IPC resolution
            await act(async () => {
                await new Promise((r) => setTimeout(r, 1200));
            });

            // No toast should be shown on success
            expect(mockShowWarning).not.toHaveBeenCalled();
        });

        it('should show toast with failed shortcut names when partial failure occurs', async () => {
            const partialFailureStatus: PlatformHotkeyStatus = {
                waylandStatus: {
                    isWayland: true,
                    desktopEnvironment: 'kde',
                    deVersion: '5.27.0',
                    portalAvailable: true,
                    portalMethod: 'chromium-flag',
                },
                registrationResults: [
                    { hotkeyId: 'quickChat', success: true },
                    { hotkeyId: 'bossKey', success: false, error: 'Already registered by another app' },
                ],
                globalHotkeysEnabled: true,
            };

            const win = globalThis.window as any;
            win.electronAPI.getPlatformHotkeyStatus.mockResolvedValue(partialFailureStatus);

            render(<LinuxHotkeyNotice />);

            await waitFor(
                () => {
                    expect(mockShowWarning).toHaveBeenCalledWith(
                        expect.stringContaining('bossKey'),
                        expect.objectContaining({
                            id: 'linux-hotkey-notice',
                            title: 'Hotkey Registration Partial',
                            duration: 5000,
                        })
                    );
                },
                { timeout: 3000 }
            );
        });

        it('should show toast listing multiple failed shortcuts', async () => {
            const multipleFailuresStatus: PlatformHotkeyStatus = {
                waylandStatus: {
                    isWayland: true,
                    desktopEnvironment: 'kde',
                    deVersion: '5.27.0',
                    portalAvailable: true,
                    portalMethod: 'chromium-flag',
                },
                registrationResults: [
                    { hotkeyId: 'quickChat', success: false, error: 'Conflict' },
                    { hotkeyId: 'bossKey', success: false, error: 'Conflict' },
                ],
                globalHotkeysEnabled: true,
            };

            const win = globalThis.window as any;
            win.electronAPI.getPlatformHotkeyStatus.mockResolvedValue(multipleFailuresStatus);

            render(<LinuxHotkeyNotice />);

            await waitFor(
                () => {
                    expect(mockShowWarning).toHaveBeenCalledWith(
                        expect.stringContaining('quickChat, bossKey'),
                        expect.any(Object)
                    );
                },
                { timeout: 3000 }
            );
        });
    });

    describe('Wayland without portal support', () => {
        beforeEach(() => {
            vi.mocked(isLinux).mockReturnValue(true);
        });

        it('should show toast when portal is unavailable', async () => {
            const noPortalStatus: PlatformHotkeyStatus = {
                waylandStatus: {
                    isWayland: true,
                    desktopEnvironment: 'unknown',
                    deVersion: null,
                    portalAvailable: false,
                    portalMethod: 'none',
                },
                registrationResults: [],
                globalHotkeysEnabled: false,
            };

            const win = globalThis.window as any;
            win.electronAPI.getPlatformHotkeyStatus.mockResolvedValue(noPortalStatus);

            render(<LinuxHotkeyNotice />);

            await waitFor(
                () => {
                    expect(mockShowWarning).toHaveBeenCalledWith(
                        expect.stringContaining('unavailable'),
                        expect.objectContaining({
                            id: 'linux-hotkey-notice',
                            title: 'Global Hotkeys Disabled',
                        })
                    );
                },
                { timeout: 3000 }
            );
        });
    });

    describe('X11 Linux', () => {
        beforeEach(() => {
            vi.mocked(isLinux).mockReturnValue(true);
        });

        it('should show toast on X11 (existing behavior)', async () => {
            const x11Status: PlatformHotkeyStatus = {
                waylandStatus: {
                    isWayland: false,
                    desktopEnvironment: 'unknown',
                    deVersion: null,
                    portalAvailable: false,
                    portalMethod: 'none',
                },
                registrationResults: [],
                globalHotkeysEnabled: false,
            };

            const win = globalThis.window as any;
            win.electronAPI.getPlatformHotkeyStatus.mockResolvedValue(x11Status);

            render(<LinuxHotkeyNotice />);

            await waitFor(
                () => {
                    expect(mockShowWarning).toHaveBeenCalledWith(
                        expect.stringContaining('unavailable'),
                        expect.any(Object)
                    );
                },
                { timeout: 3000 }
            );
        });
    });

    describe('IPC failure handling', () => {
        beforeEach(() => {
            vi.mocked(isLinux).mockReturnValue(true);
        });

        it('should show warning toast when IPC call fails', async () => {
            const win = globalThis.window as any;
            win.electronAPI.getPlatformHotkeyStatus.mockRejectedValue(new Error('IPC failed'));

            render(<LinuxHotkeyNotice />);

            await waitFor(
                () => {
                    expect(mockShowWarning).toHaveBeenCalledWith(
                        expect.stringContaining('unavailable'),
                        expect.any(Object)
                    );
                },
                { timeout: 3000 }
            );
        });

        it('should show warning toast when electronAPI is not available', async () => {
            const win = globalThis.window as any;
            const savedAPI = win.electronAPI;
            win.electronAPI = undefined;

            render(<LinuxHotkeyNotice />);

            await waitFor(
                () => {
                    expect(mockShowWarning).toHaveBeenCalledWith(
                        expect.stringContaining('unavailable'),
                        expect.any(Object)
                    );
                },
                { timeout: 3000 }
            );

            // Restore for cleanup
            win.electronAPI = savedAPI;
        });
    });

    describe('duplicate prevention', () => {
        beforeEach(() => {
            vi.mocked(isLinux).mockReturnValue(true);
        });

        it('should only show toast once even in strict mode', async () => {
            const noPortalStatus: PlatformHotkeyStatus = {
                waylandStatus: {
                    isWayland: true,
                    desktopEnvironment: 'unknown',
                    deVersion: null,
                    portalAvailable: false,
                    portalMethod: 'none',
                },
                registrationResults: [],
                globalHotkeysEnabled: false,
            };

            const win = globalThis.window as any;
            win.electronAPI.getPlatformHotkeyStatus.mockResolvedValue(noPortalStatus);

            const { rerender } = render(<LinuxHotkeyNotice />);

            // Wait for first render to complete
            await waitFor(
                () => {
                    expect(mockShowWarning).toHaveBeenCalledTimes(1);
                },
                { timeout: 3000 }
            );

            // Simulate strict mode double mount
            rerender(<LinuxHotkeyNotice />);

            // Wait a bit more
            await act(async () => {
                await new Promise((r) => setTimeout(r, 1200));
            });

            // Should still only be called once
            expect(mockShowWarning).toHaveBeenCalledTimes(1);
        });
    });
});
