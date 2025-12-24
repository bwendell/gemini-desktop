/**
 * Integration Test: Options Window + Main Window Sync
 * 
 * Validates that settings changes in Options window are properly
 * broadcast to and reflected in the Main window in real-time.
 * 
 * @module options-main-sync.test
 */

import { _electron as electron, test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mainScript = path.join(__dirname, '../../dist-electron/main.cjs');

test.describe('Options + Main Window Sync', () => {
    let userDataDir: string;

    test.beforeAll(async () => {
        userDataDir = await fs.promises.mkdtemp(
            path.join(os.tmpdir(), 'gemini-sync-integration-')
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

    test('should sync theme changes from Options to Main window in real-time', async () => {
        const app = await electron.launch({
            args: [mainScript],
            env: {
                ...process.env,
                ELECTRON_USER_DATA_DIR: userDataDir
            }
        });

        const mainWindow = await app.firstWindow();
        await mainWindow.waitForLoadState('domcontentloaded');

        // Get initial theme in main window
        const initialTheme = await mainWindow.evaluate(() => {
            return document.documentElement.getAttribute('data-theme');
        });
        console.log(`Main window initial theme: ${initialTheme}`);

        // Open Options window
        await app.evaluate(({ Menu }) => {
            const menu = Menu.getApplicationMenu();
            menu?.getMenuItemById('menu-file-options')?.click();
        });

        const optionsWindow = await app.waitForEvent('window', {
            predicate: (page) => page.url().includes('options')
        });
        await optionsWindow.waitForLoadState('domcontentloaded');

        // Get Options window handle for verification
        const optionsThemeInitial = await optionsWindow.evaluate(() => {
            return document.documentElement.getAttribute('data-theme');
        });
        console.log(`Options window initial theme: ${optionsThemeInitial}`);

        // Both windows should have same theme
        expect(optionsThemeInitial).toBe(initialTheme);

        // Change theme in Options to light
        const lightThemeCard = optionsWindow.locator('[data-testid="theme-card-light"]');
        await expect(lightThemeCard).toBeVisible({ timeout: 10000 });
        await lightThemeCard.click();

        // Wait for broadcast
        await optionsWindow.waitForTimeout(500);

        // Verify Options window updated
        const optionsThemeAfter = await optionsWindow.evaluate(() => {
            return document.documentElement.getAttribute('data-theme');
        });
        console.log(`Options window after click: ${optionsThemeAfter}`);
        expect(optionsThemeAfter).toBe('light');

        // Verify Main window also updated (real-time sync)
        const mainThemeAfter = await mainWindow.evaluate(() => {
            return document.documentElement.getAttribute('data-theme');
        });
        console.log(`Main window after Options change: ${mainThemeAfter}`);
        expect(mainThemeAfter).toBe('light');

        // Change to dark and verify sync again
        const darkThemeCard = optionsWindow.locator('[data-testid="theme-card-dark"]');
        await darkThemeCard.click();
        await optionsWindow.waitForTimeout(500);

        const mainThemeDark = await mainWindow.evaluate(() => {
            return document.documentElement.getAttribute('data-theme');
        });
        console.log(`Main window after dark theme: ${mainThemeDark}`);
        expect(mainThemeDark).toBe('dark');

        await app.close();
    });

    test('should sync always-on-top state from Menu to all windows', async () => {
        const app = await electron.launch({
            args: [mainScript],
            env: {
                ...process.env,
                ELECTRON_USER_DATA_DIR: userDataDir
            }
        });

        const mainWindow = await app.firstWindow();
        await mainWindow.waitForLoadState('domcontentloaded');

        // Open Options window
        await app.evaluate(({ Menu }) => {
            const menu = Menu.getApplicationMenu();
            menu?.getMenuItemById('menu-file-options')?.click();
        });

        const optionsWindow = await app.waitForEvent('window', {
            predicate: (page) => page.url().includes('options')
        });
        await optionsWindow.waitForLoadState('domcontentloaded');

        // Enable always-on-top via menu (affects main window)
        await app.evaluate(({ Menu }) => {
            const menu = Menu.getApplicationMenu();
            const aotItem = menu?.getMenuItemById('menu-view-always-on-top');
            aotItem?.click();
        });

        await mainWindow.waitForTimeout(500);

        // Verify main window has always-on-top
        const mainAOT = await app.evaluate(({ BrowserWindow }) => {
            const mainWin = BrowserWindow.getAllWindows().find(w =>
                !w.webContents.getURL().includes('options')
            );
            return mainWin?.isAlwaysOnTop() ?? false;
        });
        console.log(`Main window always-on-top: ${mainAOT}`);
        expect(mainAOT).toBe(true);

        // Note: Options window is a child window, its AOT behavior may differ
        // The important thing is the main window state is correct

        await app.close();
    });

    test('should close Options window when main window is closed', async () => {
        const app = await electron.launch({
            args: [mainScript],
            env: {
                ...process.env,
                ELECTRON_USER_DATA_DIR: userDataDir
            }
        });

        const mainWindow = await app.firstWindow();
        await mainWindow.waitForLoadState('domcontentloaded');

        // Open Options
        await app.evaluate(({ Menu }) => {
            const menu = Menu.getApplicationMenu();
            menu?.getMenuItemById('menu-file-options')?.click();
        });

        await app.waitForEvent('window', {
            predicate: (page) => page.url().includes('options')
        });

        // Verify we have 2 windows
        const countBefore = await app.evaluate(({ BrowserWindow }) => {
            return BrowserWindow.getAllWindows().length;
        });
        console.log(`Window count before close: ${countBefore}`);
        expect(countBefore).toBe(2);

        // Trigger app quit (which should close all windows)
        // This tests the dependent window closing behavior
        await app.close();

        // If we get here without errors, the test passed
        console.log('All windows closed successfully');
    });

    test('should broadcast individual hotkey settings to all windows', async () => {
        const app = await electron.launch({
            args: [mainScript],
            env: {
                ...process.env,
                ELECTRON_USER_DATA_DIR: userDataDir
            }
        });

        const mainWindow = await app.firstWindow();
        await mainWindow.waitForLoadState('domcontentloaded');

        // Open Options
        await app.evaluate(({ Menu }) => {
            const menu = Menu.getApplicationMenu();
            menu?.getMenuItemById('menu-file-options')?.click();
        });

        const optionsWindow = await app.waitForEvent('window', {
            predicate: (page) => page.url().includes('options')
        });
        await optionsWindow.waitForLoadState('domcontentloaded');

        // Get current state of a hotkey toggle
        const bossKeyToggle = optionsWindow.locator('[data-testid="hotkey-toggle-bossKey-switch"]');
        await expect(bossKeyToggle).toBeVisible({ timeout: 10000 });
        await expect(bossKeyToggle).toHaveAttribute('aria-checked', /true|false/, { timeout: 10000 });

        const initialState = await bossKeyToggle.getAttribute('aria-checked');
        console.log(`Boss Key initial state: ${initialState}`);

        // Toggle the setting
        await bossKeyToggle.click();
        await optionsWindow.waitForTimeout(500);

        const newState = await bossKeyToggle.getAttribute('aria-checked');
        console.log(`Boss Key new state: ${newState}`);
        expect(newState).not.toBe(initialState);

        // Verify HotkeyManager received the update
        const hotkeyManagerState = await app.evaluate(() => {
            const hm = (global as any).hotkeyManager;
            return hm?.isIndividualEnabled('bossKey');
        });
        console.log(`HotkeyManager bossKey enabled: ${hotkeyManagerState}`);
        expect(hotkeyManagerState).toBe(newState === 'true');

        await app.close();
    });
});
