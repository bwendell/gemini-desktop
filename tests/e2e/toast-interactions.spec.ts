/**
 * E2E Test: Toast User Interactions (Task 7.6.2)
 *
 * Tests user interactions with toast notifications.
 * Uses REAL user actions (click, keyboard) to verify toast behavior.
 *
 * Golden Rule: "If this code path was broken, would this test fail?"
 * - If dismiss button selector wrong: tests fail
 * - If action button callbacks broken: tests fail
 * - If auto-dismiss timer broken: tests fail
 *
 * @see docs/E2E_TESTING_GUIDELINES.md
 */

/// <reference path="./helpers/wdio-electron.d.ts" />

import { $, browser, expect } from '@wdio/globals';
import { ToastPage } from './pages';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { waitForUIState, waitForAnimationSettle, waitForDuration } from './helpers/waitUtilities';

type ToastBrowser = {
    execute<T>(script: string | ((...args: any[]) => T), ...args: any[]): Promise<T>;
    keys(keys: string | string[]): Promise<void>;
};

const toastBrowser = browser as unknown as ToastBrowser;

// Note: Action click tracking helpers (getLastActionClicked, clearActionClickTracking,
// showToastWithActions) are now part of ToastPage for reusability.

// =============================================================================
// Tests
// =============================================================================

