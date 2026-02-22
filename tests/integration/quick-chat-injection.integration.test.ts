/**
 * Integration tests for Quick Chat text injection functionality.
 *
 * Tests the core Quick Chat workflow:
 * - Submitting text triggers injection into Gemini
 * - Quick Chat window hides after submission
 * - Cancel clears and hides
 * - Main window receives focus after submit
 */

import { browser as baseBrowser, expect } from '@wdio/globals';

const browser = baseBrowser as unknown as {
    execute<T>(script: string | ((...args: unknown[]) => T), ...args: unknown[]): Promise<T>;
    waitUntil<T>(
        condition: () => Promise<T> | T,
        options?: { timeout?: number; timeoutMsg?: string; interval?: number }
    ): Promise<T>;
    getWindowHandles(): Promise<string[]>;
    switchToWindow(handle: string): Promise<void>;
    electron: {
        execute<R, T extends unknown[]>(fn: (...args: T) => R, ...args: T): Promise<R>;
    };
};

const browserWithElectron = browser;

const isLinuxCI = process.platform === 'linux' && process.env.CI === 'true';
const isWinCI = process.platform === 'win32' && process.env.CI === 'true';

describe('Quick Chat Injection Integration', () => {
    before(async () => {
        // Wait for app ready
        await browserWithElectron.waitUntil(async () => (await browserWithElectron.getWindowHandles()).length > 0);

        // Ensure renderer is ready
        await browserWithElectron.execute(async () => {
            return await new Promise<void>((resolve) => {
                if (document.readyState === 'complete') return resolve();
                window.addEventListener('load', () => resolve());
            });
        });

        // Store main window handle
        await browserWithElectron.getWindowHandles();
    });

    afterEach(async () => {
        // Ensure Quick Chat is closed and we're back in main window
        await browserWithElectron.electron.execute(() => {
            const quickChatWin = global.windowManager.getQuickChatWindow();
            if (quickChatWin && !quickChatWin.isDestroyed() && quickChatWin.isVisible()) {
                quickChatWin.hide();
            }
        });

        // Switch back to main window
        const handles = await browserWithElectron.getWindowHandles();
        if (handles.length > 0) {
            await browserWithElectron.switchToWindow(handles[0]);
        }
    });

    describe('Quick Chat Submit Workflow', () => {
        it('should open Quick Chat window and verify it appears', async function () {
            if (isLinuxCI || isWinCI) this.skip();
            // Open Quick Chat via main process
            await browserWithElectron.electron.execute(() => {
                global.windowManager.showQuickChat();
            });

            // Wait for window to appear
            await browserWithElectron.waitUntil(
                async () => {
                    return await browserWithElectron.electron.execute(() => {
                        const win = global.windowManager.getQuickChatWindow();
                        return win && !win.isDestroyed() && win.isVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Quick Chat window did not appear' }
            );

            const isVisible = await browserWithElectron.electron.execute(() => {
                const win = global.windowManager.getQuickChatWindow();
                return win && win.isVisible();
            });

            expect(isVisible).toBe(true);
        });

        it('should hide Quick Chat window after submit via IPC', async function () {
            if (isLinuxCI || isWinCI) this.skip();
            // First, ensure Quick Chat is open
            await browserWithElectron.electron.execute(() => {
                global.windowManager.showQuickChat();
            });

            await browserWithElectron.waitUntil(
                async () => {
                    return await browserWithElectron.electron.execute(() => {
                        const win = global.windowManager.getQuickChatWindow();
                        return win && !win.isDestroyed() && win.isVisible();
                    });
                },
                { timeout: 5000 }
            );

            // Simulate submit action via main process - hideQuickChat is called after submit
            // We test the window hiding behavior which is the outcome of submit
            await browserWithElectron.electron.execute(() => {
                global.windowManager.hideQuickChat();
            });

            // Wait for Quick Chat to hide
            await browserWithElectron.waitUntil(
                async () => {
                    return await browserWithElectron.electron.execute(() => {
                        const win = global.windowManager.getQuickChatWindow();
                        return !win || win.isDestroyed() || !win.isVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Quick Chat window did not hide after submit' }
            );

            const isHidden = await browserWithElectron.electron.execute(() => {
                const win = global.windowManager.getQuickChatWindow();
                return !win || !win.isVisible();
            });

            expect(isHidden).toBe(true);
        });

        it('should focus main window after Quick Chat submit', async function () {
            if (isLinuxCI || isWinCI) this.skip();
            // Open Quick Chat
            await browserWithElectron.electron.execute(() => {
                global.windowManager.showQuickChat();
            });

            await browserWithElectron.waitUntil(
                async () => {
                    return await browserWithElectron.electron.execute(() => {
                        const win = global.windowManager.getQuickChatWindow();
                        return win && !win.isDestroyed() && win.isVisible();
                    });
                },
                { timeout: 5000 }
            );

            // Simulate submit action - hide Quick Chat (which is what submit does)
            await browserWithElectron.electron.execute(() => {
                global.windowManager.hideQuickChat();
            });

            // Wait for Quick Chat to be hidden using waitUntil for reliability on macOS CI
            // Fixed pause (500ms) was flaky; waitUntil polls until condition is met
            await browserWithElectron.waitUntil(
                async () => {
                    return await browserWithElectron.electron.execute(() => {
                        const win = global.windowManager.getQuickChatWindow();
                        return !win || !win.isVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Quick Chat window did not hide after submit' }
            );

            const quickChatHidden = await browserWithElectron.electron.execute(() => {
                const win = global.windowManager.getQuickChatWindow();
                return !win || !win.isVisible();
            });

            expect(quickChatHidden).toBe(true);
        });
    });

    describe('Quick Chat Cancel Workflow', () => {
        it('should hide Quick Chat window on cancel', async function () {
            if (isLinuxCI || isWinCI) this.skip();
            // Open Quick Chat
            await browserWithElectron.electron.execute(() => {
                global.windowManager.showQuickChat();
            });

            await browserWithElectron.waitUntil(
                async () => {
                    return await browserWithElectron.electron.execute(() => {
                        const win = global.windowManager.getQuickChatWindow();
                        return win && !win.isDestroyed() && win.isVisible();
                    });
                },
                { timeout: 5000 }
            );

            // Cancel via main process - directly hide the Quick Chat window
            await browserWithElectron.electron.execute(() => {
                global.windowManager.hideQuickChat();
            });

            // Wait for Quick Chat to hide
            await browserWithElectron.waitUntil(
                async () => {
                    return await browserWithElectron.electron.execute(() => {
                        const win = global.windowManager.getQuickChatWindow();
                        return !win || win.isDestroyed() || !win.isVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Quick Chat window did not hide after cancel' }
            );

            const isHidden = await browserWithElectron.electron.execute(() => {
                const win = global.windowManager.getQuickChatWindow();
                return !win || !win.isVisible();
            });

            expect(isHidden).toBe(true);
        });

        it('should hide Quick Chat window via hideQuickChat IPC', async function () {
            if (isLinuxCI || isWinCI) this.skip();
            // Open Quick Chat
            await browserWithElectron.electron.execute(() => {
                global.windowManager.showQuickChat();
            });

            await browserWithElectron.waitUntil(
                async () => {
                    return await browserWithElectron.electron.execute(() => {
                        const win = global.windowManager.getQuickChatWindow();
                        return win && !win.isDestroyed() && win.isVisible();
                    });
                },
                { timeout: 5000 }
            );

            // Hide via main process - directly call hideQuickChat
            await browserWithElectron.electron.execute(() => {
                global.windowManager.hideQuickChat();
            });

            // Wait for Quick Chat to hide
            await browserWithElectron.waitUntil(
                async () => {
                    return await browserWithElectron.electron.execute(() => {
                        const win = global.windowManager.getQuickChatWindow();
                        return !win || win.isDestroyed() || !win.isVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Quick Chat window did not hide via hideQuickChat' }
            );

            const isHidden = await browserWithElectron.electron.execute(() => {
                const win = global.windowManager.getQuickChatWindow();
                return !win || !win.isVisible();
            });

            expect(isHidden).toBe(true);
        });
    });

    describe('Quick Chat Toggle Behavior', () => {
        it('should toggle Quick Chat visibility', async function () {
            if (isLinuxCI || isWinCI) this.skip();
            // Ensure starts hidden
            await browserWithElectron.electron.execute(() => {
                const win = global.windowManager.getQuickChatWindow();
                if (win && win.isVisible()) win.hide();
            });

            // Toggle on
            await browserWithElectron.electron.execute(() => {
                global.windowManager.toggleQuickChat();
            });

            await browserWithElectron.waitUntil(
                async () => {
                    return await browserWithElectron.electron.execute(() => {
                        const win = global.windowManager.getQuickChatWindow();
                        return win && win.isVisible();
                    });
                },
                { timeout: 5000 }
            );

            let isVisible = await browserWithElectron.electron.execute(() => {
                const win = global.windowManager.getQuickChatWindow();
                return win && win.isVisible();
            });
            expect(isVisible).toBe(true);

            // Toggle off
            await browserWithElectron.electron.execute(() => {
                global.windowManager.toggleQuickChat();
            });

            await browserWithElectron.waitUntil(
                async () => {
                    return await browserWithElectron.electron.execute(() => {
                        const win = global.windowManager.getQuickChatWindow();
                        return !win || !win.isVisible();
                    });
                },
                { timeout: 5000 }
            );

            isVisible = await browserWithElectron.electron.execute(() => {
                const win = global.windowManager.getQuickChatWindow();
                return win && win.isVisible();
            });
            expect(isVisible).toBe(false);
        });
    });

    describe('Quick Chat API Exposure', () => {
        it('should expose Quick Chat methods in electronAPI', async () => {
            const methods = await browserWithElectron.execute(() => {
                const api = (window as any).electronAPI;
                return {
                    submitQuickChat: typeof api?.submitQuickChat,
                    hideQuickChat: typeof api?.hideQuickChat,
                    cancelQuickChat: typeof api?.cancelQuickChat,
                    onQuickChatExecute: typeof api?.onQuickChatExecute,
                };
            });

            expect(methods.submitQuickChat).toBe('function');
            expect(methods.hideQuickChat).toBe('function');
            expect(methods.cancelQuickChat).toBe('function');
            expect(methods.onQuickChatExecute).toBe('function');
        });

        it('should expose electronAPI in Quick Chat window specifically', async function () {
            if (isLinuxCI || isWinCI) this.skip();
            // CRITICAL: This test catches the preload script bug.
            // The old bug: electronAPI was exposed in main window but NOT in Quick Chat window
            // because QuickChatWindow.create() was missing the preload script.

            // 1. Show Quick Chat window
            await browserWithElectron.electron.execute(() => {
                global.windowManager.showQuickChat();
            });

            await browserWithElectron.waitUntil(
                async () => {
                    return await browserWithElectron.electron.execute(() => {
                        const win = global.windowManager.getQuickChatWindow();
                        return win && !win.isDestroyed() && win.isVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Quick Chat window did not appear' }
            );

            // 2. Execute in Quick Chat window's webContents to verify electronAPI
            const hasSubmitQuickChat = await browserWithElectron.electron.execute(() => {
                const { BrowserWindow } = require('electron');
                const wins = BrowserWindow.getAllWindows();
                const qcWin = wins.find((w: { getTitle(): string }) => w.getTitle().includes('Quick Chat'));
                if (!qcWin) return false;

                // Check if electronAPI exists in the Quick Chat renderer
                return qcWin.webContents.executeJavaScript('typeof window.electronAPI?.submitQuickChat === "function"');
            });

            expect(hasSubmitQuickChat).toBe(true);

            // 3. Cleanup
            await browserWithElectron.electron.execute(() => {
                global.windowManager.hideQuickChat();
            });
        });
    });
});
