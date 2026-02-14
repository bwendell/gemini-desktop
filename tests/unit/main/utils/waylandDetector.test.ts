/**
 * Unit tests for WaylandDetector.
 *
 * This test suite validates the WaylandDetector module which detects Wayland session
 * status, desktop environment, and portal availability in the Electron main process.
 *
 * @module waylandDetector.test
 * @see WaylandDetector - The module being tested
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Mocks
// ============================================================================

import {
    detectWaylandSession,
    detectDesktopEnvironment,
    detectDEVersion,
    isSupportedDE,
    getWaylandStatus,
} from '../../../../src/main/utils/waylandDetector';

// ============================================================================
// Test Suite
// ============================================================================

describe('WaylandDetector', () => {
    /**
     * Save original env vars to restore after tests
     */
    const originalEnv = process.env;

    /**
     * Set up fresh mocks before each test.
     */
    beforeEach(() => {
        vi.clearAllMocks();
        // Create a fresh copy of env for each test
        process.env = { ...originalEnv };
    });

    /**
     * Clean up env vars after each test.
     */
    afterEach(() => {
        process.env = originalEnv;
    });

    // ========================================================================
    // detectWaylandSession
    // ========================================================================

    describe('detectWaylandSession', () => {
        it('returns true when XDG_SESSION_TYPE is "wayland"', () => {
            process.env.XDG_SESSION_TYPE = 'wayland';
            expect(detectWaylandSession()).toBe(true);
        });

        it('returns true when XDG_SESSION_TYPE is "WAYLAND" (case insensitive)', () => {
            process.env.XDG_SESSION_TYPE = 'WAYLAND';
            expect(detectWaylandSession()).toBe(true);
        });

        it('returns true when XDG_SESSION_TYPE is "Wayland" (mixed case)', () => {
            process.env.XDG_SESSION_TYPE = 'Wayland';
            expect(detectWaylandSession()).toBe(true);
        });

        it('returns false when XDG_SESSION_TYPE is "x11"', () => {
            process.env.XDG_SESSION_TYPE = 'x11';
            expect(detectWaylandSession()).toBe(false);
        });

        it('returns false when XDG_SESSION_TYPE is "X11" (case insensitive)', () => {
            process.env.XDG_SESSION_TYPE = 'X11';
            expect(detectWaylandSession()).toBe(false);
        });

        it('returns false when XDG_SESSION_TYPE is undefined', () => {
            delete process.env.XDG_SESSION_TYPE;
            expect(detectWaylandSession()).toBe(false);
        });

        it('returns false when XDG_SESSION_TYPE is empty string', () => {
            process.env.XDG_SESSION_TYPE = '';
            expect(detectWaylandSession()).toBe(false);
        });

        it('returns false when XDG_SESSION_TYPE is "tty"', () => {
            process.env.XDG_SESSION_TYPE = 'tty';
            expect(detectWaylandSession()).toBe(false);
        });
    });

    // ========================================================================
    // detectDesktopEnvironment
    // ========================================================================

    describe('detectDesktopEnvironment', () => {
        it('returns "kde" when XDG_CURRENT_DESKTOP is "KDE"', () => {
            process.env.XDG_CURRENT_DESKTOP = 'KDE';
            expect(detectDesktopEnvironment()).toBe('kde');
        });

        it('returns "kde" when XDG_CURRENT_DESKTOP is "kde" (lowercase)', () => {
            process.env.XDG_CURRENT_DESKTOP = 'kde';
            expect(detectDesktopEnvironment()).toBe('kde');
        });

        it('returns "kde" when XDG_CURRENT_DESKTOP is "Kde" (mixed case)', () => {
            process.env.XDG_CURRENT_DESKTOP = 'Kde';
            expect(detectDesktopEnvironment()).toBe('kde');
        });

        it('returns "kde" from colon-separated "ubuntu:KDE"', () => {
            process.env.XDG_CURRENT_DESKTOP = 'ubuntu:KDE';
            expect(detectDesktopEnvironment()).toBe('kde');
        });

        it('returns "kde" from colon-separated "KDE:ubuntu"', () => {
            process.env.XDG_CURRENT_DESKTOP = 'KDE:ubuntu';
            expect(detectDesktopEnvironment()).toBe('kde');
        });

        it('returns "kde" from colon-separated "ubuntu:kde:GNOME"', () => {
            process.env.XDG_CURRENT_DESKTOP = 'ubuntu:kde:GNOME';
            expect(detectDesktopEnvironment()).toBe('kde');
        });

        it('returns "gnome" when XDG_CURRENT_DESKTOP is "GNOME"', () => {
            process.env.XDG_CURRENT_DESKTOP = 'GNOME';
            expect(detectDesktopEnvironment()).toBe('gnome');
        });

        it('returns "gnome" when XDG_CURRENT_DESKTOP is "gnome" (lowercase)', () => {
            process.env.XDG_CURRENT_DESKTOP = 'gnome';
            expect(detectDesktopEnvironment()).toBe('gnome');
        });

        it('returns "gnome" when XDG_CURRENT_DESKTOP is "ubuntu:GNOME"', () => {
            process.env.XDG_CURRENT_DESKTOP = 'ubuntu:GNOME';
            expect(detectDesktopEnvironment()).toBe('gnome');
        });

        it('returns "hyprland" when XDG_CURRENT_DESKTOP is "Hyprland"', () => {
            process.env.XDG_CURRENT_DESKTOP = 'Hyprland';
            expect(detectDesktopEnvironment()).toBe('hyprland');
        });

        it('returns "hyprland" when XDG_CURRENT_DESKTOP is "hyprland"', () => {
            process.env.XDG_CURRENT_DESKTOP = 'hyprland';
            expect(detectDesktopEnvironment()).toBe('hyprland');
        });

        it('returns "sway" when XDG_CURRENT_DESKTOP is "Sway"', () => {
            process.env.XDG_CURRENT_DESKTOP = 'Sway';
            expect(detectDesktopEnvironment()).toBe('sway');
        });

        it('returns "sway" when XDG_CURRENT_DESKTOP is "sway"', () => {
            process.env.XDG_CURRENT_DESKTOP = 'sway';
            expect(detectDesktopEnvironment()).toBe('sway');
        });

        it('returns "cosmic" when XDG_CURRENT_DESKTOP is "COSMIC"', () => {
            process.env.XDG_CURRENT_DESKTOP = 'COSMIC';
            expect(detectDesktopEnvironment()).toBe('cosmic');
        });

        it('returns "cosmic" when XDG_CURRENT_DESKTOP is "cosmic"', () => {
            process.env.XDG_CURRENT_DESKTOP = 'cosmic';
            expect(detectDesktopEnvironment()).toBe('cosmic');
        });

        it('returns "deepin" when XDG_CURRENT_DESKTOP is "Deepin"', () => {
            process.env.XDG_CURRENT_DESKTOP = 'Deepin';
            expect(detectDesktopEnvironment()).toBe('deepin');
        });

        it('returns "deepin" when XDG_CURRENT_DESKTOP is "deepin"', () => {
            process.env.XDG_CURRENT_DESKTOP = 'deepin';
            expect(detectDesktopEnvironment()).toBe('deepin');
        });

        it('returns "unknown" when XDG_CURRENT_DESKTOP is undefined', () => {
            delete process.env.XDG_CURRENT_DESKTOP;
            expect(detectDesktopEnvironment()).toBe('unknown');
        });

        it('returns "unknown" when XDG_CURRENT_DESKTOP is empty string', () => {
            process.env.XDG_CURRENT_DESKTOP = '';
            expect(detectDesktopEnvironment()).toBe('unknown');
        });

        it('returns "unknown" when XDG_CURRENT_DESKTOP is "XFCE"', () => {
            process.env.XDG_CURRENT_DESKTOP = 'XFCE';
            expect(detectDesktopEnvironment()).toBe('unknown');
        });

        it('returns "unknown" when XDG_CURRENT_DESKTOP is "i3"', () => {
            process.env.XDG_CURRENT_DESKTOP = 'i3';
            expect(detectDesktopEnvironment()).toBe('unknown');
        });
    });

    // ========================================================================
    // detectDEVersion
    // ========================================================================

    describe('detectDEVersion', () => {
        it('returns "6" when KDE_SESSION_VERSION is "6" and de is "kde"', () => {
            process.env.KDE_SESSION_VERSION = '6';
            expect(detectDEVersion('kde')).toBe('6');
        });

        it('returns "5" when KDE_SESSION_VERSION is "5" and de is "kde"', () => {
            process.env.KDE_SESSION_VERSION = '5';
            expect(detectDEVersion('kde')).toBe('5');
        });

        it('returns "4" when KDE_SESSION_VERSION is "4" and de is "kde"', () => {
            process.env.KDE_SESSION_VERSION = '4';
            expect(detectDEVersion('kde')).toBe('4');
        });

        it('returns null when KDE_SESSION_VERSION is undefined and de is "kde"', () => {
            delete process.env.KDE_SESSION_VERSION;
            expect(detectDEVersion('kde')).toBeNull();
        });

        it('returns null when KDE_SESSION_VERSION is empty string and de is "kde"', () => {
            process.env.KDE_SESSION_VERSION = '';
            expect(detectDEVersion('kde')).toBeNull();
        });

        it('returns null when de is "unknown"', () => {
            process.env.KDE_SESSION_VERSION = '6';
            expect(detectDEVersion('unknown')).toBeNull();
        });

        it('returns null when de is "unknown" and KDE_SESSION_VERSION is undefined', () => {
            delete process.env.KDE_SESSION_VERSION;
            expect(detectDEVersion('unknown')).toBeNull();
        });

        it('returns GNOME_DESKTOP_SESSION_ID when de is "gnome"', () => {
            process.env.GNOME_DESKTOP_SESSION_ID = 'this-is-deprecated';
            expect(detectDEVersion('gnome')).toBe('this-is-deprecated');
        });

        it('returns null when de is "gnome" and GNOME_DESKTOP_SESSION_ID is undefined', () => {
            delete process.env.GNOME_DESKTOP_SESSION_ID;
            expect(detectDEVersion('gnome')).toBeNull();
        });

        it('returns null when de is "hyprland"', () => {
            expect(detectDEVersion('hyprland')).toBeNull();
        });

        it('returns null when de is "sway"', () => {
            expect(detectDEVersion('sway')).toBeNull();
        });

        it('returns null when de is "cosmic"', () => {
            expect(detectDEVersion('cosmic')).toBeNull();
        });

        it('returns null when de is "deepin"', () => {
            expect(detectDEVersion('deepin')).toBeNull();
        });

        it('gracefully handles unexpected env values without throwing', () => {
            process.env.KDE_SESSION_VERSION = 'unexpected';
            expect(() => detectDEVersion('kde')).not.toThrow();
            expect(detectDEVersion('kde')).toBe('unexpected');
        });
    });

    // ========================================================================
    // isSupportedDE
    // ========================================================================

    describe('isSupportedDE', () => {
        it('returns true for kde', () => {
            expect(isSupportedDE('kde', '4')).toBe(true);
            expect(isSupportedDE('kde', null)).toBe(true);
        });

        it('returns true for gnome', () => {
            expect(isSupportedDE('gnome', null)).toBe(true);
        });

        it('returns true for hyprland', () => {
            expect(isSupportedDE('hyprland', null)).toBe(true);
        });

        it('returns true for sway', () => {
            expect(isSupportedDE('sway', null)).toBe(true);
        });

        it('returns true for cosmic', () => {
            expect(isSupportedDE('cosmic', null)).toBe(true);
        });

        it('returns true for deepin', () => {
            expect(isSupportedDE('deepin', null)).toBe(true);
        });

        it('returns false for unknown', () => {
            expect(isSupportedDE('unknown', '10')).toBe(false);
            expect(isSupportedDE('unknown', null)).toBe(false);
        });
    });

    // ========================================================================
    // getWaylandStatus
    // ========================================================================

    describe('getWaylandStatus', () => {
        it('returns complete WaylandStatus for KDE Plasma 6 on Wayland', () => {
            process.env.XDG_SESSION_TYPE = 'wayland';
            process.env.XDG_CURRENT_DESKTOP = 'KDE';
            process.env.KDE_SESSION_VERSION = '6';
            process.env.DBUS_SESSION_BUS_ADDRESS = 'unix:path=/run/user/1000/bus';

            const status = getWaylandStatus();

            expect(status).toEqual({
                isWayland: true,
                desktopEnvironment: 'kde',
                deVersion: '6',
                portalAvailable: true,
                portalMethod: 'none',
            });
        });

        it('returns portalAvailable true for GNOME on Wayland with session bus', () => {
            process.env.XDG_SESSION_TYPE = 'wayland';
            process.env.XDG_CURRENT_DESKTOP = 'GNOME';
            process.env.GNOME_DESKTOP_SESSION_ID = 'session-1';
            process.env.DBUS_SESSION_BUS_ADDRESS = 'unix:path=/run/user/1000/bus';

            const status = getWaylandStatus();

            expect(status.isWayland).toBe(true);
            expect(status.desktopEnvironment).toBe('gnome');
            expect(status.portalAvailable).toBe(true);
            expect(status.portalMethod).toBe('none');
        });

        it('returns portalAvailable false for non-Wayland session', () => {
            process.env.XDG_SESSION_TYPE = 'x11';
            process.env.XDG_CURRENT_DESKTOP = 'KDE';
            process.env.KDE_SESSION_VERSION = '6';
            process.env.DBUS_SESSION_BUS_ADDRESS = 'unix:path=/run/user/1000/bus';

            const status = getWaylandStatus();

            expect(status.isWayland).toBe(false);
            expect(status.portalAvailable).toBe(false);
        });

        it('returns portalAvailable true for KDE 4 on Wayland with session bus', () => {
            process.env.XDG_SESSION_TYPE = 'wayland';
            process.env.XDG_CURRENT_DESKTOP = 'KDE';
            process.env.KDE_SESSION_VERSION = '4';
            process.env.DBUS_SESSION_BUS_ADDRESS = 'unix:path=/run/user/1000/bus';

            const status = getWaylandStatus();

            expect(status.isWayland).toBe(true);
            expect(status.desktopEnvironment).toBe('kde');
            expect(status.deVersion).toBe('4');
            expect(status.portalAvailable).toBe(true);
        });

        it('returns portalAvailable true for KDE with null version when session bus is available', () => {
            process.env.XDG_SESSION_TYPE = 'wayland';
            process.env.XDG_CURRENT_DESKTOP = 'KDE';
            delete process.env.KDE_SESSION_VERSION;
            process.env.DBUS_SESSION_BUS_ADDRESS = 'unix:path=/run/user/1000/bus';

            const status = getWaylandStatus();

            expect(status.isWayland).toBe(true);
            expect(status.desktopEnvironment).toBe('kde');
            expect(status.deVersion).toBeNull();
            expect(status.portalAvailable).toBe(true);
        });

        it('returns portalAvailable false for unknown DE on Wayland with session bus', () => {
            process.env.XDG_SESSION_TYPE = 'wayland';
            process.env.XDG_CURRENT_DESKTOP = 'FutureDE';
            process.env.DBUS_SESSION_BUS_ADDRESS = 'unix:path=/run/user/1000/bus';

            const status = getWaylandStatus();

            expect(status.isWayland).toBe(true);
            expect(status.desktopEnvironment).toBe('unknown');
            expect(status.deVersion).toBeNull();
            expect(status.portalAvailable).toBe(false);
        });

        it('returns portalAvailable false when session bus is unavailable', () => {
            process.env.XDG_SESSION_TYPE = 'wayland';
            process.env.XDG_CURRENT_DESKTOP = 'KDE';
            process.env.KDE_SESSION_VERSION = '6';
            delete process.env.DBUS_SESSION_BUS_ADDRESS;
            delete process.env.XDG_RUNTIME_DIR;

            const status = getWaylandStatus();

            expect(status.isWayland).toBe(true);
            expect(status.desktopEnvironment).toBe('kde');
            expect(status.deVersion).toBe('6');
            expect(status.portalAvailable).toBe(false);
        });

        it('sets portalMethod to "none" always', () => {
            process.env.XDG_SESSION_TYPE = 'wayland';
            process.env.XDG_CURRENT_DESKTOP = 'KDE';
            process.env.KDE_SESSION_VERSION = '6';
            process.env.DBUS_SESSION_BUS_ADDRESS = 'unix:path=/run/user/1000/bus';

            const status = getWaylandStatus();

            expect(status.portalMethod).toBe('none');
        });

        it('handles fully unknown environment gracefully', () => {
            delete process.env.XDG_SESSION_TYPE;
            delete process.env.XDG_CURRENT_DESKTOP;
            delete process.env.KDE_SESSION_VERSION;
            delete process.env.DBUS_SESSION_BUS_ADDRESS;
            delete process.env.XDG_RUNTIME_DIR;

            const status = getWaylandStatus();

            expect(status).toEqual({
                isWayland: false,
                desktopEnvironment: 'unknown',
                deVersion: null,
                portalAvailable: false,
                portalMethod: 'none',
            });
        });

        it('runs without throwing for valid environment', () => {
            process.env.XDG_SESSION_TYPE = 'wayland';
            process.env.XDG_CURRENT_DESKTOP = 'ubuntu:KDE';
            process.env.KDE_SESSION_VERSION = '5';
            process.env.DBUS_SESSION_BUS_ADDRESS = 'unix:path=/run/user/1000/bus';

            expect(() => getWaylandStatus()).not.toThrow();
        });
    });
});
