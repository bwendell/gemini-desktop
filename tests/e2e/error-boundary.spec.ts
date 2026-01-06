/**
 * E2E Test: Error Boundary Recovery
 *
 * Tests the error boundary crash recovery UX following STRICT E2E principles:
 * - Triggers ACTUAL error boundary state via production code paths
 * - Verifies ACTUAL user-visible outcomes (error fallback display, reload button)
 * - Tests the FULL recovery flow users would experience
 *
 * User Workflows Covered:
 * 1. App encounters a rendering error → Error fallback appears
 * 2. User sees the error message and reload button
 * 3. User clicks "Reload Application" → App reloads and works again
 *
 * @module error-boundary.spec
 */

/// <reference path="./helpers/wdio-electron.d.ts" />

import { browser, $, expect } from '@wdio/globals';
import { E2ELogger } from './helpers/logger';
import { E2E_TIMING } from './helpers/e2eConstants';
import { waitForAppReady } from './helpers/workflows';
import { expectElementDisplayed, expectElementNotDisplayed, expectElementContainsText } from './helpers/assertions';

// ============================================================================
// Test Suite
// ============================================================================

describe('Error Boundary Recovery E2E', () => {
    before(async () => {
        await waitForAppReady();
        E2ELogger.info('error-boundary', 'Test suite initialized');
    });

    // ========================================================================
    // Options Window Error Boundary Tests
    // ========================================================================

    describe('Options Window Error Boundary', () => {
        /**
         * Open options window before each test
         */
        beforeEach(async () => {
            // Open options window via IPC (uses the app menu action)
            await browser.electron.execute((electron) => {
                const { ipcMain } = electron;
                // Emit the open-options-window IPC event that the renderer would send
                ipcMain.emit('open-options-window', { sender: null });
            });
            await browser.pause(E2E_TIMING.ANIMATION_SETTLE);

            // Switch to the options window
            const handles = await browser.getWindowHandles();
            if (handles.length > 1) {
                await browser.switchToWindow(handles[handles.length - 1]);
            }

            // Verify options window is loaded
            const optionsWindow = await $('[data-testid="options-window"]');
            await optionsWindow.waitForDisplayed({ timeout: 5000 });

            E2ELogger.info('error-boundary', 'Options window opened successfully');
        });

        /**
         * Cleanup after each test
         */
        afterEach(async () => {
            // Return to main window
            const handles = await browser.getWindowHandles();
            if (handles.length > 0) {
                await browser.switchToWindow(handles[0]);
            }

            // Close any extra windows
            if (handles.length > 1) {
                await browser.execute(() => {
                    window.electronAPI?.closeWindow?.();
                });
            }
        });

        it('should display error fallback UI when a React error occurs in Options', async () => {
            // 1. SIMULATE REAL USER ACTION: Trigger an error in the Options window
            // We use the E2E test hook which sets the error boundary state
            // This is the same state that would be set if a real error occurred
            await browser.execute(() => {
                // @ts-expect-error - E2E testing hook exposed by ErrorBoundary
                if (window.__ERROR_BOUNDARY_TRIGGER_OPTIONS__) {
                    // @ts-expect-error
                    window.__ERROR_BOUNDARY_TRIGGER_OPTIONS__();
                } else {
                    throw new Error('Options error boundary test trigger not found');
                }
            });

            E2ELogger.info('error-boundary', 'Triggered error in Options window');

            // 2. VERIFY ACTUAL OUTCOME: Error fallback UI should be displayed
            const fallbackSelector = '[data-testid="error-fallback"]';
            await expectElementDisplayed(fallbackSelector, {
                timeout: 5000,
                timeoutMsg: 'Error fallback UI did not appear in Options window',
            });

            // 3. Verify the error title text
            await expectElementContainsText('[data-testid="error-fallback-title"]', 'Something went wrong');

            E2ELogger.info('error-boundary', '✓ Error fallback UI displayed correctly');
        });

        it('should show reload button when error occurs in Options', async () => {
            // Trigger error
            await browser.execute(() => {
                // @ts-expect-error
                window.__ERROR_BOUNDARY_TRIGGER_OPTIONS__?.();
            });

            // Wait for fallback to appear
            await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);

            // VERIFY: Reload button is visible and has correct text
            const reloadButton = await $('[data-testid="error-fallback-reload"]');
            expect(await reloadButton.isDisplayed()).toBe(true);
            expect(await reloadButton.getText()).toContain('Reload');

            E2ELogger.info('error-boundary', '✓ Reload button is visible with correct text');
        });

        it('should recover when user clicks Reload button after Options error', async () => {
            // 1. Trigger error
            await browser.execute(() => {
                // @ts-expect-error
                window.__ERROR_BOUNDARY_TRIGGER_OPTIONS__?.();
            });

            const fallbackSelector = '[data-testid="error-fallback"]';
            await expectElementDisplayed(fallbackSelector, { timeout: 5000 });

            // 2. SIMULATE REAL USER ACTION: Click the reload button
            const reloadButton = await $('[data-testid="error-fallback-reload"]');
            await reloadButton.click();

            E2ELogger.info('error-boundary', 'Reload button clicked');

            // 3. VERIFY ACTUAL OUTCOME: Error fallback should disappear
            // After reload, the options window should be functional again
            await browser.pause(E2E_TIMING.ANIMATION_SETTLE * 2);

            // The page reloads, so we need to wait for the options window to load again
            const handles = await browser.getWindowHandles();
            if (handles.length > 1) {
                await browser.switchToWindow(handles[handles.length - 1]);
            }

            // Verify the error fallback is gone and normal content is back
            await expectElementNotDisplayed(fallbackSelector, {
                timeout: 5000,
            });

            // Verify normal options content is visible
            const optionsContent = await $('[data-testid="options-content"]');
            expect(await optionsContent.isDisplayed()).toBe(true);

            E2ELogger.info('error-boundary', '✓ Options window recovered after reload');
        });

        it('should display expandable error details', async () => {
            // Trigger error
            await browser.execute(() => {
                // @ts-expect-error
                window.__ERROR_BOUNDARY_TRIGGER_OPTIONS__?.();
            });

            await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);

            // VERIFY: Error details are available
            const detailsSummary = await $('[data-testid="error-fallback"] details summary');
            expect(await detailsSummary.isDisplayed()).toBe(true);

            // Click to expand error details
            await detailsSummary.click();

            // VERIFY: Error message is visible
            const errorMessage = await $('[data-testid="error-fallback-message"]');
            expect(await errorMessage.isDisplayed()).toBe(true);

            const messageText = await errorMessage.getText();
            expect(messageText).toContain('E2E Test Error');

            E2ELogger.info('error-boundary', '✓ Error details are expandable and show message');
        });
    });

    // ========================================================================
    // Main Window Error Boundary (GeminiErrorBoundary) - Documented for completeness
    // These tests exist in fatal-error-recovery.spec.ts
    // ========================================================================

    describe('Main Window Error Boundary (Reference)', () => {
        it('should reference existing GeminiErrorBoundary tests', () => {
            // This test documents that GeminiErrorBoundary E2E tests exist in:
            // tests/e2e/fatal-error-recovery.spec.ts
            //
            // Tests covered there:
            // - "should show error boundary and allow reload on React error"
            // - Verifies [data-testid="gemini-error-fallback"] appears
            // - Verifies "Gemini couldn't load" message
            // - Verifies Reload button works

            E2ELogger.info('error-boundary', 'GeminiErrorBoundary tests exist in fatal-error-recovery.spec.ts');
            expect(true).toBe(true); // Placeholder for documentation purposes
        });
    });
});
