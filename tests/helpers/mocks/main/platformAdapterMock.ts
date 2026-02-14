import { vi, type Mock } from 'vitest';

import type { PlatformAdapter } from '../../../../src/main/platform/PlatformAdapter';
import type {
    DockMenuCallbacks,
    HotkeyRegistrationPlan,
    MainWindowPlatformConfig,
    PlatformId,
} from '../../../../src/main/platform/types';
import type { WaylandStatus } from '../../../../src/shared/types/hotkeys';
import * as platformAdapterFactory from '../../../../src/main/platform/platformAdapterFactory';

type MockFunction = Mock;

export type MockPlatformAdapter = {
    [Key in keyof PlatformAdapter]: PlatformAdapter[Key] extends (...args: any[]) => any
        ? MockFunction
        : PlatformAdapter[Key];
};

const DEFAULT_WAYLAND_STATUS: WaylandStatus = {
    isWayland: false,
    desktopEnvironment: 'unknown',
    deVersion: null,
    portalAvailable: false,
    portalMethod: 'none',
};

const createDefaultPlan = (overrides?: Partial<HotkeyRegistrationPlan>): HotkeyRegistrationPlan => ({
    mode: 'native',
    waylandStatus: DEFAULT_WAYLAND_STATUS,
    ...overrides,
});

const createDefaultDockTemplate = (callbacks: DockMenuCallbacks) => [
    {
        label: 'Show Gemini',
        click: () => callbacks.restoreFromTray(),
    },
    { type: 'separator' as const },
    {
        label: 'Settings',
        click: () => callbacks.createOptionsWindow(),
    },
];

const DEFAULT_PLATFORM_CONFIG: MainWindowPlatformConfig = {};

export function createMockPlatformAdapter(overrides: Partial<MockPlatformAdapter> = {}): MockPlatformAdapter {
    const adapter: MockPlatformAdapter = {
        id: 'windows' as PlatformId,
        applyAppConfiguration: vi.fn(),
        applyAppUserModelId: vi.fn(),
        getHotkeyRegistrationPlan: vi.fn().mockReturnValue(createDefaultPlan()),
        getWaylandStatus: vi.fn().mockReturnValue(DEFAULT_WAYLAND_STATUS),
        shouldQuitOnWindowAllClosed: vi.fn().mockReturnValue(true),
        supportsBadges: vi.fn().mockReturnValue(true),
        showBadge: vi.fn(),
        clearBadge: vi.fn(),
        getMainWindowPlatformConfig: vi.fn().mockReturnValue(DEFAULT_PLATFORM_CONFIG),
        hideToTray: vi.fn((window) => {
            window.hide();
            window.setSkipTaskbar(true);
        }),
        restoreFromTray: vi.fn((window) => {
            window.show();
            window.focus();
            window.setSkipTaskbar(false);
        }),
        shouldIncludeAppMenu: vi.fn().mockReturnValue(false),
        getSettingsMenuLabel: vi.fn().mockReturnValue('Options'),
        getWindowCloseRole: vi.fn().mockReturnValue('quit'),
        getDockMenuTemplate: vi.fn().mockReturnValue(null),
        getTitleBarStyle: vi.fn().mockReturnValue(undefined),
        getAppIconFilename: vi.fn().mockReturnValue('icon.ico'),
        shouldDisableUpdates: vi.fn().mockReturnValue(false),
        requestMediaPermissions: vi.fn().mockResolvedValue(undefined),
        getNotificationSupportHint: vi.fn().mockReturnValue(undefined),
        ...overrides,
    };

    return adapter;
}

