import { browser, expect, $ } from '@wdio/globals';
import { MainWindowPage } from './pages';
import { waitForAppReady, pressShortcut } from './helpers/workflows';
import {
    expectElementDisplayed,
    expectElementNotDisplayed,
    expectWindowCount,
    expectElementContainsText,
} from './helpers/assertions';

describe('Fatal Error Recovery E2E', () => {
    const mainWindow = new MainWindowPage();

    before(async () => {
        // Wait for app ready using workflow helper
        await waitForAppReady();
    });

    describe('Application Stability', () => {
        it('should start with main window visible', async () => {
            // Real Outcome: Verify main window is loaded and has a title
            await expectWindowCount(1, { timeout: 10000 });
            expect(await mainWindow.isLoaded()).toBe(true);

            const title = await browser.getTitle();
            expect(title.length).toBeGreaterThan(0);
        });
    });

    describe('Renderer Crash Recovery', () => {
        // This test is skipped because the WebDriver session dies when the renderer crashes,
        // making it difficult to verify the auto-reload behavior without a custom driver implementation.
        // The functionality is verified manually or via main process unit tests.
        it.skip('should automatically reload when renderer crashes', async () => {
            // Navigate to a clean state
            await browser.reloadSession();
            await expectElementDisplayed('body');

            // Trigger a real renderer process crash via Debug menu
            await browser.electron.execute((electron) => {
                const menu = electron.Menu.getApplicationMenu();
                const debugMenu = menu?.items.find((item) => item.label === 'Debug');
                const crashItem = debugMenu?.submenu?.items.find((item) => item.label === 'Crash Renderer');
                crashItem?.click();
            });

            // Wait for the window to reload (sanity check)
            await browser.waitUntil(
                async () => {
                    try {
                        const title = await browser.getTitle();
                        return title === 'Gemini Desktop';
                    } catch (_error) {
                        // Ignore tab crashed errors during reload
                        return false;
                    }
                },
                {
                    timeout: 10000,
                    timeoutMsg: 'Window should have reloaded after crash',
                }
            );

            // Verify the app is interactive again
            await expectElementDisplayed('body');
        });
    });

    describe('React Error Boundary Verification', () => {
        it('should show error boundary and allow reload on React error', async () => {
            // Navigate to a clean state
            await browser.reloadSession();
            await expectElementDisplayed('body');

            // Trigger a simulated React error via global test hook
            // Note: We use a global function instead of IPC to avoid test environment flakiness
            // This still tests the error boundary UI rendering and recovery flow
            await browser.execute(() => {
                // @ts-expect-error
                if (window.__GEMINI_TRIGGER_FATAL_ERROR__) {
                    // @ts-expect-error
                    window.__GEMINI_TRIGGER_FATAL_ERROR__();
                } else {
                    throw new Error('Global error trigger not found');
                }
            });

            // Verify the error boundary fallback is displayed
            const fallbackSelector = '[data-testid="gemini-error-fallback"]';
            await expectElementDisplayed(fallbackSelector, {
                timeout: 10000,
                timeoutMsg: 'Error fallback UI did not appear',
            });

            // Verify the error title text
            await expectElementContainsText(`${fallbackSelector} h3`, "Gemini couldn't load");

            // 3. User can recover by clicking Reload
            const reloadButton = await $(`${fallbackSelector} button`);
            expect(await reloadButton.isDisplayed()).toBe(true);
            await reloadButton.click();

            // Verify fallback disappears and normal content returns
            await expectElementNotDisplayed(fallbackSelector, { timeout: 5000 });
        });
    });

    describe('Manual Page Reload', () => {
        it('should reload page when user presses key shortcut', async () => {
            // 1. SIMULATE REAL USER ACTION
            // Press platform-appropriate reload shortcut (Ctrl+R / Cmd+R)
            await pressShortcut('primary', 'r');

            // Wait for potential reload
            await browser.pause(1000);

            // 2. VERIFY ACTUAL OUTCOME
            await expectElementDisplayed('body');
        });
    });
});
