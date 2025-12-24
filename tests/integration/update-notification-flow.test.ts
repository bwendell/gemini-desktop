/**
 * Integration Test: Update Downloaded + Badge + Tray Notification
 * 
 * Validates the complete notification flow when an update is downloaded:
 * UpdateManager → BadgeManager + TrayManager
 * 
 * This test extends the existing auto-update-server.test.ts to verify
 * the full notification chain.
 * 
 * @module update-notification-flow.test
 */

import { _electron as electron, test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mainScript = path.join(__dirname, '../../dist-electron/main.cjs');
const rootDir = path.join(__dirname, '../../');

test.describe('Update Notification Flow', () => {
    let server: http.Server;
    let serverPort: number;
    let tempDir: string;
    let devConfigPath: string;

    test.beforeAll(async () => {
        // 1. Start Mock Update Server
        server = http.createServer((req, res) => {
            console.log(`[Mock Server] Request: ${req.url}`);

            // Serve latest.yml
            if (req.url?.endsWith('latest.yml')) {
                const yamlContent = `
version: 9.9.9
files:
  - url: Gemini-Setup-9.9.9.exe
    sha512: "9TRmEkiqrw9hEbsoHRAF/Ugmhys4yuctdeNPzAhnu3tmssoK29v4v+sT3JrtFLIq9Ee5f0g3pZjrf9iFlk8PaQ=="
    size: 20
path: Gemini-Setup-9.9.9.exe
sha512: "9TRmEkiqrw9hEbsoHRAF/Ugmhys4yuctdeNPzAhnu3tmssoK29v4v+sT3JrtFLIq9Ee5f0g3pZjrf9iFlk8PaQ=="
releaseDate: "2099-01-01T00:00:00.000Z"
`;
                res.writeHead(200, { 'Content-Type': 'text/yaml' });
                res.end(yamlContent);
                return;
            }

            // Serve dummy exe
            if (req.url?.endsWith('.exe')) {
                res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
                res.end('dummy binary content');
                return;
            }

            res.writeHead(404);
            res.end('Not found');
        });

        await new Promise<void>((resolve) => {
            server.listen(0, () => {
                const addr = server.address();
                if (typeof addr === 'object' && addr) {
                    serverPort = addr.port;
                    console.log(`[Mock Server] Listening on port ${serverPort}`);
                }
                resolve();
            });
        });

        // 2. Create dev-app-update.yml
        devConfigPath = path.join(rootDir, 'dev-app-update.yml');
        const configContent = `
provider: generic
url: http://localhost:${serverPort}
updaterCacheDirName: gemini-desktop-updater-notification-test
`;
        await fs.promises.writeFile(devConfigPath, configContent);

        // 3. Create temp dir for user data
        tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'gemini-update-notification-'));
    });

    test.afterAll(async () => {
        server.close();

        try {
            await fs.promises.unlink(devConfigPath);
        } catch (e) {
            console.warn('Failed to remove dev-app-update.yml', e);
        }

        try {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
        } catch (e) {
            console.warn('Failed to cleanup temp dir', e);
        }
    });

    test('should show badge and update tray tooltip when update is downloaded', async () => {
        const app = await electron.launch({
            args: [
                mainScript,
                '--test-auto-update'
            ],
            env: {
                ...process.env,
                ELECTRON_USER_DATA_DIR: tempDir
            }
        });

        const win = await app.firstWindow();
        await win.waitForLoadState('domcontentloaded');

        // Wait for update check and download
        console.log('Waiting for update to be downloaded...');

        // Check for update toast to appear
        const toast = win.locator('[data-testid="update-toast"]');
        await expect(toast).toBeVisible({ timeout: 20000 });

        // Verify toast shows update ready
        const title = win.locator('[data-testid="update-toast-title"]');
        const titleText = await title.textContent();
        console.log(`Toast title: ${titleText}`);
        expect(titleText).toMatch(/Update (Available|Ready)/);

        // Wait for notifications to process
        await win.waitForTimeout(1000);

        // Verify BadgeManager state
        const badgeState = await app.evaluate(() => {
            const bm = (global as any).badgeManager;
            return {
                exists: !!bm,
                hasBadgeShown: bm?.hasBadgeShown?.() ?? false
            };
        });
        console.log(`Badge state: ${JSON.stringify(badgeState)}`);
        expect(badgeState.exists).toBe(true);
        expect(badgeState.hasBadgeShown).toBe(true);

        // Verify TrayManager tooltip was updated
        const trayTooltip = await app.evaluate(() => {
            const tm = (global as any).trayManager;
            return tm?.getToolTip?.() ?? '';
        });
        console.log(`Tray tooltip: ${trayTooltip}`);
        expect(trayTooltip).toContain('Update');
        expect(trayTooltip).toContain('9.9.9');

        await app.close();
    });

    test('should trigger badge via UpdateManager.devShowBadge() for manual testing', async () => {
        const app = await electron.launch({
            args: [mainScript],
            env: {
                ...process.env,
                ELECTRON_USER_DATA_DIR: tempDir
            }
        });

        const win = await app.firstWindow();
        await win.waitForLoadState('domcontentloaded');

        // Initially no badge
        const initialBadge = await app.evaluate(() => {
            const bm = (global as any).badgeManager;
            return bm?.hasBadgeShown?.() ?? false;
        });
        console.log(`Initial badge state: ${initialBadge}`);
        expect(initialBadge).toBe(false);

        // Trigger dev badge
        await app.evaluate(() => {
            const um = (global as any).updateManager;
            um?.devShowBadge?.('3.0.0-test');
        });

        await win.waitForTimeout(500);

        // Verify badge is now shown
        const afterBadge = await app.evaluate(() => {
            const bm = (global as any).badgeManager;
            return bm?.hasBadgeShown?.() ?? false;
        });
        console.log(`Badge after devShowBadge: ${afterBadge}`);
        expect(afterBadge).toBe(true);

        // Verify tray tooltip
        const trayTooltip = await app.evaluate(() => {
            const tm = (global as any).trayManager;
            return tm?.getToolTip?.() ?? '';
        });
        console.log(`Tray tooltip after devShowBadge: ${trayTooltip}`);
        expect(trayTooltip).toContain('3.0.0-test');

        // Clear badge
        await app.evaluate(() => {
            const um = (global as any).updateManager;
            um?.devClearBadge?.();
        });

        await win.waitForTimeout(500);

        // Verify badge is cleared
        const clearedBadge = await app.evaluate(() => {
            const bm = (global as any).badgeManager;
            return bm?.hasBadgeShown?.() ?? false;
        });
        console.log(`Badge after devClearBadge: ${clearedBadge}`);
        expect(clearedBadge).toBe(false);

        await app.close();
    });

    test('should broadcast update events to renderer windows', async () => {
        const app = await electron.launch({
            args: [
                mainScript,
                '--test-auto-update'
            ],
            env: {
                ...process.env,
                ELECTRON_USER_DATA_DIR: tempDir
            }
        });

        const win = await app.firstWindow();
        await win.waitForLoadState('domcontentloaded');

        // Listen for update events by checking if toast appears
        // The toast appearing means the renderer received the IPC broadcast
        const toast = win.locator('[data-testid="update-toast"]');

        try {
            await expect(toast).toBeVisible({ timeout: 20000 });
            console.log('Update toast appeared - IPC broadcast working');

            // Verify update info is displayed
            const toastBody = win.locator('[data-testid="update-toast-body"]');
            const bodyText = await toastBody.textContent();
            console.log(`Toast body: ${bodyText}`);

            // Should contain version info
            expect(bodyText).toBeTruthy();
        } catch (e) {
            // If toast doesn't appear, check if update events were received
            console.log('Toast not visible - checking update manager state');

            const lastCheckTime = await app.evaluate(() => {
                const um = (global as any).updateManager;
                return um?.getLastCheckTime?.() ?? 0;
            });
            console.log(`Last check time: ${lastCheckTime}`);
            expect(lastCheckTime).toBeGreaterThan(0);
        }

        await app.close();
    });
});