export const platformAdapterPresets = {
    linuxWayland: (): MockPlatformAdapter => {
        const waylandStatus: WaylandStatus = {
            isWayland: true,
            desktopEnvironment: 'kde',
            deVersion: '5.27',
            portalAvailable: true,
            portalMethod: 'dbus-direct',
        };

        return createMockPlatformAdapter({
            id: 'linux-wayland',
            getAppIconFilename: vi.fn().mockReturnValue('icon.png'),
            getHotkeyRegistrationPlan: vi.fn().mockReturnValue(
                createDefaultPlan({
                    mode: 'wayland-dbus',
                    waylandStatus,
                })
            ),
            getWaylandStatus: vi.fn().mockReturnValue(waylandStatus),
            supportsBadges: vi.fn().mockReturnValue(false),
            getSettingsMenuLabel: vi.fn().mockReturnValue('Options'),
            getWindowCloseRole: vi.fn().mockReturnValue('quit'),
        });
    },
    'linux-wayland': (): MockPlatformAdapter => platformAdapterPresets.linuxWayland(),
    linuxWaylandGnome: (): MockPlatformAdapter => {
        const waylandStatus: WaylandStatus = {
            isWayland: true,
            desktopEnvironment: 'gnome',
            deVersion: null,
            portalAvailable: true,
            portalMethod: 'dbus-direct',
        };

        return createMockPlatformAdapter({
            id: 'linux-wayland',
            getAppIconFilename: vi.fn().mockReturnValue('icon.png'),
            getHotkeyRegistrationPlan: vi.fn().mockReturnValue(
                createDefaultPlan({
                    mode: 'wayland-dbus',
                    waylandStatus,
                })
            ),
            getWaylandStatus: vi.fn().mockReturnValue(waylandStatus),
            supportsBadges: vi.fn().mockReturnValue(false),
            getSettingsMenuLabel: vi.fn().mockReturnValue('Options'),
            getWindowCloseRole: vi.fn().mockReturnValue('quit'),
        });
    },
    linuxWaylandHyprland: (): MockPlatformAdapter => {
        const waylandStatus: WaylandStatus = {
            isWayland: true,
            desktopEnvironment: 'hyprland',
            deVersion: null,
            portalAvailable: true,
            portalMethod: 'dbus-direct',
        };

        return createMockPlatformAdapter({
            id: 'linux-wayland',
            getAppIconFilename: vi.fn().mockReturnValue('icon.png'),
            getHotkeyRegistrationPlan: vi.fn().mockReturnValue(
                createDefaultPlan({
                    mode: 'wayland-dbus',
                    waylandStatus,
                })
            ),
            getWaylandStatus: vi.fn().mockReturnValue(waylandStatus),
            supportsBadges: vi.fn().mockReturnValue(false),
            getSettingsMenuLabel: vi.fn().mockReturnValue('Options'),
            getWindowCloseRole: vi.fn().mockReturnValue('quit'),
        });
    },
    linuxWaylandUnknown: (): MockPlatformAdapter => {
        const waylandStatus: WaylandStatus = {
            isWayland: true,
            desktopEnvironment: 'unknown',
            deVersion: null,
            portalAvailable: true,
            portalMethod: 'dbus-direct',
        };

        return createMockPlatformAdapter({
            id: 'linux-wayland',
            getAppIconFilename: vi.fn().mockReturnValue('icon.png'),
            getHotkeyRegistrationPlan: vi.fn().mockReturnValue(
                createDefaultPlan({
                    mode: 'wayland-dbus',
                    waylandStatus,
                })
            ),
            getWaylandStatus: vi.fn().mockReturnValue(waylandStatus),
            supportsBadges: vi.fn().mockReturnValue(false),
            getSettingsMenuLabel: vi.fn().mockReturnValue('Options'),
            getWindowCloseRole: vi.fn().mockReturnValue('quit'),
        });
    },
    linuxWaylandNoPortal: (): MockPlatformAdapter => {
        const waylandStatus: WaylandStatus = {
            isWayland: true,
            desktopEnvironment: 'kde',
            deVersion: '5.27',
            portalAvailable: false,
            portalMethod: 'none',
        };

        return createMockPlatformAdapter({
            id: 'linux-wayland',
            getAppIconFilename: vi.fn().mockReturnValue('icon.png'),
            getHotkeyRegistrationPlan: vi.fn().mockReturnValue(
                createDefaultPlan({
                    mode: 'disabled',
                    waylandStatus,
                })
            ),
            getWaylandStatus: vi.fn().mockReturnValue(waylandStatus),
            supportsBadges: vi.fn().mockReturnValue(false),
            getSettingsMenuLabel: vi.fn().mockReturnValue('Options'),
            getWindowCloseRole: vi.fn().mockReturnValue('quit'),
        });
    },
    linuxX11: (): MockPlatformAdapter => {
        const waylandStatus: WaylandStatus = {
            ...DEFAULT_WAYLAND_STATUS,
            isWayland: false,
        };

        return createMockPlatformAdapter({
            id: 'linux-x11',
            getAppIconFilename: vi.fn().mockReturnValue('icon.png'),
            getHotkeyRegistrationPlan: vi.fn().mockReturnValue(
                createDefaultPlan({
                    mode: 'disabled',
                    waylandStatus,
                })
            ),
            getWaylandStatus: vi.fn().mockReturnValue(waylandStatus),
            supportsBadges: vi.fn().mockReturnValue(false),
            getSettingsMenuLabel: vi.fn().mockReturnValue('Options'),
            getWindowCloseRole: vi.fn().mockReturnValue('quit'),
        });
    },
    'linux-x11': (): MockPlatformAdapter => platformAdapterPresets.linuxX11(),
    windows: (): MockPlatformAdapter =>
        createMockPlatformAdapter({
            id: 'windows',
            getHotkeyRegistrationPlan: vi.fn().mockReturnValue(createDefaultPlan()),
            supportsBadges: vi.fn().mockReturnValue(true),
            getWaylandStatus: vi.fn().mockReturnValue(DEFAULT_WAYLAND_STATUS),
            shouldIncludeAppMenu: vi.fn().mockReturnValue(false),
            getSettingsMenuLabel: vi.fn().mockReturnValue('Options'),
            getWindowCloseRole: vi.fn().mockReturnValue('quit'),
            getDockMenuTemplate: vi.fn().mockReturnValue(null),
            showBadge: vi.fn(({ window, description, overlayIcon }) => {
                if (window && overlayIcon) {
                    window.setOverlayIcon(overlayIcon, description);
                }
            }),
            clearBadge: vi.fn(({ window }) => {
                if (window) {
                    window.setOverlayIcon(null, '');
                }
            }),
        }),
    mac: (): MockPlatformAdapter =>
        createMockPlatformAdapter({
            id: 'mac',
            getAppIconFilename: vi.fn().mockReturnValue('icon.png'),
            getHotkeyRegistrationPlan: vi.fn().mockReturnValue(createDefaultPlan()),
            supportsBadges: vi.fn().mockReturnValue(true),
            getWaylandStatus: vi.fn().mockReturnValue(DEFAULT_WAYLAND_STATUS),
            shouldQuitOnWindowAllClosed: vi.fn().mockReturnValue(false),
            shouldIncludeAppMenu: vi.fn().mockReturnValue(true),
            getSettingsMenuLabel: vi.fn().mockReturnValue('Settings...'),
            getWindowCloseRole: vi.fn().mockReturnValue('close'),
            getDockMenuTemplate: vi.fn((callbacks) => createDefaultDockTemplate(callbacks)),
            showBadge: vi.fn((params, app) => {
                const text = params?.text ?? '•';
                app?.dock?.setBadge(text);
            }),
            clearBadge: vi.fn((_params, app) => {
                app?.dock?.setBadge('');
            }),
            hideToTray: vi.fn((window) => {
                window.hide();
            }),
            restoreFromTray: vi.fn((window) => {
                window.show();
                window.focus();
            }),
        }),
} satisfies Record<string, () => MockPlatformAdapter>;

