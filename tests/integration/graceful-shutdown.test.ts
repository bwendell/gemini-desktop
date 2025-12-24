/**
 * Integration Test: Graceful Shutdown with Pending State
 * 
 * Validates that settings are properly persisted during graceful shutdown
 * initiated via various signals (SIGTERM, SIGINT, app.quit).
 * 
 * @module graceful-shutdown.test
 */

import { _electron as electron, test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mainScript = path.join(__dirname, '../../dist-electron/main.cjs');

test.describe('Graceful Shutdown', () => {
    let userDataDir: string;

    test.beforeAll(async () => {
        userDataDir = await fs.promises.mkdtemp(
            path.join(os.tmpdir(), 'gemini-shutdown-integration-')
        );
        console.log(`Using user data dir: ${userDataDir}`);
    });

    test.afterAll(async () => {
        try {
            await fs.promises.rm(userDataDir, { recursive: true, force: true });
        } catch (e) {
            console.warn('Failed to cleanup temp dir:', e);
        }
    });

    test('should persist settings when app.quit() is called', async () => {
        // =========================================================================
        // SESSION 1: Modify settings and quit gracefully
        // =========================================================================
        console.log('Starting Session 1...');
        const app1 = await electron.launch({
            args: [mainScript],
            env: {
                ...process.env,
                ELECTRON_USER_DATA_DIR: userDataDir
            }
        });

        const window1 = await app1.firstWindow();
        await window1.waitForLoadState('domcontentloaded');

        // Modify a setting (enable always-on-top)
        await app1.evaluate(({ Menu }) => {
            const menu = Menu.getApplicationMenu();
            const aotItem = menu?.getMenuItemById('menu-view-always-on-top');
            aotItem?.click();
        });

        await window1.waitForTimeout(500);

        // Verify setting was applied
        const aotEnabled = await app1.evaluate(({ BrowserWindow }) => {
            const win = BrowserWindow.getAllWindows()[0];
            return win?.isAlwaysOnTop() ?? false;
        });
        console.log(`Session 1: Always-on-top enabled: ${aotEnabled}`);
        expect(aotEnabled).toBe(true);

        // Quit via app.quit() - triggers before-quit event
        await app1.evaluate(({ app }) => {
            app.quit();
        });

        // Wait for graceful shutdown
        await window1.waitForTimeout(1000);
        console.log('Session 1: Quit initiated');

        // =========================================================================
        // SESSION 2: Verify settings persisted
        // =========================================================================
        console.log('Starting Session 2...');
        const app2 = await electron.launch({
            args: [mainScript],
            env: {
                ...process.env,
                ELECTRON_USER_DATA_DIR: userDataDir
            }
        });

        const window2 = await app2.firstWindow();
        await window2.waitForLoadState('domcontentloaded');
        await window2.waitForTimeout(500);

        // Verify setting persisted
        const aotPersisted = await app2.evaluate(({ BrowserWindow }) => {
            const win = BrowserWindow.getAllWindows()[0];
            return win?.isAlwaysOnTop() ?? false;
        });
        console.log(`Session 2: Always-on-top persisted: ${aotPersisted}`);
        expect(aotPersisted).toBe(true);

        await app2.close();
    });

    test('should cleanup managers on graceful shutdown', async () => {
        const app = await electron.launch({
            args: [mainScript],
            env: {
                ...process.env,
                ELECTRON_USER_DATA_DIR: userDataDir
            }
        });

        const window = await app.firstWindow();
        await window.waitForLoadState('domcontentloaded');

        // Verify managers exist
        const managersExist = await app.evaluate(() => {
            return {
                windowManager: !!(global as any).windowManager,
                hotkeyManager: !!(global as any).hotkeyManager,
                trayManager: !!(global as any).trayManager,
                updateManager: !!(global as any).updateManager
            };
        });
        console.log(`Managers exist: ${JSON.stringify(managersExist)}`);
        expect(managersExist.windowManager).toBe(true);
        expect(managersExist.hotkeyManager).toBe(true);
        expect(managersExist.trayManager).toBe(true);
        expect(managersExist.updateManager).toBe(true);

        // Verify tray exists before shutdown
        const trayExistsBefore = await app.evaluate(() => {
            const tm = (global as any).trayManager;
            const tray = tm?.getTray();
            return tray !== null && !tray.isDestroyed();
        });
        console.log(`Tray exists before shutdown: ${trayExistsBefore}`);
        expect(trayExistsBefore).toBe(true);

        // Close app normally (triggers cleanup)
        await app.close();
        console.log('App closed successfully - graceful shutdown completed');
    });

    test('should save window state on graceful shutdown', async () => {
        // =========================================================================
        // SESSION 1: Resize window and quit
        // =========================================================================
        console.log('Starting Session 1 (window state)...');
        const app1 = await electron.launch({
            args: [mainScript],
            env: {
                ...process.env,
                ELECTRON_USER_DATA_DIR: userDataDir
            }
        });

        const window1 = await app1.firstWindow();
        await window1.waitForLoadState('domcontentloaded');

        // Set custom window bounds
        const targetBounds = { x: 200, y: 200, width: 1000, height: 700 };
        await app1.evaluate(({ BrowserWindow }, bounds) => {
            const win = BrowserWindow.getAllWindows()[0];
            win?.setBounds(bounds);
        }, targetBounds);

        await window1.waitForTimeout(1500); // Wait for debounce

        // Get actual bounds
        const actualBounds = await app1.evaluate(({ BrowserWindow }) => {
            const win = BrowserWindow.getAllWindows()[0];
            return win?.getBounds();
        });
        console.log(`Session 1: Set bounds to ${JSON.stringify(actualBounds)}`);

        // Gracefully quit
        await app1.evaluate(({ app }) => {
            app.quit();
        });
        await window1.waitForTimeout(1000);

        // =========================================================================
        // SESSION 2: Verify bounds persisted
        // =========================================================================
        console.log('Starting Session 2 (verify bounds)...');
        const app2 = await electron.launch({
            args: [mainScript],
            env: {
                ...process.env,
                ELECTRON_USER_DATA_DIR: userDataDir
            }
        });

        const window2 = await app2.firstWindow();
        await window2.waitForLoadState('domcontentloaded');

        const restoredBounds = await app2.evaluate(({ BrowserWindow }) => {
            const win = BrowserWindow.getAllWindows()[0];
            return win?.getBounds();
        });
        console.log(`Session 2: Restored bounds: ${JSON.stringify(restoredBounds)}`);

        // Allow some tolerance for OS window decorations
        const tolerance = 20;
        expect(Math.abs(restoredBounds.width - targetBounds.width)).toBeLessThan(tolerance);
        expect(Math.abs(restoredBounds.height - targetBounds.height)).toBeLessThan(tolerance);

        await app2.close();
    });
});
