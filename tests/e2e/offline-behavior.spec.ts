/**
 * E2E Test: Offline Behavior
 *
 * Verifies how the app handles network connectivity issues.
 *
 * Strategy: Uses CDP Network.emulateNetworkConditions to block network requests.
 * While CDP cannot change navigator.onLine, it DOES block fetch() requests.
 * The app's useGeminiIframe hook performs a connectivity check via fetch() on load.
 * When that fetch fails, the error state is set, triggering the offline overlay.
 *
 * Cross-platform: Windows, macOS, Linux
 *
 * @module offline-behavior.spec
 */

import { browser, expect, $ } from '@wdio/globals';
import { expectElementDisplayed, expectElementNotDisplayed } from './helpers/assertions';
import { waitForDuration } from './helpers/waitUtilities';

// ============================================================================
// CDP Network Interception Helpers
// ============================================================================

/**
 * Block all network requests to Gemini by intercepting and failing them.
 * This is more reliable than Network.emulateNetworkConditions in Electron.
 */
async function blockGeminiRequests(): Promise<void> {
    await browser.electron.execute(async (electron) => {
        const wins = electron.BrowserWindow.getAllWindows();
        const wc = wins[0].webContents;
        try {
            if (!wc.debugger.isAttached()) wc.debugger.attach('1.3');

            // Enable request interception for Gemini URLs
            await wc.debugger.sendCommand('Fetch.enable', {
                patterns: [{ urlPattern: '*gemini.google.com*', requestStage: 'Request' }],
            });

            // Listen for requests and fail them
            wc.debugger.on('message', (_event: unknown, method: string, params: { requestId: string }) => {
                if (method === 'Fetch.requestPaused') {
                    wc.debugger.sendCommand('Fetch.failRequest', {
                        requestId: params.requestId,
                        errorReason: 'InternetDisconnected',
                    });
                }
            });
        } catch (e) {
            console.error('CDP Fetch.enable Error:', e);
        }
    });

    await waitForDuration(500, 'CDP Fetch.enable setup');
}

/**
 * Restore network by disabling request interception.
 */
async function restoreNetwork(): Promise<void> {
    await browser.electron.execute(async (electron) => {
        const wins = electron.BrowserWindow.getAllWindows();
        const wc = wins[0].webContents;
        try {
            await wc.debugger.sendCommand('Fetch.disable');
            // Detach debugger to reset state completely
            if (wc.debugger.isAttached()) wc.debugger.detach();
        } catch (e) {
            console.error('CDP Fetch.disable Error:', e);
        }
    });

    await waitForDuration(500, 'CDP Fetch.disable cleanup');
}

/**
 * Reloads the page.
 */
async function reloadPage(): Promise<void> {
    await browser.execute(() => {
        window.location.reload();
    });
    await waitForDuration(2000, 'Page reload');
}

/**
 * Checks if the app's webContents has crashed.
 */
async function isAppResponsive(): Promise<boolean> {
    return await browser.electron.execute((electron) => {
        const win = electron.BrowserWindow.getAllWindows()[0];
        return win ? !win.webContents.isCrashed() : false;
    });
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Offline Behavior', () => {
    afterEach(async () => {
        // Ensure network is restored after each test
        await restoreNetwork();
    });

    it('should handle network loss gracefully', async () => {
        // 1. App starts online
        const title = await browser.getTitle();
        expect(title).not.toBe('');

        // 2. Block Gemini requests via CDP Fetch interception
        await blockGeminiRequests();

        // 3. Reload to trigger offline state
        await reloadPage();

        // 4. Verify the OfflineOverlay is visible
        await expectElementDisplayed('[data-testid="offline-overlay"]', { timeout: 10000 });

        // Verify SVG icon is present
        await expectElementDisplayed('[data-testid="offline-icon"]');

        // Verify Retry button is present and clickable
        const retryButton = await $('[data-testid="offline-retry-button"]');
        expect(await retryButton.isDisplayed()).toBe(true);
        expect(await retryButton.isEnabled()).toBe(true);

        // 5. Test Retry button click (should trigger reload)
        await retryButton.click();

        // 6. Verify the app is still responsive (not crashed)
        expect(await isAppResponsive()).toBe(true);
    });

    it('should restore functionality when network returns', async () => {
        // 1. Block Gemini requests briefly then restore
        await blockGeminiRequests();

        // 2. Restore network
        await restoreNetwork();

        // 3. Refresh and verify app loads
        await reloadPage();
        await waitForDuration(1000, 'Extra settle time after network restore');

        const title = await browser.getTitle();
        expect(title).not.toBe('');
    });

    it('should reload page and recover when retry button is clicked after connection restored', async () => {
        // 1. Block Gemini requests
        await blockGeminiRequests();

        // 2. Reload page while blocked to trigger connectivity check failure
        await reloadPage();

        // 3. Verify overlay is visible (due to connectivity check failure)
        await expectElementDisplayed('[data-testid="offline-overlay"]', { timeout: 15000 });

        // 4. Restore network connectivity
        await restoreNetwork();

        // 4. Verify overlay persists until retry (error state is sticky)
        const overlay = await $('[data-testid="offline-overlay"]');
        expect(await overlay.isDisplayed()).toBe(true);

        // 5. Click retry
        const retryButton = await $('[data-testid="offline-retry-button"]');
        await retryButton.click();

        // 6. Verify overlay disappears (reload happened and connectivity check passed)
        await expectElementNotDisplayed('[data-testid="offline-overlay"]', { timeout: 15000 });

        // 7. Verify gemini iframe is visible
        await expectElementDisplayed('[data-testid="gemini-iframe"]');
    });
});