let _mockAdapter: PlatformAdapter | null = null;
let _platformAdapterSpy: ReturnType<typeof vi.spyOn> | null = null;

export function useMockPlatformAdapter(adapter: PlatformAdapter): void {
    _mockAdapter = adapter;
    if (_platformAdapterSpy) {
        _platformAdapterSpy.mockRestore();
    }
    _platformAdapterSpy = vi.spyOn(platformAdapterFactory, 'getPlatformAdapter').mockReturnValue(adapter);
    platformAdapterFactory.resetPlatformAdapterForTests();
}

export function getMockPlatformAdapter(): PlatformAdapter | null {
    return _mockAdapter;
}

export function resetMockPlatformAdapter(): void {
    _mockAdapter = null;
}

interface ResetPlatformAdapterOptions {
    resetModules?: boolean;
}

export function resetPlatformAdapterForTests(options: ResetPlatformAdapterOptions = {}): void {
    // Handle case where platformAdapterFactory is mocked and may not have this function
    try {
        const factory = platformAdapterFactory as unknown as {
            resetPlatformAdapterForTests?: () => void;
        };
        if (typeof factory.resetPlatformAdapterForTests === 'function') {
            factory.resetPlatformAdapterForTests();
        }
    } catch {
        // If accessing the property throws (e.g., due to mock setup), just skip
    }
    resetMockPlatformAdapter();
    if (_platformAdapterSpy) {
        _platformAdapterSpy.mockRestore();
        _platformAdapterSpy = null;
    }

    if (options.resetModules) {
        vi.resetModules();
    }
}
