import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    platformAdapterPresets,
    useMockPlatformAdapter as applyMockPlatformAdapter,
    resetPlatformAdapterForTests,
} from '../helpers/mocks';
import { stubPlatform, restorePlatform } from '../helpers/harness';

vi.mock('electron', async () => {
    const mockModule = await import('../unit/main/test/electron-mock');
    return mockModule.default;
});

import { globalShortcut } from 'electron';
import { DEFAULT_ACCELERATORS } from '../../src/shared/types/hotkeys';

import type { IndividualHotkeySettings } from '../../src/main/types';
import type { WaylandStatus, PlatformHotkeyStatus } from '../../src/shared/types/hotkeys';

vi.mock('../../src/main/utils/logger');

const mockGetWaylandStatus = vi.fn();
vi.mock('../../src/main/utils/waylandDetector', () => ({
    getWaylandStatus: mockGetWaylandStatus,
    detectWaylandSession: vi.fn(),
    detectDesktopEnvironment: vi.fn(),
    detectDEVersion: vi.fn(),
    isSupportedDE: vi.fn(),
}));

const adapterForPlatform: Record<
    string,
    ReturnType<(typeof platformAdapterPresets)[keyof typeof platformAdapterPresets]>
> = {
    darwin: platformAdapterPresets.mac(),
    win32: platformAdapterPresets.windows(),
    linux: platformAdapterPresets.linuxX11(),
};

const setAdapterForCurrentPlatform = () => {
    const adapter = adapterForPlatform[process.platform] || platformAdapterPresets.linuxX11();
    applyMockPlatformAdapter(adapter);
};

vi.mock('../../src/main/platform/platformAdapterFactory', () => ({
    getPlatformAdapter: () => adapterForPlatform[process.platform] || platformAdapterPresets.linuxX11(),
    resetPlatformAdapterForTests: () => {},
}));

const mockRegisterViaDBus = vi.fn();
const mockIsDBusFallbackAvailable = vi.fn();
const mockDestroySession = vi.fn().mockResolvedValue(undefined);
vi.mock('../../src/main/utils/dbusFallback', () => ({
    registerViaDBus: (...args: unknown[]) => mockRegisterViaDBus(...args),
    isDBusFallbackAvailable: () => mockIsDBusFallbackAvailable(),
    destroySession: (...args: unknown[]) => mockDestroySession(...args),
}));

