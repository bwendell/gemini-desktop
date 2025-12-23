/**
 * E2E Test: Auto-Update Toggle
 *
 * Tests the auto-update toggle switch in the Options window.
 * 
 * User Workflows Covered:
 * 1. Viewing - Toggle visible in Updates section
 * 2. Toggling - Toggle changes enabled/disabled state
 * 3. Cross-platform - Works on Windows, macOS, and Linux
 * 
 * @module auto-update-toggle.spec
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

describe('Auto-Update Toggle', () => {
    let mainWindowHandle: string;
    let platform: E2EPlatform;

    before(async () => {
        platform = await getPlatform();
        E2ELogger.info('auto-update-toggle', `Platform: ${platform.toUpperCase()}`);
    });

    beforeEach(async () => {
        E2ELogger.info('auto-update-toggle', 'Opening Options window');

        // Store main window handle
        const initialHandles = await browser.getWindowHandles();
        mainWindowHandle = initialHandles[0];

        // Open Options via menu
        await clickMenuItemById('menu-file-options');
        await waitForWindowCount(2, 5000);

        // Switch to Options window
        const handles = await browser.getWindowHandles();
        const optionsHandle = handles.find(h => h !== mainWindowHandle) || handles[1];
        await browser.switchToWindow(optionsHandle);
        await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);
    });

    afterEach(async () => {
        E2ELogger.info('auto-update-toggle', 'Cleaning up');

        try {
            // Close options window via close button
            const closeBtn = await $(Selectors.optionsCloseButton);
            if (await closeBtn.isExisting()) {
                await closeBtn.click();
                await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);
            }
        } catch { /* ignore */ }

        // Switch back to main window
        try {
            await browser.switchToWindow(mainWindowHandle);
        } catch { /* ignore */ }
    });

    // ========================================================================
    // Rendering Tests
    // ========================================================================

    describe('Rendering', () => {
        it('should display the Updates section in Options', async () => {
            const updatesSection = await $('[data-testid="options-updates"]');
            await expect(updatesSection).toExist();
            await expect(updatesSection).toBeDisplayed();

            const heading = await updatesSection.$('h2');
            const text = await heading.getText();
            expect(text).toContain('Updates');

            E2ELogger.info('auto-update-toggle', 'Updates section visible');
        });

        it('should display the auto-update toggle', async () => {
            const toggle = await $('[data-testid="auto-update-toggle"]');
            await expect(toggle).toExist();
            await expect(toggle).toBeDisplayed();

            E2ELogger.info('auto-update-toggle', 'Auto-update toggle visible');
        });

        it('should display toggle with label and description', async () => {
            const toggle = await $('[data-testid="auto-update-toggle"]');
            const text = await toggle.getText();

            expect(text).toContain('Automatic Updates');
            expect(text.toLowerCase()).toContain('download');

            E2ELogger.info('auto-update-toggle', 'Toggle has label and description');
        });

        it('should have clickable switch with role=switch', async () => {
            const toggleSwitch = await $('[data-testid="auto-update-toggle-switch"]');
            await expect(toggleSwitch).toExist();

            const role = await toggleSwitch.getAttribute('role');
            expect(role).toBe('switch');

            E2ELogger.info('auto-update-toggle', 'Toggle has role=switch');
        });
    });

    // ========================================================================
    // Interaction Tests
    // ========================================================================

    describe('Interactions', () => {
        it('should have aria-checked attribute on toggle switch', async () => {
            const toggleSwitch = await $('[data-testid="auto-update-toggle-switch"]');
            const checked = await toggleSwitch.getAttribute('aria-checked');

            expect(['true', 'false']).toContain(checked);
            E2ELogger.info('auto-update-toggle', `Initial state: aria-checked=${checked}`);
        });

        it('should toggle state when clicked', async () => {
            const toggleSwitch = await $('[data-testid="auto-update-toggle-switch"]');

            const initialChecked = await toggleSwitch.getAttribute('aria-checked');
            E2ELogger.info('auto-update-toggle', `Initial state: ${initialChecked}`);

            await toggleSwitch.click();
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            const newChecked = await toggleSwitch.getAttribute('aria-checked');
            E2ELogger.info('auto-update-toggle', `After click: ${newChecked}`);

            expect(newChecked).not.toBe(initialChecked);

            // Restore original state
            await toggleSwitch.click();
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
        });

        it('should toggle back when clicked again', async () => {
            const toggleSwitch = await $('[data-testid="auto-update-toggle-switch"]');

            const initial = await toggleSwitch.getAttribute('aria-checked');
            await toggleSwitch.click();
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
            await toggleSwitch.click();
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            const final = await toggleSwitch.getAttribute('aria-checked');
            expect(final).toBe(initial);

            E2ELogger.info('auto-update-toggle', 'Toggle round-trip verified');
        });

        it('should remember state within session', async () => {
            const toggleSwitch = await $('[data-testid="auto-update-toggle-switch"]');

            // Set to disabled
            const initial = await toggleSwitch.getAttribute('aria-checked');
            if (initial === 'true') {
                await toggleSwitch.click();
                await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
            }

            // Close and reopen Options window
            const closeBtn = await $(Selectors.optionsCloseButton);
            await closeBtn.click();
            await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);
            await waitForWindowCount(1, 5000);

            // Reopen
            await clickMenuItemById('menu-file-options');
            await waitForWindowCount(2, 5000);
            const handles = await browser.getWindowHandles();
            const optionsHandle = handles.find(h => h !== mainWindowHandle) || handles[1];
            await browser.switchToWindow(optionsHandle);
            await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);

            // Verify state was preserved
            const toggleSwitch2 = await $('[data-testid="auto-update-toggle-switch"]');
            const state = await toggleSwitch2.getAttribute('aria-checked');
            expect(state).toBe('false');

            // Restore to enabled
            await toggleSwitch2.click();
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            E2ELogger.info('auto-update-toggle', 'Session persistence verified');
        });
    });

    // ========================================================================
    // Cross-Platform Tests
    // ========================================================================

    describe('Cross-Platform', () => {
        it('should work on current platform', async () => {
            const detectedPlatform = await getPlatform();
            expect(['windows', 'macos', 'linux']).toContain(detectedPlatform);

            // Toggle should exist and be interactable on all platforms
            const toggleSwitch = await $('[data-testid="auto-update-toggle-switch"]');
            await expect(toggleSwitch).toExist();
            await expect(toggleSwitch).toBeClickable();

            E2ELogger.info('auto-update-toggle', `Verified on platform: ${detectedPlatform}`);
        });
    });
});
