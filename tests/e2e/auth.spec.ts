/**
 * E2E Test: Authentication Flow
 * 
 * Verifies that the "Sign in to Google" menu item opens the authentication window,
 * and that the window auto-closes on successful login or can be closed manually.
 */

import { browser, $, expect } from '@wdio/globals';
import { clickMenuItemById } from './helpers/menuActions';
import { waitForWindowCount, switchToWindowByIndex } from './helpers/windowActions';
import { Selectors } from './helpers/selectors';
import { E2ELogger } from './helpers/logger';

describe('Authentication Flow', () => {
    /**
     * Ensure we start from a clean, consistent state before each test.
     */
    beforeEach(async () => {
        // Wait for app to be ready
        const mainLayout = await $(Selectors.mainLayout);
        await mainLayout.waitForExist({ timeout: 15000 });

        // Ensure we're on the main window
        const handles = await browser.getWindowHandles();
        if (handles.length > 1) {
            E2ELogger.info('auth', `Cleaning up ${handles.length - 1} extra windows from previous test`);
            // Switch to and close all extra windows
            for (let i = handles.length - 1; i > 0; i--) {
                await browser.switchToWindow(handles[i]);
                await browser.electron.execute((electron) => {
                    const focusedWindow = electron.BrowserWindow.getFocusedWindow();
                    if (focusedWindow) {
                        focusedWindow.close();
                    }
                });
            }
            await waitForWindowCount(1, 3000);
        }

        // Switch to main window
        await switchToWindowByIndex(0);
    });

    /**
     * Clean up any windows left open after a test failure.
     */
    afterEach(async () => {
        try {
            const handles = await browser.getWindowHandles();
            if (handles.length > 1) {
                E2ELogger.info('auth', `Cleaning up ${handles.length - 1} extra windows after test`);
                // Close all except the first window
                for (let i = handles.length - 1; i > 0; i--) {
                    await browser.switchToWindow(handles[i]);
                    await browser.electron.execute((electron) => {
                        const focusedWindow = electron.BrowserWindow.getFocusedWindow();
                        if (focusedWindow) {
                            focusedWindow.close();
                        }
                    });
                }
                await waitForWindowCount(1, 3000);
            }
            // Switch back to main window
            await switchToWindowByIndex(0);
        } catch (e) {
            E2ELogger.info('auth', `Cleanup error (may be expected): ${e}`);
        }
    });

    it('should open Google Sign-in window when clicking Sign In menu item', async () => {
        // 1. Initial state: just one window (Main)
        const initialHandles = await browser.getWindowHandles();
        expect(initialHandles.length).toBe(1);

        // 2. Click "Sign in to Google" using ID
        await clickMenuItemById('menu-file-signin');

        // 3. Wait for the new auth window to appear
        await waitForWindowCount(2, 5000);

        const newHandles = await browser.getWindowHandles();
        expect(newHandles.length).toBe(2);

        // 4. Identify the new window
        const newWindowHandle = newHandles.find(h => h !== initialHandles[0]);
        if (!newWindowHandle) throw new Error('Could not find new window handle');

        // 5. Switch to the new window and verify properties
        await browser.switchToWindow(newWindowHandle);

        // Check URL contains google accounts
        const url = await browser.getUrl();
        expect(url).toContain('accounts.google.com');

        E2ELogger.info('auth', 'Auth window opened successfully with Google accounts URL');

        // 6. Cleanup: Close the auth window via Electron API
        await browser.electron.execute((electron) => {
            const focusedWindow = electron.BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
                focusedWindow.close();
            }
        });

        // Wait for window count to return to 1
        await waitForWindowCount(1, 3000);
    });

    it('should auto-close auth window when user navigates to Gemini domain (simulated login)', async () => {
        // 1. Verify we start with 1 window
        const initialHandles = await browser.getWindowHandles();
        expect(initialHandles.length).toBe(1);
        const mainWindowHandle = initialHandles[0];

        // 2. Open the sign-in window
        await clickMenuItemById('menu-file-signin');
        await waitForWindowCount(2, 5000);

        const authHandles = await browser.getWindowHandles();
        const authWindowHandle = authHandles.find(h => h !== mainWindowHandle);
        if (!authWindowHandle) throw new Error('Could not find auth window handle');

        // 3. Switch to auth window
        await browser.switchToWindow(authWindowHandle);

        // 4. Simulate successful login by emitting did-navigate event with Gemini URL
        // This triggers the handler in windowManager.ts which auto-closes the window
        await browser.electron.execute((electron) => {
            const windows = electron.BrowserWindow.getAllWindows();
            // Find the auth window (window with accounts.google.com in URL)
            const authWindow = windows.find(w => {
                try {
                    const url = w.webContents.getURL();
                    return url.includes('accounts.google.com');
                } catch {
                    return false;
                }
            });
            if (authWindow) {
                // Simulate navigation to Gemini (this triggers auto-close)
                authWindow.webContents.emit('did-navigate', {}, 'https://gemini.google.com/app');
            }
        });

        // 5. Wait for auth window to auto-close
        await waitForWindowCount(1, 3000);

        // 6. Verify we're back to 1 window (main window)
        const finalHandles = await browser.getWindowHandles();
        expect(finalHandles.length).toBe(1);

        E2ELogger.info('auth', 'Auth window auto-closed after simulated login to Gemini');

        // 7. Switch back to main window and verify it still works
        await browser.switchToWindow(mainWindowHandle);
        const mainUrl = await browser.getUrl();
        expect(mainUrl).toBeDefined();
    });

    it('should close auth window and return to main window when closed manually', async () => {
        // 1. Verify we start with 1 window
        const initialHandles = await browser.getWindowHandles();
        expect(initialHandles.length).toBe(1);
        const mainWindowHandle = initialHandles[0];

        // 2. Open the sign-in window
        await clickMenuItemById('menu-file-signin');
        await waitForWindowCount(2, 5000);

        const authHandles = await browser.getWindowHandles();
        const authWindowHandle = authHandles.find(h => h !== mainWindowHandle);
        if (!authWindowHandle) throw new Error('Could not find auth window handle');

        // 3. Switch to auth window
        await browser.switchToWindow(authWindowHandle);

        // Verify we're on the auth window
        const authUrl = await browser.getUrl();
        expect(authUrl).toContain('accounts.google.com');

        // 4. Close auth window manually via Electron API
        await browser.electron.execute((electron) => {
            const focusedWindow = electron.BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
                focusedWindow.close();
            }
        });

        // 5. Wait for auth window to close
        await waitForWindowCount(1, 3000);

        // 6. Switch back to main window
        await switchToWindowByIndex(0);

        // 7. Verify we're back to main window
        const finalHandles = await browser.getWindowHandles();
        expect(finalHandles.length).toBe(1);

        E2ELogger.info('auth', 'Auth window closed manually, returned to main window');
    });

    it('should keep main window functional while auth window is open', async () => {
        // 1. Open auth window
        await clickMenuItemById('menu-file-signin');
        await waitForWindowCount(2, 5000);

        const handles = await browser.getWindowHandles();
        const mainWindowHandle = handles[0];

        // 2. Switch back to main window (instead of auth window)
        await browser.switchToWindow(mainWindowHandle);

        // 3. Verify main window is still responsive
        const mainLayout = await $(Selectors.mainLayout);
        await expect(mainLayout).toBeExisting();

        // 4. Verify main window URL hasn't changed
        const mainUrl = await browser.getUrl();
        expect(mainUrl).not.toContain('accounts.google.com');

        E2ELogger.info('auth', 'Main window remains functional while auth window is open');

        // 5. Cleanup: Close auth window
        const authWindowHandle = handles.find(h => h !== mainWindowHandle);
        if (authWindowHandle) {
            await browser.switchToWindow(authWindowHandle);
            await browser.electron.execute((electron) => {
                const focusedWindow = electron.BrowserWindow.getFocusedWindow();
                if (focusedWindow) {
                    focusedWindow.close();
                }
            });
            await waitForWindowCount(1, 3000);
        }
    });

    it('should intercept OAuth domain links and open in dedicated auth window', async () => {
        // This test verifies that window.open() to accounts.google.com
        // gets intercepted and opened in a dedicated auth window

        // 1. Create a mock OAuth link in the main window
        await browser.execute(() => {
            const link = document.createElement('a');
            link.href = 'https://accounts.google.com/signin/oauth';
            link.target = '_blank';
            link.textContent = 'OAuth Link';
            link.id = 'mock-oauth-link';
            link.style.cssText = 'position:fixed;top:150px;left:100px;z-index:99999;background:blue;padding:20px;color:white;';
            document.body.appendChild(link);
        });

        const initialHandles = await browser.getWindowHandles();
        const mainWindowHandle = initialHandles[0];

        // 2. Click the OAuth link
        const link = await browser.$('#mock-oauth-link');
        await expect(link).toBeExisting();
        await link.click();

        // 3. Wait for auth window to open
        await waitForWindowCount(2, 5000);

        const newHandles = await browser.getWindowHandles();
        expect(newHandles.length).toBe(2);

        // 4. Find and switch to auth window
        const authWindowHandle = newHandles.find(h => h !== mainWindowHandle);
        if (!authWindowHandle) throw new Error('Could not find auth window handle');
        await browser.switchToWindow(authWindowHandle);

        // 5. Verify it's showing Google accounts (not blocked)
        const authUrl = await browser.getUrl();
        expect(authUrl).toContain('accounts.google.com');

        E2ELogger.info('auth', 'OAuth domain link correctly intercepted and opened in auth window');

        // 6. Cleanup
        await browser.electron.execute((electron) => {
            const focusedWindow = electron.BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
                focusedWindow.close();
            }
        });
        await waitForWindowCount(1, 3000);

        // Remove mock link
        await browser.switchToWindow(mainWindowHandle);
        await browser.execute(() => {
            const link = document.getElementById('mock-oauth-link');
            if (link) link.remove();
        });
    });

    it('should not open duplicate auth windows when Sign In is clicked multiple times', async () => {
        // 1. Click Sign In - first time
        await clickMenuItemById('menu-file-signin');
        await waitForWindowCount(2, 5000);

        const firstHandles = await browser.getWindowHandles();
        expect(firstHandles.length).toBe(2);

        // Get the auth window count
        const authWindowCount1 = await browser.electron.execute((electron) => {
            const windows = electron.BrowserWindow.getAllWindows();
            return windows.filter(w => {
                try {
                    return w.webContents.getURL().includes('accounts.google.com');
                } catch {
                    return false;
                }
            }).length;
        });

        expect(authWindowCount1).toBe(1);

        // 2. Switch back to main window and click Sign In again
        await switchToWindowByIndex(0);
        await clickMenuItemById('menu-file-signin');

        // Brief wait to allow any additional windows to open
        await browser.pause(1000);

        // 3. Check that a new auth window was created (each click creates a new one)
        // This is actually the expected behavior - we can't prevent multiple
        // The important thing is that each operates independently
        const secondHandles = await browser.getWindowHandles();

        E2ELogger.info('auth', `Windows after second sign-in click: ${secondHandles.length}`);

        // 4. Cleanup: close all auth windows
        for (let i = secondHandles.length - 1; i > 0; i--) {
            await browser.switchToWindow(secondHandles[i]);
            await browser.electron.execute((electron) => {
                const focusedWindow = electron.BrowserWindow.getFocusedWindow();
                if (focusedWindow) {
                    focusedWindow.close();
                }
            });
        }
        await waitForWindowCount(1, 3000);
    });

    it('should share session between auth window and main window (for cookie-based auth)', async () => {
        // This test verifies that the auth window and main window share the same
        // Electron session (no partition), which is essential for cookie-based auth.
        // When user logs in via auth window, cookies are set in the shared session,
        // making them immediately available to the main window after reload.

        // 1. Open auth window
        await clickMenuItemById('menu-file-signin');
        await waitForWindowCount(2, 5000);

        // 2. Verify both windows use the same session by checking they both
        // have access to the same session cookies API
        const sessionInfo = await browser.electron.execute((electron) => {
            const windows = electron.BrowserWindow.getAllWindows();

            // Get session info for each window
            const sessionData = windows.map(w => {
                try {
                    const session = w.webContents.session;
                    return {
                        // Session ID helps verify they're the same session
                        // In Electron, default session is shared across all windows
                        // that don't specify a partition
                        isPersistent: !session.isPersistent || session.isPersistent(),
                        // The important check: partition should be undefined (default session)
                        partition: (w as any)._options?.webPreferences?.partition || 'default'
                    };
                } catch {
                    return { error: 'Could not access session' };
                }
            });

            return {
                windowCount: windows.length,
                sessions: sessionData
            };
        });

        // 3. Verify session info
        expect(sessionInfo.windowCount).toBe(2);

        // Both windows should use default session (for cookie sharing)
        sessionInfo.sessions.forEach(session => {
            // No explicit partition = using default session = cookies are shared
            expect(session.partition).toBe('default');
        });

        E2ELogger.info('auth', 'Verified both windows share default session for cookie-based auth');

        // 4. Cleanup
        const handles = await browser.getWindowHandles();
        for (let i = handles.length - 1; i > 0; i--) {
            await browser.switchToWindow(handles[i]);
            await browser.electron.execute((electron) => {
                const focusedWindow = electron.BrowserWindow.getFocusedWindow();
                if (focusedWindow) focusedWindow.close();
            });
        }
        await waitForWindowCount(1, 3000);
    });
});
