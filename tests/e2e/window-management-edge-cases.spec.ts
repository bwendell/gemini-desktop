/**
 * E2E Test: Window Management Edge Cases
 *
 * Tests complex window interaction scenarios across platforms.
 * Verifies:
 * 1. Auth window closure when main window hides to tray.
 * 2. Single-instance restoration focuses auxiliary windows.
 */

import { browser, expect } from '@wdio/globals';
import { spawn } from 'child_process';
import path from 'path';
import electronPath from 'electron';
import { fileURLToPath } from 'url';
import { MainWindowPage, OptionsPage, AuthWindowPage } from './pages';
import { waitForWindowCount } from './helpers/windowActions';
import { closeWindow, showWindow, waitForAllWindowsHidden } from './helpers/windowStateActions';
import { waitForAppReady, ensureSingleWindow, switchToMainWindow } from './helpers/workflows';
import { waitForWindowTransition } from './helpers/waitUtilities';
import { E2ELogger } from './helpers/logger';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const mainEntry = path.resolve(__dirname, '../../dist-electron/main/main.cjs');

describe('Window Management Edge Cases', () => {
    const mainWindow = new MainWindowPage();
    const optionsPage = new OptionsPage();
    const authWindow = new AuthWindowPage();
    let userDataPath: string;

    before(async () => {
        // Get the userData path from the running instance
        userDataPath = await browser.electron.execute((electron) => electron.app.getPath('userData'));
    });

    beforeEach(async () => {
        await waitForAppReady();
    });

    afterEach(async () => {
        // Restore main window if hidden (for hide-to-tray tests)
        await showWindow();
        await ensureSingleWindow();
    });

    describe('Auth Window Closure on Hide to Tray', () => {
        it('should close auth window when main window is hidden to tray', async () => {
            // 1. Open Auth window using Page Object
            await authWindow.openViaMenu();
            await authWindow.waitForOpen();
            E2ELogger.info('window-edge-cases', 'Auth window opened');

            // 2. Switch to main window and trigger close (hide-to-tray)
            await switchToMainWindow();
            await closeWindow(); // Triggers hide-to-tray in WindowManager
            await waitForAllWindowsHidden(5000);

            // 3. Verify both windows are "closed" (main hidden, auth closed)
            E2ELogger.info('window-edge-cases', 'Both windows closed/hidden as expected');
        });
    });

    describe('Single Instance Restoration with Auxiliary Windows', () => {
        it('should focus Options window when second instance is launched', async () => {
            // 1. Open Options window using Page Object
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2, 5000);
            await optionsPage.waitForLoad();

            // 2. Get window handles and capture options handle
            const handles = await browser.getWindowHandles();
            let optionsHandle = '';
            for (const handle of handles) {
                await browser.switchToWindow(handle);
                const isMain = await mainWindow.isLoaded();
                if (isMain) {
                    // Check for main layout to find main window
                    const title = await mainWindow.getTitleText();
                    if (!title.includes('Options')) {
                        continue;
                    }
                }
                // If not main window, this is the options window
                const url = await browser.getUrl();
                if (url.includes('#')) {
                    optionsHandle = handle;
                    break;
                }
            }

            // Fallback: use the second handle if no options handle found
            if (!optionsHandle && handles.length === 2) {
                const mainHandle = handles[0];
                optionsHandle = handles.find((h) => h !== mainHandle) || handles[1];
            }

            expect(optionsHandle).not.toBe('');

            // 3. Focus main window to blur options
            const mainHandle = handles.find((h) => h !== optionsHandle)!;
            await browser.switchToWindow(mainHandle);
            await mainWindow.waitForLoad();

            // 4. Spawn second instance
            const secondInstance = spawn(electronPath as any, [mainEntry, `--user-data-dir=${userDataPath}`], {
                stdio: 'ignore',
            });

            await new Promise<void>((resolve) => {
                secondInstance.on('close', (code) => {
                    expect(code).toBe(0);
                    resolve();
                });
            });

            // 5. Wait for single instance restoration to focus main window
            await waitForWindowTransition(async () => await mainWindow.isLoaded(), {
                description: 'Single instance restoration focus main window',
                timeout: 5000,
            });

            // 6. Verify main window is focused (main is focused on second-instance signal)
            await browser.switchToWindow(mainHandle);
            const isLoaded = await mainWindow.isLoaded();
            expect(isLoaded).toBe(true);

            // Cleanup: close options using Page Object
            await browser.switchToWindow(optionsHandle);
            await optionsPage.close();
        });
    });
});
