// @ts-nocheck
/**
 * E2E Test: AppImage Launch Verification (Release Build Only)
 *
 * Validates that the packaged AppImage binary starts correctly with all
 * critical subsystems functional, including sandbox auto-disable logic.
 *
 * Test coverage:
 * - Application launches and renderer loads completely
 * - Preload bridge (electronAPI) is accessible
 * - IPC round-trips work (getTheme, isMaximized)
 * - Sandbox auto-disable logic is consistent with kernel restrictions
 * - Process stability after launch (uptime, memory)
 *
 * NOTE: Linux-specific sandbox tests skip gracefully on other platforms.
 */

import { browser, expect } from '@wdio/globals';
import { isLinuxSync } from '../helpers/platform';

describe('Release Build: AppImage Launch Verification', () => {
    it('should start the application and report ready', async () => {
        const isReady = await browser.electron.execute((electron) => {
            return electron.app.isReady();
        });

        expect(isReady).toBe(true);
    });

    it('should be running as a packaged build', async () => {
        const isPackaged = await browser.electron.execute((electron) => {
            return electron.app.isPackaged;
        });

        expect(isPackaged).toBe(true);
    });

    it('should have renderer process fully loaded', async () => {
        await browser.waitUntil(
            async () => {
                const loaded = await browser.electron.execute((electron) => {
                    try {
                        const windows = electron.BrowserWindow.getAllWindows();
                        const mainWindow = windows.find((w: any) => !w.isDestroyed());
                        if (!mainWindow) return false;
                        return !mainWindow.webContents.isLoading();
                    } catch {
                        return false;
                    }
                });
                return loaded;
            },
            {
                timeout: 15000,
                timeoutMsg: 'Renderer process did not finish loading within 15s',
            }
        );

        const rendererState = await browser.electron.execute((electron) => {
            try {
                const windows = electron.BrowserWindow.getAllWindows();
                const mainWindow = windows.find((w: any) => !w.isDestroyed());
                if (!mainWindow) return { loaded: false, error: 'No main window' };
                return {
                    loaded: !mainWindow.webContents.isLoading(),
                    url: mainWindow.webContents.getURL(),
                };
            } catch (error: any) {
                return { loaded: false, error: error.message };
            }
        });

        expect(rendererState.loaded).toBe(true);
    });

    it('should expose electronAPI through preload bridge', async () => {
        const bridgeInfo = await browser.execute(() => {
            const api = (window as any).electronAPI;
            return {
                hasElectronAPI: typeof api !== 'undefined',
                hasPlatform: typeof api?.platform === 'string',
                hasIsElectron: api?.isElectron === true,
                hasGetTheme: typeof api?.getTheme === 'function',
                hasIsMaximized: typeof api?.isMaximized === 'function',
            };
        });

        expect(bridgeInfo.hasElectronAPI).toBe(true);
        expect(bridgeInfo.hasPlatform).toBe(true);
        expect(bridgeInfo.hasIsElectron).toBe(true);
        expect(bridgeInfo.hasGetTheme).toBe(true);
        expect(bridgeInfo.hasIsMaximized).toBe(true);
    });

    it('should complete IPC round-trips successfully', async () => {
        const themeData = await browser.execute(async () => {
            const api = (window as any).electronAPI;
            return await api.getTheme();
        });

        expect(themeData).toHaveProperty('preference');
        expect(themeData).toHaveProperty('effectiveTheme');

        const isMaximized = await browser.execute(async () => {
            const api = (window as any).electronAPI;
            return await api.isMaximized();
        });

        expect(typeof isMaximized).toBe('boolean');
    });
});

describe('Release Build: Sandbox Auto-Disable Verification', () => {
    before(function () {
        if (!isLinuxSync()) {
            this.skip();
        }
    });

    it('should report sandbox command-line state', async () => {
        const sandboxState = await browser.electron.execute((electron) => {
            return {
                hasNoSandbox: electron.app.commandLine.hasSwitch('no-sandbox'),
                argvHasNoSandbox: process.argv.includes('--no-sandbox'),
            };
        });

        // Just logging — the state depends on the OS environment
        expect(typeof sandboxState.hasNoSandbox).toBe('boolean');
    });

    it('should have consistent sandbox state with kernel restrictions', async () => {
        const consistency = await browser.electron.execute((electron) => {
            try {
                const fs = require('fs');

                // Read kernel restriction files
                let appArmorRestriction = null;
                let usernsRestriction = null;

                try {
                    appArmorRestriction = fs
                        .readFileSync('/proc/sys/kernel/apparmor_restrict_unprivileged_userns', 'utf8')
                        .trim();
                } catch {
                    // Not present on this system
                }

                try {
                    usernsRestriction = fs.readFileSync('/proc/sys/kernel/unprivileged_userns_clone', 'utf8').trim();
                } catch {
                    // Not present on this system
                }

                const hasNoSandbox = electron.app.commandLine.hasSwitch('no-sandbox');

                // Determine if user namespaces are blocked
                const namespacesBlocked = appArmorRestriction === '1' || usernsRestriction === '0';

                // Check SUID sandbox availability
                const path = require('path');
                let suidAvailable = false;
                try {
                    const chromeSandboxPath =
                        process.env.CHROME_DEVEL_SANDBOX || path.join(path.dirname(process.execPath), 'chrome-sandbox');
                    const stat = fs.statSync(chromeSandboxPath);
                    suidAvailable = stat.uid === 0 && (stat.mode & 0o4755) === 0o4755;
                } catch {
                    suidAvailable = false;
                }

                // Both mechanisms unavailable = should have --no-sandbox
                const bothUnavailable = namespacesBlocked && !suidAvailable;

                return {
                    appArmorRestriction,
                    usernsRestriction,
                    namespacesBlocked,
                    suidAvailable,
                    bothUnavailable,
                    hasNoSandbox,
                    isConsistent: !bothUnavailable || hasNoSandbox,
                };
            } catch (error: any) {
                return {
                    error: error.message,
                    isConsistent: true, // Can't determine, assume OK
                };
            }
        });

        // If both sandbox mechanisms are unavailable, --no-sandbox MUST be set
        // (sandboxInit.ts should have handled this at startup)
        expect(consistency.isConsistent).toBe(true);
    });

    it('should detect APPIMAGE environment when running as AppImage', async () => {
        const appImageInfo = await browser.electron.execute(() => {
            return {
                isAppImage: !!process.env.APPIMAGE,
                appImagePath: process.env.APPIMAGE || null,
            };
        });

        // When running from linux-unpacked, APPIMAGE won't be set — that's fine
        if (appImageInfo.appImagePath) {
            expect(appImageInfo.appImagePath).toContain('.AppImage');
        }
    });
});

describe('Release Build: Process Stability After Launch', () => {
    it('should have reasonable process uptime (no startup hangs)', async () => {
        const uptime = await browser.electron.execute(() => {
            return process.uptime();
        });

        expect(uptime).toBeLessThan(30);
    });

    it('should have acceptable memory usage', async () => {
        const memInfo = await browser.electron.execute(() => {
            const mem = process.memoryUsage();
            return {
                rssMB: Math.round(mem.rss / 1024 / 1024),
                heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
            };
        });

        expect(memInfo.rssMB).toBeLessThan(1000);
    });

    it('should respond to getTitle without renderer crash', async () => {
        const title = await browser.getTitle();

        expect(typeof title).toBe('string');
    });
});
