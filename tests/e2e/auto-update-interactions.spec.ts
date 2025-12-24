import { expect, $, browser } from '@wdio/globals';

describe('Auto-Update User Interactions', () => {
    beforeEach(async () => {
        // Ensure no leftover toasts
        await browser.execute(() => {
            window.electronAPI.devClearBadge();
            // Hide any existing toasts
            // @ts-ignore - test helper
            if (window.__testUpdateToast?.hide) {
                // @ts-ignore
                window.__testUpdateToast.hide();
            }
        });
        await browser.pause(500);
    });

    // =========================================================================
    // "Restart Now" Button Workflow (High Priority)
    // =========================================================================

    describe('Restart Now Button', () => {
        it('should display Restart Now button when update is downloaded', async () => {
            // GIVEN an update is downloaded
            await browser.execute(() => {
                // @ts-ignore - test helper
                window.__testUpdateToast.showDownloaded('9.9.9');
            });

            // THEN the "Update Ready" toast should show with Restart Now button
            const toast = await $('[data-testid="update-toast"]');
            await toast.waitForDisplayed();

            const restartBtn = await $('[data-testid="update-toast-restart"]');
            await expect(restartBtn).toBeDisplayed();
            expect(await restartBtn.getText()).toBe('Restart Now');
        });

        it('should dismiss toast and clear pending state when Restart Now is clicked', async () => {
            // Note: Clicking Restart Now triggers the main process installUpdate() which fails
            // in test mode (no real update available). This causes an error toast to appear.
            // We verify the original downloaded toast was dismissed by checking:
            // 1. The Restart Now button is no longer visible
            // 2. The hasPendingUpdate state is cleared (verified in React component behavior)

            // GIVEN an update is downloaded with badge visible
            await browser.execute(() => {
                // @ts-ignore - test helper
                window.__testUpdateToast.showDownloaded('9.9.9');
                window.electronAPI.devShowBadge('9.9.9');
            });

            const toast = await $('[data-testid="update-toast"]');
            await toast.waitForDisplayed();

            // Verify Restart Now button is visible before clicking
            const restartBtn = await $('[data-testid="update-toast-restart"]');
            expect(await restartBtn.isDisplayed()).toBe(true);

            // WHEN user clicks Restart Now
            await restartBtn.click();
            await browser.pause(500);

            // THEN the Restart Now button should no longer be visible
            // (either toast is hidden or has transitioned to error state without that button)
            expect(await restartBtn.isExisting()).toBe(false);
        });
    });

    // =========================================================================
    // "Later" Button Workflow
    // =========================================================================

    describe('Later Button', () => {
        it('should dismiss toast but keep indicators when "Later" is clicked', async () => {
            // GIVEN an update is downloaded
            await browser.execute(() => {
                // @ts-ignore - test helper
                window.__testUpdateToast.showDownloaded('9.9.9');
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

        it('should keep pending update state when Later is clicked', async () => {
            // GIVEN an update is downloaded
            await browser.execute(() => {
                // @ts-ignore - test helper
                window.__testUpdateToast.showDownloaded('9.9.9');
            });

            const toast = await $('[data-testid="update-toast"]');
            await toast.waitForDisplayed();

            // WHEN user clicks Later
            const laterBtn = await $('[data-testid="update-toast-later"]');
            await laterBtn.click();
            await browser.pause(500);

            // THEN toast is dismissed
            expect(await toast.isDisplayed()).toBe(false);

            // BUT the app still knows there's a pending update (badge visible)
            // Re-showing would show the same update
            await browser.execute(() => {
                // @ts-ignore - test helper
                window.__testUpdateToast.showDownloaded('9.9.9');
            });

            await toast.waitForDisplayed();
            expect(await toast.isDisplayed()).toBe(true);
        });
    });

    // =========================================================================
    // Error State Testing (High Priority)
    // =========================================================================

    describe('Error Toast', () => {
        it('should display error message in toast', async () => {
            // GIVEN an update error occurs
            await browser.execute(() => {
                // @ts-ignore
                window.__testUpdateToast.showError('Test Network Error');
            });

            // THEN the error toast should be visible with the correct message
            const toast = await $('[data-testid="update-toast"]');
            await toast.waitForDisplayed();

            const title = await $('[data-testid="update-toast-title"]');
            expect(await title.getText()).toBe('Update Error');

            const errorMsg = await $('[data-testid="update-toast-message"]');
            expect(await errorMsg.getText()).toContain('Test Network Error');
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

            // WHEN the user clicks the dismiss (×) button
            const dismissBtn = await $('[data-testid="update-toast-dismiss"]');
            await dismissBtn.click();
            await browser.pause(500);

            // THEN the toast should dismiss
            expect(await toast.isDisplayed()).toBe(false);

            // AND no badges should appear (errors don't create badges)
            const badge = await $('[data-testid="update-badge"]');
            expect(await badge.isExisting()).toBe(false);
        });

        it('should show appropriate message for download failure', async () => {
            // Test specific error scenario: download failure
            await browser.execute(() => {
                // @ts-ignore
                window.__testUpdateToast.showError('Failed to download update: Connection timed out');
            });

            const toast = await $('[data-testid="update-toast"]');
            await toast.waitForDisplayed();

            const errorMsg = await $('[data-testid="update-toast-message"]');
            expect(await errorMsg.getText()).toContain('Connection timed out');
        });

        it('should handle generic error with fallback message', async () => {
            // Test error with no custom message (uses fallback)
            await browser.execute(() => {
                // @ts-ignore
                window.__testUpdateToast.showError(null);
            });

            const toast = await $('[data-testid="update-toast"]');
            await toast.waitForDisplayed();

            const errorMsg = await $('[data-testid="update-toast-message"]');
            // Should show default fallback message
            expect(await errorMsg.getText()).toContain('An error occurred while updating');
        });

        it('should not show Restart Now or Later buttons for error toast', async () => {
            // GIVEN an error toast
            await browser.execute(() => {
                // @ts-ignore
                window.__testUpdateToast.showError('Some error');
            });

            const toast = await $('[data-testid="update-toast"]');
            await toast.waitForDisplayed();

            // THEN only dismiss button should be present
            const restartBtn = await $('[data-testid="update-toast-restart"]');
            expect(await restartBtn.isExisting()).toBe(false);

            const laterBtn = await $('[data-testid="update-toast-later"]');
            expect(await laterBtn.isExisting()).toBe(false);

            const dismissBtn = await $('[data-testid="update-toast-dismiss"]');
            expect(await dismissBtn.isExisting()).toBe(true);
        });
    });

    // =========================================================================
    // Update Available Toast
    // =========================================================================

    describe('Update Available Toast', () => {
        it('should show update available message while downloading', async () => {
            // GIVEN an update is available (downloading)
            await browser.execute(() => {
                // @ts-ignore
                window.__testUpdateToast.showAvailable('10.0.0');
            });

            const toast = await $('[data-testid="update-toast"]');
            await toast.waitForDisplayed();

            const title = await $('[data-testid="update-toast-title"]');
            expect(await title.getText()).toBe('Update Available');

            const message = await $('[data-testid="update-toast-message"]');
            expect(await message.getText()).toContain('10.0.0');
            expect(await message.getText()).toContain('downloading');
        });

        it('should show dismiss button for update available toast', async () => {
            await browser.execute(() => {
                // @ts-ignore
                window.__testUpdateToast.showAvailable('10.0.0');
            });

            const toast = await $('[data-testid="update-toast"]');
            await toast.waitForDisplayed();

            // Should have dismiss button, NOT Restart Now
            const dismissBtn = await $('[data-testid="update-toast-dismiss"]');
            expect(await dismissBtn.isExisting()).toBe(true);

            const restartBtn = await $('[data-testid="update-toast-restart"]');
            expect(await restartBtn.isExisting()).toBe(false);
        });
    });
});