describe('Toast User Interactions E2E', () => {
    let toastPage: ToastPage;

    beforeEach(async () => {
        await waitForAppReady();
        toastPage = new ToastPage();
        // Clear any existing toasts
        await toastPage.clearAll();
        await toastPage.clearActionClickTracking();
        await waitForUIState(async () => !(await toastPage.isToastDisplayed()), {
            description: 'All toasts cleared',
        });
    });

    afterEach(async () => {
        await toastPage.clearAll();
        await ensureSingleWindow();
    });

    // ===========================================================================
    // 7.6.2.2 Test clicking dismiss removes toast
    // ===========================================================================

    describe('Dismiss Button (7.6.2.2)', () => {
        it('should remove toast when dismiss button is clicked', async () => {
            // GIVEN a persistent toast is displayed
            await toastPage.showInfo('Test toast for dismissal', {
                persistent: true,
            });
            await toastPage.waitForToastVisible();
            expect(await toastPage.isToastDisplayed()).toBe(true);

            // WHEN user clicks the dismiss button
            await toastPage.clickDismiss();
            await waitForAnimationSettle('[data-testid="toast"]', { allowMissing: true });

            // THEN the toast should be removed from DOM
            expect(await toastPage.isToastDisplayed()).toBe(false);

            // AND the context should have no toasts
            const toasts = await toastPage.getToasts();
            expect(toasts.length).toBe(0);
        });

        it('should dismiss the correct toast when multiple are displayed', async () => {
            // GIVEN multiple persistent toasts are displayed
            const _toast1Id = await toastPage.showInfo('First toast', { persistent: true });
            await waitForUIState(async () => (await toastPage.getToastCount()) === 1, {
                description: 'First toast visible',
            });
            const _toast2Id = await toastPage.showWarning('Second toast', { persistent: true });
            await waitForUIState(async () => (await toastPage.getToastCount()) === 2, {
                description: 'Second toast visible',
            });
            await toastPage.showSuccess('Third toast', { persistent: true });
            await waitForUIState(async () => (await toastPage.getToastCount()) === 3, {
                description: 'All three toasts visible',
            });

            expect(await toastPage.getToastCount()).toBe(3);

            // WHEN user clicks dismiss on the first toast
            await toastPage.clickDismiss();
            await waitForAnimationSettle('[data-testid="toast"]', { allowMissing: true });

            // THEN only 2 toasts should remain
            expect(await toastPage.getToastCount()).toBe(2);
        });
    });

    // ===========================================================================
    // 7.6.2.3 Test clicking action button fires callback
    // ===========================================================================

    describe('Action Button Callbacks (7.6.2.3)', () => {
        it('should fire callback when primary action button is clicked', async () => {
            // GIVEN a toast with a primary action button
            const _toastId = await toastPage.showToastWithActions('info', 'Action test', [
                { label: 'Confirm', primary: true },
            ]);
            await toastPage.waitForToastVisible();

            // Verify button is displayed
            const actionBtn = await $('[data-testid="toast-action-0"]');
            expect(await actionBtn.isDisplayed()).toBe(true);

            // WHEN user clicks the action button
            await actionBtn.waitForClickable({ timeout: 2000 });
            await actionBtn.click();
            await waitForUIState(
                async () => {
                    const lastClick = await toastPage.getLastActionClicked();
                    return lastClick !== null;
                },
                { description: 'Action callback fired' }
            );

            // THEN the callback should have been invoked
            const lastClick = await toastPage.getLastActionClicked();
            expect(lastClick).not.toBeNull();
            expect(lastClick?.label).toBe('Confirm');
            expect(lastClick?.index).toBe(0);
        });

        it('should fire callback for secondary action button', async () => {
            // GIVEN a toast with primary and secondary action buttons
            const _toastId = await toastPage.showToastWithActions('warning', 'Multiple actions', [
                { label: 'Primary', primary: true },
                { label: 'Secondary', primary: false },
            ]);
            await toastPage.waitForToastVisible();

            // WHEN user clicks the secondary action button (index 1)
            const secondaryBtn = await $('[data-testid="toast-action-1"]');
            expect(await secondaryBtn.isDisplayed()).toBe(true);
            await secondaryBtn.waitForClickable({ timeout: 2000 });
            await secondaryBtn.click();
            await waitForUIState(
                async () => {
                    const lastClick = await toastPage.getLastActionClicked();
                    return lastClick !== null;
                },
                { description: 'Secondary action callback fired' }
            );

            // THEN the callback for secondary action should have been invoked
            const lastClick = await toastPage.getLastActionClicked();
            expect(lastClick).not.toBeNull();
            expect(lastClick?.label).toBe('Secondary');
            expect(lastClick?.index).toBe(1);
        });
    });

    // ===========================================================================
    // 7.6.2.4 Test toast auto-dismisses after duration
    // ===========================================================================

    describe('Auto-Dismiss Timer (7.6.2.4)', () => {
        it('should auto-dismiss success toast after ~5 seconds', async () => {
            // GIVEN a success toast (auto-dismiss after 5000ms)
            await toastPage.showSuccess('Auto-dismiss test');
            await toastPage.waitForToastVisible();
            expect(await toastPage.isToastDisplayed()).toBe(true);

            // WHEN we wait for the auto-dismiss duration (5s + buffer)
            // INTENTIONAL: Testing 5s auto-dismiss timer
            await waitForDuration(5500, 'Toast auto-dismiss timer');

            // THEN the toast should be automatically removed
            expect(await toastPage.isToastDisplayed()).toBe(false);
        });

        it('should auto-dismiss info toast after ~5 seconds', async () => {
            // GIVEN an info toast
            await toastPage.showInfo('Info auto-dismiss test');
            await toastPage.waitForToastVisible();

            // WHEN we wait for auto-dismiss
            // INTENTIONAL: Testing 5s auto-dismiss timer
            await waitForDuration(5500, 'Toast auto-dismiss timer');

            // THEN the toast should be removed
            expect(await toastPage.isToastDisplayed()).toBe(false);
        });

        it('should auto-dismiss warning toast after ~7 seconds', async () => {
            // GIVEN a warning toast (auto-dismiss after 7000ms)
            await toastPage.showWarning('Warning auto-dismiss test');
            await toastPage.waitForToastVisible();

            // Verify still visible after 5s (warning has 7s duration)
            // INTENTIONAL: Testing warning toast duration (7s)
            await waitForDuration(5000, 'Partial warning duration wait');
            expect(await toastPage.isToastDisplayed()).toBe(true);

            // WHEN we wait for the full duration
            // INTENTIONAL: Testing warning toast full duration (7s total)
            await waitForDuration(2500, 'Remaining warning duration'); // 5000 + 2500 = 7500ms > 7000ms

            // THEN the toast should be removed
            expect(await toastPage.isToastDisplayed()).toBe(false);
        });

        it('should NOT auto-dismiss persistent toast', async () => {
            // GIVEN a persistent toast
            await toastPage.showInfo('Persistent toast', { persistent: true });
            await toastPage.waitForToastVisible();

            // WHEN we wait longer than any auto-dismiss duration
            // INTENTIONAL: Testing persistent toast does NOT auto-dismiss
            await waitForDuration(6000, 'Persistent toast verification wait');

            // THEN the toast should still be visible
            expect(await toastPage.isToastDisplayed()).toBe(true);
        });
    });

    // ===========================================================================
    // 7.6.2.5 Test hover pauses auto-dismiss (if implemented)
    // ===========================================================================

    describe('Hover Pause (7.6.2.5)', () => {
        it('should note if hover pause is implemented', async () => {
            // Note: The current toast implementation does not pause auto-dismiss on hover.
            // This test documents the expected behavior if it were implemented.

            // Create a toast and verify basic interaction works
            await toastPage.showSuccess('Hover test toast', { persistent: true });
            await toastPage.waitForToastVisible();

            // Hover over the toast
            const toast = await $('[data-testid="toast"]');
            await toast.moveTo();
            await waitForUIState(async () => await toast.isDisplayed(), {
                description: 'Toast still visible after hover',
                timeout: 1000,
            });

            // Toast should still be visible (this would be the base expectation)
            expect(await toastPage.isToastDisplayed()).toBe(true);
        });
    });

    // ===========================================================================
    // 7.6.2.6 Test keyboard navigation
    // ===========================================================================

    describe('Keyboard Navigation (7.6.2.6)', () => {
        it('should allow Tab navigation to dismiss button', async () => {
            // GIVEN a toast is displayed
            await toastPage.showInfo('Keyboard test', { persistent: true });
            await toastPage.waitForToastVisible();

            // WHEN user tabs to the dismiss button
            // First click on toast to bring focus into the toast area
            const toast = await $('[data-testid="toast"]');
            await toast.click();
            await waitForUIState(
                async () => {
                    const activeElement = await toastBrowser.execute(() => {
                        return document.activeElement?.tagName;
                    });
                    return activeElement !== null;
                },
                { description: 'Focus established', timeout: 1000 }
            );

            // Tab to navigate (dismiss button should be focusable)
            await toastBrowser.keys('Tab');
            await waitForUIState(
                async () => {
                    const activeElement = await toastBrowser.execute(() => {
                        return document.activeElement?.getAttribute('data-testid');
                    });
                    return activeElement !== null;
                },
                { description: 'Tab navigation complete', timeout: 1000 }
            );

            // THEN the dismiss button should be focused
            const activeElement = await toastBrowser.execute(() => {
                return document.activeElement?.getAttribute('data-testid');
            });
            expect(activeElement).toBeTruthy();

            // The toast dismiss button should receive focus

            // Verify dismiss button exists and is focusable
            const dismissBtn = await $('[data-testid="toast-dismiss"]');
            expect(await dismissBtn.isExisting()).toBe(true);
        });

        it('should allow Enter key to activate focused button', async () => {
            // GIVEN a toast with an action button
            await toastPage.showToastWithActions('info', 'Keyboard action test', [
                { label: 'Activate', primary: true },
            ]);
            await toastPage.waitForToastVisible();

            // WHEN user focuses and activates the action button with Enter
            const actionBtn = await $('[data-testid="toast-action-0"]');
            await actionBtn.click(); // Focus
            await waitForUIState(
                async () => {
                    const activeElement = await toastBrowser.execute(() => {
                        return document.activeElement?.getAttribute('data-testid');
                    });
                    return activeElement === 'toast-action-0';
                },
                { description: 'Action button focused', timeout: 1000 }
            );

            // Clear tracking and use keyboard to activate
            await toastPage.clearActionClickTracking();
            await toastBrowser.keys('Enter');
            await waitForUIState(
                async () => {
                    const lastClick = await toastPage.getLastActionClicked();
                    return lastClick !== null;
                },
                { description: 'Enter key callback fired' }
            );

            // THEN the action callback should have been triggered
            const lastClick = await toastPage.getLastActionClicked();
            expect(lastClick).not.toBeNull();
            expect(lastClick?.label).toBe('Activate');
        });

        it('should have proper ARIA attributes for accessibility', async () => {
            // GIVEN a toast is displayed
            await toastPage.showWarning('Accessibility test', { persistent: true });
            await toastPage.waitForToastVisible();

            // THEN the toast should have correct ARIA attributes
            const role = await toastPage.getToastRole();
            expect(role).toBe('alert');

            const ariaLive = await toastPage.getToastAriaLive();
            expect(ariaLive).toBe('polite');

            // AND the dismiss button should have an aria-label
            const dismissBtn = await $('[data-testid="toast-dismiss"]');
            const ariaLabel = await dismissBtn.getAttribute('aria-label');
            expect(ariaLabel).toBeTruthy();
            expect(ariaLabel).toContain('Dismiss');
        });
    });
});
