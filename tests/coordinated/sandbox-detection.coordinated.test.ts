/**
 * Coordinated tests for sandbox detection and window configuration.
 *
 * Tests the interaction between sandboxInit module and getBaseWebPreferences
 * to ensure sandbox state propagates correctly to window configurations.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { app } from 'electron';

describe('Sandbox Detection Coordination', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        // Reset app.commandLine mock state
        vi.mocked(app.commandLine.hasSwitch).mockReturnValue(false);
    });

    afterEach(() => {
        vi.resetModules();
    });

    describe('getBaseWebPreferences sandbox state', () => {
        it('returns sandbox: true when no-sandbox switch is NOT set', async () => {
            // Setup: no sandbox switch
            vi.mocked(app.commandLine.hasSwitch).mockReturnValue(false);
            // Ensure no --no-sandbox in argv
            const originalArgv = process.argv;
            process.argv = ['node', 'main.js'];

            const { getBaseWebPreferences } = await import('../../src/main/utils/constants');
            const prefs = getBaseWebPreferences();

            expect(prefs!.sandbox).toBe(true);

            process.argv = originalArgv;
        });

        it('returns sandbox: false when --no-sandbox is in process.argv', async () => {
            vi.mocked(app.commandLine.hasSwitch).mockReturnValue(false);
            const originalArgv = process.argv;
            process.argv = ['node', 'main.js', '--no-sandbox'];

            const { getBaseWebPreferences } = await import('../../src/main/utils/constants');
            const prefs = getBaseWebPreferences();

            expect(prefs!.sandbox).toBe(false);

            process.argv = originalArgv;
        });

        it('returns sandbox: false when app.commandLine.hasSwitch("no-sandbox") is true', async () => {
            vi.mocked(app.commandLine.hasSwitch).mockReturnValue(true);
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
            vi.mocked(app.commandLine.hasSwitch).mockReturnValue(true); // sandbox disabled
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
            vi.mocked(app.commandLine.hasSwitch).mockReturnValue(true); // sandbox disabled
            const originalArgv = process.argv;
            process.argv = ['node', 'main.js'];

            const { AUTH_WINDOW_CONFIG } = await import('../../src/main/utils/constants');
            const config = AUTH_WINDOW_CONFIG as any;

            // Should have sandbox: false due to the mock
            expect(config.webPreferences.sandbox).toBe(false);

            process.argv = originalArgv;
        });

        it('BASE_WINDOW_CONFIG uses getBaseWebPreferences sandbox value', async () => {
            vi.mocked(app.commandLine.hasSwitch).mockReturnValue(false); // sandbox enabled
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
});
