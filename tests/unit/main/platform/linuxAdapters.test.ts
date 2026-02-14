/**
 * Tests for Linux platform adapters (LinuxWaylandAdapter + LinuxX11Adapter).
 *
 * Verifies app configuration, hotkey registration plan, Wayland status
 * delegation, and platform-specific behaviors for both Linux adapters.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WaylandStatus } from '../../../../src/shared/types/hotkeys';
import type { Logger } from '../../../../src/main/types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock getWaylandPlatformStatus from constants
const mockGetWaylandPlatformStatus = vi.fn<() => WaylandStatus>();

vi.mock('../../../../src/main/utils/constants', () => ({
    isLinux: true,
    isWindows: false,
    isWayland: true,
    getWaylandPlatformStatus: (...args: unknown[]) => mockGetWaylandPlatformStatus(...(args as [])),
}));

// Mock logger
vi.mock('../../../../src/main/utils/logger', () => ({
    createLogger: () => ({
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    }),
}));

const mockAskForMediaAccess = vi.fn().mockResolvedValue(true);

vi.mock('electron', () => ({
    systemPreferences: {
        askForMediaAccess: mockAskForMediaAccess,
    },
}));

import { LinuxWaylandAdapter } from '../../../../src/main/platform/adapters/LinuxWaylandAdapter';
import { LinuxX11Adapter } from '../../../../src/main/platform/adapters/LinuxX11Adapter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Default WaylandStatus for non-Wayland / X11 contexts */
const DEFAULT_WAYLAND_STATUS: WaylandStatus = {
    isWayland: false,
    desktopEnvironment: 'unknown',
    deVersion: null,
    portalAvailable: false,
    portalMethod: 'none',
};

/** Wayland status with portal available (KDE Plasma 6) */
const WAYLAND_PORTAL_AVAILABLE: WaylandStatus = {
    isWayland: true,
    desktopEnvironment: 'kde',
    deVersion: '6',
    portalAvailable: true,
    portalMethod: 'none',
};

/** Wayland status with portal unavailable */
const WAYLAND_PORTAL_UNAVAILABLE: WaylandStatus = {
    isWayland: true,
    desktopEnvironment: 'unknown',
    deVersion: null,
    portalAvailable: false,
    portalMethod: 'none',
};

/** Create a mock Electron.App */
function createMockApp(): Electron.App {
    return {
        setName: vi.fn(),
        commandLine: {
            appendSwitch: vi.fn(),
            hasSwitch: vi.fn(),
            getSwitchValue: vi.fn(),
            removeSwitch: vi.fn(),
        },
        setDesktopName: vi.fn(),
        setAppUserModelId: vi.fn(),
    } as unknown as Electron.App;
}

/** Create a mock Logger */
function createMockLogger(): Logger {
    return {
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    };
}

// ===========================================================================
// LinuxWaylandAdapter
// ===========================================================================

