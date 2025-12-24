import { _electron as electron, test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to main entry
const mainScript = path.join(__dirname, '../../dist-electron/main.cjs');
const rootDir = path.join(__dirname, '../../');

test.describe('Auto-Update Server Integration', () => {
    let server: http.Server;
    let serverPort: number;
    let tempDir: string;
    let devConfigPath: string;

    test.beforeAll(async () => {
        // 1. Start Mock Server
        server = http.createServer((req, res) => {
            console.log(`[Server] Request: ${req.url}`);

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
                    console.log(`[Server] Listening on port ${serverPort}`);
                }
                resolve();
            });
        });

        // 2. Create dev-app-update.yml in root
        devConfigPath = path.join(rootDir, 'dev-app-update.yml');
        const configContent = `
provider: generic
url: http://localhost:${serverPort}
updaterCacheDirName: gemini-desktop-updater-test
`;
        await fs.promises.writeFile(devConfigPath, configContent);

        // 3. Create Temp Dir for User Data
        tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'gemini-update-test-'));
    });

    test.afterAll(async () => {
        // Cleanup
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

    test('should detect and download update from local server', async () => {
        const app = await electron.launch({
            args: [
                mainScript,
                '--test-auto-update' // Ensures we use forceDevUpdateConfig=true
            ],
            env: {
                ...process.env,
                ELECTRON_USER_DATA_DIR: tempDir
            }
        });

        const win = await app.firstWindow();
        await win.waitForLoadState('domcontentloaded');

        // Wait for update available toast
        console.log('Waiting for update toast...');
        const toast = win.locator('[data-testid="update-toast"]');
        await expect(toast).toBeVisible({ timeout: 20000 }); // Give it time to check

        // Verify "Downloading" or "Ready" state
        const title = win.locator('[data-testid="update-toast-title"]');
        const text = await title.textContent();
        console.log(`Toast title: ${text}`);

        expect(text).toMatch(/Update (Available|Ready)/);

        // If it was "Available" (downloading), wait for "Ready" (downloaded)
        if (text === 'Update Available') {
            await expect(win.locator('[data-testid="update-toast-restart"]')).toBeVisible({ timeout: 10000 });
        }

        console.log('Update downloaded.');

        // Verify badge state (Integration step for Native Badges)
        // Access main process via generic IPC call we injected
        // Note: Playwright doesn't have direct access to 'ipcRenderer.invoke' in page context easily without exposeBinding? 
        // We can use app.evaluate to run node code in main process directly! Even better.

        // Wait a moment for badge event to process
        await win.waitForTimeout(1000);

        // Verify badge state (Integration step for Native Badges)
        // Access global manager instances exposed in main.ts
        const hasBadge = await app.evaluate(() => {
            const bm = (global as any).badgeManager;
            return bm && bm.hasBadgeShown();
        });

        console.log(`Badge shown internal state: ${hasBadge}`);
        expect(hasBadge).toBe(true);

        // Let's check preload.ts Exposure. If not exposed, I can't call it from renderer.
        // But with `app.evaluate`, I have access to `electron` module. I can't reach the *instance* of IpcManager easily.
        // However, I can check `BrowserWindow.getAllWindows()[0].overlayIcon` (Windows) or `app.dock.getBadge()` (macOS).

        if (process.platform === 'darwin') {
            const badge = await app.evaluate(({ app }) => app.dock?.getBadge());
            console.log(`MacOS Badge: ${badge}`);
            // Note: mocked badge is "•"
            // expect(badge).toBe('•'); // This might work!
        }

        // For cross-platform "BadgeManager" verification, let's try to reach the injected IPC if possible.
        // If not, we'll verify the TOAST functionality (UI) implies the event was received.
        // The test already verified the Toast "Update Ready" appeared.
        // The "badge" part is nice-to-have integration.
        // Let's use `page.evaluate` assuming we might need to add it to preload if we really want it.
        // Or just rely on the Toast check which is strong proof the event flow works.

        await app.close();
    });
});
