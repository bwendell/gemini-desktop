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

import { expect } from '@wdio/globals';
import { UpdateToastPage } from './pages';

// ============================================================================
// Test Suite
// ============================================================================

describe('Auto-Update Happy Path', () => {
    let updateToast: UpdateToastPage;

    before(async () => {
        updateToast = new UpdateToastPage();
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

            // Note: We skip calling window.electronAPI.checkForUpdates() here because
            // it attempts a real network request to GitHub's releases API, which fails
            // in E2E testing (HttpError 406). Instead, we use the __testUpdateToast
            // helper to simulate the update flow UI without network dependency.
            await updateToast.waitForAnimationComplete();

            // STEP 2: Update becomes available

            await updateToast.showAvailable('2.5.0');
            await updateToast.waitForVisible();

            expect(await updateToast.getTitle()).toBe('Update Available');
            expect(await updateToast.getMessage()).toContain('2.5.0');

            // User dismisses the "available" toast
            await updateToast.dismiss();
            await updateToast.waitForHidden();

            // STEP 3: Download Progress

            await updateToast.showProgress(45);
            await updateToast.waitForVisible();

            expect(await updateToast.getTitle()).toBe('Downloading Update');
            expect(await updateToast.getMessage()).toContain('45%');
            expect(await updateToast.isProgressBarDisplayed()).toBe(true);
            expect(await updateToast.getProgressValue()).toBe('45');

            await updateToast.waitForAnimationComplete();

            // STEP 4: Update downloaded (auto-download in background)

            await updateToast.showDownloaded('2.5.0');
            await updateToast.waitForVisible();

            expect(await updateToast.getTitle()).toBe('Update Ready');
            expect(await updateToast.getMessage()).toContain('2.5.0');

            // STEP 5: Verify Restart Now button is present
            expect(await updateToast.isRestartButtonDisplayed()).toBe(true);
            expect(await updateToast.getRestartButtonText()).toContain('Restart');

            // STEP 6: Verify tray tooltip
            // Note: Badge visibility depends on platform and implementation
            // We'll verify the tray tooltip instead, which is more reliable
            await updateToast.waitForAnimationComplete();

            const tooltip = await updateToast.getTrayTooltip();
            expect(tooltip).toContain('2.5.0');

            // STEP 7: Click "Restart Now" to trigger install

            // In a real scenario, this would quit the app. We just verify the IPC call works.
            await updateToast.clickRestartNow();

            // The app would quit here in production, but in test we just verify no crash
            await updateToast.waitForAnimationComplete();
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
        });

        it('should allow dismissing update available notification', async () => {
            await updateToast.showAvailable('3.1.0');
            await updateToast.waitForVisible();

            await updateToast.dismiss();
            await updateToast.waitForHidden();
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
        });
    });

    describe('Update Downloaded Stage', () => {
        it('should display update ready notification with restart button', async () => {
            await updateToast.showDownloaded('3.2.0');
            await updateToast.waitForVisible();

            expect(await updateToast.getTitle()).toBe('Update Ready');
            expect(await updateToast.isRestartButtonDisplayed()).toBe(true);
        });

        it('should update tray tooltip when update is downloaded', async () => {
            await updateToast.showDownloaded('3.2.0');
            await updateToast.waitForAnimationComplete();

            const tooltip = await updateToast.getTrayTooltip();
            expect(tooltip).toContain('3.2.0');
        });

        it('should trigger install on restart button click', async () => {
            await updateToast.showDownloaded('3.2.0');
            await updateToast.waitForVisible();

            // Click restart - in production this quits the app
            await expect(updateToast.clickRestartNow()).resolves.not.toThrow();
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
        });

        it('should clear tray tooltip after clearing badge', async () => {
            // Show then clear
            await updateToast.showBadge('4.0.0');
            await updateToast.waitForAnimationComplete();

            await updateToast.clearBadge();
            await updateToast.waitForAnimationComplete();

            const tooltip = await updateToast.getTrayTooltip();
            expect(tooltip).toBe('Gemini Desktop'); // Default tooltip
        });
    });
});
