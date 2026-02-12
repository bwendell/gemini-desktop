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
                'Wayland detected with portal — will use D-Bus portal for global shortcuts'
            );
        });

        it('should log warning when Wayland detected but portal unavailable', () => {
            const app = createMockApp();
            const logger = createMockLogger();
            mockGetWaylandPlatformStatus.mockReturnValue(WAYLAND_PORTAL_UNAVAILABLE);

            adapter.applyAppConfiguration(app, logger);

            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Wayland detected but portal unavailable')
            );
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
});
