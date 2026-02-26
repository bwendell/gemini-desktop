/// <reference path="./helpers/wdio-electron.d.ts" />
/**
 * E2E Test: Toast Full Workflow (Task 7.6.5)
 *
 * Verifies complete toast notification workflows from trigger to removal.
 * Tests follow the Golden Rule: "If this code path was broken, would this test fail?"
 *
 * Subtasks:
 * - 7.6.5.1 Success Toast: Trigger → appears → auto-dismiss → removed
 * - 7.6.5.2 Error Toast: Trigger → appears → persists 10s → dismiss → removed
 * - 7.6.5.3 Progress Toast: Trigger → appears → progress updates → completion
 * - 7.6.5.4 Multi-Toast: Trigger 3 → all stack → dismiss middle → re-stack
 *
 * @see docs/E2E_TESTING_GUIDELINES.md
 */

import { expect, $, $$ } from '@wdio/globals';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { E2E_TIMING } from './helpers/e2eConstants';
import { waitForUIState, waitForAnimationSettle } from './helpers/waitUtilities';
import { ToastPage } from './pages/ToastPage';

// =============================================================================
// Tests
// =============================================================================

describe('Toast Full Workflow E2E', function () {
    this.timeout(180000);
    const toastPage = new ToastPage();

    const waitForDurationWithPolling = async (durationMs: number, description: string): Promise<void> => {
        const startTime = Date.now();
        const completed = await waitForUIState(async () => Date.now() - startTime >= durationMs, {
            timeout: durationMs + 1000,
            interval: 100,
            description,
        });

        if (!completed) {
            throw new Error(`Timed out waiting ${durationMs}ms for ${description}`);
        }
    };

    beforeEach(async () => {
        await waitForAppReady();
        // Clear any existing toasts
        await toastPage.dismissAll();
        await waitForUIState(async () => true, {
            timeout: E2E_TIMING.UI_STATE_PAUSE_MS,
            description: 'Clear toasts and settle UI',
        });
    });

    afterEach(async () => {
        await toastPage.dismissAll();
        await ensureSingleWindow();
    });

    // ===========================================================================
    // 7.6.5.1 Success Toast Workflow
    // ===========================================================================

    describe('Success Toast Workflow (7.6.5.1)', () => {
        it('should complete: trigger → appears → auto-dismiss → removed', async () => {
            // 1. Trigger success toast
            const toastId = await toastPage.showSuccess('Operation completed successfully!', {
                title: 'Success',
            });
            expect(toastId).toBeTruthy();

            // 2. Verify toast appears in DOM
            await toastPage.waitForToastVisible();
            const toastCount = await toastPage.getToastCount();
            expect(toastCount).toBe(1);

            // 3. Verify toast has correct content
            expect(await toastPage.isToastDisplayed()).toBe(true);

            const toastType = await toastPage.getToastTypeClass();
            expect(toastType).toBe('success');

            // Verify ARIA attributes for accessibility
            const role = await toastPage.getToastRole();
            expect(role).toBe('alert');

            const ariaLive = await toastPage.getToastAriaLive();
            expect(ariaLive).toBe('polite');

            // 4. Wait for auto-dismiss (success duration is 5000ms)
            // We wait a bit longer to account for animation time
            await waitForDurationWithPolling(5500, 'INTENTIONAL: Testing 5s auto-dismiss timer for success toast');

            // 5. Verify toast is removed
            const remainingCount = await toastPage.getToastCount();
            expect(remainingCount).toBe(0);

            const contextToasts = await toastPage.getToasts();
            expect(contextToasts.length).toBe(0);
        });
    });

    // ===========================================================================
    // 7.6.5.2 Error Toast Workflow
    // ===========================================================================

    describe('Error Toast Workflow (7.6.5.2)', () => {
        it('should: trigger → appears → persists 10s → manual dismiss → removed', async () => {
            // 1. Trigger error toast
            const toastId = await toastPage.showError('Something went wrong!', {
                title: 'Error',
            });
            expect(toastId).toBeTruthy();

            // 2. Verify toast appears
            await toastPage.waitForToastVisible();
            expect(await toastPage.isToastDisplayed()).toBe(true);

            const toastType = await toastPage.getToastTypeClass();
            expect(toastType).toBe('error');

            // 3. Verify toast persists after 5 seconds (success would auto-dismiss by now)
            await waitForDurationWithPolling(
                5500,
                'INTENTIONAL: Testing error toast persistence (success would dismiss by now)'
            );

            let count = await toastPage.getToastCount();
            expect(count).toBe(1); // Error toast should still be visible

            // 4. Click dismiss button to manually remove
            await toastPage.dismissToast(0);
            await waitForAnimationSettle('[data-testid="toast"]', {
                timeout: E2E_TIMING.TIMEOUTS?.ANIMATION_SETTLE,
                allowMissing: true,
            });

            // 5. Verify toast is removed
            count = await toastPage.getToastCount();
            expect(count).toBe(0);
        });

        it('should auto-dismiss after 10 seconds if not manually dismissed', async () => {
            // Trigger error toast
            await toastPage.showError('Auto-dismiss test', { title: 'Error' });
            await toastPage.waitForToastVisible();

            // Wait for the full 10s duration + buffer
            await waitForDurationWithPolling(10500, 'INTENTIONAL: Testing 10s auto-dismiss timer for error toast');

            // Verify auto-dismissed
            const count = await toastPage.getToastCount();
            expect(count).toBe(0);
        });
    });

    // ===========================================================================
    // 7.6.5.3 Progress Toast Workflow
    // ===========================================================================

    describe('Progress Toast Workflow (7.6.5.3)', () => {
        it('should: trigger → appears → progress updates → completion', async () => {
            // 1. Trigger progress toast at 0%
            const toastId = await toastPage.showProgress('Downloading...', 0, {
                title: 'Download Progress',
                id: 'test-progress-toast',
            });
            expect(toastId).toBe('test-progress-toast');

            // 2. Verify toast appears with progress bar
            await toastPage.waitForToastVisible();
            expect(await toastPage.isToastDisplayed()).toBe(true);

            const toastType = await toastPage.getToastTypeClass();
            expect(toastType).toBe('progress');

            // Verify progress bar exists
            expect(await toastPage.isProgressBarDisplayed()).toBe(true);

            // Verify initial progress
            let progressValue = await toastPage.getProgressValue();
            expect(parseInt(progressValue ?? '0', 10)).toBe(0);

            // 3. Update progress to 50%
            await toastPage.showProgress('Downloading...', 50, {
                title: 'Download Progress',
                id: 'test-progress-toast',
            });
            await waitForUIState(async () => true, {
                timeout: E2E_TIMING.UI_STATE_PAUSE_MS,
                description: 'Progress update to 50%',
            });

            // Verify progress updated
            progressValue = await toastPage.getProgressValue();
            expect(parseInt(progressValue ?? '0', 10)).toBe(50);

            // 4. Update progress to 100%
            await toastPage.showProgress('Download complete!', 100, {
                title: 'Download Progress',
                id: 'test-progress-toast',
            });
            await waitForUIState(async () => true, {
                timeout: E2E_TIMING.UI_STATE_PAUSE_MS,
                description: 'Progress update to 100%',
            });

            progressValue = await toastPage.getProgressValue();
            expect(parseInt(progressValue ?? '0', 10)).toBe(100);

            // 5. Progress toast should NOT auto-dismiss (persistent by default)
            await waitForDurationWithPolling(5500, 'INTENTIONAL: Verify progress toast does not auto-dismiss after 5s');
            const stillVisible = await toastPage.getToastCount();
            expect(stillVisible).toBe(1);

            // 6. Manually dismiss to complete workflow
            await toastPage.dismissToastById(toastId);
            await waitForAnimationSettle('[data-testid="toast"]', {
                timeout: E2E_TIMING.TIMEOUTS?.ANIMATION_SETTLE,
                allowMissing: true,
            });

            const finalCount = await toastPage.getToastCount();
            expect(finalCount).toBe(0);
        });
    });

    // ===========================================================================
    // 7.6.5.4 Multi-Toast Workflow
    // ===========================================================================

    describe('Multi-Toast Workflow (7.6.5.4)', () => {
        it('should: trigger 3 → all stack → dismiss middle → re-stack', async () => {
            // 1. Trigger 3 toasts in sequence (all persistent to control timing)
            const toast1Id = await toastPage.showInfo('First toast', {
                title: 'Toast 1',
                persistent: true,
                id: 'multi-toast-1',
            });
            await waitForUIState(async () => true, {
                timeout: 100,
                description: 'Brief delay after first toast creation',
            });

            const toast2Id = await toastPage.showWarning('Second toast', {
                title: 'Toast 2',
                persistent: true,
                id: 'multi-toast-2',
            });
            await waitForUIState(async () => true, {
                timeout: 100,
                description: 'Brief delay after second toast creation',
            });

            const toast3Id = await toastPage.showSuccess('Third toast', {
                title: 'Toast 3',
                persistent: true,
                id: 'multi-toast-3',
            });

            await waitForUIState(async () => true, {
                timeout: E2E_TIMING.UI_STATE_PAUSE_MS,
                description: 'Three toasts rendered and stacked',
            });

            // 2. Verify all 3 toasts are stacked
            const initialCount = await toastPage.getToastCount();
            expect(initialCount).toBe(3);

            // Verify stacking order
            const messages = await toastPage.getToastMessagesInOrder();
            expect(messages.length).toBe(3);

            const toast1 = await $(toastPage.toastByIdSelector(toast1Id));
            const toast2 = await $(toastPage.toastByIdSelector(toast2Id));
            const toast3 = await $(toastPage.toastByIdSelector(toast3Id));

            expect(await toast1.isExisting()).toBe(true);
            expect(await toast2.isExisting()).toBe(true);
            expect(await toast3.isExisting()).toBe(true);

            const toast1Class = await toast1.getAttribute('class');
            const toast2Class = await toast2.getAttribute('class');
            const toast3Class = await toast3.getAttribute('class');

            expect(toast1Class).toContain('toast--info');
            expect(toast2Class).toContain('toast--warning');
            expect(toast3Class).toContain('toast--success');

            // 3. Dismiss middle toast (toast 2)
            await toastPage.dismissToastById(toast2Id);
            await waitForAnimationSettle('[data-testid="toast"]', {
                timeout: E2E_TIMING.TIMEOUTS?.ANIMATION_SETTLE,
                allowMissing: true,
            });

            // 4. Verify remaining toasts re-stack correctly
            const remainingCount = await toastPage.getToastCount();
            expect(remainingCount).toBe(2);

            const remainingToasts = await $$('[data-testid="toast"]');
            expect(remainingToasts.length).toBe(2);

            const remainingToast1 = await $(toastPage.toastByIdSelector(toast1Id));
            const remainingToast2 = await $(toastPage.toastByIdSelector(toast2Id));
            const remainingToast3 = await $(toastPage.toastByIdSelector(toast3Id));

            expect(await remainingToast1.isExisting()).toBe(true);
            expect(await remainingToast2.isExisting()).toBe(false);
            expect(await remainingToast3.isExisting()).toBe(true);

            const remainingToast1Class = await remainingToast1.getAttribute('class');
            const remainingToast3Class = await remainingToast3.getAttribute('class');

            expect(remainingToast1Class).toContain('toast--info');
            expect(remainingToast3Class).toContain('toast--success');

            // 5. Cleanup - dismiss remaining toasts
            await toastPage.dismissToastById(toast1Id);
            await toastPage.dismissToastById(toast3Id);
            await waitForAnimationSettle('[data-testid="toast"]', {
                timeout: E2E_TIMING.TIMEOUTS?.ANIMATION_SETTLE,
                allowMissing: true,
            });

            const finalCount = await toastPage.getToastCount();
            expect(finalCount).toBe(0);
        });

        it('should dismiss toasts via click on dismiss button', async () => {
            // Create 2 persistent toasts
            await toastPage.showInfo('Toast to dismiss', {
                persistent: true,
                id: 'click-dismiss-1',
            });
            await toastPage.showWarning('Another toast', {
                persistent: true,
                id: 'click-dismiss-2',
            });

            await toastPage.waitForToastVisible();
            expect(await toastPage.getToastCount()).toBe(2);

            // Click dismiss on first visible toast (index 0)
            await toastPage.dismissToast(0);
            await waitForAnimationSettle('[data-testid="toast"]', {
                timeout: E2E_TIMING.TIMEOUTS?.ANIMATION_SETTLE,
                allowMissing: true,
            });

            expect(await toastPage.getToastCount()).toBe(1);

            // Click dismiss on remaining toast
            await toastPage.dismissToast(0);
            await waitForAnimationSettle('[data-testid="toast"]', {
                timeout: E2E_TIMING.TIMEOUTS?.ANIMATION_SETTLE,
                allowMissing: true,
            });

            expect(await toastPage.getToastCount()).toBe(0);
        });
    });
});
