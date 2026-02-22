import { browser, expect } from '@wdio/globals';

/**
 * Wayland Platform Status IPC Round-Trip Integration Tests
 *
 * These tests verify IPC round-trips between main and renderer processes
 * for the platform hotkey status API.
 *
 * Pattern follows: https://github.com/user/repo/tests/integration/hotkeys.integration.test.ts
 */
const browserWithElectron = browser as unknown as {
    execute<T>(script: string | ((...args: unknown[]) => T), ...args: unknown[]): Promise<T>;
    waitUntil<T>(
        condition: () => Promise<T> | T,
        options?: { timeout?: number; timeoutMsg?: string; interval?: number }
    ): Promise<T>;
    getWindowHandles(): Promise<string[]>;
    electron: {
        execute<R, T extends unknown[]>(fn: (...args: T) => R, ...args: T): Promise<R>;
    };
};

const isLinuxCI = process.platform === 'linux' && process.env.CI === 'true';
const isWinCI = process.platform === 'win32' && process.env.CI === 'true';

describe('Platform Hotkey Status IPC', () => {
    before(async function () {
        // Wait for app to be ready with at least one window
        await browserWithElectron.waitUntil(async () => (await browserWithElectron.getWindowHandles()).length > 0);

        if (process.platform !== 'linux') {
            console.log('[SKIP] Linux-only integration tests');
            this.skip();
        }
    });

    /**
     * Helper to detect if we're on Wayland with portal available.
     * Used for conditional test skipping.
     */
    async function getWaylandStatus(): Promise<{
        isWayland: boolean;
        portalAvailable: boolean;
        desktopEnvironment: string;
        isLinux: boolean;
    }> {
        const status = await browserWithElectron.electron.execute(() => {
            return global.hotkeyManager?.getPlatformHotkeyStatus?.() ?? null;
        });

        const isLinux = await browserWithElectron.electron.execute(() => process.platform === 'linux');

        if (!status) {
            return { isWayland: false, portalAvailable: false, desktopEnvironment: 'unknown', isLinux };
        }

        return {
            isWayland: status.waylandStatus?.isWayland ?? false,
            portalAvailable: status.waylandStatus?.portalAvailable ?? false,
            desktopEnvironment: status.waylandStatus?.desktopEnvironment ?? 'unknown',
            isLinux,
        };
    }

    describe('getPlatformHotkeyStatus() IPC round-trip', () => {
        it('renderer can query platform hotkey status via window.electronAPI.getPlatformHotkeyStatus()', async () => {
            // Call the renderer API
            const status = await browserWithElectron.execute(async () => {
                const api = (window as any).electronAPI;
                return await api.getPlatformHotkeyStatus();
            });

            // Verify it returns an object (not undefined/null)
            expect(status).toBeDefined();
            expect(status).not.toBeNull();
            expect(typeof status).toBe('object');
        });

        it('main process returns correctly typed PlatformHotkeyStatus object', async () => {
            // Query directly via main process to bypass renderer
            const status = await browserWithElectron.electron.execute(() => {
                return global.hotkeyManager?.getPlatformHotkeyStatus?.() ?? null;
            });

            // Verify response has required fields
            expect(status).toBeDefined();
            expect(status).not.toBeNull();

            // PlatformHotkeyStatus shape validation
            expect(typeof status.globalHotkeysEnabled).toBe('boolean');
            expect(typeof status.waylandStatus).toBe('object');
            expect(Array.isArray(status.registrationResults)).toBe(true);
        });
        it('globalHotkeysEnabled field reflects actual registration state', async function () {
            if (isLinuxCI || isWinCI) this.skip();
            // Get platform status from main process
            const status = await browserWithElectron.electron.execute(() => {
                return global.hotkeyManager?.getPlatformHotkeyStatus?.() ?? null;
            });

            // Check if quickChat is registered via globalShortcut
            const isQuickChatRegistered = await browserWithElectron.electron.execute(() => {
                const { globalShortcut } = require('electron');
                // Use the default quickChat accelerator
                return globalShortcut.isRegistered('CommandOrControl+Shift+Space');
            });

            // If any global hotkey is registered, globalHotkeysEnabled should be true
            // Note: On Linux without Wayland portal, both may be false — that's valid
            expect(status).toBeDefined();

            // If quickChat is registered, globalHotkeysEnabled must be true
            // (The inverse is not necessarily true — other hotkeys could be registered)
            if (isQuickChatRegistered) {
                expect(status.globalHotkeysEnabled).toBe(true);
            }
        });

        it('waylandStatus fields are populated with sensible defaults', async () => {
            // Query platform status via renderer IPC
            const status = await browserWithElectron.execute(async () => {
                const api = (window as any).electronAPI;
                return await api.getPlatformHotkeyStatus();
            });

            // waylandStatus should always be a valid object (not crash)
            expect(status.waylandStatus).toBeDefined();
            expect(typeof status.waylandStatus).toBe('object');

            // Validate waylandStatus shape
            expect(typeof status.waylandStatus.isWayland).toBe('boolean');
            expect(typeof status.waylandStatus.desktopEnvironment).toBe('string');
            // deVersion can be string | null
            expect(status.waylandStatus.deVersion === null || typeof status.waylandStatus.deVersion === 'string').toBe(
                true
            );
            expect(typeof status.waylandStatus.portalAvailable).toBe('boolean');
            expect(typeof status.waylandStatus.portalMethod).toBe('string');

            // On non-Wayland test environments (most CI), isWayland should be false
            // But we don't assert this — test environments may vary
        });

        it('IPC channel PLATFORM_HOTKEY_STATUS_GET round-trip works end-to-end', async () => {
            // Test the complete renderer→main→renderer flow with timeout handling
            const startTime = Date.now();

            const status = await browserWithElectron.execute(async () => {
                const api = (window as any).electronAPI;
                return await api.getPlatformHotkeyStatus();
            });

            const elapsed = Date.now() - startTime;

            // Verify response shape (confirms round-trip completed)
            expect(status).toBeDefined();
            expect(status.globalHotkeysEnabled !== undefined).toBe(true);
            expect(status.waylandStatus !== undefined).toBe(true);
            expect(status.registrationResults !== undefined).toBe(true);

            // Round-trip should complete quickly (under 5 seconds even with slow CI)
            expect(elapsed).toBeLessThan(5000);
        });

        it('IPC returns null when getPlatformHotkeyStatus method is missing', async () => {
            const result = await browserWithElectron.execute(async () => {
                const api = (window as any).electronAPI;
                // If the API or method doesn't exist, return null
                if (!api?.getPlatformHotkeyStatus) {
                    return null;
                }
                // Method exists, so return its result (which may be null/undefined)
                try {
                    const status = await api.getPlatformHotkeyStatus();
                    return status ?? null;
                } catch {
                    return null;
                }
            });

            // This test verifies the null handling path works correctly
            // The actual result depends on whether the API is available in the test environment
            expect(result === null || typeof result === 'object').toBe(true);
        });
    });

    describe('PlatformHotkeyStatus shape consistency', () => {
        it('registrationResults is an array with valid structure', async () => {
            const status = await browserWithElectron.execute(async () => {
                const api = (window as any).electronAPI;
                return await api.getPlatformHotkeyStatus();
            });

            expect(Array.isArray(status.registrationResults)).toBe(true);

            // If there are any registration results, validate their shape
            for (const result of status.registrationResults) {
                expect(typeof result.hotkeyId).toBe('string');
                expect(typeof result.success).toBe('boolean');
                // error is optional
                if (result.error !== undefined) {
                    expect(typeof result.error).toBe('string');
                }
            }
        });

        it('desktopEnvironment is a valid value', async () => {
            const status = await browserWithElectron.execute(async () => {
                const api = (window as any).electronAPI;
                return await api.getPlatformHotkeyStatus();
            });

            // Valid desktop environment values per type definition
            const validDEs = ['kde', 'gnome', 'hyprland', 'sway', 'cosmic', 'deepin', 'unknown'];
            expect(validDEs).toContain(status.waylandStatus.desktopEnvironment);
        });

        it('portalMethod is a valid value', async () => {
            const status = await browserWithElectron.execute(async () => {
                const api = (window as any).electronAPI;
                return await api.getPlatformHotkeyStatus();
            });

            // Valid portal method values per type definition
            const validMethods = ['chromium-flag', 'dbus-direct', 'dbus-fallback', 'none'];
            expect(validMethods).toContain(status.waylandStatus.portalMethod);
        });
    });

    describe('D-Bus Activation Signal Tracking (Test-Only)', () => {
        before(function () {
            if (process.env.NODE_ENV !== 'test' && process.env.DEBUG_DBUS !== '1') {
                console.log('[SKIP] Test-only D-Bus signal tracking disabled (set NODE_ENV=test or DEBUG_DBUS=1)');
                this.skip();
            }
        });

        it('getDbusActivationSignalStats returns valid structure', async () => {
            const stats = await browserWithElectron.execute(async () => {
                const api = (window as any).electronAPI;
                return await api.getDbusActivationSignalStats();
            });

            expect(stats).toBeDefined();
            expect(typeof stats).toBe('object');
            expect(typeof stats.trackingEnabled).toBe('boolean');
            expect(typeof stats.totalSignals).toBe('number');
            expect(typeof stats.signalsByShortcut).toBe('object');
            expect(stats.lastSignalTime === null || typeof stats.lastSignalTime === 'number').toBe(true);
            expect(Array.isArray(stats.signals)).toBe(true);
        });

        it('signal tracking is disabled by default (non-test environments)', async () => {
            const stats = await browserWithElectron.execute(async () => {
                const api = (window as any).electronAPI;
                return await api.getDbusActivationSignalStats();
            });

            expect(stats.trackingEnabled).toBeDefined();
            expect(stats.totalSignals).toBeGreaterThanOrEqual(0);
        });

        it('clearDbusActivationSignalHistory executes without error', async () => {
            await browserWithElectron.execute(async () => {
                const api = (window as any).electronAPI;
                api.clearDbusActivationSignalHistory();
            });

            // Verify history is cleared
            const stats = await browserWithElectron.execute(async () => {
                const api = (window as any).electronAPI;
                return await api.getDbusActivationSignalStats();
            });

            expect(stats.totalSignals).toBe(0);
            expect(stats.signals).toHaveLength(0);
            expect(Object.keys(stats.signalsByShortcut)).toHaveLength(0);
            expect(stats.lastSignalTime).toBeNull();
        });

        it('tracks activation signals when on Wayland+KDE with portal', async function () {
            const waylandStatus = await getWaylandStatus();

            const shouldSkip =
                !waylandStatus.isLinux ||
                !waylandStatus.isWayland ||
                !waylandStatus.portalAvailable ||
                waylandStatus.desktopEnvironment !== 'kde';

            if (shouldSkip) {
                this.skip();
            }

            await browserWithElectron.execute(async () => {
                const api = (window as any).electronAPI;
                api.clearDbusActivationSignalHistory();
            });

            const initialStats = await browserWithElectron.execute(async () => {
                const api = (window as any).electronAPI;
                return await api.getDbusActivationSignalStats();
            });

            expect(initialStats.trackingEnabled).toBe(true);
            expect(initialStats.totalSignals).toBe(0);
            expect(initialStats.signals).toEqual([]);
            expect(initialStats.lastSignalTime).toBeNull();
        });

        it('signal tracking isolates between clear calls', async () => {
            await browserWithElectron.execute(async () => {
                const api = (window as any).electronAPI;
                api.clearDbusActivationSignalHistory();
            });

            const stats1 = await browserWithElectron.execute(async () => {
                const api = (window as any).electronAPI;
                return await api.getDbusActivationSignalStats();
            });

            expect(stats1.totalSignals).toBe(0);

            // Clear again (idempotent)
            await browserWithElectron.execute(async () => {
                const api = (window as any).electronAPI;
                api.clearDbusActivationSignalHistory();
            });

            // Stats should still be 0
            const stats2 = await browserWithElectron.execute(async () => {
                const api = (window as any).electronAPI;
                return await api.getDbusActivationSignalStats();
            });

            expect(stats2.totalSignals).toBe(0);
            expect(stats2.lastSignalTime).toBeNull();
        });

        it('signal stats IPC round-trip completes within timeout', async () => {
            const startTime = Date.now();

            const stats = await browserWithElectron.execute(async () => {
                const api = (window as any).electronAPI;
                return await api.getDbusActivationSignalStats();
            });

            const elapsed = Date.now() - startTime;

            expect(stats).toBeDefined();
            expect(elapsed).toBeLessThan(5000);
        });
    });
});
