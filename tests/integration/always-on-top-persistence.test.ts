/**
 * Integration Test: Always-On-Top Persistence
 * 
 * Validates that always-on-top state persists across application restarts.
 * Tests WindowManager → MainWindow → SettingsStore flow.
 * 
 * @module always-on-top-persistence.test
 */

import { _electron as electron, test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mainScript = path.join(__dirname, '../../dist-electron/main.cjs');

test.describe('Always-On-Top Persistence', () => {
    let userDataDir: string;

    test.beforeAll(async () => {
        userDataDir = await fs.promises.mkdtemp(
            path.join(os.tmpdir(), 'gemini-aot-integration-')
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

    test('should persist always-on-top enabled state across app restart', async () => {
        // =========================================================================
        // SESSION 1: Enable Always-On-Top
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

        // Initial state should be disabled
        const initialAOT = await app1.evaluate(({ BrowserWindow }) => {
            const win = BrowserWindow.getAllWindows()[0];
            return win?.isAlwaysOnTop() ?? false;
        });
        console.log(`Session 1: Initial always-on-top: ${initialAOT}`);

        // Enable always-on-top via menu
        await app1.evaluate(({ Menu }) => {
            const menu = Menu.getApplicationMenu();
            const aotItem = menu?.getMenuItemById('menu-view-always-on-top');
            aotItem?.click();
        });

        // Wait for state to update
        await window1.waitForTimeout(500);

        // Verify it's now enabled
        const aotAfterClick = await app1.evaluate(({ BrowserWindow }) => {
            const win = BrowserWindow.getAllWindows()[0];
            return win?.isAlwaysOnTop() ?? false;
        });
        console.log(`Session 1: After toggle always-on-top: ${aotAfterClick}`);
        expect(aotAfterClick).toBe(true);

        // Also verify via WindowManager
        const wmAOT = await app1.evaluate(() => {
            const wm = (global as any).windowManager;
            return wm?.isAlwaysOnTop() ?? false;
        });
        console.log(`Session 1: WindowManager.isAlwaysOnTop(): ${wmAOT}`);
        expect(wmAOT).toBe(true);

        await app1.close();
        console.log('Session 1: Closed');

        // =========================================================================
        // SESSION 2: Verify persistence
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

        // Allow time for initialization
        await window2.waitForTimeout(500);

        // Verify window is still always-on-top
        const aotOnStartup = await app2.evaluate(({ BrowserWindow }) => {
            const win = BrowserWindow.getAllWindows()[0];
            return win?.isAlwaysOnTop() ?? false;
        });
        console.log(`Session 2: Always-on-top on startup: ${aotOnStartup}`);
        expect(aotOnStartup).toBe(true);

        // Verify menu item is checked
        const menuChecked = await app2.evaluate(({ Menu }) => {
            const menu = Menu.getApplicationMenu();
            const aotItem = menu?.getMenuItemById('menu-view-always-on-top');
            return aotItem?.checked ?? false;
        });
        console.log(`Session 2: Menu item checked: ${menuChecked}`);
        expect(menuChecked).toBe(true);

        await app2.close();
        console.log('Session 2: Always-on-top persistence verified');
    });

    test('should persist always-on-top disabled state after being toggled off', async () => {
        // =========================================================================
        // SESSION 1: Disable Always-On-Top
        // =========================================================================
        console.log('Starting Session 1 (disable AOT)...');
        const app1 = await electron.launch({
            args: [mainScript],
            env: {
                ...process.env,
                ELECTRON_USER_DATA_DIR: userDataDir
            }
        });

        const window1 = await app1.firstWindow();
        await window1.waitForLoadState('domcontentloaded');
        await window1.waitForTimeout(500);

        // Verify it's currently enabled from previous test
        const currentAOT = await app1.evaluate(({ BrowserWindow }) => {
            const win = BrowserWindow.getAllWindows()[0];
            return win?.isAlwaysOnTop() ?? false;
        });
        console.log(`Session 1: Current always-on-top: ${currentAOT}`);
        expect(currentAOT).toBe(true);

        // Toggle off
        await app1.evaluate(({ Menu }) => {
            const menu = Menu.getApplicationMenu();
            const aotItem = menu?.getMenuItemById('menu-view-always-on-top');
            aotItem?.click();
        });

        await window1.waitForTimeout(500);

        // Verify disabled
        const aotAfterDisable = await app1.evaluate(({ BrowserWindow }) => {
            const win = BrowserWindow.getAllWindows()[0];
            return win?.isAlwaysOnTop() ?? false;
        });
        console.log(`Session 1: After disable always-on-top: ${aotAfterDisable}`);
        expect(aotAfterDisable).toBe(false);

        await app1.close();

        // =========================================================================
        // SESSION 2: Verify disabled state persisted
        // =========================================================================
        console.log('Starting Session 2 (verify disabled)...');
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

        const aotOnStartup = await app2.evaluate(({ BrowserWindow }) => {
            const win = BrowserWindow.getAllWindows()[0];
            return win?.isAlwaysOnTop() ?? false;
        });
        console.log(`Session 2: Always-on-top on startup: ${aotOnStartup}`);
        expect(aotOnStartup).toBe(false);

        await app2.close();
    });
});
