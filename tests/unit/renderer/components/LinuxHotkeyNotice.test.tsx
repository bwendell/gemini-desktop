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
import { platformAdapterPresets } from '../../../helpers/mocks/main/platformAdapterMock';

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

describe('LinuxHotkeyNotice', () => {
    const mockShowWarning = vi.fn();
    let originalElectronAPI: any;

    const buildStatusFromPreset = (
        preset: keyof typeof platformAdapterPresets,
        globalHotkeysEnabled: boolean,
        registrationResults: PlatformHotkeyStatus['registrationResults'] = []
    ): PlatformHotkeyStatus => {
        const adapter = platformAdapterPresets[preset]();
        return {
            waylandStatus: adapter.getWaylandStatus(),
            registrationResults,
            globalHotkeysEnabled,
        };
    };

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
                    { hotkeyId: 'peekAndHide', success: true },
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
                    { hotkeyId: 'peekAndHide', success: false, error: 'Already registered by another app' },
                ],
                globalHotkeysEnabled: true,
            };

            const win = globalThis.window as any;
            win.electronAPI.getPlatformHotkeyStatus.mockResolvedValue(partialFailureStatus);

            render(<LinuxHotkeyNotice />);

            await waitFor(
                () => {
                    expect(mockShowWarning).toHaveBeenCalledWith(
                        expect.stringContaining('peekAndHide'),
                        expect.objectContaining({
                            id: 'linux-hotkey-notice',
                            title: 'Hotkey Registration Partial',
                            duration: 20000,
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
                    { hotkeyId: 'peekAndHide', success: false, error: 'Conflict' },
                ],
                globalHotkeysEnabled: true,
            };

            const win = globalThis.window as any;
            win.electronAPI.getPlatformHotkeyStatus.mockResolvedValue(multipleFailuresStatus);

            render(<LinuxHotkeyNotice />);

            await waitFor(
                () => {
                    expect(mockShowWarning).toHaveBeenCalledWith(
                        expect.stringContaining('quickChat, peekAndHide'),
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
            const noPortalStatus = buildStatusFromPreset('linuxWaylandNoPortal', false);

            const win = globalThis.window as any;
            win.electronAPI.getPlatformHotkeyStatus.mockResolvedValue(noPortalStatus);

            render(<LinuxHotkeyNotice />);

            await waitFor(
                () => {
                    expect(mockShowWarning).toHaveBeenCalledWith(
                        'Global shortcuts are not available on KDE Plasma. Portal registration is unavailable because the desktop environment is unsupported or no Wayland session bus was detected.',
                        expect.objectContaining({
                            id: 'linux-hotkey-notice',
                            title: 'Global Hotkeys Disabled',
                            duration: 20000,
                        })
                    );
                },
                { timeout: 3000 }
            );
        });

        it('should show combined-cause warning for unknown DE when portal is unavailable', async () => {
            const status: PlatformHotkeyStatus = {
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
            win.electronAPI.getPlatformHotkeyStatus.mockResolvedValue(status);

            render(<LinuxHotkeyNotice />);

            await waitFor(
                () => {
                    expect(mockShowWarning).toHaveBeenCalledWith(
                        'Global shortcuts are not available. Portal registration is unavailable because the desktop environment is unsupported or no Wayland session bus was detected.',
                        expect.objectContaining({
                            id: 'linux-hotkey-notice',
                            title: 'Global Hotkeys Disabled',
                            duration: 20000,
                        })
                    );
                },
                { timeout: 3000 }
            );
        });

        it('should show GNOME-specific warning when hotkeys are disabled', async () => {
            const noPortalStatus = buildStatusFromPreset('linuxWaylandGnome', false);

            const win = globalThis.window as any;
            win.electronAPI.getPlatformHotkeyStatus.mockResolvedValue(noPortalStatus);

            render(<LinuxHotkeyNotice />);

            await waitFor(
                () => {
                    expect(mockShowWarning).toHaveBeenCalledWith(
                        'Global shortcuts are currently disabled on GNOME. Enable them in Settings to register shortcuts.',
                        expect.objectContaining({
                            id: 'linux-hotkey-notice',
                            title: 'Global Hotkeys Disabled',
                            duration: 20000,
                        })
                    );
                },
                { timeout: 3000 }
            );
        });

        it('should show Hyprland-specific warning when hotkeys are disabled', async () => {
            const noPortalStatus = buildStatusFromPreset('linuxWaylandHyprland', false);

            const win = globalThis.window as any;
            win.electronAPI.getPlatformHotkeyStatus.mockResolvedValue(noPortalStatus);

            render(<LinuxHotkeyNotice />);

            await waitFor(
                () => {
                    expect(mockShowWarning).toHaveBeenCalledWith(
                        'Global shortcuts are currently disabled on Hyprland. Enable them in Settings to register shortcuts.',
                        expect.objectContaining({
                            id: 'linux-hotkey-notice',
                            title: 'Global Hotkeys Disabled',
                            duration: 20000,
                        })
                    );
                },
                { timeout: 3000 }
            );
        });

        it('should show generic warning for unknown desktop environment', async () => {
            const noPortalStatus = buildStatusFromPreset('linuxWaylandUnknown', false);

            const win = globalThis.window as any;
            win.electronAPI.getPlatformHotkeyStatus.mockResolvedValue(noPortalStatus);

            render(<LinuxHotkeyNotice />);

            await waitFor(
                () => {
                    expect(mockShowWarning).toHaveBeenCalledWith(
                        'Global shortcuts are currently disabled. Enable them in Settings to register shortcuts.',
                        expect.objectContaining({
                            id: 'linux-hotkey-notice',
                            title: 'Global Hotkeys Disabled',
                            duration: 20000,
                        })
                    );
                },
                { timeout: 3000 }
            );
        });

        it('should avoid portal remediation when no registration was attempted', async () => {
            const status = buildStatusFromPreset('linuxWaylandGnome', false, []);

            const win = globalThis.window as any;
            win.electronAPI.getPlatformHotkeyStatus.mockResolvedValue(status);

            render(<LinuxHotkeyNotice />);

            await waitFor(
                () => {
                    expect(mockShowWarning).toHaveBeenCalledWith(
                        'Global shortcuts are currently disabled on GNOME. Enable them in Settings to register shortcuts.',
                        expect.objectContaining({
                            id: 'linux-hotkey-notice',
                            title: 'Global Hotkeys Disabled',
                            duration: 20000,
                        })
                    );
                },
                { timeout: 3000 }
            );

            const [message] = mockShowWarning.mock.calls[0] as [string, unknown];
            expect(message).not.toContain('portal');
        });

        it('should show registration failure details when attempts were made', async () => {
            const failedRegistrationStatus = buildStatusFromPreset('linuxWaylandGnome', false, [
                { hotkeyId: 'quickChat', success: false, error: 'Bind timeout' },
                { hotkeyId: 'peekAndHide', success: false, error: 'Already in use' },
            ]);

            const win = globalThis.window as any;
            win.electronAPI.getPlatformHotkeyStatus.mockResolvedValue(failedRegistrationStatus);

            render(<LinuxHotkeyNotice />);

            await waitFor(
                () => {
                    expect(mockShowWarning).toHaveBeenCalledWith(
                        'Global shortcuts could not be registered: quickChat, peekAndHide. Bind timeout; Already in use.',
                        expect.objectContaining({
                            id: 'linux-hotkey-notice',
                            title: 'Global Hotkeys Disabled',
                            duration: 20000,
                        })
                    );
                },
                { timeout: 3000 }
            );
        });

        it('should not show warning when registration succeeds on GNOME', async () => {
            const successStatus = buildStatusFromPreset('linuxWaylandGnome', true, [
                { hotkeyId: 'quickChat', success: true },
                { hotkeyId: 'peekAndHide', success: true },
            ]);

            const win = globalThis.window as any;
            win.electronAPI.getPlatformHotkeyStatus.mockResolvedValue(successStatus);

            render(<LinuxHotkeyNotice />);

            await act(async () => {
                await new Promise((r) => setTimeout(r, 1200));
            });

            expect(mockShowWarning).not.toHaveBeenCalled();
        });

        it.each([
            ['sway', 'Sway'],
            ['cosmic', 'COSMIC'],
            ['deepin', 'Deepin'],
        ] as const)('should show %s display name in warning message', async (desktopEnvironment, displayName) => {
            const status: PlatformHotkeyStatus = {
                waylandStatus: {
                    isWayland: true,
                    desktopEnvironment,
                    deVersion: null,
                    portalAvailable: true,
                    portalMethod: 'none',
                },
                registrationResults: [],
                globalHotkeysEnabled: false,
            };

            const win = globalThis.window as any;
            win.electronAPI.getPlatformHotkeyStatus.mockResolvedValue(status);

            render(<LinuxHotkeyNotice />);

            await waitFor(
                () => {
                    expect(mockShowWarning).toHaveBeenCalledWith(
                        `Global shortcuts are currently disabled on ${displayName}. Enable them in Settings to register shortcuts.`,
                        expect.objectContaining({
                            id: 'linux-hotkey-notice',
                            title: 'Global Hotkeys Disabled',
                            duration: 20000,
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
                        'Global shortcuts are not available.',
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
                        'Global shortcuts are not available.',
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
                        'Global shortcuts are not available.',
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
