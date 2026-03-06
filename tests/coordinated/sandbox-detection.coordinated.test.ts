/**
 * Coordinated tests for sandbox detection and window configuration.
 *
 * Tests the interaction between sandboxInit module and getBaseWebPreferences
 * to ensure sandbox state propagates correctly to window configurations.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { App } from 'electron';

describe('Sandbox Detection Coordination', () => {
    let app: App;

    beforeEach(async () => {
        vi.resetModules();
        vi.clearAllMocks();
        const electron = await import('electron');
        app = electron.app ?? (electron as { default?: { app?: App } }).default?.app;
        // Reset app.commandLine mock state
        app.commandLine.hasSwitch = vi.fn().mockReturnValue(false);
        app.commandLine.getSwitchValue = vi.fn().mockReturnValue('');
    });

    afterEach(() => {
        vi.resetModules();
    });

    describe('getBaseWebPreferences sandbox state', () => {
        it('returns sandbox: true when no-sandbox switch is NOT set', async () => {
            // Setup: no sandbox switch
            app.commandLine.hasSwitch = vi.fn().mockReturnValue(false);
            // Ensure no --no-sandbox in argv
            const originalArgv = process.argv;
            process.argv = ['node', 'main.js'];

            const { getBaseWebPreferences } = await import('../../src/main/utils/constants');
            const prefs = getBaseWebPreferences();

            expect(prefs!.sandbox).toBe(true);

            process.argv = originalArgv;
        });

        it('returns sandbox: false when --no-sandbox is in process.argv', async () => {
            app.commandLine.hasSwitch = vi.fn().mockReturnValue(false);
            const originalArgv = process.argv;
            process.argv = ['node', 'main.js', '--no-sandbox'];

            const { getBaseWebPreferences } = await import('../../src/main/utils/constants');
            const prefs = getBaseWebPreferences();

            expect(prefs!.sandbox).toBe(false);

            process.argv = originalArgv;
        });

        it('returns sandbox: false when app.commandLine.hasSwitch("no-sandbox") is true', async () => {
            app.commandLine.hasSwitch = vi.fn().mockReturnValue(true);
            const originalArgv = process.argv;
            process.argv = ['node', 'main.js'];

            const { getBaseWebPreferences } = await import('../../src/main/utils/constants');
            const prefs = getBaseWebPreferences();

            expect(prefs!.sandbox).toBe(false);

            process.argv = originalArgv;
        });
    });

    describe('getBaseWebPreferences security defaults', () => {
        it('always enables contextIsolation regardless of sandbox state', async () => {
            app.commandLine.hasSwitch = vi.fn().mockReturnValue(true); // sandbox disabled
            const originalArgv = process.argv;
            process.argv = ['node', 'main.js'];

            const { getBaseWebPreferences } = await import('../../src/main/utils/constants');
            const prefs = getBaseWebPreferences();

            expect(prefs!.contextIsolation).toBe(true);
            expect(prefs!.nodeIntegration).toBe(false);

            process.argv = originalArgv;
        });
    });

    describe('Window configurations inherit sandbox state', () => {
        it('AUTH_WINDOW_CONFIG uses getBaseWebPreferences sandbox value', async () => {
            app.commandLine.hasSwitch = vi.fn().mockReturnValue(true); // sandbox disabled
            const originalArgv = process.argv;
            process.argv = ['node', 'main.js'];

            const { AUTH_WINDOW_CONFIG } = await import('../../src/main/utils/constants');
            const config = AUTH_WINDOW_CONFIG as any;

            // Should have sandbox: false due to the mock
            expect(config.webPreferences.sandbox).toBe(false);

            process.argv = originalArgv;
        });

        it('BASE_WINDOW_CONFIG uses getBaseWebPreferences sandbox value', async () => {
            app.commandLine.hasSwitch = vi.fn().mockReturnValue(false); // sandbox enabled
            const originalArgv = process.argv;
            process.argv = ['node', 'main.js'];

            const { BASE_WINDOW_CONFIG } = await import('../../src/main/utils/constants');
            const config = BASE_WINDOW_CONFIG as any;

            // Should have sandbox: true (default)
            expect(config.webPreferences.sandbox).toBe(true);

            process.argv = originalArgv;
        });
    });

    describe('webSecurity configuration', () => {
        it('returns webSecurity: true when --disable-web-security is NOT set', async () => {
            const originalArgv = process.argv;
            process.argv = ['node', 'main.js'];

            const { getBaseWebPreferences } = await import('../../src/main/utils/constants');
            const prefs = getBaseWebPreferences();

            expect(prefs!.webSecurity).toBe(true);

            process.argv = originalArgv;
        });

        it('returns webSecurity: false when --disable-web-security is set', async () => {
            const originalArgv = process.argv;
            process.argv = ['node', 'main.js', '--disable-web-security'];

            const { getBaseWebPreferences } = await import('../../src/main/utils/constants');
            const prefs = getBaseWebPreferences();

            expect(prefs!.webSecurity).toBe(false);

            process.argv = originalArgv;
        });
    });

    describe('V8 sandbox flag independence from Chromium sandbox', () => {
        it('V8 sandbox flag does not affect sandbox preference value', async () => {
            app.commandLine.hasSwitch = vi.fn().mockReturnValue(false);
            app.commandLine.getSwitchValue = vi.fn().mockReturnValue('--no-v8-sandbox');
            const originalArgv = process.argv;
            process.argv = ['node', 'main.js'];

            const { getBaseWebPreferences } = await import('../../src/main/utils/constants');
            const prefs = getBaseWebPreferences();

            expect(prefs!.sandbox).toBe(true);

            process.argv = originalArgv;
        });

        it('both sandbox flags can coexist without weakening other security defaults', async () => {
            app.commandLine.hasSwitch = vi.fn().mockReturnValue(true);
            app.commandLine.getSwitchValue = vi.fn().mockReturnValue('--no-v8-sandbox');
            const originalArgv = process.argv;
            process.argv = ['node', 'main.js', '--no-sandbox'];

            const { getBaseWebPreferences } = await import('../../src/main/utils/constants');
            const prefs = getBaseWebPreferences();

            expect(prefs!.sandbox).toBe(false);
            expect(prefs!.contextIsolation).toBe(true);
            expect(prefs!.nodeIntegration).toBe(false);

            process.argv = originalArgv;
        });
    });
});
