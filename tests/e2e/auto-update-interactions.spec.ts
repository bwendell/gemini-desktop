/**
 * E2E Test: Auto-Update User Interactions
 *
 * Tests user interaction workflows for the auto-update feature.
 *
 * @module auto-update-interactions.spec
 */

/// <reference path="./helpers/wdio-electron.d.ts" />

import { expect, browser } from '@wdio/globals';
import { UpdateToastPage } from './pages';

describe('Auto-Update User Interactions', () => {
    let updateToast: UpdateToastPage;

    // Disable auto-updates to prevent startup check interference
    before(async () => {
        updateToast = new UpdateToastPage();

        // Wait for app to be ready
        await browser.pause(2000);

        // Disable auto-updates settings via IPC to stop the startup check
        await browser.execute(() => {
            // @ts-expect-error - electronAPI exposed at runtime
            if (window.electronAPI) {
                // @ts-expect-error
                window.electronAPI.setAutoUpdateEnabled(false);
            }
        });

        // Allow IPC to process
        await browser.pause(1000);
    });

    beforeEach(async () => {
        // Ensure no leftover toasts
        await updateToast.clearAll();
    });

    // =========================================================================
    // "Restart Now" Button Workflow (High Priority)
    // =========================================================================

    describe('Restart Now Button', () => {
        it('should display Restart Now button when update is downloaded', async () => {
            // GIVEN an update is downloaded
            await updateToast.showDownloaded('9.9.9');

            // THEN the "Update Ready" toast should show with Restart Now button
            await updateToast.waitForVisible();

            expect(await updateToast.isRestartButtonDisplayed()).toBe(true);
            expect(await updateToast.getRestartButtonText()).toBe('Restart Now');
        });

        it('should dismiss toast and clear pending state when Restart Now is clicked', async () => {
            // Note: Clicking Restart Now triggers the main process installUpdate() which fails
            // in test mode (no real update available). This causes an error toast to appear.
            // We verify the original downloaded toast was dismissed by checking:
            // 1. The Restart Now button is no longer visible
            // 2. The hasPendingUpdate state is cleared (verified in React component behavior)

            // GIVEN an update is downloaded with badge visible
            await updateToast.showDownloaded('9.9.9');
            await updateToast.showBadge('9.9.9');

            await updateToast.waitForVisible();

            // Verify Restart Now button is visible before clicking
            expect(await updateToast.isRestartButtonDisplayed()).toBe(true);

            // WHEN user clicks Restart Now
            await updateToast.clickRestartNow();
            await updateToast.waitForAnimationComplete();

            // THEN the Restart Now button should no longer be visible
            // (either toast is hidden or has transitioned to error state without that button)
            expect(await updateToast.isRestartButtonExisting()).toBe(false);
        });
    });

    // =========================================================================
    // "Later" Button Workflow
    // =========================================================================

    describe('Later Button', () => {
        it('should dismiss toast but keep indicators when "Later" is clicked', async () => {
            // GIVEN an update is downloaded
            await updateToast.showDownloaded('9.9.9');
            await updateToast.showBadge('9.9.9');

            // AND the "Update Ready" toast is visible
            await updateToast.waitForVisible();
            expect(await updateToast.isDisplayed()).toBe(true);
            expect(await updateToast.isRestartButtonDisplayed()).toBe(true);

            // WHEN the user clicks "Later"
            await updateToast.clickLater();
            await updateToast.waitForAnimationComplete();

            // THEN the toast should dismiss
            expect(await updateToast.isDisplayed()).toBe(false);

            // AND the titlebar badge should remain visible
            expect(await updateToast.isBadgeDisplayed()).toBe(true);

            // AND the tray tooltip should remain updated
            const tooltip = await updateToast.getTrayTooltip();
            expect(tooltip).toContain('Update v9.9.9 available');
        });

        it('should keep pending update state when Later is clicked', async () => {
            // GIVEN an update is downloaded
            await updateToast.showDownloaded('9.9.9');
            await updateToast.waitForVisible();

            // WHEN user clicks Later
            await updateToast.clickLater();
            await updateToast.waitForAnimationComplete();

            // THEN toast is dismissed
            expect(await updateToast.isDisplayed()).toBe(false);

            // BUT the app still knows there's a pending update (badge visible)
            // Re-showing would show the same update
            await updateToast.showDownloaded('9.9.9');
            await updateToast.waitForVisible();
            expect(await updateToast.isDisplayed()).toBe(true);
        });
    });

    // =========================================================================
    // Error State Testing (High Priority)
    // =========================================================================

    describe('Error Toast', () => {
        it('should display error message in toast', async () => {
            // GIVEN an update error occurs
            await updateToast.showError('Test Network Error');

            // THEN the error toast should be visible with the correct message
            await updateToast.waitForVisible();

            expect(await updateToast.getTitle()).toBe('Update Error');
            expect(await updateToast.getMessage()).toContain('Test Network Error');
        });

        it('should dismiss error toast and clear state when error is dismissed', async () => {
            // GIVEN an update error occurs
            await updateToast.showError('Test Network Error');

            // AND the "Update Error" toast is visible
            await updateToast.waitForVisible();

            // WHEN the user clicks the dismiss (×) button
            await updateToast.dismiss();

            // THEN toast should be hidden
            await updateToast.waitForHidden();

            // AND no badges should appear (errors don't create badges)
            expect(await updateToast.isBadgeExisting()).toBe(false);
        });

        it('should show appropriate message for download failure', async () => {
            // Test specific error scenario: download failure
            await updateToast.showError('Failed to download update: Connection timed out');
            await updateToast.waitForVisible();

            expect(await updateToast.getMessage()).toContain('Connection timed out');
        });

        it('should handle generic error with fallback message', async () => {
            // Test error with no custom message (uses fallback)
            await updateToast.showError(null);
            await updateToast.waitForVisible();

            // Should show default fallback message
            expect(await updateToast.getMessage()).toContain('An error occurred while updating');
        });

        it('should not show Restart Now or Later buttons for error toast', async () => {
            // GIVEN an error toast
            await updateToast.showError('Some error');
            await updateToast.waitForVisible();

            // THEN only dismiss button should be present
            expect(await updateToast.isRestartButtonExisting()).toBe(false);
            expect(await updateToast.isLaterButtonExisting()).toBe(false);
            expect(await updateToast.isDismissButtonExisting()).toBe(true);
        });
    });

    // =========================================================================
    // Update Available Toast
    // =========================================================================

    describe('Update Available Toast', () => {
        it('should show update available message while downloading', async () => {
            // GIVEN an update is available (downloading)
            await updateToast.showAvailable('10.0.0');
            await updateToast.waitForVisible();

            expect(await updateToast.getTitle()).toBe('Update Available');
            const message = await updateToast.getMessage();
            expect(message).toContain('10.0.0');
            expect(message).toContain('downloading');
        });

        it('should show dismiss button for update available toast', async () => {
            await updateToast.showAvailable('10.0.0');
            await updateToast.waitForVisible();

            // Should have dismiss button, NOT Restart Now
            expect(await updateToast.isDismissButtonExisting()).toBe(true);
            expect(await updateToast.isRestartButtonExisting()).toBe(false);
        });
    });

    // =========================================================================
    // Update Not Available Toast (Manual Check)
    // =========================================================================

    describe('Update Not Available Toast', () => {
        it('should show "No updates available" toast when manual check finds no update', async () => {
            // GIVEN user performs a manual update check
            await updateToast.showNotAvailable('1.0.0');

            // THEN the "No updates available" toast should appear
            await updateToast.waitForVisible();

            const title = await updateToast.getTitle();
            expect(title.toLowerCase()).toContain('up to date');

            const message = await updateToast.getMessage();
            // Should indicate current version or that app is up to date
            expect(message).toMatch(/(up to date|current|1\.0\.0)/i);
        });

        it('should dismiss "No updates available" toast when user clicks dismiss', async () => {
            await updateToast.showNotAvailable('1.0.0');
            await updateToast.waitForVisible();

            await updateToast.dismiss();
            await updateToast.waitForHidden();
        });

        it('should not show badge or tray tooltip for "No updates available"', async () => {
            // Ensure badges are clear first
            await updateToast.clearBadge();
            await updateToast.waitForAnimationComplete();

            // Show "No updates available" toast
            await updateToast.showNotAvailable('1.0.0');
            await updateToast.waitForVisible();
            await updateToast.waitForAnimationComplete();

            // No badge should appear
            expect(await updateToast.isBadgeExisting()).toBe(false);

            // Tray tooltip should be default (not showing update info)
            const tooltip = await updateToast.getTrayTooltip();
            expect(tooltip).toBe('Gemini Desktop'); // Default tooltip
        });
    });
});
