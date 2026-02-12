/**
 * Tests for Windows and Mac platform adapters.
 *
 * Verifies app configuration, AppUserModelId, hotkey registration plan,
 * Wayland status defaults, and shouldQuitOnWindowAllClosed for both adapters.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WaylandStatus } from '../../../../src/shared/types/hotkeys';
import type { Logger } from '../../../../src/main/types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../../../src/main/utils/constants', () => ({
    isLinux: false,
    isWindows: true,
    isWayland: false,
    APP_ID: 'com.benwendell.gemini-desktop',
}));

vi.mock('../../../../src/main/utils/logger', () => ({
    createLogger: () => ({
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    }),
}));

import { WindowsAdapter } from '../../../../src/main/platform/adapters/WindowsAdapter';
import { MacAdapter } from '../../../../src/main/platform/adapters/MacAdapter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Default WaylandStatus for non-Wayland / non-Linux contexts */
const DEFAULT_WAYLAND_STATUS: WaylandStatus = {
    isWayland: false,
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
// WindowsAdapter
// ===========================================================================

describe('WindowsAdapter', () => {
    let adapter: WindowsAdapter;

    beforeEach(() => {
        vi.clearAllMocks();
        adapter = new WindowsAdapter();
    });

    it('should have id "windows"', () => {
        expect(adapter.id).toBe('windows');
    });

    describe('applyAppConfiguration()', () => {
        it('should set app name to "Gemini Desktop"', () => {
            const app = createMockApp();
            const logger = createMockLogger();

            adapter.applyAppConfiguration(app, logger);

            expect(app.setName).toHaveBeenCalledWith('Gemini Desktop');
        });

        it('should NOT set WM_CLASS or desktop name (Windows-only)', () => {
            const app = createMockApp();
            const logger = createMockLogger();

            adapter.applyAppConfiguration(app, logger);

            expect(app.commandLine.appendSwitch).not.toHaveBeenCalledWith('class', expect.anything());
            expect((app as any).setDesktopName).not.toHaveBeenCalled();
        });
    });

    describe('applyAppUserModelId()', () => {
        it('should call app.setAppUserModelId with APP_ID', () => {
            const app = createMockApp();

            adapter.applyAppUserModelId(app);

            expect(app.setAppUserModelId).toHaveBeenCalledWith('com.benwendell.gemini-desktop');
        });
    });

    describe('getHotkeyRegistrationPlan()', () => {
        it('should return mode "native"', () => {
            const plan = adapter.getHotkeyRegistrationPlan();

            expect(plan.mode).toBe('native');
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
    });

    describe('shouldQuitOnWindowAllClosed()', () => {
        it('should return true', () => {
            expect(adapter.shouldQuitOnWindowAllClosed()).toBe(true);
        });
    });
});

// ===========================================================================
// MacAdapter
// ===========================================================================

describe('MacAdapter', () => {
    let adapter: MacAdapter;

    beforeEach(() => {
        vi.clearAllMocks();
        adapter = new MacAdapter();
    });

    it('should have id "mac"', () => {
        expect(adapter.id).toBe('mac');
    });

    describe('applyAppConfiguration()', () => {
        it('should set app name to "Gemini Desktop"', () => {
            const app = createMockApp();
            const logger = createMockLogger();

            adapter.applyAppConfiguration(app, logger);

            expect(app.setName).toHaveBeenCalledWith('Gemini Desktop');
        });

        it('should NOT set WM_CLASS or desktop name (Mac-only)', () => {
            const app = createMockApp();
            const logger = createMockLogger();

            adapter.applyAppConfiguration(app, logger);

            expect(app.commandLine.appendSwitch).not.toHaveBeenCalledWith('class', expect.anything());
            expect((app as any).setDesktopName).not.toHaveBeenCalled();
        });
    });

    describe('applyAppUserModelId()', () => {
        it('should be a no-op (no calls to app)', () => {
            const app = createMockApp();

            adapter.applyAppUserModelId(app);

            expect(app.setAppUserModelId).not.toHaveBeenCalled();
        });
    });

    describe('getHotkeyRegistrationPlan()', () => {
        it('should return mode "native"', () => {
            const plan = adapter.getHotkeyRegistrationPlan();

            expect(plan.mode).toBe('native');
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
    });

    describe('shouldQuitOnWindowAllClosed()', () => {
        it('should return false (macOS stays in dock)', () => {
            expect(adapter.shouldQuitOnWindowAllClosed()).toBe(false);
        });
    });
});
