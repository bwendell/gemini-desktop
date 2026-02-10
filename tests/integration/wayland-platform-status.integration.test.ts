import { browser, expect } from '@wdio/globals';

/**
 * Wayland Platform Status IPC Round-Trip Integration Tests
 *
 * These tests verify IPC round-trips between main and renderer processes
 * for the platform hotkey status API.
 *
 * Pattern follows: https://github.com/user/repo/tests/integration/hotkeys.integration.test.ts
 */
describe('Platform Hotkey Status IPC', () => {
    before(async () => {
        // Wait for app to be ready with at least one window
        await browser.waitUntil(async () => (await browser.getWindowHandles()).length > 0);
    });

    describe('getPlatformHotkeyStatus() IPC round-trip', () => {
        it('renderer can query platform hotkey status via window.electronAPI.getPlatformHotkeyStatus()', async () => {
            // Call the renderer API
            const status = await browser.execute(async () => {
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
            const status = await browser.electron.execute(() => {
                // @ts-expect-error - accessing global manager
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

        it('globalHotkeysEnabled field reflects actual registration state', async () => {
            // Get platform status from main process
            const status = await browser.electron.execute(() => {
                // @ts-expect-error - accessing global manager
                return global.hotkeyManager?.getPlatformHotkeyStatus?.() ?? null;
            });

            // Check if quickChat is registered via globalShortcut
            const isQuickChatRegistered = await browser.electron.execute((_electron) => {
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
            const status = await browser.execute(async () => {
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

            const status = await browser.execute(async () => {
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
    });

    describe('PlatformHotkeyStatus shape consistency', () => {
        it('registrationResults is an array with valid structure', async () => {
            const status = await browser.execute(async () => {
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
            const status = await browser.execute(async () => {
                const api = (window as any).electronAPI;
                return await api.getPlatformHotkeyStatus();
            });

            // Valid desktop environment values per type definition
            const validDEs = ['kde', 'unknown'];
            expect(validDEs).toContain(status.waylandStatus.desktopEnvironment);
        });

        it('portalMethod is a valid value', async () => {
            const status = await browser.execute(async () => {
                const api = (window as any).electronAPI;
                return await api.getPlatformHotkeyStatus();
            });

            // Valid portal method values per type definition
            const validMethods = ['chromium-flag', 'dbus-direct', 'dbus-fallback', 'none'];
            expect(validMethods).toContain(status.waylandStatus.portalMethod);
        });
    });
});