describe('Wayland Hotkey Coordination', () => {
    let HotkeyManager: typeof import('../../src/main/managers/hotkeyManager').default;
    let WindowManager: typeof import('../../src/main/managers/windowManager').default;

    let hotkeyManager: InstanceType<typeof HotkeyManager>;
    let windowManager: InstanceType<typeof WindowManager>;

    const defaultWaylandStatus: WaylandStatus = {
        isWayland: false,
        desktopEnvironment: 'unknown',
        deVersion: null,
        portalAvailable: false,
        portalMethod: 'none',
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        stubPlatform('linux');
        const { ipcMain, BrowserWindow: BW, globalShortcut: gs } = require('electron');
        if (ipcMain && (ipcMain as any)._reset) (ipcMain as any)._reset();
        if (BW && (BW as any)._reset) (BW as any)._reset();
        if (gs && (gs as any)._reset) (gs as any)._reset();

        mockGetWaylandStatus.mockReturnValue(defaultWaylandStatus);
        mockRegisterViaDBus.mockResolvedValue([]);
        mockIsDBusFallbackAvailable.mockResolvedValue(false);

        setAdapterForCurrentPlatform();

        const hotkeyManagerModule = await import('../../src/main/managers/hotkeyManager');
        const windowManagerModule = await import('../../src/main/managers/windowManager');
        HotkeyManager = hotkeyManagerModule.default;
        WindowManager = windowManagerModule.default;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        restorePlatform();
        resetPlatformAdapterForTests();
        if (hotkeyManager) {
            hotkeyManager.unregisterAll();
        }
    });

    describe('WaylandDetector → HotkeyManager coordination', () => {
        beforeEach(() => {
            adapterForPlatform.linux = platformAdapterPresets.linuxWayland();
            setAdapterForCurrentPlatform();
        });

        it('when detector reports Wayland+KDE, manager attempts registration via portal', async () => {
            adapterForPlatform.linux = platformAdapterPresets.linuxWayland();
            setAdapterForCurrentPlatform();

            windowManager = new WindowManager(false);
            const initialSettings: IndividualHotkeySettings = {
                alwaysOnTop: true,
                peekAndHide: true,
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

        it('when detector reports Wayland+GNOME, manager attempts registration via portal', async () => {
            adapterForPlatform.linux = platformAdapterPresets.linuxWaylandGnome();
            setAdapterForCurrentPlatform();

            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                peekAndHide: true,
                quickChat: true,
                printToPdf: true,
            });

            vi.clearAllMocks();
            hotkeyManager.registerShortcuts();

            await vi.waitFor(() => {
                expect(mockRegisterViaDBus).toHaveBeenCalled();
            });

            expect(globalShortcut.register).not.toHaveBeenCalled();
        });

        it('when detector reports Wayland+Hyprland, manager attempts registration via portal', async () => {
            adapterForPlatform.linux = platformAdapterPresets.linuxWaylandHyprland();
            setAdapterForCurrentPlatform();

            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                peekAndHide: true,
                quickChat: true,
                printToPdf: true,
            });

            vi.clearAllMocks();
            hotkeyManager.registerShortcuts();

            await vi.waitFor(() => {
                expect(mockRegisterViaDBus).toHaveBeenCalled();
            });

            expect(globalShortcut.register).not.toHaveBeenCalled();
        });

        it('when detector reports X11, manager skips Wayland-specific registration', () => {
            adapterForPlatform.linux = platformAdapterPresets.linuxX11();
            setAdapterForCurrentPlatform();

            windowManager = new WindowManager(false);
            const initialSettings: IndividualHotkeySettings = {
                alwaysOnTop: true,
                peekAndHide: true,
                quickChat: true,
                printToPdf: true,
            };
            hotkeyManager = new HotkeyManager(windowManager, initialSettings);

            vi.clearAllMocks();
            hotkeyManager.registerShortcuts();

            expect(globalShortcut.register).not.toHaveBeenCalled();
        });

        it('when detector reports Wayland+unknown DE, manager still attempts portal and handles failure', async () => {
            adapterForPlatform.linux = platformAdapterPresets.linuxWaylandUnknown();
            setAdapterForCurrentPlatform();

            mockRegisterViaDBus.mockResolvedValue([
                { hotkeyId: 'quickChat', success: false, error: 'Portal backend missing' },
                { hotkeyId: 'peekAndHide', success: false, error: 'Portal backend missing' },
            ]);

            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                peekAndHide: true,
                quickChat: true,
                printToPdf: true,
            });

            vi.clearAllMocks();
            hotkeyManager.registerShortcuts();

            await vi.waitFor(() => {
                expect(mockRegisterViaDBus).toHaveBeenCalled();
            });

            expect(globalShortcut.register).not.toHaveBeenCalled();

            const status = hotkeyManager.getPlatformHotkeyStatus();
            expect(status.waylandStatus.desktopEnvironment).toBe('unknown');
            expect(status.globalHotkeysEnabled).toBe(false);
        });

        it('when detector reports Wayland without portal availability, manager does not attempt D-Bus registration', () => {
            adapterForPlatform.linux = platformAdapterPresets.linuxWaylandNoPortal();
            setAdapterForCurrentPlatform();

            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                peekAndHide: true,
                quickChat: true,
                printToPdf: true,
            });

            vi.clearAllMocks();
            hotkeyManager.registerShortcuts();

            expect(mockRegisterViaDBus).not.toHaveBeenCalled();
            expect(globalShortcut.register).not.toHaveBeenCalled();

            const status = hotkeyManager.getPlatformHotkeyStatus();
            expect(status.waylandStatus.isWayland).toBe(true);
            expect(status.waylandStatus.portalAvailable).toBe(false);
            expect(status.globalHotkeysEnabled).toBe(false);
        });
    });

    describe('HotkeyManager → D-Bus fallback coordination', () => {
        beforeEach(() => {
            adapterForPlatform.linux = platformAdapterPresets.linuxWayland();
            setAdapterForCurrentPlatform();
        });

        it('on Wayland+KDE, D-Bus is called directly without globalShortcut.register', async () => {
            adapterForPlatform.linux = platformAdapterPresets.linuxWayland();
            setAdapterForCurrentPlatform();

            mockRegisterViaDBus.mockResolvedValue([
                { hotkeyId: 'quickChat', success: true },
                { hotkeyId: 'peekAndHide', success: true },
            ]);

            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                peekAndHide: true,
                quickChat: true,
                printToPdf: true,
            });

            hotkeyManager.registerShortcuts();

            await vi.waitFor(() => {
                expect(mockRegisterViaDBus).toHaveBeenCalled();
            });

            expect(globalShortcut.register).not.toHaveBeenCalled();
        });

        it('on Wayland+Hyprland, D-Bus registration flow is used', async () => {
            adapterForPlatform.linux = platformAdapterPresets.linuxWaylandHyprland();
            setAdapterForCurrentPlatform();

            mockRegisterViaDBus.mockResolvedValue([
                { hotkeyId: 'quickChat', success: true },
                { hotkeyId: 'peekAndHide', success: true },
            ]);

            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                peekAndHide: true,
                quickChat: true,
                printToPdf: true,
            });

            hotkeyManager.registerShortcuts();

            await vi.waitFor(() => {
                expect(mockRegisterViaDBus).toHaveBeenCalled();
            });

            expect(globalShortcut.register).not.toHaveBeenCalled();
            expect(hotkeyManager.getPlatformHotkeyStatus().waylandStatus.desktopEnvironment).toBe('hyprland');
        });

        it('D-Bus direct path passes action callbacks map', async () => {
            adapterForPlatform.linux = platformAdapterPresets.linuxWayland();
            setAdapterForCurrentPlatform();

            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                peekAndHide: true,
                quickChat: true,
                printToPdf: true,
            });

            hotkeyManager.registerShortcuts();

            await vi.waitFor(() => {
                expect(mockRegisterViaDBus).toHaveBeenCalledWith(expect.any(Array), expect.any(Map));
            });
        });

        it('D-Bus fallback path also passes action callbacks when triggered', async () => {
            adapterForPlatform.linux = platformAdapterPresets.linuxWayland();
            setAdapterForCurrentPlatform();

            mockRegisterViaDBus.mockResolvedValue([
                { hotkeyId: 'quickChat', success: false, error: 'Denied' },
                { hotkeyId: 'peekAndHide', success: true },
            ]);

            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                peekAndHide: true,
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
            adapterForPlatform.linux = platformAdapterPresets.linuxWayland();
            setAdapterForCurrentPlatform();

            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                peekAndHide: true,
                quickChat: true,
                printToPdf: true,
            });

            hotkeyManager.registerShortcuts();
            const status: PlatformHotkeyStatus = hotkeyManager.getPlatformHotkeyStatus();

            expect(status).toHaveProperty('waylandStatus');
            expect(status).toHaveProperty('registrationResults');
            expect(status).toHaveProperty('globalHotkeysEnabled');
            expect(status.waylandStatus.isWayland).toBe(true);
            expect(status.waylandStatus.desktopEnvironment).toBe('kde');
        });

        it('platform status includes GNOME desktop environment through coordination layer', () => {
            adapterForPlatform.linux = platformAdapterPresets.linuxWaylandGnome();
            setAdapterForCurrentPlatform();

            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                peekAndHide: true,
                quickChat: true,
                printToPdf: true,
            });

            hotkeyManager.registerShortcuts();
            const status: PlatformHotkeyStatus = hotkeyManager.getPlatformHotkeyStatus();

            expect(status.waylandStatus.isWayland).toBe(true);
            expect(status.waylandStatus.desktopEnvironment).toBe('gnome');
            expect(status.waylandStatus.portalAvailable).toBe(true);
        });

        it('platform status includes unknown desktop environment through coordination layer', () => {
            adapterForPlatform.linux = platformAdapterPresets.linuxWaylandUnknown();
            setAdapterForCurrentPlatform();

            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                peekAndHide: true,
                quickChat: true,
                printToPdf: true,
            });

            hotkeyManager.registerShortcuts();
            const status: PlatformHotkeyStatus = hotkeyManager.getPlatformHotkeyStatus();

            expect(status.waylandStatus.isWayland).toBe(true);
            expect(status.waylandStatus.desktopEnvironment).toBe('unknown');
            expect(status.waylandStatus.portalAvailable).toBe(true);
        });

        it('platform status returns correct defaults on non-Linux platforms', () => {
            adapterForPlatform.darwin = platformAdapterPresets.mac();
            stubPlatform('darwin');
            setAdapterForCurrentPlatform();

            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                peekAndHide: true,
                quickChat: true,
                printToPdf: true,
            });

            const status: PlatformHotkeyStatus = hotkeyManager.getPlatformHotkeyStatus();

            expect(status.waylandStatus.isWayland).toBe(false);
            expect(status.waylandStatus.portalAvailable).toBe(false);
        });
    });

    describe.each(['darwin', 'win32', 'linux'] as const)('cross-platform behavior on %s', (platform) => {
        beforeEach(() => {
            stubPlatform(platform);
            if (platform === 'linux') {
                adapterForPlatform.linux = platformAdapterPresets.linuxX11();
            } else if (platform === 'darwin') {
                adapterForPlatform.darwin = platformAdapterPresets.mac();
            } else {
                adapterForPlatform.win32 = platformAdapterPresets.windows();
            }
            setAdapterForCurrentPlatform();
        });

        it('non-Linux platforms register hotkeys normally without Wayland checks', () => {
            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                peekAndHide: true,
                quickChat: true,
                printToPdf: true,
            });

            vi.clearAllMocks();
            hotkeyManager.registerShortcuts();

            if (platform !== 'linux') {
                expect(globalShortcut.register).toHaveBeenCalledWith(
                    DEFAULT_ACCELERATORS.quickChat,
                    expect.any(Function)
                );
                expect(globalShortcut.register).toHaveBeenCalledWith(
                    DEFAULT_ACCELERATORS.peekAndHide,
                    expect.any(Function)
                );

                expect(mockRegisterViaDBus).not.toHaveBeenCalled();
            } else {
                expect(globalShortcut.register).not.toHaveBeenCalled();
            }
        });

        it('getPlatformHotkeyStatus returns appropriate status for platform', () => {
            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                peekAndHide: true,
                quickChat: true,
                printToPdf: true,
            });

            hotkeyManager.registerShortcuts();
            const status = hotkeyManager.getPlatformHotkeyStatus();

            expect(status).toHaveProperty('waylandStatus');
            expect(status).toHaveProperty('registrationResults');
            expect(status).toHaveProperty('globalHotkeysEnabled');

            if (platform !== 'linux') {
                expect(status.globalHotkeysEnabled).toBe(true);
            }
        });
    });

    describe('P1: Coordinated Wayland Hotkey Scenarios', () => {
        it('P1-2: toggling a hotkey during in-flight D-Bus registration queues one reconciliation call', async () => {
            adapterForPlatform.linux = platformAdapterPresets.linuxWayland();
            setAdapterForCurrentPlatform();

            let resolveRegistration!: (value: any) => void;
            const registrationPromise = new Promise((resolve) => {
                resolveRegistration = resolve;
            });
            mockRegisterViaDBus.mockReturnValue(registrationPromise);

            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                peekAndHide: true,
                quickChat: true,
                printToPdf: true,
            });

            hotkeyManager.registerShortcuts();

            hotkeyManager.setIndividualEnabled('peekAndHide', false);

            expect(hotkeyManager.getIndividualSettings().peekAndHide).toBe(false);

            resolveRegistration([
                { hotkeyId: 'quickChat', success: true },
                { hotkeyId: 'peekAndHide', success: true },
            ]);

            await vi.waitFor(() => {
                expect(mockRegisterViaDBus).toHaveBeenCalledTimes(2);
            });

            const secondCallShortcuts = mockRegisterViaDBus.mock.calls[1][0] as Array<{ id: string }>;
            expect(secondCallShortcuts).toHaveLength(2);
            expect(secondCallShortcuts.map((s) => s?.id).sort()).toEqual(['quickChat', 'voiceChat']);
        });

        it('P1-3: re-registration clears previous results and calls destroySession', async () => {
            adapterForPlatform.linux = platformAdapterPresets.linuxWayland();

            mockRegisterViaDBus.mockResolvedValue([
                { hotkeyId: 'quickChat', success: true },
                { hotkeyId: 'peekAndHide', success: true },
            ]);

            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                peekAndHide: true,
                quickChat: true,
                printToPdf: true,
            });

            hotkeyManager.registerShortcuts();
            await vi.waitFor(() => {
                const status = hotkeyManager.getPlatformHotkeyStatus();
                expect(status.registrationResults).toHaveLength(2);
            });

            vi.clearAllMocks();
            adapterForPlatform.linux = platformAdapterPresets.linuxWayland();
            mockRegisterViaDBus.mockResolvedValue([
                { hotkeyId: 'quickChat', success: true },
                { hotkeyId: 'peekAndHide', success: true },
            ]);

            hotkeyManager.registerShortcuts();
            await vi.waitFor(() => {
                expect(mockRegisterViaDBus).toHaveBeenCalledTimes(1);
            });

            const status = hotkeyManager.getPlatformHotkeyStatus();
            expect(status.registrationResults).toHaveLength(2);
            expect(status.registrationResults.every((r) => r.success)).toBe(true);
        });

        it('CT-001: rapid enable/disable toggles do not cause duplicate registrations', async () => {
            adapterForPlatform.linux = platformAdapterPresets.linuxWayland();

            let resolveRegistration!: (value: any) => void;
            const registrationPromise = new Promise((resolve) => {
                resolveRegistration = resolve;
            });
            mockRegisterViaDBus.mockReturnValue(registrationPromise);

            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                peekAndHide: true,
                quickChat: true,
                printToPdf: true,
            });

            hotkeyManager.registerShortcuts();

            hotkeyManager.setIndividualEnabled('quickChat', false);
            hotkeyManager.setIndividualEnabled('quickChat', true);
            hotkeyManager.setIndividualEnabled('quickChat', false);

            expect(hotkeyManager.getIndividualSettings().quickChat).toBe(false);

            resolveRegistration([
                { hotkeyId: 'quickChat', success: true },
                { hotkeyId: 'peekAndHide', success: true },
            ]);

            await vi.waitFor(() => {
                expect(mockRegisterViaDBus).toHaveBeenCalled();
            });

            expect(mockRegisterViaDBus).toHaveBeenCalledTimes(2);
        });

        it('CT-002: app quit during registration triggers cleanup without errors', async () => {
            adapterForPlatform.linux = platformAdapterPresets.linuxWayland();

            let resolveRegistration!: (value: any) => void;
            const registrationPromise = new Promise((resolve) => {
                resolveRegistration = resolve;
            });
            mockRegisterViaDBus.mockReturnValue(registrationPromise);

            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                peekAndHide: true,
                quickChat: true,
                printToPdf: true,
            });

            hotkeyManager.registerShortcuts();
            hotkeyManager.unregisterAll();

            resolveRegistration([
                { hotkeyId: 'quickChat', success: true },
                { hotkeyId: 'peekAndHide', success: true },
            ]);

            await vi.waitFor(() => {
                expect(mockDestroySession).toHaveBeenCalled();
            });

            await vi.waitFor(() => {
                const status = hotkeyManager.getPlatformHotkeyStatus();
                expect(status.globalHotkeysEnabled).toBe(false);
                expect(status.registrationResults).toHaveLength(0);
            });
        });

        it('CT-003: state propagation timing - settings update before registration completes', async () => {
            adapterForPlatform.linux = platformAdapterPresets.linuxWayland();

            let resolveRegistration!: (value: any) => void;
            const registrationPromise = new Promise((resolve) => {
                resolveRegistration = resolve;
            });
            mockRegisterViaDBus.mockReturnValue(registrationPromise);

            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                peekAndHide: true,
                quickChat: true,
                printToPdf: true,
            });

            hotkeyManager.registerShortcuts();

            const stateBeforeToggle = hotkeyManager.getIndividualSettings();
            expect(stateBeforeToggle.peekAndHide).toBe(true);

            hotkeyManager.setIndividualEnabled('peekAndHide', false);

            const stateAfterToggle = hotkeyManager.getIndividualSettings();
            expect(stateAfterToggle.peekAndHide).toBe(false);

            resolveRegistration([
                { hotkeyId: 'quickChat', success: true },
                { hotkeyId: 'peekAndHide', success: true },
            ]);

            await vi.waitFor(() => {
                expect(mockRegisterViaDBus).toHaveBeenCalled();
            });

            const finalState = hotkeyManager.getIndividualSettings();
            expect(finalState.peekAndHide).toBe(false);
        });

        it('CT-004: partial registration failure propagates error state correctly', async () => {
            adapterForPlatform.linux = platformAdapterPresets.linuxWayland();

            mockRegisterViaDBus.mockResolvedValue([
                { hotkeyId: 'quickChat', success: true },
                { hotkeyId: 'peekAndHide', success: false, error: 'AccessDenied' },
            ]);

            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager, {
                alwaysOnTop: true,
                peekAndHide: true,
                quickChat: true,
                printToPdf: true,
            });

            hotkeyManager.registerShortcuts();

            await vi.waitFor(() => {
                expect(mockRegisterViaDBus).toHaveBeenCalled();
            });

            const status = hotkeyManager.getPlatformHotkeyStatus();
            expect(status.registrationResults).toHaveLength(2);

            const successResults = status.registrationResults.filter((r) => r.success);
            const failureResults = status.registrationResults.filter((r) => !r.success);
            expect(successResults).toHaveLength(1);
            expect(failureResults).toHaveLength(1);
            expect(failureResults[0].error).toBeDefined();
        });
    });
});
