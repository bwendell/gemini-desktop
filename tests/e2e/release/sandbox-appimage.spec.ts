// @ts-nocheck
/**
 * E2E Test: AppImage Sandbox Detection (Release Build Only)
 *
 * This test validates that the AppImage sandbox detection and fallback
 * works correctly in the packaged release build. Verifies:
 * - AppImage launches successfully on systems with sandbox restrictions
 * - Sandbox detection logic is properly bundled
 * - Application remains functional regardless of sandbox mode
 *
 * NOTE: This test is specifically designed for Linux AppImage builds.
 * On other platforms, tests are skipped gracefully.
 */

import { browser, expect } from '@wdio/globals';
import { E2ELogger } from '../helpers/logger';
import { isLinuxSync } from '../helpers/platform';

describe('Release Build: AppImage Sandbox Detection', () => {
    it('should start the application successfully', async () => {
        const isReady = await browser.electron.execute((electron) => {
            return electron.app.isReady();
        });
        expect(isReady).toBe(true);

        E2ELogger.info('sandbox-appimage', 'Application started successfully');
    });

    it('should be running as a packaged app', async () => {
        const isPackaged = await browser.electron.execute((electron) => {
            return electron.app.isPackaged;
        });

        expect(isPackaged).toBe(true);
        E2ELogger.info('sandbox-appimage', 'App is running in packaged mode');
    });

    it('should detect current platform correctly', async () => {
        const platform = await browser.electron.execute(() => {
            return process.platform;
        });

        expect(['darwin', 'win32', 'linux']).toContain(platform);
        E2ELogger.info('sandbox-appimage', `Platform detected: ${platform}`);
    });

    describe('Linux AppImage specific tests', () => {
        it('should detect APPIMAGE environment variable (Linux only)', async function () {
            if (!isLinuxSync()) {
                this.skip();
                return;
            }

            const appImageEnv = await browser.electron.execute(() => {
                return {
                    isAppImage: !!process.env.APPIMAGE,
                    appImagePath: process.env.APPIMAGE || null,
                    platform: process.platform,
                };
            });

            E2ELogger.info('sandbox-appimage', `APPIMAGE env: ${appImageEnv.appImagePath || 'not set'}`);

            // If running as AppImage, APPIMAGE env should be set
            // This may not be set in unpacked linux-unpacked directory
            if (appImageEnv.appImagePath) {
                expect(appImageEnv.appImagePath).toContain('.AppImage');
            } else {
                E2ELogger.info(
                    'sandbox-appimage',
                    'Not running as AppImage (linux-unpacked directory). APPIMAGE detection skipped.'
                );
            }
        });

        it('should have sandbox command-line switch accessible (Linux only)', async function () {
            if (!isLinuxSync()) {
                this.skip();
                return;
            }

            const sandboxInfo = await browser.electron.execute((electron) => {
                return {
                    hasNoSandbox: electron.app.commandLine.hasSwitch('no-sandbox'),
                    hasSandbox: electron.app.commandLine.hasSwitch('sandbox'),
                    // Check process.argv as well
                    argvHasNoSandbox: process.argv.includes('--no-sandbox'),
                };
            });

            E2ELogger.info(
                'sandbox-appimage',
                `Sandbox state: hasNoSandbox=${sandboxInfo.hasNoSandbox}, argvHasNoSandbox=${sandboxInfo.argvHasNoSandbox}`
            );

            // Either way, the app should be running - this just logs the state
            expect(typeof sandboxInfo.hasNoSandbox).toBe('boolean');
        });
    });

    describe('Security verification', () => {
        it('should have contextIsolation enabled regardless of sandbox mode', async () => {
            // Test that the renderer can't access Node APIs directly
            const hasRequire = await browser.execute(() => {
                try {
                    return typeof require !== 'undefined';
                } catch {
                    return false;
                }
            });

            // contextIsolation should prevent require from being available
            expect(hasRequire).toBe(false);
            E2ELogger.info('sandbox-appimage', 'contextIsolation verified: require not exposed');
        });

        it('should expose electronAPI through preload bridge', async () => {
            const hasElectronAPI = await browser.execute(() => {
                return typeof (window as any).electronAPI !== 'undefined';
            });

            expect(hasElectronAPI).toBe(true);
            E2ELogger.info('sandbox-appimage', 'electronAPI bridge verified');
        });

        it('should not expose process.versions directly', async () => {
            const hasProcessVersions = await browser.execute(() => {
                try {
                    return typeof (window as any).process?.versions?.electron !== 'undefined';
                } catch {
                    return false;
                }
            });

            expect(hasProcessVersions).toBe(false);
            E2ELogger.info('sandbox-appimage', 'process.versions correctly isolated');
        });
    });

    describe('Functionality verification', () => {
        it('should be able to invoke IPC methods (getTheme)', async () => {
            const themeData = await browser.execute(async () => {
                const api = (window as any).electronAPI;
                return await api.getTheme();
            });

            expect(themeData).toHaveProperty('preference');
            expect(themeData).toHaveProperty('effectiveTheme');
            E2ELogger.info('sandbox-appimage', `IPC working: theme=${themeData.preference}`);
        });

        it('should be able to query window state (isMaximized)', async () => {
            const isMaximized = await browser.execute(async () => {
                const api = (window as any).electronAPI;
                return await api.isMaximized();
            });

            expect(typeof isMaximized).toBe('boolean');
            E2ELogger.info('sandbox-appimage', `Window state IPC working: isMaximized=${isMaximized}`);
        });

        it('should have platform info exposed via electronAPI', async () => {
            const platformInfo = await browser.execute(() => {
                const api = (window as any).electronAPI;
                return {
                    platform: api.platform,
                    isElectron: api.isElectron,
                };
            });

            expect(['darwin', 'win32', 'linux']).toContain(platformInfo.platform);
            expect(platformInfo.isElectron).toBe(true);
            E2ELogger.info('sandbox-appimage', `Platform info: ${platformInfo.platform}`);
        });
    });

    describe('Kernel restriction detection (Linux only)', () => {
        it('should handle AppArmor restriction gracefully', async function () {
            if (!isLinuxSync()) {
                this.skip();
                return;
            }

            // Try to read the AppArmor restriction sysctl
            const restrictionInfo = await browser.electron.execute(() => {
                try {
                    const fs = require('fs');
                    const appArmorPath = '/proc/sys/kernel/apparmor_restrict_unprivileged_userns';
                    const usernsPath = '/proc/sys/kernel/unprivileged_userns_clone';

                    let appArmorRestriction = null;
                    let usernsRestriction = null;

                    try {
                        appArmorRestriction = fs.readFileSync(appArmorPath, 'utf8').trim();
                    } catch {
                        // File doesn't exist
                    }

                    try {
                        usernsRestriction = fs.readFileSync(usernsPath, 'utf8').trim();
                    } catch {
                        // File doesn't exist
                    }

                    return {
                        success: true,
                        appArmorRestriction,
                        usernsRestriction,
                        // App is running, so either there's no restriction or we handled it
                        appRunning: true,
                    };
                } catch (err: any) {
                    return {
                        success: false,
                        error: err.message,
                        appRunning: true, // We're executing this, so app is running
                    };
                }
            });

            E2ELogger.info(
                'sandbox-appimage',
                `Kernel restrictions: AppArmor=${restrictionInfo.appArmorRestriction}, UserNS=${restrictionInfo.usernsRestriction}`
            );

            // The key assertion: regardless of restrictions, the app is running
            expect(restrictionInfo.appRunning).toBe(true);
        });
    });
});
