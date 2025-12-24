/**
 * Integration Test: Theme Persistence Across Sessions
 * 
 * Validates that theme preferences persist across application restarts.
 * Tests the complete flow: IpcManager → SettingsStore → nativeTheme.
 * 
 * @module theme-persistence.test
 */

import { _electron as electron, test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mainScript = path.join(__dirname, '../../dist-electron/main.cjs');

test.describe('Theme Persistence', () => {
    let userDataDir: string;

    test.beforeAll(async () => {
        userDataDir = await fs.promises.mkdtemp(
            path.join(os.tmpdir(), 'gemini-theme-integration-')
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

    test('should persist theme preference across app restart', async () => {
        // =========================================================================
        // SESSION 1: Set theme to dark
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

        // Open Options via menu
        await app1.evaluate(({ Menu }) => {
            const menu = Menu.getApplicationMenu();
            const optionsItem = menu?.getMenuItemById('menu-file-options');
            optionsItem?.click();
        });

        // Wait for Options window
        const optionsWindow1 = await app1.waitForEvent('window', {
            predicate: (page) => page.url().includes('options')
        });
        await optionsWindow1.waitForLoadState('domcontentloaded');

        // Click on dark theme card
        const darkThemeCard = optionsWindow1.locator('[data-testid="theme-card-dark"]');
        await expect(darkThemeCard).toBeVisible({ timeout: 10000 });
        await darkThemeCard.click();

        // Verify theme was applied
        await optionsWindow1.waitForTimeout(500);
        const themeAfterClick = await optionsWindow1.evaluate(() => {
            return document.documentElement.getAttribute('data-theme');
        });
        console.log(`Session 1: Theme set to: ${themeAfterClick}`);
        expect(themeAfterClick).toBe('dark');

        // Close app
        await app1.close();
        console.log('Session 1: Closed');

        // =========================================================================
        // SESSION 2: Verify theme persisted
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

        // Verify main window has dark theme
        await window2.waitForTimeout(500);
        const mainWindowTheme = await window2.evaluate(() => {
            return document.documentElement.getAttribute('data-theme');
        });
        console.log(`Session 2: Main window theme: ${mainWindowTheme}`);
        expect(mainWindowTheme).toBe('dark');

        // Also verify via nativeTheme (main process)
        const nativeThemeSource = await app2.evaluate(({ nativeTheme }) => {
            return nativeTheme.themeSource;
        });
        console.log(`Session 2: nativeTheme.themeSource: ${nativeThemeSource}`);
        expect(nativeThemeSource).toBe('dark');

        await app2.close();
        console.log('Session 2: Theme persistence verified');
    });

    test('should persist system theme preference across restart', async () => {
        // =========================================================================
        // SESSION 1: Set theme to system
        // =========================================================================
        console.log('Starting Session 1 (system theme)...');
        const app1 = await electron.launch({
            args: [mainScript],
            env: {
                ...process.env,
                ELECTRON_USER_DATA_DIR: userDataDir
            }
        });

        const window1 = await app1.firstWindow();
        await window1.waitForLoadState('domcontentloaded');

        // Open Options
        await app1.evaluate(({ Menu }) => {
            const menu = Menu.getApplicationMenu();
            menu?.getMenuItemById('menu-file-options')?.click();
        });

        const optionsWindow1 = await app1.waitForEvent('window', {
            predicate: (page) => page.url().includes('options')
        });
        await optionsWindow1.waitForLoadState('domcontentloaded');

        // Click system theme
        const systemThemeCard = optionsWindow1.locator('[data-testid="theme-card-system"]');
        await expect(systemThemeCard).toBeVisible({ timeout: 10000 });
        await systemThemeCard.click();
        await optionsWindow1.waitForTimeout(500);

        await app1.close();

        // =========================================================================
        // SESSION 2: Verify system theme persisted
        // =========================================================================
        console.log('Starting Session 2 (system theme)...');
        const app2 = await electron.launch({
            args: [mainScript],
            env: {
                ...process.env,
                ELECTRON_USER_DATA_DIR: userDataDir
            }
        });

        const window2 = await app2.firstWindow();
        await window2.waitForLoadState('domcontentloaded');

        // Verify nativeTheme is set to system
        const nativeThemeSource = await app2.evaluate(({ nativeTheme }) => {
            return nativeTheme.themeSource;
        });
        console.log(`Session 2: nativeTheme.themeSource: ${nativeThemeSource}`);
        expect(nativeThemeSource).toBe('system');

        await app2.close();
    });
});
