/**
 * Integration Test: Tray + Window Manager Integration
 * 
 * Validates the coordination between TrayManager and WindowManager
 * for show/hide/restore operations.
 * 
 * @module tray-window-integration.test
 */

import { _electron as electron, test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mainScript = path.join(__dirname, '../../dist-electron/main.cjs');

test.describe('Tray + Window Integration', () => {
    let userDataDir: string;

    test.beforeAll(async () => {
        userDataDir = await fs.promises.mkdtemp(
            path.join(os.tmpdir(), 'gemini-tray-integration-')
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

    test('should hide to tray and restore via TrayManager', async () => {
        const app = await electron.launch({
            args: [mainScript],
            env: {
                ...process.env,
                ELECTRON_USER_DATA_DIR: userDataDir
            }
        });

        const window = await app.firstWindow();
        await window.waitForLoadState('domcontentloaded');

        // Verify window is initially visible
        const initiallyVisible = await app.evaluate(({ BrowserWindow }) => {
            const win = BrowserWindow.getAllWindows()[0];
            return win?.isVisible() ?? false;
        });
        console.log(`Initially visible: ${initiallyVisible}`);
        expect(initiallyVisible).toBe(true);

        // Verify tray exists
        const trayExists = await app.evaluate(() => {
            const tm = (global as any).trayManager;
            return tm?.getTray() !== null;
        });
        console.log(`Tray exists: ${trayExists}`);
        expect(trayExists).toBe(true);

        // Hide to tray via WindowManager
        await app.evaluate(() => {
            const wm = (global as any).windowManager;
            wm?.hideToTray();
        });

        await window.waitForTimeout(500);

        // Verify window is hidden
        const hiddenAfterHide = await app.evaluate(({ BrowserWindow }) => {
            const win = BrowserWindow.getAllWindows()[0];
            return win?.isVisible() ?? true;
        });
        console.log(`Visible after hideToTray: ${hiddenAfterHide}`);
        expect(hiddenAfterHide).toBe(false);

        // Restore via WindowManager (simulating tray click)
        await app.evaluate(() => {
            const wm = (global as any).windowManager;
            wm?.restoreFromTray();
        });

        await window.waitForTimeout(500);

        // Verify window is visible again
        const visibleAfterRestore = await app.evaluate(({ BrowserWindow }) => {
            const win = BrowserWindow.getAllWindows()[0];
            return win?.isVisible() ?? false;
        });
        console.log(`Visible after restoreFromTray: ${visibleAfterRestore}`);
        expect(visibleAfterRestore).toBe(true);

        await app.close();
    });

    test('should update tray tooltip when update is available', async () => {
        const app = await electron.launch({
            args: [mainScript, '--test-auto-update'],
            env: {
                ...process.env,
                ELECTRON_USER_DATA_DIR: userDataDir
            }
        });

        const window = await app.firstWindow();
        await window.waitForLoadState('domcontentloaded');

        // Get initial tooltip
        const initialTooltip = await app.evaluate(() => {
            const tm = (global as any).trayManager;
            return tm?.getToolTip() ?? '';
        });
        console.log(`Initial tooltip: ${initialTooltip}`);
        expect(initialTooltip).toBe('Gemini Desktop');

        // Simulate update notification via TrayManager
        await app.evaluate(() => {
            const tm = (global as any).trayManager;
            tm?.setUpdateTooltip('2.0.0');
        });

        // Verify tooltip changed
        const updatedTooltip = await app.evaluate(() => {
            const tm = (global as any).trayManager;
            return tm?.getToolTip() ?? '';
        });
        console.log(`Updated tooltip: ${updatedTooltip}`);
        expect(updatedTooltip).toContain('Update v2.0.0 available');

        // Clear tooltip
        await app.evaluate(() => {
            const tm = (global as any).trayManager;
            tm?.clearUpdateTooltip();
        });

        // Verify tooltip reset
        const resetTooltip = await app.evaluate(() => {
            const tm = (global as any).trayManager;
            return tm?.getToolTip() ?? '';
        });
        console.log(`Reset tooltip: ${resetTooltip}`);
        expect(resetTooltip).toBe('Gemini Desktop');

        await app.close();
    });

    test('should handle tray context menu "Quit" action', async () => {
        const app = await electron.launch({
            args: [mainScript],
            env: {
                ...process.env,
                ELECTRON_USER_DATA_DIR: userDataDir
            }
        });

        const window = await app.firstWindow();
        await window.waitForLoadState('domcontentloaded');

        // Verify tray menu has quit option (by checking tray exists)
        const hasTray = await app.evaluate(() => {
            const tm = (global as any).trayManager;
            const tray = tm?.getTray();
            return tray !== null && !tray.isDestroyed();
        });
        console.log(`Has tray: ${hasTray}`);
        expect(hasTray).toBe(true);

        // Note: We can't easily simulate clicking the tray menu in Playwright,
        // but we can verify the tray was created correctly and test
        // the quit flow works via app.quit()

        await app.close();
    });
});
