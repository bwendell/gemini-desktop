/**
 * Integration Test: Individual Hotkey Settings Persistence
 * 
 * Validates that individual hotkey enable/disable settings persist across
 * application restarts and that the HotkeyManager respects these settings.
 * 
 * @module hotkey-settings-persistence.test
 */

import { _electron as electron, test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mainScript = path.join(__dirname, '../../dist-electron/main.cjs');

test.describe('Hotkey Settings Persistence', () => {
    let userDataDir: string;

    test.beforeAll(async () => {
        userDataDir = await fs.promises.mkdtemp(
            path.join(os.tmpdir(), 'gemini-hotkey-integration-')
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

    test('should persist disabled hotkey settings across app restart', async () => {
        // =========================================================================
        // SESSION 1: Disable the Quick Chat hotkey
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

        // Open Options
        await app1.evaluate(({ Menu }) => {
            const menu = Menu.getApplicationMenu();
            menu?.getMenuItemById('menu-file-options')?.click();
        });

        const optionsWindow1 = await app1.waitForEvent('window', {
            predicate: (page) => page.url().includes('options')
        });
        await optionsWindow1.waitForLoadState('domcontentloaded');

        // Find the Quick Chat hotkey toggle
        const quickChatToggle = optionsWindow1.locator('[data-testid="hotkey-toggle-quickChat-switch"]');
        await expect(quickChatToggle).toBeVisible({ timeout: 10000 });

        // Wait for hydration
        await expect(quickChatToggle).toHaveAttribute('aria-checked', /true|false/, { timeout: 10000 });

        // Get initial state
        const initialState = await quickChatToggle.getAttribute('aria-checked');
        console.log(`Session 1: Quick Chat hotkey initial state: ${initialState}`);

        // If enabled, disable it
        if (initialState === 'true') {
            await quickChatToggle.click();
            await expect(quickChatToggle).toHaveAttribute('aria-checked', 'false');
        }

        // Verify the setting was applied
        const stateAfterClick = await quickChatToggle.getAttribute('aria-checked');
        console.log(`Session 1: Quick Chat hotkey after toggle: ${stateAfterClick}`);
        expect(stateAfterClick).toBe('false');

        // Verify the hotkey is actually unregistered in HotkeyManager
        const isRegistered = await app1.evaluate(() => {
            const hotkeyManager = (global as any).hotkeyManager;
            if (!hotkeyManager) return null;
            return hotkeyManager.isIndividualEnabled('quickChat');
        });
        console.log(`Session 1: HotkeyManager quickChat enabled: ${isRegistered}`);
        expect(isRegistered).toBe(false);

        await app1.close();
        console.log('Session 1: Closed');

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

        // Verify HotkeyManager has correct state on startup
        const isEnabledOnStartup = await app2.evaluate(() => {
            const hotkeyManager = (global as any).hotkeyManager;
            if (!hotkeyManager) return null;
            return hotkeyManager.isIndividualEnabled('quickChat');
        });
        console.log(`Session 2: HotkeyManager quickChat enabled on startup: ${isEnabledOnStartup}`);
        expect(isEnabledOnStartup).toBe(false);

        // Open Options and verify UI state
        await app2.evaluate(({ Menu }) => {
            const menu = Menu.getApplicationMenu();
            menu?.getMenuItemById('menu-file-options')?.click();
        });

        const optionsWindow2 = await app2.waitForEvent('window', {
            predicate: (page) => page.url().includes('options')
        });
        await optionsWindow2.waitForLoadState('domcontentloaded');

        const quickChatToggle2 = optionsWindow2.locator('[data-testid="hotkey-toggle-quickChat-switch"]');
        await expect(quickChatToggle2).toBeVisible({ timeout: 10000 });
        await expect(quickChatToggle2).toHaveAttribute('aria-checked', 'false');

        console.log('Session 2: Hotkey settings persistence verified');
        await app2.close();
    });

    test('should persist enabled hotkey settings after being re-enabled', async () => {
        // =========================================================================
        // SESSION 1: Re-enable the Quick Chat hotkey
        // =========================================================================
        console.log('Starting Session 1 (re-enable)...');
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

        // Re-enable Quick Chat hotkey
        const quickChatToggle = optionsWindow1.locator('[data-testid="hotkey-toggle-quickChat-switch"]');
        await expect(quickChatToggle).toBeVisible({ timeout: 10000 });
        await expect(quickChatToggle).toHaveAttribute('aria-checked', 'false');

        await quickChatToggle.click();
        await expect(quickChatToggle).toHaveAttribute('aria-checked', 'true');

        await app1.close();

        // =========================================================================
        // SESSION 2: Verify it's still enabled
        // =========================================================================
        console.log('Starting Session 2 (verify re-enabled)...');
        const app2 = await electron.launch({
            args: [mainScript],
            env: {
                ...process.env,
                ELECTRON_USER_DATA_DIR: userDataDir
            }
        });

        const window2 = await app2.firstWindow();
        await window2.waitForLoadState('domcontentloaded');

        const isEnabledOnStartup = await app2.evaluate(() => {
            const hotkeyManager = (global as any).hotkeyManager;
            if (!hotkeyManager) return null;
            return hotkeyManager.isIndividualEnabled('quickChat');
        });
        console.log(`Session 2: HotkeyManager quickChat enabled: ${isEnabledOnStartup}`);
        expect(isEnabledOnStartup).toBe(true);

        await app2.close();
    });
});
