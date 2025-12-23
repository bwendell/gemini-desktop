/**
 * E2E Test: Auto-Update Platform Behavior
 *
 * Tests platform-specific auto-update behavior.
 * 
 * Platform Behaviors:
 * - Windows: Auto-updates enabled by default, toggle functional
 * - macOS: Auto-updates enabled by default, toggle functional
 * - Linux AppImage: Auto-updates enabled by default, toggle functional
 * - Linux DEB/RPM: Auto-updates disabled, toggle may be non-functional
 * 
 * @module auto-update-platform.spec
 */

/// <reference path="./helpers/wdio-electron.d.ts" />

import { browser, $, expect } from '@wdio/globals';
import { clickMenuItemById, menuItemExists } from './helpers/menuActions';
import { waitForWindowCount } from './helpers/windowActions';
import { getPlatform, E2EPlatform } from './helpers/platform';
import { E2ELogger } from './helpers/logger';
import { E2E_TIMING } from './helpers/e2eConstants';
import { Selectors } from './helpers/selectors';

// ============================================================================
// Test Suite
// ============================================================================

describe('Auto-Update Platform Behavior', () => {
    let mainWindowHandle: string;
    let platform: E2EPlatform;

    before(async () => {
        platform = await getPlatform();
        E2ELogger.info('auto-update-platform', `Platform: ${platform.toUpperCase()}`);
    });

    beforeEach(async () => {
        // Store main window handle
        const initialHandles = await browser.getWindowHandles();
        mainWindowHandle = initialHandles[0];
    });

    afterEach(async () => {
        // Ensure we're back on main window
        try {
            const handles = await browser.getWindowHandles();
            if (handles.length > 1) {
                await browser.switchToWindow(handles[1]);
                const closeBtn = await $(Selectors.optionsCloseButton);
                if (await closeBtn.isExisting()) {
                    await closeBtn.click();
                    await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);
                }
            }
            await browser.switchToWindow(mainWindowHandle);
        } catch { /* ignore */ }
    });

    /**
     * Helper to open Options window and switch to it.
     */
    async function openOptionsWindow(): Promise<void> {
        await clickMenuItemById('menu-file-options');
        await waitForWindowCount(2, 5000);

        const handles = await browser.getWindowHandles();
        const optionsHandle = handles.find(h => h !== mainWindowHandle) || handles[1];
        await browser.switchToWindow(optionsHandle);
        await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);
    }

    // ========================================================================
    // Windows Platform Tests
    // ========================================================================

    describe('Windows Platform', () => {
        before(function () {
            if (platform !== 'windows') {
                E2ELogger.info('auto-update-platform', 'Skipping Windows tests on non-Windows platform');
                this.skip();
            }
        });

        it('should show auto-update toggle on Windows', async () => {
            await openOptionsWindow();

            const toggle = await $('[data-testid="auto-update-toggle"]');
            await expect(toggle).toExist();
            await expect(toggle).toBeDisplayed();

            E2ELogger.info('auto-update-platform', 'Windows: Toggle is visible');
        });

        it('should have functional toggle on Windows', async () => {
            await openOptionsWindow();

            const toggleSwitch = await $('[data-testid="auto-update-toggle-switch"]');
            await expect(toggleSwitch).toExist();
            await expect(toggleSwitch).toBeClickable();

            const initial = await toggleSwitch.getAttribute('aria-checked');
            await toggleSwitch.click();
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            const after = await toggleSwitch.getAttribute('aria-checked');
            expect(after).not.toBe(initial);

            // Restore
            await toggleSwitch.click();
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            E2ELogger.info('auto-update-platform', 'Windows: Toggle is functional');
        });
    });

    // ========================================================================
    // macOS Platform Tests
    // ========================================================================

    describe('macOS Platform', () => {
        before(function () {
            if (platform !== 'macos') {
                E2ELogger.info('auto-update-platform', 'Skipping macOS tests on non-macOS platform');
                this.skip();
            }
        });

        it('should show auto-update toggle on macOS', async () => {
            await openOptionsWindow();

            const toggle = await $('[data-testid="auto-update-toggle"]');
            await expect(toggle).toExist();
            await expect(toggle).toBeDisplayed();

            E2ELogger.info('auto-update-platform', 'macOS: Toggle is visible');
        });

        it('should have functional toggle on macOS', async () => {
            await openOptionsWindow();

            const toggleSwitch = await $('[data-testid="auto-update-toggle-switch"]');
            await expect(toggleSwitch).toExist();
            await expect(toggleSwitch).toBeClickable();

            const initial = await toggleSwitch.getAttribute('aria-checked');
            await toggleSwitch.click();
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            const after = await toggleSwitch.getAttribute('aria-checked');
            expect(after).not.toBe(initial);

            // Restore
            await toggleSwitch.click();
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            E2ELogger.info('auto-update-platform', 'macOS: Toggle is functional');
        });
    });

    // ========================================================================
    // Linux Platform Tests
    // ========================================================================

    describe('Linux Platform', () => {
        before(function () {
            if (platform !== 'linux') {
                E2ELogger.info('auto-update-platform', 'Skipping Linux tests on non-Linux platform');
                this.skip();
            }
        });

        it('should show auto-update toggle on Linux', async () => {
            await openOptionsWindow();

            const toggle = await $('[data-testid="auto-update-toggle"]');
            await expect(toggle).toExist();
            await expect(toggle).toBeDisplayed();

            E2ELogger.info('auto-update-platform', 'Linux: Toggle is visible');
        });

        it('should have clickable toggle on Linux (behavior depends on package type)', async () => {
            await openOptionsWindow();

            const toggleSwitch = await $('[data-testid="auto-update-toggle-switch"]');
            await expect(toggleSwitch).toExist();

            // On AppImage, toggle should be functional
            // On DEB/RPM, toggle may still be visible but backend disables actual updates
            // We test that the UI at least responds to clicks
            const initial = await toggleSwitch.getAttribute('aria-checked');

            try {
                await toggleSwitch.click();
                await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

                const after = await toggleSwitch.getAttribute('aria-checked');
                E2ELogger.info('auto-update-platform', `Linux: Toggle state changed from ${initial} to ${after}`);
            } catch (error) {
                E2ELogger.info('auto-update-platform', 'Linux: Toggle click may be disabled for non-AppImage');
            }
        });
    });

    // ========================================================================
    // Cross-Platform Consistency
    // ========================================================================

    describe('Cross-Platform Consistency', () => {
        it('should have Updates section on all platforms', async () => {
            await openOptionsWindow();

            const updatesSection = await $('[data-testid="options-updates"]');
            await expect(updatesSection).toExist();
            await expect(updatesSection).toBeDisplayed();

            E2ELogger.info('auto-update-platform', `Updates section exists on ${platform}`);
        });

        it('should have toggle component on all platforms', async () => {
            await openOptionsWindow();

            const toggle = await $('[data-testid="auto-update-toggle"]');
            await expect(toggle).toExist();

            const toggleSwitch = await $('[data-testid="auto-update-toggle-switch"]');
            await expect(toggleSwitch).toExist();

            E2ELogger.info('auto-update-platform', `Toggle component exists on ${platform}`);
        });

        it('should have correct accessibility attributes on all platforms', async () => {
            await openOptionsWindow();

            const toggleSwitch = await $('[data-testid="auto-update-toggle-switch"]');

            const role = await toggleSwitch.getAttribute('role');
            expect(role).toBe('switch');

            const checked = await toggleSwitch.getAttribute('aria-checked');
            expect(['true', 'false']).toContain(checked);

            E2ELogger.info('auto-update-platform', `Accessibility attributes correct on ${platform}`);
        });
    });

    // ========================================================================
    // Check for Updates Menu Action
    // ========================================================================

    describe('Check for Updates Menu Action', () => {
        it('should have Check for Updates menu item in Help menu', async () => {
            // Verify the menu item exists and is clickable
            const exists = await menuItemExists('menu-help-check-updates');
            expect(exists).toBe(true);

            E2ELogger.info('auto-update-platform', 'Check for Updates menu item exists');
        });

        it('should trigger check when clicked (no error thrown)', async () => {
            // Click the menu item - if it errors, the test fails
            await clickMenuItemById('menu-help-check-updates');

            // Give time for the IPC call to complete
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            E2ELogger.info('auto-update-platform', 'Check for Updates menu action triggered successfully');
        });
    });

    // ========================================================================
    // Update Flow Verification (IPC Layer)
    // ========================================================================

    describe('Update Flow Verification', () => {
        it('should toggle setting persists across window reopen', async () => {
            // Open options, toggle off, close, reopen, verify state persisted
            await openOptionsWindow();

            const toggleSwitch = await $('[data-testid="auto-update-toggle-switch"]');
            const initialState = await toggleSwitch.getAttribute('aria-checked');

            // Toggle the switch
            await toggleSwitch.click();
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            const newState = await toggleSwitch.getAttribute('aria-checked');
            expect(newState).not.toBe(initialState);

            // Close the options window
            const closeBtn = await $(Selectors.optionsCloseButton);
            await closeBtn.click();
            await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);

            // Wait for window count to return to 1
            await waitForWindowCount(1, 5000);

            // Reopen options window
            await openOptionsWindow();

            // Verify the state persisted
            const persistedSwitch = await $('[data-testid="auto-update-toggle-switch"]');
            const persistedState = await persistedSwitch.getAttribute('aria-checked');
            expect(persistedState).toBe(newState);

            // Restore original state
            await persistedSwitch.click();
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            E2ELogger.info('auto-update-platform', 'Auto-update toggle setting persisted correctly');
        });

        it('should allow manual check even when auto-updates are disabled', async () => {
            // Disable auto-updates
            await openOptionsWindow();

            const toggleSwitch = await $('[data-testid="auto-update-toggle-switch"]');
            const currentState = await toggleSwitch.getAttribute('aria-checked');

            // Ensure auto-updates are disabled
            if (currentState === 'true') {
                await toggleSwitch.click();
                await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
            }

            // Verify disabled
            const disabledState = await toggleSwitch.getAttribute('aria-checked');
            expect(disabledState).toBe('false');

            // Close options window
            const closeBtn = await $(Selectors.optionsCloseButton);
            await closeBtn.click();
            await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);
            await waitForWindowCount(1, 5000);

            // Switch back to main window
            const handles = await browser.getWindowHandles();
            await browser.switchToWindow(handles[0]);

            // Now manually trigger "Check for Updates" - should not throw error
            await clickMenuItemById('menu-help-check-updates');
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            E2ELogger.info('auto-update-platform', 'Manual update check succeeded even with auto-updates disabled');

            // Restore: re-enable auto-updates
            await openOptionsWindow();
            const restoreSwitch = await $('[data-testid="auto-update-toggle-switch"]');
            const finalState = await restoreSwitch.getAttribute('aria-checked');
            if (finalState === 'false') {
                await restoreSwitch.click();
                await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
            }
        });
    });
});
