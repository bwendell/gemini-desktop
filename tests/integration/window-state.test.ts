
import { test, expect, _electron as electron } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Path to the main entry point
const mainScript = path.join(fileURLToPath(new URL('../../dist-electron/main.cjs', import.meta.url)));

test.describe('Window State Persistence', () => {
    let userDataDir: string;

    test.beforeAll(async () => {
        // Create a unique temp dir for user data to ensure clean state
        userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gemini-e2e-window-'));
        console.log(`Using user data dir: ${userDataDir}`);
    });

    test.afterAll(async () => {
        // Cleanup temp dir
        if (userDataDir && fs.existsSync(userDataDir)) {
            try {
                fs.rmSync(userDataDir, { recursive: true, force: true });
            } catch (e) {
                console.warn('Failed to cleanup temp dir:', e);
            }
        }
    });

    test('should persist window bounds across app restart', async () => {
        // --- Session 1: Set Custom Bounds ---
        console.log('Starting Session 1...');
        const app1 = await electron.launch({
            args: [
                mainScript,
                `--user-data-dir=${userDataDir}`
            ],
            env: process.env as { [key: string]: string },
        });

        // Wait for app to load
        const matchWin1 = await app1.firstWindow();
        await matchWin1.waitForLoadState('domcontentloaded');

        // Define distinctive bounds (different from default)
        const targetBounds = { x: 150, y: 150, width: 900, height: 600 };

        console.log(`Setting bounds to: ${JSON.stringify(targetBounds)}`);

        // Apply bounds via Electron API
        await app1.evaluate(async ({ BrowserWindow }, bounds) => {
            const win = BrowserWindow.getAllWindows()[0];
            win.setBounds(bounds);
        }, targetBounds);

        // Wait for debounce/save (allow time for file write)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify bounds were applied
        const actualBounds1 = await app1.evaluate(async ({ BrowserWindow }) => {
            const win = BrowserWindow.getAllWindows()[0];
            return win.getBounds();
        });
        console.log('Session 1 actual bounds:', actualBounds1);

        // Wait for debounce to save state
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Use explicit app.quit() to trigger before-quit event for persistence
        await app1.evaluate(async ({ app }) => {
            app.quit();
        });
        // await app1.close(); // Implicitly handled by app.quit() but we need to wait for process exit?
        // Playwright might throw if app quits from under it.
        // But app.evaluate waits for promise. app.quit() is sync (returns void).
        // It triggers shutdown. Playwright should handle process exit.

        // Actually, verify execution context destroys.
        // Keep it simple: evaluate app.quit() and then wait for close?
        // app1.close() waits for process exit.
        // So:
        // await app1.evaluate(({ app }) => app.quit());
        // await app1.close(); 

        console.log('Session 1 closed.');

        // --- Session 2: Verify Restoration ---
        console.log('Starting Session 2...');
        const app2 = await electron.launch({
            args: [
                mainScript,
                `--user-data-dir=${userDataDir}`
            ],
            env: process.env as { [key: string]: string },
        });

        // Wait for app to load
        const matchWin2 = await app2.firstWindow();
        await matchWin2.waitForLoadState('domcontentloaded');

        // Get restored bounds
        const restoredBounds = await app2.evaluate(async ({ BrowserWindow }) => {
            const win = BrowserWindow.getAllWindows()[0];
            return win.getBounds();
        });
        console.log('Session 2 restored bounds:', restoredBounds);

        // Assert bounds are approximately equal
        // Allow variance for OS window decorations and safe area snapping
        const tolerance = 10;
        expect(Math.abs(restoredBounds.x - targetBounds.x)).toBeLessThan(tolerance);
        expect(Math.abs(restoredBounds.y - targetBounds.y)).toBeLessThan(tolerance);
        expect(Math.abs(restoredBounds.width - targetBounds.width)).toBeLessThan(tolerance);
        expect(Math.abs(restoredBounds.height - targetBounds.height)).toBeLessThan(tolerance);

        await app2.close();
    });
});
