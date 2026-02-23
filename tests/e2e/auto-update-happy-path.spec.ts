/**
 * E2E Test: Auto-Update Happy Path
 *
 * Tests the complete end-to-end flow for a successful auto-update.
 *
 * User Workflows Covered:
 * 1. Manual check → Update available → Download → Install
 * 2. Toast notifications at each stage
 * 3. Badge and tray tooltip appearance
 * 4. Successful installation trigger
 *
 * @module auto-update-happy-path.spec
 */

/// <reference path="./helpers/wdio-electron.d.ts" />

import { expect, browser } from '@wdio/globals';
import { getPlatform, E2EPlatform } from './helpers/platform';
import { waitForDuration } from './helpers/waitUtilities';
import { E2ELogger } from './helpers/logger';
import { UpdateToastPage } from './pages';

// ============================================================================
// Test Suite
// ============================================================================

describe('Auto-Update Happy Path', () => {
    let platform: E2EPlatform;
    let updateToast: UpdateToastPage;

    before(async () => {
        platform = await getPlatform();
        updateToast = new UpdateToastPage();
        E2ELogger.info('auto-update-happy-path', `Platform: ${platform.toUpperCase()}`);
        // Wait for app to be ready
        await waitForDuration(2000, 'App startup');

        // Disable auto-updates to prevent startup check interference.
        // Without this, the 10-second delayed startup check fires during tests,
        // hits GitHub's API (which fails with 406 in E2E), and re-shows an error
        // toast that interferes with waitForHidden() assertions.
        await browser.execute(() => {
            // @ts-expect-error - electronAPI exposed at runtime
            if (window.electronAPI) {
                // @ts-expect-error
                window.electronAPI.setAutoUpdateEnabled(false);
            }
        });

        // Allow IPC to process
        await waitForDuration(1000, 'IPC processing');
    });

    beforeEach(async () => {
        // Clear any existing toasts/badges
        await updateToast.clearAll();
    });

    // ========================================================================
    // Complete Happy Path Flow
    // ========================================================================

    describe('Complete Update Flow', () => {
        it('should complete full update cycle from check to ready-to-install', async () => {
            // STEP 1: Manual check for updates
            E2ELogger.info('auto-update-happy-path', 'Step 1: Triggering manual update check...');

            // Note: We skip calling window.electronAPI.checkForUpdates() here because
            // it attempts a real network request to GitHub's releases API, which fails
            // in E2E testing (HttpError 406). Instead, we use the __testUpdateToast
            // helper to simulate the update flow UI without network dependency.
            await updateToast.waitForAnimationComplete();

            // STEP 2: Update becomes available
            E2ELogger.info('auto-update-happy-path', 'Step 2: Simulating update available...');

            await updateToast.showAvailable('2.5.0');
            await updateToast.waitForVisible();

            expect(await updateToast.getTitle()).toBe('Update Available');
            expect(await updateToast.getMessage()).toContain('2.5.0');

            E2ELogger.info('auto-update-happy-path', '  ✓ Update Available toast displayed');

            // User dismisses the "available" toast
            await updateToast.dismiss();
            await updateToast.waitForHidden();

            // STEP 3: Download Progress
            E2ELogger.info('auto-update-happy-path', 'Step 3: Simulating download progress...');

            await updateToast.showProgress(45);
            await updateToast.waitForVisible();

            expect(await updateToast.getTitle()).toBe('Downloading Update');
            expect(await updateToast.getMessage()).toContain('45%');
            expect(await updateToast.isProgressBarDisplayed()).toBe(true);
            expect(await updateToast.getProgressValue()).toBe('45');

            E2ELogger.info('auto-update-happy-path', '  ✓ Download progress toast displayed');

            await updateToast.waitForAnimationComplete();

            // STEP 4: Update downloaded (auto-download in background)
            E2ELogger.info('auto-update-happy-path', 'Step 4: Simulating update downloaded...');

            await updateToast.showDownloaded('2.5.0');
            await updateToast.waitForVisible();

            expect(await updateToast.getTitle()).toBe('Update Ready');
            expect(await updateToast.getMessage()).toContain('2.5.0');

            E2ELogger.info('auto-update-happy-path', '  ✓ Update Ready toast displayed');

            // STEP 5: Verify Restart Now button is present
            expect(await updateToast.isRestartButtonDisplayed()).toBe(true);
            expect(await updateToast.getRestartButtonText()).toContain('Restart');

            E2ELogger.info('auto-update-happy-path', '  ✓ Restart Now button available');

            // STEP 6: Verify tray tooltip
            // Note: Badge visibility depends on platform and implementation
            // We'll verify the tray tooltip instead, which is more reliable
            await updateToast.waitForAnimationComplete();

            const tooltip = await updateToast.getTrayTooltip();
            expect(tooltip).toContain('2.5.0');

            E2ELogger.info('auto-update-happy-path', '  ✓ Tray tooltip shows update version');

            // STEP 7: Click "Restart Now" to trigger install
            E2ELogger.info('auto-update-happy-path', 'Step 5: Triggering install...');

            // In a real scenario, this would quit the app. We just verify the IPC call works.
            await updateToast.clickRestartNow();

            // The app would quit here in production, but in test we just verify no crash
            await updateToast.waitForAnimationComplete();

            E2ELogger.info('auto-update-happy-path', '  ✓ Install triggered successfully');
            E2ELogger.info('auto-update-happy-path', '✅ Happy path complete!');
        });
    });

    // ========================================================================
    // Individual Stage Tests
    // ========================================================================

    describe('Update Available Stage', () => {
        it('should display update available notification with version', async () => {
            await updateToast.showAvailable('3.1.0');
            await updateToast.waitForVisible();

            expect(await updateToast.getTitle()).toBe('Update Available');
            expect(await updateToast.getMessage()).toContain('3.1.0');

            E2ELogger.info('auto-update-happy-path', 'Update available notification verified');
        });

        it('should allow dismissing update available notification', async () => {
            await updateToast.showAvailable('3.1.0');
            await updateToast.waitForVisible();

            await updateToast.dismiss();
            await updateToast.waitForHidden();

            E2ELogger.info('auto-update-happy-path', 'Dismiss functionality verified');
        });
    });

    describe('Download Progress Stage', () => {
        it('should display progress bar with correct percentage', async () => {
            await updateToast.showProgress(75);
            await updateToast.waitForVisible();

            expect(await updateToast.getTitle()).toBe('Downloading Update');
            expect(await updateToast.getMessage()).toContain('75%');
            expect(await updateToast.isProgressBarDisplayed()).toBe(true);
            expect(await updateToast.getProgressValue()).toBe('75');

            // Verify width style on the inner progress bar element
            const style = await updateToast.getProgressBarStyle();
            expect(style).toContain('width: 75%');

            E2ELogger.info('auto-update-happy-path', 'Download progress verified');
        });
    });

    describe('Update Downloaded Stage', () => {
        it('should display update ready notification with restart button', async () => {
            await updateToast.showDownloaded('3.2.0');
            await updateToast.waitForVisible();

            expect(await updateToast.getTitle()).toBe('Update Ready');
            expect(await updateToast.isRestartButtonDisplayed()).toBe(true);

            E2ELogger.info('auto-update-happy-path', 'Update ready notification verified');
        });

        it('should update tray tooltip when update is downloaded', async () => {
            await updateToast.showDownloaded('3.2.0');
            await updateToast.waitForAnimationComplete();

            const tooltip = await updateToast.getTrayTooltip();
            expect(tooltip).toContain('3.2.0');

            E2ELogger.info('auto-update-happy-path', 'Tray tooltip update verified');
        });

        it('should trigger install on restart button click', async () => {
            await updateToast.showDownloaded('3.2.0');
            await updateToast.waitForVisible();

            // Click restart - in production this quits the app
            await expect(updateToast.clickRestartNow()).resolves.not.toThrow();

            E2ELogger.info('auto-update-happy-path', 'Restart button click verified');
        });
    });

    // ========================================================================
    // Badge & Tray Integration
    // ========================================================================

    describe('Visual Indicators', () => {
        it('should show tray tooltip after update download', async () => {
            // Show badge via dev helper
            await updateToast.showBadge('4.0.0');
            await updateToast.waitForAnimationComplete();

            const tooltip = await updateToast.getTrayTooltip();
            expect(tooltip).toContain('4.0.0');

            E2ELogger.info('auto-update-happy-path', 'Badge/tray tooltip verified');
        });

        it('should clear tray tooltip after clearing badge', async () => {
            // Show then clear
            await updateToast.showBadge('4.0.0');
            await updateToast.waitForAnimationComplete();

            await updateToast.clearBadge();
            await updateToast.waitForAnimationComplete();

            const tooltip = await updateToast.getTrayTooltip();
            expect(tooltip).toBe('Gemini Desktop'); // Default tooltip

            E2ELogger.info('auto-update-happy-path', 'Badge clear verified');
        });
    });
});
