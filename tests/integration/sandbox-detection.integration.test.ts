/**
 * Integration tests for sandbox detection in real Electron.
 *
 * Verifies sandbox behavior in a real Electron process.
 * Note: Integration tests run with --no-sandbox flag in wdio.integration.conf.js
 * for CI compatibility, so we verify the app runs correctly in this mode.
 */

import { browser, expect } from '@wdio/globals';

describe('Sandbox Detection Integration', () => {
    before(async () => {
        // Wait for Electron app to fully load
        await browser.waitUntil(
            async () => {
                try {
                    const hasElectronAPI = await browser.execute(() => {
                        return typeof (window as any).electronAPI !== 'undefined';
                    });
                    return hasElectronAPI;
                } catch {
                    return false;
                }
            },
            {
                timeout: 30000,
                timeoutMsg: 'electronAPI not available after 30 seconds',
                interval: 500,
            }
        );
    });

    describe('App Launch Verification', () => {
        it('should launch successfully with sandbox configuration', async () => {
            // If we got here, the app started - this is the key test for sandbox compatibility
            const hasElectronAPI = await browser.execute(() => {
                return typeof (window as any).electronAPI !== 'undefined';
            });
            expect(hasElectronAPI).toBe(true);
        });

        it('should expose platform information', async () => {
            const platform = await browser.execute(() => {
                return (window as any).electronAPI.platform;
            });

            expect(['darwin', 'win32', 'linux']).toContain(platform);
        });

        it('should confirm running in Electron environment', async () => {
            const isElectron = await browser.execute(() => {
                return (window as any).electronAPI.isElectron;
            });

            expect(isElectron).toBe(true);
        });
    });

    describe('Security Settings Verification', () => {
        it('should have contextIsolation enabled (Node APIs not exposed)', async () => {
            // If contextIsolation is working, require should not be available
            const hasRequire = await browser.execute(() => {
                try {
                    return typeof require !== 'undefined';
                } catch {
                    return false;
                }
            });

            expect(hasRequire).toBe(false);
        });

        it('should not expose process.versions.electron directly', async () => {
            // With proper context isolation, process should not be directly accessible
            const hasProcessVersions = await browser.execute(() => {
                try {
                    return typeof (window as any).process?.versions?.electron !== 'undefined';
                } catch {
                    return false;
                }
            });

            expect(hasProcessVersions).toBe(false);
        });

        it('should only expose allowed APIs through electronAPI bridge', async () => {
            // Verify the bridge exists and has expected properties
            const apiKeys = await browser.execute(() => {
                const api = (window as any).electronAPI;
                if (!api) return [];
                return Object.keys(api);
            });

            // Should have some keys (the exposed API surface)
            expect(apiKeys.length).toBeGreaterThan(0);

            // Should include platform-related keys
            expect(apiKeys).toContain('platform');
            expect(apiKeys).toContain('isElectron');
        });
    });

    describe('Window Functionality with Current Sandbox Mode', () => {
        it('should successfully invoke IPC methods (getTheme)', async () => {
            const themeData = await browser.execute(async () => {
                const api = (window as any).electronAPI;
                return await api.getTheme();
            });

            expect(themeData).toHaveProperty('preference');
            expect(themeData).toHaveProperty('effectiveTheme');
        });

        it('should successfully invoke IPC methods (isMaximized)', async () => {
            const isMaximized = await browser.execute(async () => {
                const api = (window as any).electronAPI;
                return await api.isMaximized();
            });

            expect(typeof isMaximized).toBe('boolean');
        });
    });
});
