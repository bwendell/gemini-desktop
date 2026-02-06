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

// Import after mocks are set up
import {
    detectWaylandSession,
    detectDesktopEnvironment,
    detectDEVersion,
    isSupportedDE,
    getWaylandStatus,
} from '../../../../src/main/utils/waylandDetector';

import type { DesktopEnvironment } from '../../../../src/shared/types/hotkeys';

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

        it('returns "unknown" when XDG_CURRENT_DESKTOP is "GNOME"', () => {
            process.env.XDG_CURRENT_DESKTOP = 'GNOME';
            expect(detectDesktopEnvironment()).toBe('unknown');
        });

        it('returns "unknown" when XDG_CURRENT_DESKTOP is "gnome" (lowercase)', () => {
            process.env.XDG_CURRENT_DESKTOP = 'gnome';
            expect(detectDesktopEnvironment()).toBe('unknown');
        });

        it('returns "unknown" when XDG_CURRENT_DESKTOP is "ubuntu:GNOME"', () => {
            process.env.XDG_CURRENT_DESKTOP = 'ubuntu:GNOME';
            expect(detectDesktopEnvironment()).toBe('unknown');
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
        it('returns true for kde with version "6"', () => {
            expect(isSupportedDE('kde', '6')).toBe(true);
        });

        it('returns true for kde with version "5"', () => {
            expect(isSupportedDE('kde', '5')).toBe(true);
        });

        it('returns true for kde with version "7" (future version)', () => {
            expect(isSupportedDE('kde', '7')).toBe(true);
        });

        it('returns false for kde with version "4"', () => {
            expect(isSupportedDE('kde', '4')).toBe(false);
        });

        it('returns false for kde with version "3"', () => {
            expect(isSupportedDE('kde', '3')).toBe(false);
        });

        it('returns false for kde with version "0"', () => {
            expect(isSupportedDE('kde', '0')).toBe(false);
        });

        it('returns false for kde with version null', () => {
            expect(isSupportedDE('kde', null)).toBe(false);
        });

        it('returns false for unknown DE with version "6"', () => {
            expect(isSupportedDE('unknown', '6')).toBe(false);
        });

        it('returns false for unknown DE with version "5"', () => {
            expect(isSupportedDE('unknown', '5')).toBe(false);
        });

        it('returns false for unknown DE with version null', () => {
            expect(isSupportedDE('unknown', null)).toBe(false);
        });

        it('returns false for unknown DE with any version', () => {
            expect(isSupportedDE('unknown', '10')).toBe(false);
        });

        it('handles version strings with numeric comparison correctly', () => {
            // Edge case: '10' should be > 5
            expect(isSupportedDE('kde', '10')).toBe(true);
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

            const status = getWaylandStatus();

            expect(status).toEqual({
                isWayland: true,
                desktopEnvironment: 'kde',
                deVersion: '6',
                portalAvailable: true,
                portalMethod: 'none',
            });
        });

        it('returns portalAvailable false for GNOME on Wayland', () => {
            process.env.XDG_SESSION_TYPE = 'wayland';
            process.env.XDG_CURRENT_DESKTOP = 'GNOME';
            delete process.env.KDE_SESSION_VERSION;

            const status = getWaylandStatus();

            expect(status.isWayland).toBe(true);
            expect(status.desktopEnvironment).toBe('unknown');
            expect(status.portalAvailable).toBe(false);
            expect(status.portalMethod).toBe('none');
        });

        it('returns portalAvailable false for non-Wayland session', () => {
            process.env.XDG_SESSION_TYPE = 'x11';
            process.env.XDG_CURRENT_DESKTOP = 'KDE';
            process.env.KDE_SESSION_VERSION = '6';

            const status = getWaylandStatus();

            expect(status.isWayland).toBe(false);
            expect(status.portalAvailable).toBe(false);
        });

        it('returns portalAvailable false for KDE 4 on Wayland (unsupported)', () => {
            process.env.XDG_SESSION_TYPE = 'wayland';
            process.env.XDG_CURRENT_DESKTOP = 'KDE';
            process.env.KDE_SESSION_VERSION = '4';

            const status = getWaylandStatus();

            expect(status.isWayland).toBe(true);
            expect(status.desktopEnvironment).toBe('kde');
            expect(status.deVersion).toBe('4');
            expect(status.portalAvailable).toBe(false);
        });

        it('returns portalAvailable false for KDE with null version', () => {
            process.env.XDG_SESSION_TYPE = 'wayland';
            process.env.XDG_CURRENT_DESKTOP = 'KDE';
            delete process.env.KDE_SESSION_VERSION;

            const status = getWaylandStatus();

            expect(status.isWayland).toBe(true);
            expect(status.desktopEnvironment).toBe('kde');
            expect(status.deVersion).toBeNull();
            expect(status.portalAvailable).toBe(false);
        });

        it('sets portalMethod to "none" always', () => {
            process.env.XDG_SESSION_TYPE = 'wayland';
            process.env.XDG_CURRENT_DESKTOP = 'KDE';
            process.env.KDE_SESSION_VERSION = '6';

            const status = getWaylandStatus();

            expect(status.portalMethod).toBe('none');
        });

        it('handles fully unknown environment gracefully', () => {
            delete process.env.XDG_SESSION_TYPE;
            delete process.env.XDG_CURRENT_DESKTOP;
            delete process.env.KDE_SESSION_VERSION;

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

            expect(() => getWaylandStatus()).not.toThrow();
        });
    });
});