describe('LinuxWaylandAdapter', () => {
    let adapter: LinuxWaylandAdapter;

    beforeEach(() => {
        vi.clearAllMocks();
        adapter = new LinuxWaylandAdapter();
    });

    it('should have id "linux-wayland"', () => {
        expect(adapter.id).toBe('linux-wayland');
    });

    describe('applyAppConfiguration()', () => {
        it('should set app name to "gemini-desktop"', () => {
            const app = createMockApp();
            const logger = createMockLogger();
            mockGetWaylandPlatformStatus.mockReturnValue(WAYLAND_PORTAL_AVAILABLE);

            adapter.applyAppConfiguration(app, logger);

            expect(app.setName).toHaveBeenCalledWith('gemini-desktop');
        });

        it('should set WM_CLASS via commandLine switch', () => {
            const app = createMockApp();
            const logger = createMockLogger();
            mockGetWaylandPlatformStatus.mockReturnValue(WAYLAND_PORTAL_AVAILABLE);

            adapter.applyAppConfiguration(app, logger);

            expect(app.commandLine.appendSwitch).toHaveBeenCalledWith('class', 'gemini-desktop');
        });

        it('should call setDesktopName if available', () => {
            const app = createMockApp();
            const logger = createMockLogger();
            mockGetWaylandPlatformStatus.mockReturnValue(WAYLAND_PORTAL_AVAILABLE);

            adapter.applyAppConfiguration(app, logger);

            expect((app as any).setDesktopName).toHaveBeenCalledWith('gemini-desktop');
        });

        it('should log Wayland detection status', () => {
            const app = createMockApp();
            const logger = createMockLogger();
            mockGetWaylandPlatformStatus.mockReturnValue(WAYLAND_PORTAL_AVAILABLE);

            adapter.applyAppConfiguration(app, logger);

            expect(logger.log).toHaveBeenCalledWith('Wayland detection:', JSON.stringify(WAYLAND_PORTAL_AVAILABLE));
        });

        it('should log portal available message when portal is available', () => {
            const app = createMockApp();
            const logger = createMockLogger();
            mockGetWaylandPlatformStatus.mockReturnValue(WAYLAND_PORTAL_AVAILABLE);

            adapter.applyAppConfiguration(app, logger);

            expect(logger.log).toHaveBeenCalledWith(
                'Wayland detected on kde, attempting portal registration for global shortcuts'
            );
        });

        it('should log warning when Wayland detected but portal unavailable', () => {
            const app = createMockApp();
            const logger = createMockLogger();
            mockGetWaylandPlatformStatus.mockReturnValue(WAYLAND_PORTAL_UNAVAILABLE);

            adapter.applyAppConfiguration(app, logger);

            expect(logger.warn).toHaveBeenCalledWith('Portal registration not available on unknown — no session bus');
        });

        it('should not throw if setDesktopName is not a function', () => {
            const app = createMockApp();
            delete (app as any).setDesktopName;
            const logger = createMockLogger();
            mockGetWaylandPlatformStatus.mockReturnValue(WAYLAND_PORTAL_AVAILABLE);

            expect(() => adapter.applyAppConfiguration(app, logger)).not.toThrow();
        });
    });

    describe('getHotkeyRegistrationPlan()', () => {
        it('should return mode "wayland-dbus" when portal available', () => {
            mockGetWaylandPlatformStatus.mockReturnValue(WAYLAND_PORTAL_AVAILABLE);

            const plan = adapter.getHotkeyRegistrationPlan();

            expect(plan.mode).toBe('wayland-dbus');
            expect(plan.waylandStatus).toEqual(WAYLAND_PORTAL_AVAILABLE);
        });

        it('should return mode "disabled" when portal unavailable', () => {
            mockGetWaylandPlatformStatus.mockReturnValue(WAYLAND_PORTAL_UNAVAILABLE);

            const plan = adapter.getHotkeyRegistrationPlan();

            expect(plan.mode).toBe('disabled');
            expect(plan.waylandStatus).toEqual(WAYLAND_PORTAL_UNAVAILABLE);
        });
    });

    describe('getWaylandStatus()', () => {
        it('should delegate to getWaylandPlatformStatus()', () => {
            mockGetWaylandPlatformStatus.mockReturnValue(WAYLAND_PORTAL_AVAILABLE);

            const status = adapter.getWaylandStatus();

            expect(status).toEqual(WAYLAND_PORTAL_AVAILABLE);
            expect(mockGetWaylandPlatformStatus).toHaveBeenCalled();
        });
    });

    describe('applyAppUserModelId()', () => {
        it('should be a no-op (no calls to app)', () => {
            const app = createMockApp();

            adapter.applyAppUserModelId(app);

            expect(app.setAppUserModelId).not.toHaveBeenCalled();
        });
    });

    describe('shouldQuitOnWindowAllClosed()', () => {
        it('should return true', () => {
            expect(adapter.shouldQuitOnWindowAllClosed()).toBe(true);
        });
    });

    describe('getTitleBarStyle()', () => {
        it('should return undefined on Linux', () => {
            expect(adapter.getTitleBarStyle()).toBeUndefined();
        });
    });

    describe('getAppIconFilename()', () => {
        it('should return icon.png on Linux', () => {
            expect(adapter.getAppIconFilename()).toBe('icon.png');
        });
    });

    describe('shouldDisableUpdates()', () => {
        it('should return true when APPIMAGE is not set', () => {
            const env = {} as NodeJS.ProcessEnv;

            expect(adapter.shouldDisableUpdates(env)).toBe(true);
        });

        it('should return false when APPIMAGE is set', () => {
            const env = { APPIMAGE: '/path/to/app.AppImage' } as NodeJS.ProcessEnv;

            expect(adapter.shouldDisableUpdates(env)).toBe(false);
        });
    });

    describe('requestMediaPermissions()', () => {
        it('should resolve without logging', async () => {
            const logger = createMockLogger();

            await adapter.requestMediaPermissions(logger);

            expect(logger.log).not.toHaveBeenCalled();
            expect(mockAskForMediaAccess).not.toHaveBeenCalled();
        });
    });

    describe('getNotificationSupportHint()', () => {
        it('should return Linux libnotify guidance', () => {
            expect(adapter.getNotificationSupportHint()).toBe(
                'Notifications not supported on this platform. ' +
                    'On Linux, ensure libnotify is installed: ' +
                    'Ubuntu/Debian: apt install libnotify-bin | ' +
                    'Fedora: dnf install libnotify | ' +
                    'Arch: pacman -S libnotify'
            );
        });
    });

    // --- New badge/window/menu methods ---

    describe('supportsBadges()', () => {
        it('should return false (Linux has no native badge API)', () => {
            expect(adapter.supportsBadges()).toBe(false);
        });
    });

    describe('showBadge()', () => {
        it('should be a no-op (not throw)', () => {
            expect(() =>
                adapter.showBadge({
                    window: null,
                    description: 'Update',
                    text: '•',
                    overlayIcon: null,
                })
            ).not.toThrow();
        });
    });

    describe('clearBadge()', () => {
        it('should be a no-op (not throw)', () => {
            expect(() => adapter.clearBadge({ window: null })).not.toThrow();
        });
    });

    describe('getMainWindowPlatformConfig()', () => {
        it('should return wmClass for Linux WM integration', () => {
            expect(adapter.getMainWindowPlatformConfig()).toEqual({ wmClass: 'gemini-desktop' });
        });
    });

    describe('hideToTray()', () => {
        it('should call hide() and setSkipTaskbar(true)', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                hide: vi.fn(),
                setSkipTaskbar: vi.fn(),
            } as unknown as Electron.BrowserWindow;

            adapter.hideToTray(mockWindow);

            expect(mockWindow.hide).toHaveBeenCalled();
            expect(mockWindow.setSkipTaskbar).toHaveBeenCalledWith(true);
        });
    });

    describe('restoreFromTray()', () => {
        it('should call show(), focus(), and setSkipTaskbar(false)', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                show: vi.fn(),
                focus: vi.fn(),
                setSkipTaskbar: vi.fn(),
            } as unknown as Electron.BrowserWindow;

            adapter.restoreFromTray(mockWindow);

            expect(mockWindow.show).toHaveBeenCalled();
            expect(mockWindow.focus).toHaveBeenCalled();
            expect(mockWindow.setSkipTaskbar).toHaveBeenCalledWith(false);
        });
    });

    describe('shouldIncludeAppMenu()', () => {
        it('should return false', () => {
            expect(adapter.shouldIncludeAppMenu()).toBe(false);
        });
    });

    describe('getSettingsMenuLabel()', () => {
        it('should return "Options"', () => {
            expect(adapter.getSettingsMenuLabel()).toBe('Options');
        });
    });

    describe('getWindowCloseRole()', () => {
        it('should return "quit"', () => {
            expect(adapter.getWindowCloseRole()).toBe('quit');
        });
    });

    describe('getDockMenuTemplate()', () => {
        it('should return null (no dock menu on Linux)', () => {
            const callbacks = {
                restoreFromTray: vi.fn(),
                createOptionsWindow: vi.fn(),
            };
            expect(adapter.getDockMenuTemplate(callbacks)).toBeNull();
        });
    });

    // --- New platform-specific methods ---

    describe('getTitleBarStyle()', () => {
        it('should return undefined (Linux does not use custom title bar)', () => {
            expect(adapter.getTitleBarStyle()).toBeUndefined();
        });
    });

    describe('getAppIconFilename()', () => {
        it('should return "icon.png" for Linux', () => {
            expect(adapter.getAppIconFilename()).toBe('icon.png');
        });
    });

    describe('shouldDisableUpdates()', () => {
        it('should return false when APPIMAGE is set', () => {
            const env = { APPIMAGE: '/path/to/app.AppImage' };
            expect(adapter.shouldDisableUpdates(env)).toBe(false);
        });

        it('should return true when APPIMAGE is not set', () => {
            const env = {};
            expect(adapter.shouldDisableUpdates(env)).toBe(true);
        });

        it('should return true when APPIMAGE is empty string', () => {
            const env = { APPIMAGE: '' };
            expect(adapter.shouldDisableUpdates(env)).toBe(true);
        });

        it('should return true when PORTABLE_EXECUTABLE_DIR is set (Windows only)', () => {
            const env = { PORTABLE_EXECUTABLE_DIR: '/path/to/portable' };
            expect(adapter.shouldDisableUpdates(env)).toBe(true);
        });
    });

    describe('requestMediaPermissions()', () => {
        it('should be a no-op on Linux (not throw)', async () => {
            const logger = createMockLogger();
            await expect(adapter.requestMediaPermissions(logger)).resolves.toBeUndefined();
        });
    });

    describe('getNotificationSupportHint()', () => {
        it('should return a libnotify guidance string for Linux', () => {
            const hint = adapter.getNotificationSupportHint();
            expect(typeof hint).toBe('string');
            expect(hint?.length).toBeGreaterThan(0);
            expect(hint).toContain('libnotify');
        });
    });
});

