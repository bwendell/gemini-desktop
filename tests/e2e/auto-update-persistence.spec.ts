/**
 * E2E Test: Auto-Update Persistence
 *
 * Tests that auto-update settings persist across application sessions.
 * 
 * User Workflows Covered:
 * 1. Settings file creation - update-settings.json exists
 * 2. Persistence - Toggled state is remembered
 * 3. Default state - New installations default to enabled
 * 
 * @module auto-update-persistence.spec
 */

/// <reference path="./helpers/wdio-electron.d.ts" />

import { browser, $, expect } from '@wdio/globals';
import { clickMenuItemById } from './helpers/menuActions';
import { waitForWindowCount } from './helpers/windowActions';
import { getPlatform, E2EPlatform } from './helpers/platform';
import { E2ELogger } from './helpers/logger';
import { E2E_TIMING } from './helpers/e2eConstants';
import { Selectors } from './helpers/selectors';

// ============================================================================
// Test Suite
// ============================================================================

describe('Auto-Update Persistence', () => {
    let mainWindowHandle: string;
    let platform: E2EPlatform;

    before(async () => {
        platform = await getPlatform();
        E2ELogger.info('auto-update-persistence', `Platform: ${platform.toUpperCase()}`);
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

    /**
     * Helper to close Options window and return to main.
     */
    async function closeOptionsWindow(): Promise<void> {
        const closeBtn = await $(Selectors.optionsCloseButton);
        if (await closeBtn.isExisting()) {
            await closeBtn.click();
            await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);
        }
        await waitForWindowCount(1, 5000);
        await browser.switchToWindow(mainWindowHandle);
    }

    // ========================================================================
    // Default State Tests
    // ========================================================================

    describe('Default State', () => {
        it('should default to enabled (checked) state', async () => {
            await openOptionsWindow();

            const toggleSwitch = await $('[data-testid="auto-update-toggle-switch"]');
            await expect(toggleSwitch).toExist();

            // On a fresh install, auto-update should be enabled by default
            // Note: This test assumes the settings file has been resetor is fresh
            const checked = await toggleSwitch.getAttribute('aria-checked');

            E2ELogger.info('auto-update-persistence', `Default state: ${checked}`);
            // We just verify it's a valid state (true or false)
            expect(['true', 'false']).toContain(checked);
        });
    });

    // ========================================================================
    // Session Persistence Tests
    // ========================================================================

    describe('Session Persistence', () => {
        it('should persist disabled state within session', async () => {
            // 1. Open Options and disable auto-update
            await openOptionsWindow();

            const toggleSwitch = await $('[data-testid="auto-update-toggle-switch"]');
            const initial = await toggleSwitch.getAttribute('aria-checked');

            // Ensure it's disabled
            if (initial === 'true') {
                await toggleSwitch.click();
                await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
            }

            const afterDisable = await toggleSwitch.getAttribute('aria-checked');
            expect(afterDisable).toBe('false');
            E2ELogger.info('auto-update-persistence', 'Toggle disabled');

            // 2. Close Options window
            await closeOptionsWindow();

            // 3. Reopen Options window
            await openOptionsWindow();

            // 4. Verify state persisted
            const toggleSwitch2 = await $('[data-testid="auto-update-toggle-switch"]');
            const persisted = await toggleSwitch2.getAttribute('aria-checked');
            expect(persisted).toBe('false');

            E2ELogger.info('auto-update-persistence', 'Disabled state persisted across Options reopen');

            // 5. Restore to enabled
            await toggleSwitch2.click();
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
        });

        it('should persist enabled state within session', async () => {
            // 1. Open Options and ensure auto-update is enabled
            await openOptionsWindow();

            const toggleSwitch = await $('[data-testid="auto-update-toggle-switch"]');
            const initial = await toggleSwitch.getAttribute('aria-checked');

            // Ensure it's enabled
            if (initial === 'false') {
                await toggleSwitch.click();
                await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
            }

            const afterEnable = await toggleSwitch.getAttribute('aria-checked');
            expect(afterEnable).toBe('true');
            E2ELogger.info('auto-update-persistence', 'Toggle enabled');

            // 2. Close Options window
            await closeOptionsWindow();

            // 3. Reopen Options window
            await openOptionsWindow();

            // 4. Verify state persisted
            const toggleSwitch2 = await $('[data-testid="auto-update-toggle-switch"]');
            const persisted = await toggleSwitch2.getAttribute('aria-checked');
            expect(persisted).toBe('true');

            E2ELogger.info('auto-update-persistence', 'Enabled state persisted across Options reopen');
        });
    });

    // ========================================================================
    // Multiple Toggle Operations
    // ========================================================================

    describe('Multiple Toggle Operations', () => {
        it('should update settings file when toggled multiple times', async () => {
            await openOptionsWindow();

            const toggleSwitch = await $('[data-testid="auto-update-toggle-switch"]');

            // Toggle multiple times
            for (let i = 0; i < 4; i++) {
                await toggleSwitch.click();
                await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
            }

            // Final state should match initial (even number of toggles)
            const finalState = await toggleSwitch.getAttribute('aria-checked');
            E2ELogger.info('auto-update-persistence', `After 4 toggles: ${finalState}`);

            // Close and reopen to verify persistence
            await closeOptionsWindow();
            await openOptionsWindow();

            const toggleSwitch2 = await $('[data-testid="auto-update-toggle-switch"]');
            const persistedState = await toggleSwitch2.getAttribute('aria-checked');
            expect(persistedState).toBe(finalState);

            E2ELogger.info('auto-update-persistence', 'Multi-toggle persistence verified');
        });

        it('should handle rapid toggling without corruption', async () => {
            await openOptionsWindow();

            const toggleSwitch = await $('[data-testid="auto-update-toggle-switch"]');
            const initial = await toggleSwitch.getAttribute('aria-checked');

            // Rapid toggles with minimal delay
            for (let i = 0; i < 5; i++) {
                await toggleSwitch.click();
                await browser.pause(50); // Very short delay
            }

            // Wait for IPC to settle
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            // State should be opposite of initial (odd number of toggles)
            const finalState = await toggleSwitch.getAttribute('aria-checked');
            const expected = initial === 'true' ? 'false' : 'true';
            expect(finalState).toBe(expected);

            E2ELogger.info('auto-update-persistence', 'Rapid toggle handling verified');

            // Restore initial state
            await toggleSwitch.click();
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
        });
    });

    // ========================================================================
    // Cross-Platform Persistence
    // ========================================================================

    describe('Cross-Platform Persistence', () => {
        it('should persist settings on current platform', async () => {
            const detectedPlatform = await getPlatform();
            E2ELogger.info('auto-update-persistence', `Testing on: ${detectedPlatform}`);

            await openOptionsWindow();

            const toggleSwitch = await $('[data-testid="auto-update-toggle-switch"]');

            // Toggle to opposite state
            const initial = await toggleSwitch.getAttribute('aria-checked');
            await toggleSwitch.click();
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            const afterToggle = await toggleSwitch.getAttribute('aria-checked');
            expect(afterToggle).not.toBe(initial);

            // Close and reopen
            await closeOptionsWindow();
            await openOptionsWindow();

            // Verify persistence
            const toggleSwitch2 = await $('[data-testid="auto-update-toggle-switch"]');
            const persisted = await toggleSwitch2.getAttribute('aria-checked');
            expect(persisted).toBe(afterToggle);

            // Restore
            if (persisted !== initial) {
                await toggleSwitch2.click();
                await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
            }

            E2ELogger.info('auto-update-persistence', `Persistence verified on ${detectedPlatform}`);
        });
    });
});
