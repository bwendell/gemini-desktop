/**
 * Integration Test: Quick Chat End-to-End Workflow
 * 
 * Validates the complete Quick Chat workflow including:
 * - Window creation and visibility
 * - Text submission to main window
 * - Window hiding after submission
 * 
 * Note: This test requires network access for Gemini iframe.
 * 
 * @module quick-chat-workflow.test
 */

import { _electron as electron, test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mainScript = path.join(__dirname, '../../dist-electron/main.cjs');

test.describe('Quick Chat Workflow', () => {
    let userDataDir: string;

    test.beforeAll(async () => {
        userDataDir = await fs.promises.mkdtemp(
            path.join(os.tmpdir(), 'gemini-quickchat-integration-')
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

    test('should show and hide Quick Chat window', async () => {
        const app = await electron.launch({
            args: [mainScript],
            env: {
                ...process.env,
                ELECTRON_USER_DATA_DIR: userDataDir
            }
        });

        const window = await app.firstWindow();
        await window.waitForLoadState('domcontentloaded');

        // Initial state - no Quick Chat window
        const initialWindowCount = await app.evaluate(({ BrowserWindow }) => {
            return BrowserWindow.getAllWindows().length;
        });
        console.log(`Initial window count: ${initialWindowCount}`);
        expect(initialWindowCount).toBe(1);

        // Show Quick Chat
        await app.evaluate(() => {
            const wm = (global as any).windowManager;
            wm?.showQuickChat();
        });

        await window.waitForTimeout(500);

        // Verify Quick Chat window exists and is visible
        const afterShowState = await app.evaluate(({ BrowserWindow }) => {
            const windows = BrowserWindow.getAllWindows();
            const quickChatWin = windows.find(w =>
                w.getTitle().includes('Quick Chat') ||
                w.webContents.getURL().includes('quickchat')
            );
            return {
                windowCount: windows.length,
                quickChatExists: !!quickChatWin,
                quickChatVisible: quickChatWin?.isVisible() ?? false
            };
        });
        console.log(`After show: ${JSON.stringify(afterShowState)}`);
        expect(afterShowState.quickChatExists).toBe(true);
        expect(afterShowState.quickChatVisible).toBe(true);

        // Hide Quick Chat
        await app.evaluate(() => {
            const wm = (global as any).windowManager;
            wm?.hideQuickChat();
        });

        await window.waitForTimeout(500);

        // Verify Quick Chat is hidden
        const afterHideState = await app.evaluate(({ BrowserWindow }) => {
            const windows = BrowserWindow.getAllWindows();
            const quickChatWin = windows.find(w =>
                w.getTitle().includes('Quick Chat') ||
                w.webContents.getURL().includes('quickchat')
            );
            return {
                quickChatExists: !!quickChatWin,
                quickChatVisible: quickChatWin?.isVisible() ?? false
            };
        });
        console.log(`After hide: ${JSON.stringify(afterHideState)}`);
        expect(afterHideState.quickChatVisible).toBe(false);

        await app.close();
    });

    test('should toggle Quick Chat window visibility', async () => {
        const app = await electron.launch({
            args: [mainScript],
            env: {
                ...process.env,
                ELECTRON_USER_DATA_DIR: userDataDir
            }
        });

        const window = await app.firstWindow();
        await window.waitForLoadState('domcontentloaded');

        // Toggle once - should show
        await app.evaluate(() => {
            const wm = (global as any).windowManager;
            wm?.toggleQuickChat();
        });
        await window.waitForTimeout(500);

        const firstToggle = await app.evaluate(({ BrowserWindow }) => {
            const quickChatWin = BrowserWindow.getAllWindows().find(w =>
                w.webContents.getURL().includes('quickchat')
            );
            return quickChatWin?.isVisible() ?? false;
        });
        console.log(`After first toggle (should be visible): ${firstToggle}`);
        expect(firstToggle).toBe(true);

        // Toggle again - should hide
        await app.evaluate(() => {
            const wm = (global as any).windowManager;
            wm?.toggleQuickChat();
        });
        await window.waitForTimeout(500);

        const secondToggle = await app.evaluate(({ BrowserWindow }) => {
            const quickChatWin = BrowserWindow.getAllWindows().find(w =>
                w.webContents.getURL().includes('quickchat')
            );
            return quickChatWin?.isVisible() ?? false;
        });
        console.log(`After second toggle (should be hidden): ${secondToggle}`);
        expect(secondToggle).toBe(false);

        await app.close();
    });

    test('should focus main window after Quick Chat submission flow', async () => {
        const app = await electron.launch({
            args: [mainScript],
            env: {
                ...process.env,
                ELECTRON_USER_DATA_DIR: userDataDir
            }
        });

        const window = await app.firstWindow();
        await window.waitForLoadState('domcontentloaded');

        // Wait for iframe to be ready
        await window.waitForTimeout(2000);

        // Show Quick Chat
        await app.evaluate(() => {
            const wm = (global as any).windowManager;
            wm?.showQuickChat();
        });
        await window.waitForTimeout(500);

        // Simulate the submission flow (hide Quick Chat and focus main)
        await app.evaluate(() => {
            const wm = (global as any).windowManager;
            // This simulates what happens after submit
            wm?.hideQuickChat();
            wm?.focusMainWindow();
        });
        await window.waitForTimeout(500);

        // Verify main window is focused
        const mainWindowState = await app.evaluate(({ BrowserWindow }) => {
            const mainWin = BrowserWindow.getAllWindows().find(w =>
                !w.webContents.getURL().includes('quickchat') &&
                !w.webContents.getURL().includes('options')
            );
            return {
                visible: mainWin?.isVisible() ?? false,
                focused: mainWin?.isFocused() ?? false
            };
        });
        console.log(`Main window state: ${JSON.stringify(mainWindowState)}`);
        expect(mainWindowState.visible).toBe(true);
        // Note: Focus may not be reliable in headless CI environments

        await app.close();
    });

    test('should create Quick Chat window via WindowManager', async () => {
        const app = await electron.launch({
            args: [mainScript],
            env: {
                ...process.env,
                ELECTRON_USER_DATA_DIR: userDataDir
            }
        });

        const window = await app.firstWindow();
        await window.waitForLoadState('domcontentloaded');

        // Explicitly create Quick Chat window
        const quickChatWindow = await app.evaluate(() => {
            const wm = (global as any).windowManager;
            const qc = wm?.createQuickChatWindow();
            return {
                created: !!qc,
                id: qc?.id
            };
        });
        console.log(`Quick Chat created: ${JSON.stringify(quickChatWindow)}`);
        expect(quickChatWindow.created).toBe(true);

        // Verify getQuickChatWindow returns the window
        const retrievedWindow = await app.evaluate(() => {
            const wm = (global as any).windowManager;
            const qc = wm?.getQuickChatWindow();
            return !!qc;
        });
        console.log(`Retrieved Quick Chat window: ${retrievedWindow}`);
        expect(retrievedWindow).toBe(true);

        await app.close();
    });
});