// ===========================================================================
// LinuxX11Adapter
// ===========================================================================

describe('LinuxX11Adapter', () => {
    let adapter: LinuxX11Adapter;

    beforeEach(() => {
        vi.clearAllMocks();
        adapter = new LinuxX11Adapter();
    });

    it('should have id "linux-x11"', () => {
        expect(adapter.id).toBe('linux-x11');
    });

    describe('applyAppConfiguration()', () => {
        it('should set app name to "gemini-desktop"', () => {
            const app = createMockApp();
            const logger = createMockLogger();

            adapter.applyAppConfiguration(app, logger);

            expect(app.setName).toHaveBeenCalledWith('gemini-desktop');
        });

        it('should set WM_CLASS via commandLine switch', () => {
            const app = createMockApp();
            const logger = createMockLogger();

            adapter.applyAppConfiguration(app, logger);

            expect(app.commandLine.appendSwitch).toHaveBeenCalledWith('class', 'gemini-desktop');
        });

        it('should call setDesktopName if available', () => {
            const app = createMockApp();
            const logger = createMockLogger();

            adapter.applyAppConfiguration(app, logger);

            expect((app as any).setDesktopName).toHaveBeenCalledWith('gemini-desktop');
        });

        it('should not log Wayland-specific messages', () => {
            const app = createMockApp();
            const logger = createMockLogger();

            adapter.applyAppConfiguration(app, logger);

            // Should not log Wayland detection or portal messages
            expect(logger.log).not.toHaveBeenCalledWith(expect.stringContaining('Wayland detection'));
            expect(logger.log).not.toHaveBeenCalledWith(expect.stringContaining('D-Bus portal'));
        });

        it('should not throw if setDesktopName is not a function', () => {
            const app = createMockApp();
            delete (app as any).setDesktopName;
            const logger = createMockLogger();

            expect(() => adapter.applyAppConfiguration(app, logger)).not.toThrow();
        });
    });

    describe('getHotkeyRegistrationPlan()', () => {
        it('should always return mode "disabled"', () => {
            const plan = adapter.getHotkeyRegistrationPlan();

            expect(plan.mode).toBe('disabled');
        });

        it('should return default (all-false) WaylandStatus', () => {
            const plan = adapter.getHotkeyRegistrationPlan();

            expect(plan.waylandStatus).toEqual(DEFAULT_WAYLAND_STATUS);
        });
    });

    describe('getWaylandStatus()', () => {
        it('should return default (all-false) WaylandStatus', () => {
            const status = adapter.getWaylandStatus();

            expect(status).toEqual(DEFAULT_WAYLAND_STATUS);
        });

        it('should NOT call getWaylandPlatformStatus()', () => {
            adapter.getWaylandStatus();

            expect(mockGetWaylandPlatformStatus).not.toHaveBeenCalled();
        });
    });

    describe('applyAppUserModelId()', () => {
        it('should be a no-op (no calls to app)', () => {
            const app = createMockApp();

            adapter.applyAppUserModelId(app);

            expect(app.setAppUserModelId).not.toHaveBeenCalled();
        });
    });

    describe('shouldQuitOnWindowAllClosed()', () => {
        it('should return true', () => {
            expect(adapter.shouldQuitOnWindowAllClosed()).toBe(true);
        });
    });

    describe('getTitleBarStyle()', () => {
        it('should return undefined on Linux', () => {
            expect(adapter.getTitleBarStyle()).toBeUndefined();
        });
    });

    describe('getAppIconFilename()', () => {
        it('should return icon.png on Linux', () => {
            expect(adapter.getAppIconFilename()).toBe('icon.png');
        });
    });

    describe('shouldDisableUpdates()', () => {
        it('should return true when APPIMAGE is not set', () => {
            const env = {} as NodeJS.ProcessEnv;

            expect(adapter.shouldDisableUpdates(env)).toBe(true);
        });

        it('should return false when APPIMAGE is set', () => {
            const env = { APPIMAGE: '/path/to/app.AppImage' } as NodeJS.ProcessEnv;

            expect(adapter.shouldDisableUpdates(env)).toBe(false);
        });
    });

    describe('requestMediaPermissions()', () => {
        it('should resolve without logging', async () => {
            const logger = createMockLogger();

            await adapter.requestMediaPermissions(logger);

            expect(logger.log).not.toHaveBeenCalled();
            expect(mockAskForMediaAccess).not.toHaveBeenCalled();
        });
    });

    describe('getNotificationSupportHint()', () => {
        it('should return Linux libnotify guidance', () => {
            expect(adapter.getNotificationSupportHint()).toBe(
                'Notifications not supported on this platform. ' +
                    'On Linux, ensure libnotify is installed: ' +
                    'Ubuntu/Debian: apt install libnotify-bin | ' +
                    'Fedora: dnf install libnotify | ' +
                    'Arch: pacman -S libnotify'
            );
        });
    });

    // --- New badge/window/menu methods ---

    describe('supportsBadges()', () => {
        it('should return false (Linux has no native badge API)', () => {
            expect(adapter.supportsBadges()).toBe(false);
        });
    });

    describe('showBadge()', () => {
        it('should be a no-op (not throw)', () => {
            expect(() =>
                adapter.showBadge({
                    window: null,
                    description: 'Update',
                    text: '•',
                    overlayIcon: null,
                })
            ).not.toThrow();
        });
    });

    describe('clearBadge()', () => {
        it('should be a no-op (not throw)', () => {
            expect(() => adapter.clearBadge({ window: null })).not.toThrow();
        });
    });

    describe('getMainWindowPlatformConfig()', () => {
        it('should return wmClass for Linux WM integration', () => {
            expect(adapter.getMainWindowPlatformConfig()).toEqual({ wmClass: 'gemini-desktop' });
        });
    });

    describe('hideToTray()', () => {
        it('should call hide() and setSkipTaskbar(true)', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                hide: vi.fn(),
                setSkipTaskbar: vi.fn(),
            } as unknown as Electron.BrowserWindow;

            adapter.hideToTray(mockWindow);

            expect(mockWindow.hide).toHaveBeenCalled();
            expect(mockWindow.setSkipTaskbar).toHaveBeenCalledWith(true);
        });
    });

    describe('restoreFromTray()', () => {
        it('should call show(), focus(), and setSkipTaskbar(false)', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                show: vi.fn(),
                focus: vi.fn(),
                setSkipTaskbar: vi.fn(),
            } as unknown as Electron.BrowserWindow;

            adapter.restoreFromTray(mockWindow);

            expect(mockWindow.show).toHaveBeenCalled();
            expect(mockWindow.focus).toHaveBeenCalled();
            expect(mockWindow.setSkipTaskbar).toHaveBeenCalledWith(false);
        });
    });

    describe('shouldIncludeAppMenu()', () => {
        it('should return false', () => {
            expect(adapter.shouldIncludeAppMenu()).toBe(false);
        });
    });

    describe('getSettingsMenuLabel()', () => {
        it('should return "Options"', () => {
            expect(adapter.getSettingsMenuLabel()).toBe('Options');
        });
    });

    describe('getWindowCloseRole()', () => {
        it('should return "quit"', () => {
            expect(adapter.getWindowCloseRole()).toBe('quit');
        });
    });

    describe('getDockMenuTemplate()', () => {
        it('should return null (no dock menu on Linux)', () => {
            const callbacks = {
                restoreFromTray: vi.fn(),
                createOptionsWindow: vi.fn(),
            };
            expect(adapter.getDockMenuTemplate(callbacks)).toBeNull();
        });
    });

    // --- New platform-specific methods ---

    describe('getTitleBarStyle()', () => {
        it('should return undefined (Linux does not use custom title bar)', () => {
            expect(adapter.getTitleBarStyle()).toBeUndefined();
        });
    });

    describe('getAppIconFilename()', () => {
        it('should return "icon.png" for Linux', () => {
            expect(adapter.getAppIconFilename()).toBe('icon.png');
        });
    });

    describe('shouldDisableUpdates()', () => {
        it('should return false when APPIMAGE is set', () => {
            const env = { APPIMAGE: '/path/to/app.AppImage' };
            expect(adapter.shouldDisableUpdates(env)).toBe(false);
        });

        it('should return true when APPIMAGE is not set', () => {
            const env = {};
            expect(adapter.shouldDisableUpdates(env)).toBe(true);
        });

        it('should return true when APPIMAGE is empty string', () => {
            const env = { APPIMAGE: '' };
            expect(adapter.shouldDisableUpdates(env)).toBe(true);
        });

        it('should return true when PORTABLE_EXECUTABLE_DIR is set (Windows only)', () => {
            const env = { PORTABLE_EXECUTABLE_DIR: '/path/to/portable' };
            expect(adapter.shouldDisableUpdates(env)).toBe(true);
        });
    });

    describe('requestMediaPermissions()', () => {
        it('should be a no-op on Linux (not throw)', async () => {
            const logger = createMockLogger();
            await expect(adapter.requestMediaPermissions(logger)).resolves.toBeUndefined();
        });
    });

    describe('getNotificationSupportHint()', () => {
        it('should return a libnotify guidance string for Linux', () => {
            const hint = adapter.getNotificationSupportHint();
            expect(typeof hint).toBe('string');
            expect(hint?.length).toBeGreaterThan(0);
            expect(hint).toContain('libnotify');
        });
    });
});
