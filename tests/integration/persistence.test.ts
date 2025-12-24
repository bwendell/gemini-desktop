import { _electron as electron, test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the compiled main entry point
const mainScript = path.join(__dirname, '../../dist-electron/main.cjs');

// Settings file path within user data
const SETTINGS_FILE = 'user-preferences.json';

test.describe('Cross-Session Persistence', () => {
    let userDataDir: string;

    test.beforeAll(async () => {
        // Create a temporary user data directory for isolation
        userDataDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'gemini-e2e-'));
        console.log(`Using user data dir: ${userDataDir}`);
    });

    test.afterAll(async () => {
        // Cleanup
        try {
            await fs.promises.rm(userDataDir, { recursive: true, force: true });
        } catch (e) {
            console.warn('Failed to cleanup temp dir:', e);
        }
    });

    test('should persist auto-update setting across app restart', async () => {
        // =========================================================================
        // SESSION 1: Disable Auto-Updates
        // =========================================================================
        console.log('Starting Session 1...');
        const app1 = await electron.launch({
            args: [mainScript, '--test-auto-update'], // Enable test mode if needed for certain flags
            env: {
                ...process.env,
                // Ensure we force the user data dir
                ELECTRON_USER_DATA_DIR: userDataDir
            }
        });

        // Note: _electron.launch() connects to the first window automatically if you wait for it
        const window1 = await app1.firstWindow();
        await window1.waitForLoadState('domcontentloaded');

        // Open Options Menu
        // We assume the menu implementation works (covered by other E2E tests)
        // Here we can use IPC directly or UI interactions. 
        // UI is better for "Integration" testing but IPC is faster for setup.
        // Let's stick to UI to be "Integration" level.

        // Simulate menu click via IPC if menu not accessible via DOM? 
        // Electron's application menu is native, hard to click with Playwright DOM selectors.
        // Playwright has app.evaluate() to run code in main process!
        await app1.evaluate(({ Menu }) => {
            const menu = Menu.getApplicationMenu();
            const optionsItem = menu?.getMenuItemById('menu-file-options');
            optionsItem?.click();
        });

        // Wait for options window
        const optionsWindow = await app1.waitForEvent('window', {
            predicate: (page) => page.url().includes('options')
        });
        await optionsWindow.waitForLoadState('domcontentloaded');

        // Toggle Auto-Update to OFF
        // Note: The toggle button itself has the role 'switch' and 'aria-checked' attribute
        const toggle = optionsWindow.locator('[data-testid="auto-update-toggle-switch-switch"]');
        await expect(toggle).toBeVisible();

        // Wait for the toggle to have a valid state (hydration check)
        await expect(toggle).toHaveAttribute('aria-checked', /true|false/, { timeout: 10000 });

        // Check initial state
        const initialState = await toggle.getAttribute('aria-checked');
        console.log(`Session 1 Initial State: ${initialState}`);

        if (initialState === 'true') {
            await toggle.click();
            // Wait for state to actually change
            await expect(toggle).toHaveAttribute('aria-checked', 'false');
        }

        await expect(toggle).toHaveAttribute('aria-checked', 'false');
        console.log('Session 1: Auto-update disabled');

        // Close App 1
        await app1.close();
        console.log('Session 1: Closed');

        // =========================================================================
        // SESSION 2: Verify Persistence
        // =========================================================================
        console.log('Starting Session 2...');
        const app2 = await electron.launch({
            args: [mainScript, '--test-auto-update'],
            env: {
                ...process.env,
                ELECTRON_USER_DATA_DIR: userDataDir
            }
        });

        const window2 = await app2.firstWindow();
        await window2.waitForLoadState('domcontentloaded');

        // Open Options again
        await app2.evaluate(({ Menu }) => {
            const menu = Menu.getApplicationMenu();
            const optionsItem = menu?.getMenuItemById('menu-file-options');
            optionsItem?.click();
        });

        const optionsWindow2 = await app2.waitForEvent('window', {
            predicate: (page) => page.url().includes('options')
        });
        await optionsWindow2.waitForLoadState('domcontentloaded');

        // Verify Toggle is still OFF
        const toggle2 = optionsWindow2.locator('[data-testid="auto-update-toggle-switch-switch"]');
        await expect(toggle2).toBeVisible();
        await expect(toggle2).toHaveAttribute('aria-checked', 'false');

        console.log('Session 2: Verified persistence');

        await app2.close();
    });
});
