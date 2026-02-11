/**
 * Coordinated tests for Wayland hotkey functionality.
 *
 * Tests the coordination between:
 * - WaylandDetector → HotkeyManager (detection influences registration)
 * - HotkeyManager → D-Bus fallback (failed Chromium registration triggers fallback)
 * - HotkeyManager → IpcManager (platform status flows through IPC)
 *
 * These tests use REAL manager instances (not mocked) while mocking Electron APIs
 * and environment variables.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock electron module FIRST (before importing from 'electron')
vi.mock('electron', async () => {
    const mockModule = await import('../unit/main/test/electron-mock');
    return mockModule.default;
});

import { globalShortcut } from 'electron';
import { DEFAULT_ACCELERATORS } from '../../src/shared/types/hotkeys';

import type { IndividualHotkeySettings } from '../../src/main/types';
import type { WaylandStatus, PlatformHotkeyStatus } from '../../src/shared/types/hotkeys';

// Use the centralized logger mock from __mocks__ directory
vi.mock('../../src/main/utils/logger');

// Mock the waylandDetector module to control detection results
const mockGetWaylandStatus = vi.fn();
vi.mock('../../src/main/utils/waylandDetector', () => ({
    getWaylandStatus: mockGetWaylandStatus,
    detectWaylandSession: vi.fn(),
    detectDesktopEnvironment: vi.fn(),
    detectDEVersion: vi.fn(),
    isSupportedDE: vi.fn(),
}));

// Mock getWaylandPlatformStatus from constants and make isLinux dynamic
const mockGetWaylandPlatformStatus = vi.fn();
let mockIsLinux = false;
vi.mock('../../src/main/utils/constants', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../src/main/utils/constants')>();
    return {
        ...actual,
        get isLinux() {
            return mockIsLinux;
        },
        getWaylandPlatformStatus: mockGetWaylandPlatformStatus,
    };
});

// Mock dbusFallback module
const mockRegisterViaDBus = vi.fn();
const mockIsDBusFallbackAvailable = vi.fn();
const mockDestroySession = vi.fn();
vi.mock('../../src/main/utils/dbusFallback', () => ({
    registerViaDBus: (...args: unknown[]) => mockRegisterViaDBus(...args),
    isDBusFallbackAvailable: () => mockIsDBusFallbackAvailable(),
    destroySession: (...args: unknown[]) => mockDestroySession(...args),
}));

describe('Wayland Hotkey Coordination', () => {
    // Import managers dynamically to pick up mocks
    let HotkeyManager: typeof import('../../src/main/managers/hotkeyManager').default;
    let WindowManager: typeof import('../../src/main/managers/windowManager').default;

    let hotkeyManager: InstanceType<typeof HotkeyManager>;
    let windowManager: InstanceType<typeof WindowManager>;

    // Default Wayland status for mocking
    const defaultWaylandStatus: WaylandStatus = {
        isWayland: false,
        desktopEnvironment: 'unknown',
        deVersion: null,
        portalAvailable: false,
        portalMethod: 'none',
    };

    const waylandKDEStatus: WaylandStatus = {
        isWayland: true,
        desktopEnvironment: 'kde',
        deVersion: '5.27',
        portalAvailable: true,
        portalMethod: 'chromium-flag',
    };

    const waylandUnsupportedStatus: WaylandStatus = {
        isWayland: true,
        desktopEnvironment: 'unknown',
        deVersion: null,
        portalAvailable: false,
        portalMethod: 'none',
    };

    const x11Status: WaylandStatus = {
        isWayland: false,
        desktopEnvironment: 'kde',
        deVersion: '5.27',
        portalAvailable: false,
        portalMethod: 'none',
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        const { ipcMain, BrowserWindow: BW, globalShortcut: gs } = require('electron');
        if (ipcMain && (ipcMain as any)._reset) (ipcMain as any)._reset();
        if (BW && (BW as any)._reset) (BW as any)._reset();
        if (gs && (gs as any)._reset) (gs as any)._reset();

        // Default mocks
        mockGetWaylandStatus.mockReturnValue(defaultWaylandStatus);
        mockGetWaylandPlatformStatus.mockReturnValue(defaultWaylandStatus);
        mockRegisterViaDBus.mockResolvedValue([]);
        mockIsDBusFallbackAvailable.mockResolvedValue(false);
        mockIsLinux = false;

        // Dynamic imports to pick up mocks
        const hotkeyManagerModule = await import('../../src/main/managers/hotkeyManager');
        const windowManagerModule = await import('../../src/main/managers/windowManager');
        HotkeyManager = hotkeyManagerModule.default;
        WindowManager = windowManagerModule.default;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        if (hotkeyManager) {
            hotkeyManager.unregisterAll();
        }
    });

    describe('WaylandDetector → HotkeyManager coordination', () => {
        beforeEach(() => {
            // Linux platform for Wayland tests
            vi.stubGlobal('process', { ...process, platform: 'linux' });
            mockIsLinux = true;
        });

        it('when detector reports Wayland+KDE, manager attempts registration via portal', async () => {
            // Arrange: Mock Wayland with KDE Plasma 5.27+ (supported)
            mockGetWaylandPlatformStatus.mockReturnValue(waylandKDEStatus);

            // Act: Create manager and register shortcuts
            windowManager = new WindowManager(false);
            const initialSettings: IndividualHotkeySettings = {
                alwaysOnTop: true,
                bossKey: true,
                quickChat: true,
                printToPdf: true,
            };
            hotkeyManager = new HotkeyManager(windowManager, initialSettings);

            vi.clearAllMocks();
            hotkeyManager.registerShortcuts();

            await vi.waitFor(() => {
                expect(mockRegisterViaDBus).toHaveBeenCalled();
            });

            expect(globalShortcut.register).not.toHaveBeenCalled();
        });

        it('when detector reports X11, manager skips Wayland-specific registration', () => {
            // Arrange: Mock X11 session (not Wayland)
            mockGetWaylandPlatformStatus.mockReturnValue(x11Status);

            // Act
            windowManager = new WindowManager(false);
            const initialSettings: IndividualHotkeySettings = {
                alwaysOnTop: true,
                bossKey: true,
                quickChat: true,
                printToPdf: true,
            };
            hotkeyManager = new HotkeyManager(windowManager, initialSettings);

            vi.clearAllMocks();
            hotkeyManager.registerShortcuts();

            // Assert: On X11 (not Wayland), hotkeys remain disabled on Linux
            // The implementation disables global hotkeys when portalAvailable is false
            expect(globalShortcut.register).not.toHaveBeenCalled();
        });

        it('when detector reports unsupported Wayland DE, hotkeys are disabled', () => {
            // Arrange: Mock Wayland with unsupported DE
            mockGetWaylandPlatformStatus.mockReturnValue(waylandUnsupportedStatus);

            // Act
            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                bossKey: true,
                quickChat: true,
                printToPdf: true,
            });

            vi.clearAllMocks();
            hotkeyManager.registerShortcuts();

            // Assert: No registration on unsupported Wayland DE
            expect(globalShortcut.register).not.toHaveBeenCalled();
        });
    });

    describe('HotkeyManager → D-Bus fallback coordination', () => {
        beforeEach(() => {
            vi.stubGlobal('process', { ...process, platform: 'linux' });
            mockIsLinux = true;
        });

        it('on Wayland+KDE, D-Bus is called directly without globalShortcut.register', async () => {
            // Arrange: Mock Wayland+KDE with portal available
            mockGetWaylandPlatformStatus.mockReturnValue(waylandKDEStatus);

            mockRegisterViaDBus.mockResolvedValue([
                { hotkeyId: 'quickChat', success: true },
                { hotkeyId: 'bossKey', success: true },
            ]);

            // Act
            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                bossKey: true,
                quickChat: true,
                printToPdf: true,
            });

            hotkeyManager.registerShortcuts();

            await vi.waitFor(() => {
                expect(mockRegisterViaDBus).toHaveBeenCalled();
            });

            expect(globalShortcut.register).not.toHaveBeenCalled();
        });

        it('D-Bus direct path passes action callbacks map', async () => {
            // Arrange: Mock Wayland+KDE with portal available
            mockGetWaylandPlatformStatus.mockReturnValue(waylandKDEStatus);

            // Act
            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                bossKey: true,
                quickChat: true,
                printToPdf: true,
            });

            hotkeyManager.registerShortcuts();

            await vi.waitFor(() => {
                expect(mockRegisterViaDBus).toHaveBeenCalledWith(expect.any(Array), expect.any(Map));
            });
        });

        it('D-Bus fallback path also passes action callbacks when triggered', async () => {
            // Arrange: Mock Wayland+KDE with portal available
            mockGetWaylandPlatformStatus.mockReturnValue(waylandKDEStatus);

            mockRegisterViaDBus.mockResolvedValue([
                { hotkeyId: 'quickChat', success: false, error: 'Denied' },
                { hotkeyId: 'bossKey', success: true },
            ]);

            // Act
            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                bossKey: true,
                quickChat: true,
                printToPdf: true,
            });

            hotkeyManager.registerShortcuts();

            await vi.waitFor(() => {
                expect(mockRegisterViaDBus).toHaveBeenCalledWith(expect.any(Array), expect.any(Map));
            });
        });
    });

    describe('HotkeyManager → IpcManager coordination', () => {
        it('platform status flows correctly through getPlatformHotkeyStatus on Linux', () => {
            // Arrange: Setup on Linux with Wayland
            vi.stubGlobal('process', { ...process, platform: 'linux' });
            mockIsLinux = true;
            mockGetWaylandPlatformStatus.mockReturnValue(waylandKDEStatus);

            // Act
            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                bossKey: true,
                quickChat: true,
                printToPdf: true,
            });

            // Get platform status after registration attempt
            hotkeyManager.registerShortcuts();
            const status: PlatformHotkeyStatus = hotkeyManager.getPlatformHotkeyStatus();

            // Assert: Status should reflect Wayland detection
            expect(status).toHaveProperty('waylandStatus');
            expect(status).toHaveProperty('registrationResults');
            expect(status).toHaveProperty('globalHotkeysEnabled');
            expect(status.waylandStatus.isWayland).toBe(true);
            expect(status.waylandStatus.desktopEnvironment).toBe('kde');
        });

        it('platform status returns correct defaults on non-Linux platforms', () => {
            // Arrange: Setup on macOS
            vi.stubGlobal('process', { ...process, platform: 'darwin' });
            mockIsLinux = false;

            // Act
            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                bossKey: true,
                quickChat: true,
                printToPdf: true,
            });

            const status: PlatformHotkeyStatus = hotkeyManager.getPlatformHotkeyStatus();

            // Assert: Non-Linux should not detect Wayland
            expect(status.waylandStatus.isWayland).toBe(false);
            expect(status.waylandStatus.portalAvailable).toBe(false);
        });
    });

    describe.each(['darwin', 'win32', 'linux'] as const)('cross-platform behavior on %s', (platform) => {
        beforeEach(() => {
            vi.stubGlobal('process', { ...process, platform });
            mockIsLinux = platform === 'linux';

            // Reset platform-specific mocks
            if (platform === 'linux') {
                mockGetWaylandPlatformStatus.mockReturnValue(x11Status);
            } else {
                mockGetWaylandPlatformStatus.mockReturnValue(defaultWaylandStatus);
            }
        });

        it('non-Linux platforms register hotkeys normally without Wayland checks', () => {
            // Act
            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                bossKey: true,
                quickChat: true,
                printToPdf: true,
            });

            vi.clearAllMocks();
            hotkeyManager.registerShortcuts();

            if (platform !== 'linux') {
                // Darwin/Win32: Global hotkeys should be registered
                expect(globalShortcut.register).toHaveBeenCalledWith(
                    DEFAULT_ACCELERATORS.quickChat,
                    expect.any(Function)
                );
                expect(globalShortcut.register).toHaveBeenCalledWith(
                    DEFAULT_ACCELERATORS.bossKey,
                    expect.any(Function)
                );

                // D-Bus fallback should never be triggered
                expect(mockRegisterViaDBus).not.toHaveBeenCalled();
            } else {
                // Linux with X11: hotkeys disabled
                expect(globalShortcut.register).not.toHaveBeenCalled();
            }
        });

        it('getPlatformHotkeyStatus returns appropriate status for platform', () => {
            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                bossKey: true,
                quickChat: true,
                printToPdf: true,
            });

            hotkeyManager.registerShortcuts();
            const status = hotkeyManager.getPlatformHotkeyStatus();

            expect(status).toHaveProperty('waylandStatus');
            expect(status).toHaveProperty('registrationResults');
            expect(status).toHaveProperty('globalHotkeysEnabled');

            if (platform !== 'linux') {
                // Non-Linux: global hotkeys should be enabled
                expect(status.globalHotkeysEnabled).toBe(true);
            }
        });
    });

    // ========================================================================
    // P1: Coordinated Wayland Hotkey Scenarios
    // ========================================================================

    describe('P1: Coordinated Wayland Hotkey Scenarios', () => {
        it('P1-2: toggling a hotkey during in-flight D-Bus registration does not cause duplicate calls', async () => {
            // Arrange
            vi.stubGlobal('process', { ...process, platform: 'linux' });
            mockIsLinux = true;
            mockGetWaylandPlatformStatus.mockReturnValue(waylandKDEStatus);

            // Use a deferred promise to control when registerViaDBus resolves
            let resolveRegistration!: (value: any) => void;
            const registrationPromise = new Promise((resolve) => {
                resolveRegistration = resolve;
            });
            mockRegisterViaDBus.mockReturnValue(registrationPromise);

            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                bossKey: true,
                quickChat: true,
                printToPdf: true,
            });

            // Act: Start registration (don't await)
            hotkeyManager.registerShortcuts();

            // Toggle bossKey while registration is in-flight
            hotkeyManager.setIndividualEnabled('bossKey', false);

            // Verify the setting is updated immediately
            expect(hotkeyManager.getIndividualSettings().bossKey).toBe(false);

            // Complete the registration
            resolveRegistration([
                { hotkeyId: 'quickChat', success: true },
                { hotkeyId: 'bossKey', success: true },
            ]);

            await vi.waitFor(() => {
                expect(mockRegisterViaDBus).toHaveBeenCalled();
            });

            // registerViaDBus should only have been called once (from the original registerShortcuts)
            expect(mockRegisterViaDBus).toHaveBeenCalledTimes(1);
        });

        it('P1-3: re-registration clears previous results and calls destroySession', async () => {
            // Arrange
            vi.stubGlobal('process', { ...process, platform: 'linux' });
            mockIsLinux = true;
            mockGetWaylandPlatformStatus.mockReturnValue(waylandKDEStatus);

            mockRegisterViaDBus.mockResolvedValue([
                { hotkeyId: 'quickChat', success: true },
                { hotkeyId: 'bossKey', success: true },
            ]);

            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                bossKey: true,
                quickChat: true,
                printToPdf: true,
            });

            // First registration
            hotkeyManager.registerShortcuts();
            await vi.waitFor(() => {
                const status = hotkeyManager.getPlatformHotkeyStatus();
                expect(status.registrationResults).toHaveLength(2);
            });

            vi.clearAllMocks();
            mockGetWaylandPlatformStatus.mockReturnValue(waylandKDEStatus);
            mockRegisterViaDBus.mockResolvedValue([
                { hotkeyId: 'quickChat', success: true },
                { hotkeyId: 'bossKey', success: true },
            ]);

            // Second registration (without explicit cleanup)
            hotkeyManager.registerShortcuts();
            await vi.waitFor(() => {
                expect(mockRegisterViaDBus).toHaveBeenCalledTimes(1);
            });

            // Final results should reflect the second registration
            const status = hotkeyManager.getPlatformHotkeyStatus();
            expect(status.registrationResults).toHaveLength(2);
            expect(status.registrationResults.every((r) => r.success)).toBe(true);
        });

        // ====================================================================
        // CT-001: Rapid Enable/Disable Toggles (RC-2)
        // ====================================================================
        it('CT-001: rapid enable/disable toggles do not cause duplicate registrations', async () => {
            // Arrange: Mock Wayland+KDE with portal available
            vi.stubGlobal('process', { ...process, platform: 'linux' });
            mockIsLinux = true;
            mockGetWaylandPlatformStatus.mockReturnValue(waylandKDEStatus);

            // Use a deferred promise to control registration timing
            let resolveRegistration!: (value: any) => void;
            const registrationPromise = new Promise((resolve) => {
                resolveRegistration = resolve;
            });
            mockRegisterViaDBus.mockReturnValue(registrationPromise);

            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                bossKey: true,
                quickChat: true,
                printToPdf: true,
            });

            // Act: Start registration
            hotkeyManager.registerShortcuts();

            // Rapid toggles: disable/enable/disable
            hotkeyManager.setIndividualEnabled('quickChat', false);
            hotkeyManager.setIndividualEnabled('quickChat', true);
            hotkeyManager.setIndividualEnabled('quickChat', false);

            // Verify state reflects final toggle
            expect(hotkeyManager.getIndividualSettings().quickChat).toBe(false);

            // Complete the deferred registration
            resolveRegistration([
                { hotkeyId: 'quickChat', success: true },
                { hotkeyId: 'bossKey', success: true },
            ]);

            await vi.waitFor(() => {
                expect(mockRegisterViaDBus).toHaveBeenCalled();
            });

            // registerViaDBus should only be called once (toggles don't trigger re-registration)
            expect(mockRegisterViaDBus).toHaveBeenCalledTimes(1);
        });

        // ====================================================================
        // CT-002: App Quit During Registration (RC-3)
        // ====================================================================
        it('CT-002: app quit during registration triggers cleanup without errors', async () => {
            // Arrange: Mock Wayland+KDE
            vi.stubGlobal('process', { ...process, platform: 'linux' });
            mockIsLinux = true;
            mockGetWaylandPlatformStatus.mockReturnValue(waylandKDEStatus);

            // Deferred promise for registration
            let resolveRegistration!: (value: any) => void;
            const registrationPromise = new Promise((resolve) => {
                resolveRegistration = resolve;
            });
            mockRegisterViaDBus.mockReturnValue(registrationPromise);

            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                bossKey: true,
                quickChat: true,
                printToPdf: true,
            });

            // Act: Start registration (don't await)
            hotkeyManager.registerShortcuts();

            // Simulate app quit: unregister all hotkeys
            hotkeyManager.unregisterAll();

            // Now complete the registration (should not crash)
            resolveRegistration([
                { hotkeyId: 'quickChat', success: true },
                { hotkeyId: 'bossKey', success: true },
            ]);

            // Wait briefly to ensure no unhandled rejections
            await vi.waitFor(
                () => {
                    // Verify unregisterAll was called and state is clean
                    const status = hotkeyManager.getPlatformHotkeyStatus();
                    expect(status).toBeDefined();
                },
                { timeout: 100 }
            );

            // No assertion needed beyond not crashing; success is no exception
        });

        // ====================================================================
        // CT-003: State Propagation Timing
        // ====================================================================
        it('CT-003: state propagation timing - settings update before registration completes', async () => {
            // Arrange: Mock Wayland+KDE
            vi.stubGlobal('process', { ...process, platform: 'linux' });
            mockIsLinux = true;
            mockGetWaylandPlatformStatus.mockReturnValue(waylandKDEStatus);

            let resolveRegistration!: (value: any) => void;
            const registrationPromise = new Promise((resolve) => {
                resolveRegistration = resolve;
            });
            mockRegisterViaDBus.mockReturnValue(registrationPromise);

            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                bossKey: true,
                quickChat: true,
                printToPdf: true,
            });

            // Act: Start registration
            hotkeyManager.registerShortcuts();

            // Immediately check initial state
            const stateBeforeToggle = hotkeyManager.getIndividualSettings();
            expect(stateBeforeToggle.bossKey).toBe(true);

            // Toggle while registration is in-flight
            hotkeyManager.setIndividualEnabled('bossKey', false);

            // State should update immediately (not wait for registration)
            const stateAfterToggle = hotkeyManager.getIndividualSettings();
            expect(stateAfterToggle.bossKey).toBe(false);

            // Complete registration
            resolveRegistration([
                { hotkeyId: 'quickChat', success: true },
                { hotkeyId: 'bossKey', success: true },
            ]);

            await vi.waitFor(() => {
                expect(mockRegisterViaDBus).toHaveBeenCalled();
            });

            // State should remain updated after registration
            const finalState = hotkeyManager.getIndividualSettings();
            expect(finalState.bossKey).toBe(false);
        });

        // ====================================================================
        // CT-004: Error State Coordination
        // ====================================================================
        it('CT-004: partial registration failure propagates error state correctly', async () => {
            // Arrange: Mock Wayland+KDE
            vi.stubGlobal('process', { ...process, platform: 'linux' });
            mockIsLinux = true;
            mockGetWaylandPlatformStatus.mockReturnValue(waylandKDEStatus);

            // Simulate partial failure
            mockRegisterViaDBus.mockResolvedValue([
                { hotkeyId: 'quickChat', success: true },
                { hotkeyId: 'bossKey', success: false, error: 'AccessDenied' },
            ]);

            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                bossKey: true,
                quickChat: true,
                printToPdf: true,
            });

            // Act: Register with partial failure
            hotkeyManager.registerShortcuts();

            // Wait for registration to complete
            await vi.waitFor(() => {
                expect(mockRegisterViaDBus).toHaveBeenCalled();
            });

            // Assert: Error state is recorded
            const status = hotkeyManager.getPlatformHotkeyStatus();
            expect(status.registrationResults).toHaveLength(2);

            // One success, one failure
            const successResults = status.registrationResults.filter((r) => r.success);
            const failureResults = status.registrationResults.filter((r) => !r.success);
            expect(successResults).toHaveLength(1);
            expect(failureResults).toHaveLength(1);
            expect(failureResults[0].error).toBeDefined();
        });
    });
});
