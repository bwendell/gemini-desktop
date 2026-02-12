/**
 * Tests for PlatformAdapterFactory.
 *
 * Verifies adapter selection by platform + session type, caching behavior,
 * and test-only reset functionality.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock constants before importing the factory.
// We control `isLinux`, `isWindows`, and `isWayland` to drive adapter selection.
vi.mock('../../../../src/main/utils/constants', () => ({
    isLinux: false,
    isWindows: false,
    isWayland: false,
}));

import { getPlatformAdapter, resetPlatformAdapterForTests } from '../../../../src/main/platform/platformAdapterFactory';
import * as constants from '../../../../src/main/utils/constants';

describe('platformAdapterFactory', () => {
    beforeEach(() => {
        resetPlatformAdapterForTests();
        // Reset mocks to defaults
        vi.mocked(constants).isLinux = false;
        vi.mocked(constants).isWindows = false;
        vi.mocked(constants).isWayland = false;
    });

    describe('adapter selection', () => {
        it('should select LinuxWaylandAdapter when Linux + Wayland', () => {
            vi.mocked(constants).isLinux = true;
            vi.mocked(constants).isWayland = true;

            const adapter = getPlatformAdapter();

            expect(adapter.id).toBe('linux-wayland');
        });

        it('should select LinuxX11Adapter when Linux + not Wayland', () => {
            vi.mocked(constants).isLinux = true;
            vi.mocked(constants).isWayland = false;

            const adapter = getPlatformAdapter();

            expect(adapter.id).toBe('linux-x11');
        });

        it('should select WindowsAdapter when win32', () => {
            // Not Linux, platform is win32
            vi.stubGlobal('process', { ...process, platform: 'win32' });

            const adapter = getPlatformAdapter();

            expect(adapter.id).toBe('windows');

            vi.unstubAllGlobals();
        });

        it('should select MacAdapter when darwin', () => {
            // Not Linux, platform is darwin
            vi.stubGlobal('process', { ...process, platform: 'darwin' });

            const adapter = getPlatformAdapter();

            expect(adapter.id).toBe('mac');

            vi.unstubAllGlobals();
        });
    });

    describe('caching', () => {
        it('should return the same adapter instance on repeated calls', () => {
            vi.mocked(constants).isLinux = true;
            vi.mocked(constants).isWayland = true;

            const first = getPlatformAdapter();
            const second = getPlatformAdapter();

            expect(first).toBe(second);
        });

        it('should return a new instance after resetPlatformAdapterForTests()', () => {
            vi.mocked(constants).isLinux = true;
            vi.mocked(constants).isWayland = true;

            const first = getPlatformAdapter();
            resetPlatformAdapterForTests();
            const second = getPlatformAdapter();

            expect(first).not.toBe(second);
            // Both should still be LinuxWayland
            expect(first.id).toBe('linux-wayland');
            expect(second.id).toBe('linux-wayland');
        });

        it('should allow switching adapters after reset (for test isolation)', () => {
            // First: get Linux Wayland adapter
            vi.mocked(constants).isLinux = true;
            vi.mocked(constants).isWayland = true;
            const linuxAdapter = getPlatformAdapter();
            expect(linuxAdapter.id).toBe('linux-wayland');

            // Reset and switch to Mac
            resetPlatformAdapterForTests();
            vi.mocked(constants).isLinux = false;
            vi.mocked(constants).isWayland = false;
            vi.stubGlobal('process', { ...process, platform: 'darwin' });

            const macAdapter = getPlatformAdapter();
            expect(macAdapter.id).toBe('mac');

            vi.unstubAllGlobals();
        });
    });

    describe('interface conformance', () => {
        it('should return an adapter with all required methods', () => {
            vi.mocked(constants).isLinux = true;
            vi.mocked(constants).isWayland = false;

            const adapter = getPlatformAdapter();

            expect(adapter).toHaveProperty('id');
            expect(typeof adapter.applyAppConfiguration).toBe('function');
            expect(typeof adapter.applyAppUserModelId).toBe('function');
            expect(typeof adapter.getHotkeyRegistrationPlan).toBe('function');
            expect(typeof adapter.getWaylandStatus).toBe('function');
            expect(typeof adapter.shouldQuitOnWindowAllClosed).toBe('function');
        });

        it('MacAdapter should not quit on window all closed', () => {
            vi.stubGlobal('process', { ...process, platform: 'darwin' });

            const adapter = getPlatformAdapter();

            expect(adapter.shouldQuitOnWindowAllClosed()).toBe(false);

            vi.unstubAllGlobals();
        });

        it('LinuxX11Adapter should quit on window all closed', () => {
            vi.mocked(constants).isLinux = true;

            const adapter = getPlatformAdapter();

            expect(adapter.shouldQuitOnWindowAllClosed()).toBe(true);
        });
    });
});
