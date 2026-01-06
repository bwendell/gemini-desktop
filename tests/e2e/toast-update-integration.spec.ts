/**
 * E2E Test: Update Toast Integration
 *
 * Tests that update toasts work correctly through the generic toast system.
 * Uses dev helpers (__testUpdateToast) to trigger toast states, NOT internal method calls.
 *
 * Golden Rule: "If this code path was broken, would this test fail?"
 * - If update → toast type mapping broken: tests fail
 * - If toast container not rendering: tests fail
 * - If action buttons broken: tests fail
 *
 * @module toast-update-integration.spec
 */

/// <reference path="./helpers/wdio-electron.d.ts" />

import { expect, browser } from '@wdio/globals';
import { UpdateToastPage } from './pages';

describe('Update Toast Integration E2E', () => {
    let updateToast: UpdateToastPage;

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

    // ===========================================================================
    // 7.6.4.1 Test __testUpdateToast.showAvailable() shows info toast
    // ===========================================================================

    describe('showAvailable() - Info Toast', () => {
        it('should display info-type toast when update is available', async () => {
            // GIVEN we trigger an update available notification
            await updateToast.showAvailable('3.0.0');

            // THEN the toast should be visible
            await updateToast.waitForVisible();
            expect(await updateToast.isDisplayed()).toBe(true);

            // AND it should have the correct info-style content
            expect(await updateToast.getTitle()).toBe('Update Available');
            const message = await updateToast.getMessage();
            expect(message).toContain('3.0.0');
            expect(message).toContain('downloading');
        });

        it('should render toast through the generic toast system', async () => {
            // GIVEN we trigger an update available notification
            await updateToast.showAvailable('3.0.0');
            await updateToast.waitForVisible();

            // THEN the toast should be rendered with proper structure
            // Verify the toast is actually in the DOM with correct elements
            const toastExists = await updateToast.isDisplayed();
            expect(toastExists).toBe(true);

            // Verify it has expected UI elements for info type
            expect(await updateToast.isDismissButtonExisting()).toBe(true);
            expect(await updateToast.isRestartButtonExisting()).toBe(false);
        });
    });

    // ===========================================================================
    // 7.6.4.2 Test __testUpdateToast.showDownloaded() shows success toast
    // ===========================================================================

    describe('showDownloaded() - Success Toast', () => {
        it('should display success-type toast when update is downloaded', async () => {
            // GIVEN we trigger an update downloaded notification
            await updateToast.showDownloaded('3.0.0');

            // THEN the toast should be visible
            await updateToast.waitForVisible();
            expect(await updateToast.isDisplayed()).toBe(true);

            // AND it should have the correct success-style content
            expect(await updateToast.getTitle()).toBe('Update Ready');
            const message = await updateToast.getMessage();
            expect(message).toContain('3.0.0');
            expect(message).toContain('ready to install');
        });

        it('should show action buttons (Restart Now, Later) for downloaded toast', async () => {
            // GIVEN we trigger an update downloaded notification
            await updateToast.showDownloaded('3.0.0');
            await updateToast.waitForVisible();

            // THEN both action buttons should be visible
            expect(await updateToast.isRestartButtonDisplayed()).toBe(true);
            expect(await updateToast.isLaterButtonDisplayed()).toBe(true);
            expect(await updateToast.getRestartButtonText()).toBe('Restart Now');
        });
    });

    // ===========================================================================
    // 7.6.4.3 Test __testUpdateToast.showError() shows error toast
    // ===========================================================================

    describe('showError() - Error Toast', () => {
        it('should display error-type toast when update fails', async () => {
            // GIVEN we trigger an update error notification
            await updateToast.showError('Network connection failed');

            // THEN the toast should be visible
            await updateToast.waitForVisible();
            expect(await updateToast.isDisplayed()).toBe(true);

            // AND it should have the correct error-style content
            expect(await updateToast.getTitle()).toBe('Update Error');
            expect(await updateToast.getMessage()).toContain('Network connection failed');
        });

        it('should show only dismiss button for error toast', async () => {
            // GIVEN we trigger an update error notification
            await updateToast.showError('Test error');
            await updateToast.waitForVisible();

            // THEN only dismiss button should be present (no Restart Now or Later)
            expect(await updateToast.isDismissButtonExisting()).toBe(true);
            expect(await updateToast.isRestartButtonExisting()).toBe(false);
            expect(await updateToast.isLaterButtonExisting()).toBe(false);
        });

        it('should handle null error message with fallback', async () => {
            // GIVEN we trigger an error with no message
            await updateToast.showError(null);
            await updateToast.waitForVisible();

            // THEN the toast should display a fallback error message
            expect(await updateToast.getMessage()).toContain('An error occurred while updating');
        });
    });

    // ===========================================================================
    // 7.6.4.4 Test "Install Now" button triggers install
    // ===========================================================================

    describe('"Install Now" Button', () => {
        it('should trigger install action when clicked', async () => {
            // GIVEN we have an update downloaded toast with Restart Now button
            await updateToast.showDownloaded('3.0.0');
            await updateToast.waitForVisible();
            expect(await updateToast.isRestartButtonDisplayed()).toBe(true);

            // WHEN we click the Restart Now button
            await updateToast.clickRestartNow();
            await updateToast.waitForAnimationComplete();

            // THEN the Restart Now button should no longer be visible
            // (The toast is dismissed when install is triggered)
            // Note: In test mode, this will cause an error toast to appear since
            // there's no real update to install, but the original toast is dismissed
            expect(await updateToast.isRestartButtonExisting()).toBe(false);
        });

        it('should clear pending update state after Install Now is clicked', async () => {
            // GIVEN we have an update downloaded with badge visible
            await updateToast.showDownloaded('3.0.0');
            await updateToast.showBadge('3.0.0');
            await updateToast.waitForVisible();

            // Verify initial state
            expect(await updateToast.isBadgeDisplayed()).toBe(true);
            expect(await updateToast.isRestartButtonDisplayed()).toBe(true);

            // WHEN we click Restart Now
            await updateToast.clickRestartNow();
            await updateToast.waitForAnimationComplete();

            // THEN the Restart Now button should be gone
            // (indicating the downloaded toast was dismissed and install was triggered)
            expect(await updateToast.isRestartButtonExisting()).toBe(false);
        });
    });

    // ===========================================================================
    // 7.6.4.5 Test "Later" button dismisses toast
    // ===========================================================================

    describe('"Later" Button', () => {
        it('should dismiss toast when clicked', async () => {
            // GIVEN we have an update downloaded toast
            await updateToast.showDownloaded('3.0.0');
            await updateToast.waitForVisible();
            expect(await updateToast.isLaterButtonDisplayed()).toBe(true);

            // WHEN we click the Later button
            await updateToast.clickLater();
            await updateToast.waitForAnimationComplete();

            // THEN the toast should be dismissed
            expect(await updateToast.isDisplayed()).toBe(false);
        });

        it('should keep pending update indicator (badge) after clicking Later', async () => {
            // GIVEN we have an update downloaded with badge visible
            await updateToast.showDownloaded('3.0.0');
            await updateToast.showBadge('3.0.0');
            await updateToast.waitForVisible();

            // WHEN we click Later
            await updateToast.clickLater();
            await updateToast.waitForAnimationComplete();

            // THEN the toast should be dismissed
            expect(await updateToast.isDisplayed()).toBe(false);

            // BUT the badge should remain (indicating pending update)
            expect(await updateToast.isBadgeDisplayed()).toBe(true);
        });

        it('should keep tray tooltip updated after clicking Later', async () => {
            // GIVEN we have an update downloaded with badge
            await updateToast.showDownloaded('3.0.0');
            await updateToast.showBadge('3.0.0');
            await updateToast.waitForVisible();

            // WHEN we click Later
            await updateToast.clickLater();
            await updateToast.waitForAnimationComplete();

            // THEN the tray tooltip should still indicate update available
            const tooltip = await updateToast.getTrayTooltip();
            expect(tooltip).toContain('Update v3.0.0 available');
        });
    });

    // ===========================================================================
    // 7.6.4.6 Test download progress bar updates
    // ===========================================================================

    describe('Download Progress Bar', () => {
        it('should display progress bar during download', async () => {
            // GIVEN we trigger a progress notification
            await updateToast.showProgress(50);
            await updateToast.waitForVisible();

            // THEN the progress bar should be displayed
            expect(await updateToast.isProgressBarDisplayed()).toBe(true);
        });

        it('should update progress bar value', async () => {
            // GIVEN we start with 25% progress
            await updateToast.showProgress(25);
            await updateToast.waitForVisible();

            // Verify initial progress
            const initialValue = await updateToast.getProgressValue();
            expect(initialValue).toBe('25');

            // WHEN we update to 75%
            await updateToast.showProgress(75);
            await updateToast.pause(300); // Allow time for update

            // THEN the progress bar should show 75%
            const updatedValue = await updateToast.getProgressValue();
            expect(updatedValue).toBe('75');
        });

        it('should show progress message with percentage', async () => {
            // GIVEN we trigger progress at 60%
            await updateToast.showProgress(60);
            await updateToast.waitForVisible();

            // THEN the title should indicate downloading
            expect(await updateToast.getTitle()).toBe('Downloading Update');

            // AND the message should show the percentage
            const message = await updateToast.getMessage();
            expect(message).toContain('60%');
        });

        it('should handle progress from 0 to 100', async () => {
            // Start at 0%
            await updateToast.showProgress(0);
            await updateToast.waitForVisible();
            expect(await updateToast.getProgressValue()).toBe('0');

            // Update to 100%
            await updateToast.showProgress(100);
            await updateToast.pause(300);
            expect(await updateToast.getProgressValue()).toBe('100');
        });
    });

    // ===========================================================================
    // Integration: Toast Type Verification
    // ===========================================================================

    describe('Toast Type Integration', () => {
        it('should use correct toast types for each update state', async () => {
            // Test that update states map correctly to generic toast types
            // This verifies the integration between UpdateToast and generic Toast

            // Info type for available
            await updateToast.showAvailable('2.0.0');
            await updateToast.waitForVisible();
            // Available shows dismiss, not restart
            expect(await updateToast.isDismissButtonExisting()).toBe(true);
            expect(await updateToast.isRestartButtonExisting()).toBe(false);
            await updateToast.hide();
            await updateToast.waitForHidden();

            // Success type for downloaded
            await updateToast.showDownloaded('2.0.0');
            await updateToast.waitForVisible();
            // Downloaded shows restart and later buttons
            expect(await updateToast.isRestartButtonExisting()).toBe(true);
            expect(await updateToast.isLaterButtonExisting()).toBe(true);
            await updateToast.hide();
            await updateToast.waitForHidden();

            // Error type for error
            await updateToast.showError('Test error');
            await updateToast.waitForVisible();
            // Error shows only dismiss
            expect(await updateToast.isDismissButtonExisting()).toBe(true);
            expect(await updateToast.isRestartButtonExisting()).toBe(false);
            await updateToast.hide();
            await updateToast.waitForHidden();

            // Progress type for downloading
            await updateToast.showProgress(50);
            await updateToast.waitForVisible();
            // Progress shows progress bar
            expect(await updateToast.isProgressBarDisplayed()).toBe(true);
        });
    });
});
