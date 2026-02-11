/**
 * Tests for Wayland platform detection exports in constants.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock waylandDetector module before importing constants
vi.mock('../../../../src/main/utils/waylandDetector', () => ({
    getWaylandStatus: vi.fn(),
}));

describe('constants.ts Wayland exports', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
        vi.restoreAllMocks();
    });

    describe('isWayland', () => {
        it('should be true when XDG_SESSION_TYPE is "wayland"', async () => {
            process.env.XDG_SESSION_TYPE = 'wayland';
            vi.resetModules();

            const { isWayland } = await import('../../../../src/main/utils/constants');

            expect(isWayland).toBe(true);
        });

        it('should be true when XDG_SESSION_TYPE is "WAYLAND" (case insensitive)', async () => {
            process.env.XDG_SESSION_TYPE = 'WAYLAND';
            vi.resetModules();

            const { isWayland } = await import('../../../../src/main/utils/constants');

            expect(isWayland).toBe(true);
        });

        it('should be true when XDG_SESSION_TYPE is "Wayland" (mixed case)', async () => {
            process.env.XDG_SESSION_TYPE = 'Wayland';
            vi.resetModules();

            const { isWayland } = await import('../../../../src/main/utils/constants');

            expect(isWayland).toBe(true);
        });

        it('should be false when XDG_SESSION_TYPE is "x11"', async () => {
            process.env.XDG_SESSION_TYPE = 'x11';
            vi.resetModules();

            const { isWayland } = await import('../../../../src/main/utils/constants');

            expect(isWayland).toBe(false);
        });

        it('should be false when XDG_SESSION_TYPE is not set', async () => {
            delete process.env.XDG_SESSION_TYPE;
            vi.resetModules();

            const { isWayland } = await import('../../../../src/main/utils/constants');

            expect(isWayland).toBe(false);
        });
    });

    describe('getWaylandPlatformStatus', () => {
        it('should return WaylandStatus from getWaylandStatus', async () => {
            const mockStatus = {
                isWayland: true,
                desktopEnvironment: 'kde' as const,
                deVersion: '6',
                portalAvailable: true,
                portalMethod: 'chromium-flag' as const,
            };

            const { getWaylandStatus } = await import('../../../../src/main/utils/waylandDetector');
            vi.mocked(getWaylandStatus).mockReturnValue(mockStatus);

            vi.resetModules();
            const { getWaylandPlatformStatus } = await import('../../../../src/main/utils/constants');

            const result = getWaylandPlatformStatus();

            expect(result).toEqual(mockStatus);
        });

        it('should cache the result on subsequent calls', async () => {
            const mockStatus = {
                isWayland: true,
                desktopEnvironment: 'kde' as const,
                deVersion: '5',
                portalAvailable: true,
                portalMethod: 'none' as const,
            };

            const waylandDetector = await import('../../../../src/main/utils/waylandDetector');
            vi.mocked(waylandDetector.getWaylandStatus).mockReturnValue(mockStatus);
            // Clear any previous calls to ensure accurate count
            vi.mocked(waylandDetector.getWaylandStatus).mockClear();

            vi.resetModules();
            const { getWaylandPlatformStatus } = await import('../../../../src/main/utils/constants');

            // First call
            const result1 = getWaylandPlatformStatus();
            // Second call
            const result2 = getWaylandPlatformStatus();

            expect(result1).toEqual(mockStatus);
            expect(result2).toEqual(mockStatus);
            // Re-import to check call count after the module has been freshly loaded
            const detector = await import('../../../../src/main/utils/waylandDetector');
            expect(vi.mocked(detector.getWaylandStatus)).toHaveBeenCalledTimes(1);
        });
    });

    describe('existing platform exports preserved', () => {
        it('should still export isLinux', async () => {
            const { isLinux } = await import('../../../../src/main/utils/constants');
            expect(typeof isLinux).toBe('boolean');
        });

        it('should still export isMacOS', async () => {
            const { isMacOS } = await import('../../../../src/main/utils/constants');
            expect(typeof isMacOS).toBe('boolean');
        });

        it('should still export isWindows', async () => {
            const { isWindows } = await import('../../../../src/main/utils/constants');
            expect(typeof isWindows).toBe('boolean');
        });
    });
});
