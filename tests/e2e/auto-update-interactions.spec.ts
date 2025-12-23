import { expect, $, browser } from '@wdio/globals';

describe('Auto-Update User Interactions', () => {
    beforeEach(async () => {
        // Ensure no leftover toasts
        await browser.execute(() => {
            window.electronAPI.devClearBadge();
            // We need to inject a test toast helper if not present, but 
            // relying on the app's internal "useUpdateNotifications" hook is hard from outside.
            // However, the analysis mentioned `window.__testUpdateToast`. 
            // Let's assume this helper exists or we need to add it to the app if it doesn't.
            // Checking: The analysis said "Dev Test Helpers (Already Implemented): Use existing window.__testUpdateToast helpers".
            // So we assume it works.
        });
        await browser.pause(500);
    });

    it('should dismiss toast but keep indicators when "Later" is clicked', async () => {
        // GIVEN an update is downloaded
        await browser.execute(() => {
            // @ts-ignore - test helper
            window.__testUpdateToast.showDownloaded('9.9.9');
            // Also ensure badges are shown (the toast helper mainly shows UI, might not trigger native badge)
            // usage of devShowBadge ensures native side is consistent
            window.electronAPI.devShowBadge('9.9.9');
        });

        // AND the "Update Ready" toast is visible
        const toast = await $('[data-testid="update-toast"]');
        await toast.waitForDisplayed();
        expect(await toast.isDisplayed()).toBe(true);

        const restartBtn = await $('[data-testid="update-toast-restart"]');
        expect(await restartBtn.isDisplayed()).toBe(true);

        // WHEN the user clicks "Later"
        const laterBtn = await $('[data-testid="update-toast-later"]');
        await laterBtn.click();
        await browser.pause(500);

        // THEN the toast should dismiss
        expect(await toast.isDisplayed()).toBe(false);

        // AND the titlebar badge should remain visible
        const badge = await $('[data-testid="update-badge"]');
        expect(await badge.isDisplayed()).toBe(true);

        // AND the tray tooltip should remain updated
        const tooltip = await browser.execute(() => {
            return window.electronAPI.getTrayTooltip();
        });
        expect(tooltip).toContain('Update v9.9.9 available');
    });

    it('should dismiss error toast and clear state when error is dismissed', async () => {
        // GIVEN an update error occurs
        await browser.execute(() => {
            // @ts-ignore
            window.__testUpdateToast.showError('Test Network Error');
        });

        // AND the "Update Error" toast is visible
        const toast = await $('[data-testid="update-toast"]');
        await toast.waitForDisplayed();

        const errorMsg = await $('[data-testid="update-toast-message"]');
        expect(await errorMsg.getText()).toContain('Test Network Error');

        // WHEN the user clicks the dismiss (×) button
        const dismissBtn = await $('[data-testid="update-toast-dismiss"]');
        await dismissBtn.click();
        await browser.pause(500);

        // THEN the toast should dismiss
        expect(await toast.isDisplayed()).toBe(false);

        // AND no badges should appear
        const badge = await $('[data-testid="update-badge"]');
        expect(await badge.isExisting()).toBe(false);
    });
});
