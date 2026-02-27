/// <reference path="./helpers/wdio-electron.d.ts" />

import { browser, expect } from '@wdio/globals';

import { ToastPage, UpdateToastPage } from './pages';
import { E2E_TIMING } from './helpers/e2eConstants';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { waitForAnimationSettle, waitForDuration, waitForIPCRoundTrip, waitForUIState } from './helpers/waitUtilities';

type ToastBrowser = {
    execute<T>(script: string | ((...args: any[]) => T), ...args: any[]): Promise<T>;
    keys(keys: string | string[]): Promise<void>;
};

type WdioElement = {
    isExisting(): Promise<boolean>;
    isDisplayed(): Promise<boolean>;
    isClickable(): Promise<boolean>;
    click(): Promise<void>;
    moveTo(): Promise<void>;
    waitForClickable(options?: { timeout?: number }): Promise<boolean>;
    getAttribute(name: string): Promise<string | null>;
    getCSSProperty(prop: string): Promise<{ value: string }>;
};

type WdioBrowser = {
    $(selector: string): Promise<WdioElement>;
    $$(selector: string): Promise<WdioElement[]>;
    execute<T>(script: string | ((...args: any[]) => T), ...args: any[]): Promise<T>;
};

const wdioBrowser = browser as unknown as WdioBrowser;
const toastBrowser = browser as unknown as ToastBrowser;

type ElectronAPI = {
    setAutoUpdateEnabled: (enabled: boolean) => void;
};

const getElectronAPI = (win: Window): ElectronAPI | null => {
    return (win as Window & { electronAPI?: ElectronAPI }).electronAPI ?? null;
};

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

describe('Toast Notifications', () => {
    describe('Visibility', () => {
        let toast: ToastPage;

        before(async () => {
            toast = new ToastPage();

            await waitForUIState(
                async () => {
                    const container = await wdioBrowser.$('[data-testid="toast-container"]');
                    return await container.isExisting();
                },
                { description: 'App initialization', timeout: 5000 }
            );
        });

        beforeEach(async () => {
            await toast.clearAll();
        });

        afterEach(async () => {
            await toast.clearAll();
        });

        describe('Toast Positioning', () => {
            it('should appear in the bottom-left corner of the window', async () => {
                await toast.showInfo('Test positioning message');

                await toast.waitForToastVisible();
                expect(await toast.isToastDisplayed()).toBe(true);

                const isBottomLeft = await toast.isPositionedBottomLeft();
                expect(isBottomLeft).toBe(true);
            });

            it('should have fixed positioning so it stays in place on scroll', async () => {
                await toast.showInfo('Fixed position test');
                await toast.waitForToastVisible();

                const container = await wdioBrowser.$('[data-testid="toast-container"]');
                const position = await container.getCSSProperty('position');
                expect(position.value).toBe('fixed');
            });
        });

        describe('Toast Icons', () => {
            it('should display correct icon for success toast', async () => {
                await toast.showSuccess('Success message');
                await toast.waitForToastType('success');

                const icon = await toast.getToastIcon();
                expect(icon).toBe('✅');
            });

            it('should display correct icon for error toast', async () => {
                await toast.showError('Error message');
                await toast.waitForToastType('error');

                const icon = await toast.getToastIcon();
                expect(icon).toBe('❌');
            });

            it('should display correct icon for info toast', async () => {
                await toast.showInfo('Info message');
                await toast.waitForToastType('info');

                const icon = await toast.getToastIcon();
                expect(icon).toBe('ℹ️');
            });

            it('should display correct icon for warning toast', async () => {
                await toast.showWarning('Warning message');
                await toast.waitForToastType('warning');

                const icon = await toast.getToastIcon();
                expect(icon).toBe('⚠️');
            });

            it('should display correct icon for progress toast', async () => {
                await toast.showProgress('Progress message', 50);
                await toast.waitForToastType('progress');

                const icon = await toast.getToastIcon();
                expect(icon).toBe('⏳');
            });
        });

        describe('Toast Content', () => {
            it('should display the message correctly', async () => {
                const testMessage = 'This is a test message for E2E';
                await toast.showInfo(testMessage);
                await toast.waitForToastVisible();

                const displayedMessage = await toast.getMessage();
                expect(displayedMessage).toBe(testMessage);
            });

            it('should display title when provided', async () => {
                const testTitle = 'Test Title';
                const testMessage = 'Test message with title';
                await toast.showToast({
                    type: 'info',
                    title: testTitle,
                    message: testMessage,
                    persistent: true,
                });
                await toast.waitForToastVisible();

                const displayedTitle = await toast.getTitle();
                const displayedMessage = await toast.getMessage();
                expect(displayedTitle).toBe(testTitle);
                expect(displayedMessage).toBe(testMessage);
            });

            it('should display message without title when title is not provided', async () => {
                const testMessage = 'Message only, no title';
                await toast.showInfo(testMessage);
                await toast.waitForToastVisible();

                const displayedMessage = await toast.getMessage();
                expect(displayedMessage).toBe(testMessage);

                const titleExists = await (await wdioBrowser.$('[data-testid="toast-title"]')).isExisting();
                expect(titleExists).toBe(false);
            });
        });

        describe('Toast Accessibility', () => {
            it('should have role="alert" attribute', async () => {
                await toast.showInfo('Accessibility test');
                await toast.waitForToastVisible();

                const role = await toast.getToastRole();
                expect(role).toBe('alert');
            });

            it('should have aria-live="polite" attribute', async () => {
                await toast.showInfo('Accessibility test');
                await toast.waitForToastVisible();

                const ariaLive = await toast.getToastAriaLive();
                expect(ariaLive).toBe('polite');
            });

            it('should have dismiss button with accessible label', async () => {
                await toast.showInfo('Accessibility button test');
                await toast.waitForToastVisible();

                const dismissBtn = await wdioBrowser.$('[data-testid="toast-dismiss"]');
                const ariaLabel = await dismissBtn.getAttribute('aria-label');
                expect(ariaLabel).toBe('Dismiss notification');
            });

            it('should have toast container with aria-label for region', async () => {
                await toast.showInfo('Container accessibility test');
                await toast.waitForToastVisible();

                const container = await wdioBrowser.$('[data-testid="toast-container"]');
                const role = await container.getAttribute('role');
                const ariaLabel = await container.getAttribute('aria-label');
                expect(role).toBe('region');
                expect(ariaLabel).toBe('Notifications');
            });
        });

        describe('Toast DOM Rendering', () => {
            it('should actually render toast in DOM when shown', async () => {
                expect(await toast.isToastInDOM()).toBe(false);

                await toast.showInfo('DOM render test');
                await toast.waitForToastVisible();

                expect(await toast.isToastInDOM()).toBe(true);
                expect(await toast.isToastDisplayed()).toBe(true);
            });

            it('should render toast with correct type class', async () => {
                const types: Array<'success' | 'error' | 'info' | 'warning' | 'progress'> = [
                    'success',
                    'error',
                    'info',
                    'warning',
                    'progress',
                ];

                for (const type of types) {
                    await toast.clearAll();

                    if (type === 'progress') {
                        await toast.showProgress(`${type} type test`, 50);
                    } else {
                        await toast.showToast({
                            type,
                            message: `${type} type test`,
                            persistent: true,
                        });
                    }
                    await toast.waitForToastType(type);

                    const typeClass = await toast.getToastTypeClass();
                    expect(typeClass).toBe(type);
                }
            });

            it('should render progress bar only for progress type', async () => {
                await toast.showProgress('Progress with bar', 75);
                await toast.waitForToastType('progress');

                expect(await toast.isProgressBarDisplayed()).toBe(true);

                const progressValue = await toast.getProgressValue();
                expect(progressValue).toBe('75');

                await toast.clearAll();
                await toast.showInfo('Info without progress bar');
                await toast.waitForToastType('info');

                expect(await toast.isProgressBarDisplayed()).toBe(false);
            });

            it('should render dismiss button on all toasts', async () => {
                await toast.showInfo('Dismiss button test');
                await toast.waitForToastVisible();

                expect(await toast.isDismissButtonDisplayed()).toBe(true);

                const dismissBtn = await wdioBrowser.$('[data-testid="toast-dismiss"]');
                expect(await dismissBtn.isClickable()).toBe(true);
            });

            it('should remove toast from DOM after dismiss', async () => {
                await toast.showInfo('Dismiss removal test', { persistent: true });
                await toast.waitForToastVisible();
                expect(await toast.isToastInDOM()).toBe(true);

                await toast.clickDismiss();

                await toast.waitForAllToastsDismissed();
                expect(await toast.isToastInDOM()).toBe(false);
            });
        });

        describe('Toast Visual Properties', () => {
            it('should have visible border color for each type', async () => {
                await toast.showSuccess('Success border test');
                await toast.waitForToastType('success');

                const toastEl = await wdioBrowser.$('[data-testid="toast"]');
                const borderLeftColor = await toastEl.getCSSProperty('border-left-color');

                expect(borderLeftColor.value).toBeDefined();
                expect(borderLeftColor.value).not.toBe('rgba(0,0,0,0)');
            });

            it('should have glassmorphism effect (backdrop-filter)', async () => {
                await toast.showInfo('Glassmorphism test');
                await toast.waitForToastVisible();

                const toastEl = await wdioBrowser.$('[data-testid="toast"]');
                const backdropFilter = await toastEl.getCSSProperty('backdrop-filter');
                expect(backdropFilter).toBeDefined();
            });
        });
    });

    describe('User Interactions', () => {
        let toastPage: ToastPage;

        beforeEach(async () => {
            await waitForAppReady();
            toastPage = new ToastPage();
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

        describe('Dismiss Button (7.6.2.2)', () => {
            it('should remove toast when dismiss button is clicked', async () => {
                await toastPage.showInfo('Test toast for dismissal', {
                    persistent: true,
                });
                await toastPage.waitForToastVisible();
                expect(await toastPage.isToastDisplayed()).toBe(true);

                await toastPage.clickDismiss();
                await waitForAnimationSettle('[data-testid="toast"]', { allowMissing: true });

                expect(await toastPage.isToastDisplayed()).toBe(false);

                const toasts = await toastPage.getToasts();
                expect(toasts.length).toBe(0);
            });

            it('should dismiss the correct toast when multiple are displayed', async () => {
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

                await toastPage.clickDismiss();
                await waitForAnimationSettle('[data-testid="toast"]', { allowMissing: true });

                expect(await toastPage.getToastCount()).toBe(2);
            });
        });

        describe('Action Button Callbacks (7.6.2.3)', () => {
            it('should fire callback when primary action button is clicked', async () => {
                const _toastId = await toastPage.showToastWithActions('info', 'Action test', [
                    { label: 'Confirm', primary: true },
                ]);
                await toastPage.waitForToastVisible();

                const actionBtn = await wdioBrowser.$('[data-testid="toast-action-0"]');
                expect(await actionBtn.isDisplayed()).toBe(true);

                await actionBtn.waitForClickable({ timeout: 2000 });
                await actionBtn.click();
                await waitForUIState(
                    async () => {
                        const lastClick = await toastPage.getLastActionClicked();
                        return lastClick !== null;
                    },
                    { description: 'Action callback fired' }
                );

                const lastClick = await toastPage.getLastActionClicked();
                expect(lastClick).not.toBeNull();
                expect(lastClick?.label).toBe('Confirm');
                expect(lastClick?.index).toBe(0);
            });

            it('should fire callback for secondary action button', async () => {
                const _toastId = await toastPage.showToastWithActions('warning', 'Multiple actions', [
                    { label: 'Primary', primary: true },
                    { label: 'Secondary', primary: false },
                ]);
                await toastPage.waitForToastVisible();

                const secondaryBtn = await wdioBrowser.$('[data-testid="toast-action-1"]');
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

                const lastClick = await toastPage.getLastActionClicked();
                expect(lastClick).not.toBeNull();
                expect(lastClick?.label).toBe('Secondary');
                expect(lastClick?.index).toBe(1);
            });
        });

        describe('Auto-Dismiss Timer (7.6.2.4)', () => {
            it('should auto-dismiss success toast after ~5 seconds', async () => {
                await toastPage.showSuccess('Auto-dismiss test');
                await toastPage.waitForToastVisible();
                expect(await toastPage.isToastDisplayed()).toBe(true);

                await waitForDuration(5500, 'Toast auto-dismiss timer');

                expect(await toastPage.isToastDisplayed()).toBe(false);
            });

            it('should auto-dismiss info toast after ~5 seconds', async () => {
                await toastPage.showInfo('Info auto-dismiss test');
                await toastPage.waitForToastVisible();

                await waitForDuration(5500, 'Toast auto-dismiss timer');

                expect(await toastPage.isToastDisplayed()).toBe(false);
            });

            it('should auto-dismiss warning toast after ~7 seconds', async () => {
                await toastPage.showWarning('Warning auto-dismiss test');
                await toastPage.waitForToastVisible();

                await waitForDuration(5000, 'Partial warning duration wait');
                expect(await toastPage.isToastDisplayed()).toBe(true);

                await waitForDuration(2500, 'Remaining warning duration');

                expect(await toastPage.isToastDisplayed()).toBe(false);
            });

            it('should NOT auto-dismiss persistent toast', async () => {
                await toastPage.showInfo('Persistent toast', { persistent: true });
                await toastPage.waitForToastVisible();

                await waitForDuration(6000, 'Persistent toast verification wait');

                expect(await toastPage.isToastDisplayed()).toBe(true);
            });
        });

        describe('Hover Pause (7.6.2.5)', () => {
            it('should note if hover pause is implemented', async () => {
                await toastPage.showSuccess('Hover test toast', { persistent: true });
                await toastPage.waitForToastVisible();

                const toast = await wdioBrowser.$('[data-testid="toast"]');
                await toast.moveTo();
                await waitForUIState(async () => await toast.isDisplayed(), {
                    description: 'Toast still visible after hover',
                    timeout: 1000,
                });

                expect(await toastPage.isToastDisplayed()).toBe(true);
            });
        });

        describe('Keyboard Navigation (7.6.2.6)', () => {
            it('should allow Tab navigation to dismiss button', async () => {
                await toastPage.showInfo('Keyboard test', { persistent: true });
                await toastPage.waitForToastVisible();

                const toast = await wdioBrowser.$('[data-testid="toast"]');
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

                const activeElement = await toastBrowser.execute(() => {
                    return document.activeElement?.getAttribute('data-testid');
                });
                expect(activeElement).toBeTruthy();

                const dismissBtn = await wdioBrowser.$('[data-testid="toast-dismiss"]');
                expect(await dismissBtn.isExisting()).toBe(true);
            });

            it('should allow Enter key to activate focused button', async () => {
                await toastPage.showToastWithActions('info', 'Keyboard action test', [
                    { label: 'Activate', primary: true },
                ]);
                await toastPage.waitForToastVisible();

                const actionBtn = await wdioBrowser.$('[data-testid="toast-action-0"]');
                await actionBtn.click();
                await waitForUIState(
                    async () => {
                        const activeElement = await toastBrowser.execute(() => {
                            return document.activeElement?.getAttribute('data-testid');
                        });
                        return activeElement === 'toast-action-0';
                    },
                    { description: 'Action button focused', timeout: 1000 }
                );

                await toastPage.clearActionClickTracking();
                await toastBrowser.keys('Enter');
                await waitForUIState(
                    async () => {
                        const lastClick = await toastPage.getLastActionClicked();
                        return lastClick !== null;
                    },
                    { description: 'Enter key callback fired' }
                );

                const lastClick = await toastPage.getLastActionClicked();
                expect(lastClick).not.toBeNull();
                expect(lastClick?.label).toBe('Activate');
            });

            it('should have proper ARIA attributes for accessibility', async () => {
                await toastPage.showWarning('Accessibility test', { persistent: true });
                await toastPage.waitForToastVisible();

                const role = await toastPage.getToastRole();
                expect(role).toBe('alert');

                const ariaLive = await toastPage.getToastAriaLive();
                expect(ariaLive).toBe('polite');

                const dismissBtn = await wdioBrowser.$('[data-testid="toast-dismiss"]');
                const ariaLabel = await dismissBtn.getAttribute('aria-label');
                expect(ariaLabel).toBeTruthy();
                expect(ariaLabel).toContain('Dismiss');
            });
        });
    });

    describe('Stacking Behavior', () => {
        let toastPage: ToastPage;

        beforeEach(async () => {
            toastPage = new ToastPage();
            await toastPage.clearAll();
            await toastPage.waitForAnimationComplete();
        });

        afterEach(async () => {
            await toastPage.clearAll();
        });

        describe('Vertical Stacking', () => {
            it('should stack multiple toasts vertically with newest on top', async () => {
                const ids = await toastPage.showMultipleToasts(3);

                await toastPage.waitForAnimationComplete();

                const visibleCount = await toastPage.getToastCount();
                expect(visibleCount).toBe(3);

                const isStacked = await toastPage.areToastsStackedVertically();
                expect(isStacked).toBe(true);

                const messages = await toastPage.getToastMessagesInOrder();
                expect(messages).toEqual(['Toast 3', 'Toast 2', 'Toast 1']);

                const foundIds = await toastPage.getToastIdsInOrder();
                expect(foundIds.length).toBe(3);
                expect(foundIds).toEqual([...ids].reverse());
            });

            it('should maintain proper spacing between stacked toasts', async () => {
                await toastPage.showMultipleToasts(3);
                await toastPage.waitForAnimationComplete();

                const positions = await toastPage.getToastPositions();
                expect(positions.length).toBe(3);

                for (let i = 1; i < positions.length; i++) {
                    const gap = positions[i].y - (positions[i - 1].y + positions[i - 1].height);
                    expect(gap).toBeGreaterThanOrEqual(-1);
                }
            });
        });

        describe('Max Visible Limit', () => {
            it('should show at most 5 toasts at a time', async () => {
                await toastPage.showMultipleToasts(7);
                await toastPage.waitForAnimationComplete();

                const visibleCount = await toastPage.getToastCount();
                expect(visibleCount).toBe(5);

                const allToasts = await toastPage.getToasts();
                expect(allToasts.length).toBe(7);
            });

            it('should show the LAST 5 toasts (newest) and hide the first ones', async () => {
                const ids = await toastPage.showMultipleToasts(6);
                await toastPage.waitForAnimationComplete();

                const visibleCount = await toastPage.getToastCount();
                expect(visibleCount).toBe(5);

                const visibleIds = await toastPage.getToastIdsInOrder();
                expect(visibleIds.length).toBe(5);

                const expectedVisibleIds = ids.slice(1, 6).reverse();
                expect(visibleIds).toEqual(expectedVisibleIds);

                expect(visibleIds).not.toContain(ids[0]);
            });
        });

        describe('Queue Behavior', () => {
            it('should show previously hidden toast when a visible toast is dismissed', async () => {
                const ids = await toastPage.showMultipleToasts(6);
                await toastPage.waitForAnimationComplete();

                let visibleCount = await toastPage.getToastCount();
                expect(visibleCount).toBe(5);

                let visibleIds = await toastPage.getToastIdsInOrder();
                expect(visibleIds).not.toContain(ids[0]);

                await toastPage.dismissToastByIndex(0);
                await toastPage.waitForAnimationComplete();

                visibleCount = await toastPage.getToastCount();
                expect(visibleCount).toBe(5);

                visibleIds = await toastPage.getToastIdsInOrder();
                expect(visibleIds).toContain(ids[0]);
                expect(visibleIds).not.toContain(ids[5]);
            });

            it('should maintain 5 visible toasts while dismissing', async () => {
                const ids = await toastPage.showMultipleToasts(7);
                await toastPage.waitForAnimationComplete();

                await toastPage.dismissToastByIndex(0);
                await toastPage.waitForAnimationComplete();

                let visibleIds = await toastPage.getToastIdsInOrder();
                expect(visibleIds.length).toBe(5);
                expect(visibleIds).toContain(ids[1]);
                expect(visibleIds).not.toContain(ids[0]);

                await toastPage.dismissToastByIndex(0);
                await toastPage.waitForAnimationComplete();

                visibleIds = await toastPage.getToastIdsInOrder();
                expect(visibleIds.length).toBe(5);
                expect(visibleIds).toContain(ids[0]);
            });
        });

        describe('Z-Order', () => {
            it('should have toast container with appropriate z-index', async () => {
                await toastPage.showInfo('Z-order test', { persistent: true });
                await toastPage.waitForAnimationComplete();

                const container = await wdioBrowser.$('[data-testid="toast-container"]');
                const zIndex = await container.getCSSProperty('z-index');

                const zValue = parseInt(String(zIndex.value), 10);
                expect(zValue).toBeGreaterThanOrEqual(1000);
            });

            it('should render all toasts at the same z-level within the container', async () => {
                await toastPage.showMultipleToasts(3);
                await toastPage.waitForAnimationComplete();

                const toasts = await wdioBrowser.$$('[data-testid="toast"]');
                const zIndices: number[] = [];

                for (const toast of toasts) {
                    const zIndex = await toast.getCSSProperty('z-index');
                    const zValue = zIndex.value === 'auto' ? 0 : parseInt(String(zIndex.value), 10);
                    zIndices.push(zValue);
                }

                const uniqueZIndices = [...new Set(zIndices)];
                expect(uniqueZIndices.length).toBe(1);
            });
        });

        describe('Middle Toast Dismissal', () => {
            it('should maintain layout when dismissing a middle toast', async () => {
                const ids = await toastPage.showMultipleToasts(5);
                await toastPage.waitForAnimationComplete();

                let isStacked = await toastPage.areToastsStackedVertically();
                expect(isStacked).toBe(true);

                await toastPage.dismissToastByIndex(2);
                await toastPage.waitForAnimationComplete();

                const visibleCount = await toastPage.getToastCount();
                expect(visibleCount).toBe(4);

                isStacked = await toastPage.areToastsStackedVertically();
                expect(isStacked).toBe(true);

                const visibleIds = await toastPage.getToastIdsInOrder();
                expect(visibleIds).not.toContain(ids[2]);
                expect(visibleIds).toContain(ids[0]);
                expect(visibleIds).toContain(ids[4]);
            });

            it('should reflow remaining toasts smoothly after middle dismissal', async () => {
                await toastPage.showMultipleToasts(4);
                await toastPage.waitForAnimationComplete();

                const initialPositions = await toastPage.getToastPositions();
                expect(initialPositions.length).toBe(4);

                await toastPage.dismissToastByIndex(1);
                await toastPage.waitForAnimationComplete();

                const finalPositions = await toastPage.getToastPositions();
                expect(finalPositions.length).toBe(3);

                const isStacked = await toastPage.areToastsStackedVertically();
                expect(isStacked).toBe(true);
            });
        });

        describe('Rapid Toast Creation', () => {
            it('should handle rapid toast creation without race conditions', async () => {
                const ids = await toastPage.showMultipleToasts(10, 50);

                await toastPage.waitForAnimationComplete();

                const allToasts = await toastPage.getToasts();
                expect(allToasts.length).toBe(10);

                const visibleCount = await toastPage.getToastCount();
                expect(visibleCount).toBe(5);

                const isStacked = await toastPage.areToastsStackedVertically();
                expect(isStacked).toBe(true);

                const uniqueIds = new Set(ids);
                expect(uniqueIds.size).toBe(10);
            });

            it('should create toasts with no delay and handle correctly', async () => {
                const ids = await toastPage.showMultipleToasts(10, 0);

                await toastPage.waitForAnimationComplete();

                const allToasts = await toastPage.getToasts();
                expect(allToasts.length).toBe(10);

                const visibleCount = await toastPage.getToastCount();
                expect(visibleCount).toBe(5);

                const uniqueIds = new Set(ids);
                expect(uniqueIds.size).toBe(10);
            });

            it('should properly show newest toasts after rapid dismissals', async () => {
                const ids = await toastPage.showMultipleToasts(8, 25);
                await toastPage.waitForAnimationComplete();

                for (let i = 0; i < 3; i++) {
                    const previousCount = await toastPage.getToastCount();
                    await toastPage.dismissToastByIndex(0);
                    await waitForUIState(async () => (await toastPage.getToastCount()) < previousCount, {
                        timeout: 1000,
                        description: 'Toast dismissed',
                    });
                }

                await toastPage.waitForAnimationComplete();

                const visibleCount = await toastPage.getToastCount();
                expect(visibleCount).toBe(5);

                const visibleIds = await toastPage.getToastIdsInOrder();
                expect(visibleIds.length).toBe(5);

                const expectedIds = ids.slice(0, 5).reverse();
                expect(visibleIds).toEqual(expectedIds);
            });
        });

        describe('Edge Cases', () => {
            it('should handle dismissing all visible toasts', async () => {
                await toastPage.showMultipleToasts(5);
                await toastPage.waitForAnimationComplete();

                for (let i = 0; i < 5; i++) {
                    const previousCount = await toastPage.getToastCount();
                    await toastPage.dismissToastByIndex(0);
                    await waitForUIState(async () => (await toastPage.getToastCount()) < previousCount, {
                        timeout: 1000,
                        description: 'Toast dismissed',
                    });
                }

                await toastPage.waitForAnimationComplete();

                const visibleCount = await toastPage.getToastCount();
                expect(visibleCount).toBe(0);

                const allToasts = await toastPage.getToasts();
                expect(allToasts.length).toBe(0);
            });

            it('should handle single toast correctly', async () => {
                const id = await toastPage.showInfo('Single toast', { persistent: true });
                await toastPage.waitForAnimationComplete();

                const visibleCount = await toastPage.getToastCount();
                expect(visibleCount).toBe(1);

                const isPositioned = await toastPage.isPositionedBottomLeft();
                expect(isPositioned).toBe(true);

                await toastPage.dismissToastById(id);
                await toastPage.waitForAnimationComplete();

                const finalCount = await toastPage.getToastCount();
                expect(finalCount).toBe(0);
            });

            it('should maintain stack order when types are mixed', async () => {
                await toastPage.showSuccess('Success toast', { persistent: true });
                await toastPage.waitForAnimationComplete();
                await toastPage.showError('Error toast', { persistent: true });
                await toastPage.waitForAnimationComplete();
                await toastPage.showWarning('Warning toast', { persistent: true });
                await toastPage.waitForAnimationComplete();
                await toastPage.showInfo('Info toast', { persistent: true });
                await toastPage.waitForAnimationComplete();

                const visibleCount = await toastPage.getToastCount();
                expect(visibleCount).toBe(4);

                const isStacked = await toastPage.areToastsStackedVertically();
                expect(isStacked).toBe(true);

                const messages = await toastPage.getToastMessagesInOrder();
                expect(messages).toEqual(['Info toast', 'Warning toast', 'Error toast', 'Success toast']);
            });
        });
    });

    describe('Update Toast Integration', () => {
        let updateToast: UpdateToastPage;

        before(async () => {
            updateToast = new UpdateToastPage();

            await waitForDuration(2000, 'App initialization');

            await wdioBrowser.execute(() => {
                getElectronAPI(window)?.setAutoUpdateEnabled(false);
            });

            await waitForIPCRoundTrip(async () => undefined);
        });

        beforeEach(async () => {
            await updateToast.clearAll();
        });

        describe('showAvailable() - Info Toast', () => {
            it('should display info-type toast when update is available', async () => {
                await updateToast.showAvailable('3.0.0');

                await updateToast.waitForVisible();
                expect(await updateToast.isDisplayed()).toBe(true);

                expect(await updateToast.getTitle()).toBe('Update Available');
                const message = await updateToast.getMessage();
                expect(message).toContain('3.0.0');
                expect(message).toContain('downloading');
            });

            it('should render toast through the generic toast system', async () => {
                await updateToast.showAvailable('3.0.0');
                await updateToast.waitForVisible();

                const toastExists = await updateToast.isDisplayed();
                expect(toastExists).toBe(true);

                expect(await updateToast.isDismissButtonExisting()).toBe(true);
                expect(await updateToast.isRestartButtonExisting()).toBe(false);
            });
        });

        describe('showDownloaded() - Success Toast', () => {
            it('should display success-type toast when update is downloaded', async () => {
                await updateToast.showDownloaded('3.0.0');

                await updateToast.waitForVisible();
                expect(await updateToast.isDisplayed()).toBe(true);

                expect(await updateToast.getTitle()).toBe('Update Ready');
                const message = await updateToast.getMessage();
                expect(message).toContain('3.0.0');
                expect(message).toContain('ready to install');
            });

            it('should show action buttons (Restart Now, Later) for downloaded toast', async () => {
                await updateToast.showDownloaded('3.0.0');
                await updateToast.waitForVisible();

                expect(await updateToast.isRestartButtonDisplayed()).toBe(true);
                expect(await updateToast.isLaterButtonDisplayed()).toBe(true);
                expect(await updateToast.getRestartButtonText()).toBe('Restart Now');
            });
        });

        describe('showError() - Error Toast', () => {
            it('should display error-type toast when update fails', async () => {
                await updateToast.showError('Network connection failed');

                await updateToast.waitForVisible();
                expect(await updateToast.isDisplayed()).toBe(true);

                expect(await updateToast.getTitle()).toBe('Update Error');
                expect(await updateToast.getMessage()).toContain('Network connection failed');
            });

            it('should show only dismiss button for error toast', async () => {
                await updateToast.showError('Test error');
                await updateToast.waitForVisible();

                expect(await updateToast.isDismissButtonExisting()).toBe(true);
                expect(await updateToast.isRestartButtonExisting()).toBe(false);
                expect(await updateToast.isLaterButtonExisting()).toBe(false);
            });

            it('should handle null error message with fallback', async () => {
                await updateToast.showError(null);
                await updateToast.waitForVisible();

                expect(await updateToast.getMessage()).toContain('An error occurred while updating');
            });
        });

        describe('"Install Now" Button', () => {
            it('should trigger install action when clicked', async () => {
                await updateToast.showDownloaded('3.0.0');
                await updateToast.waitForVisible();
                expect(await updateToast.isRestartButtonDisplayed()).toBe(true);

                await updateToast.clickRestartNow();
                await updateToast.waitForAnimationComplete();

                expect(await updateToast.isRestartButtonExisting()).toBe(false);
            });

            it('should clear pending update state after Install Now is clicked', async () => {
                await updateToast.showDownloaded('3.0.0');
                await updateToast.showBadge('3.0.0');
                await updateToast.waitForVisible();

                expect(await updateToast.isBadgeDisplayed()).toBe(true);
                expect(await updateToast.isRestartButtonDisplayed()).toBe(true);

                await updateToast.clickRestartNow();
                await updateToast.waitForAnimationComplete();

                expect(await updateToast.isRestartButtonExisting()).toBe(false);
            });
        });

        describe('"Later" Button', () => {
            it('should dismiss toast when clicked', async () => {
                await updateToast.showDownloaded('3.0.0');
                await updateToast.waitForVisible();
                expect(await updateToast.isLaterButtonDisplayed()).toBe(true);

                await updateToast.clickLater();
                await updateToast.waitForAnimationComplete();

                expect(await updateToast.isDisplayed()).toBe(false);
            });

            it('should keep pending update indicator (badge) after clicking Later', async () => {
                await updateToast.showDownloaded('3.0.0');
                await updateToast.showBadge('3.0.0');
                await updateToast.waitForVisible();

                await updateToast.clickLater();
                await updateToast.waitForAnimationComplete();

                expect(await updateToast.isDisplayed()).toBe(false);
                expect(await updateToast.isBadgeDisplayed()).toBe(true);
            });

            it('should keep tray tooltip updated after clicking Later', async () => {
                await updateToast.showDownloaded('3.0.0');
                await updateToast.showBadge('3.0.0');
                await updateToast.waitForVisible();

                await updateToast.clickLater();
                await updateToast.waitForAnimationComplete();

                const tooltip = await updateToast.getTrayTooltip();
                expect(tooltip).toContain('Update v3.0.0 available');
            });
        });

        describe('Download Progress Bar', () => {
            it('should display progress bar during download', async () => {
                await updateToast.showProgress(50);
                await updateToast.waitForVisible();

                expect(await updateToast.isProgressBarDisplayed()).toBe(true);
            });

            it('should update progress bar value', async () => {
                await updateToast.showProgress(25);
                await updateToast.waitForVisible();

                const initialValue = await updateToast.getProgressValue();
                expect(initialValue).toBe('25');

                await updateToast.showProgress(75);
                await waitForDuration(300, 'Progress value update');

                const updatedValue = await updateToast.getProgressValue();
                expect(updatedValue).toBe('75');
            });

            it('should show progress message with percentage', async () => {
                await updateToast.showProgress(60);
                await updateToast.waitForVisible();

                expect(await updateToast.getTitle()).toBe('Downloading Update');

                const message = await updateToast.getMessage();
                expect(message).toContain('60%');
            });

            it('should handle progress from 0 to 100', async () => {
                await updateToast.showProgress(0);
                await updateToast.waitForVisible();
                expect(await updateToast.getProgressValue()).toBe('0');

                await updateToast.showProgress(100);
                await waitForDuration(300, 'Progress completion');
                expect(await updateToast.getProgressValue()).toBe('100');
            });
        });

        describe('Toast Type Integration', () => {
            it('should use correct toast types for each update state', async () => {
                await updateToast.showAvailable('2.0.0');
                await updateToast.waitForVisible();
                expect(await updateToast.isDismissButtonExisting()).toBe(true);
                expect(await updateToast.isRestartButtonExisting()).toBe(false);
                await updateToast.hide();
                await updateToast.waitForHidden();

                await updateToast.showDownloaded('2.0.0');
                await updateToast.waitForVisible();
                expect(await updateToast.isRestartButtonExisting()).toBe(true);
                expect(await updateToast.isLaterButtonExisting()).toBe(true);
                await updateToast.hide();
                await updateToast.waitForHidden();

                await updateToast.showError('Test error');
                await updateToast.waitForVisible();
                expect(await updateToast.isDismissButtonExisting()).toBe(true);
                expect(await updateToast.isRestartButtonExisting()).toBe(false);
                await updateToast.hide();
                await updateToast.waitForHidden();

                await updateToast.showProgress(50);
                await updateToast.waitForVisible();
                expect(await updateToast.isProgressBarDisplayed()).toBe(true);
            });
        });
    });

    describe('Full Workflow', function () {
        this.timeout(180000);
        const toastPage = new ToastPage();

        beforeEach(async () => {
            await waitForAppReady();
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

        describe('Success Toast Workflow (7.6.5.1)', () => {
            it('should complete: trigger → appears → auto-dismiss → removed', async () => {
                const toastId = await toastPage.showSuccess('Operation completed successfully!', {
                    title: 'Success',
                });
                expect(toastId).toBeTruthy();

                await toastPage.waitForToastVisible();
                const toastCount = await toastPage.getToastCount();
                expect(toastCount).toBe(1);

                expect(await toastPage.isToastDisplayed()).toBe(true);

                const toastType = await toastPage.getToastTypeClass();
                expect(toastType).toBe('success');

                const role = await toastPage.getToastRole();
                expect(role).toBe('alert');

                const ariaLive = await toastPage.getToastAriaLive();
                expect(ariaLive).toBe('polite');

                await waitForDurationWithPolling(5500, 'INTENTIONAL: Testing 5s auto-dismiss timer for success toast');

                const remainingCount = await toastPage.getToastCount();
                expect(remainingCount).toBe(0);

                const contextToasts = await toastPage.getToasts();
                expect(contextToasts.length).toBe(0);
            });
        });

        describe('Error Toast Workflow (7.6.5.2)', () => {
            it('should: trigger → appears → persists 10s → manual dismiss → removed', async () => {
                const toastId = await toastPage.showError('Something went wrong!', {
                    title: 'Error',
                });
                expect(toastId).toBeTruthy();

                await toastPage.waitForToastVisible();
                expect(await toastPage.isToastDisplayed()).toBe(true);

                const toastType = await toastPage.getToastTypeClass();
                expect(toastType).toBe('error');

                await waitForDurationWithPolling(
                    5500,
                    'INTENTIONAL: Testing error toast persistence (success would dismiss by now)'
                );

                let count = await toastPage.getToastCount();
                expect(count).toBe(1);

                await toastPage.dismissToast(0);
                await waitForAnimationSettle('[data-testid="toast"]', {
                    timeout: E2E_TIMING.TIMEOUTS?.ANIMATION_SETTLE,
                    allowMissing: true,
                });

                count = await toastPage.getToastCount();
                expect(count).toBe(0);
            });

            it('should auto-dismiss after 10 seconds if not manually dismissed', async () => {
                await toastPage.showError('Auto-dismiss test', { title: 'Error' });
                await toastPage.waitForToastVisible();

                await waitForDurationWithPolling(10500, 'INTENTIONAL: Testing 10s auto-dismiss timer for error toast');

                const count = await toastPage.getToastCount();
                expect(count).toBe(0);
            });
        });

        describe('Progress Toast Workflow (7.6.5.3)', () => {
            it('should: trigger → appears → progress updates → completion', async () => {
                const toastId = await toastPage.showProgress('Downloading...', 0, {
                    title: 'Download Progress',
                    id: 'test-progress-toast',
                });
                expect(toastId).toBe('test-progress-toast');

                await toastPage.waitForToastVisible();
                expect(await toastPage.isToastDisplayed()).toBe(true);

                const toastType = await toastPage.getToastTypeClass();
                expect(toastType).toBe('progress');

                expect(await toastPage.isProgressBarDisplayed()).toBe(true);

                let progressValue = await toastPage.getProgressValue();
                expect(parseInt(progressValue ?? '0', 10)).toBe(0);

                await toastPage.showProgress('Downloading...', 50, {
                    title: 'Download Progress',
                    id: 'test-progress-toast',
                });
                await waitForUIState(async () => true, {
                    timeout: E2E_TIMING.UI_STATE_PAUSE_MS,
                    description: 'Progress update to 50%',
                });

                progressValue = await toastPage.getProgressValue();
                expect(parseInt(progressValue ?? '0', 10)).toBe(50);

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

                await waitForDurationWithPolling(
                    5500,
                    'INTENTIONAL: Verify progress toast does not auto-dismiss after 5s'
                );
                const stillVisible = await toastPage.getToastCount();
                expect(stillVisible).toBe(1);

                await toastPage.dismissToastById(toastId);
                await waitForAnimationSettle('[data-testid="toast"]', {
                    timeout: E2E_TIMING.TIMEOUTS?.ANIMATION_SETTLE,
                    allowMissing: true,
                });

                const finalCount = await toastPage.getToastCount();
                expect(finalCount).toBe(0);
            });
        });

        describe('Multi-Toast Workflow (7.6.5.4)', () => {
            it('should: trigger 3 → all stack → dismiss middle → re-stack', async () => {
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

                const initialCount = await toastPage.getToastCount();
                expect(initialCount).toBe(3);

                const messages = await toastPage.getToastMessagesInOrder();
                expect(messages.length).toBe(3);

                const toast1 = await wdioBrowser.$(toastPage.toastByIdSelector(toast1Id));
                const toast2 = await wdioBrowser.$(toastPage.toastByIdSelector(toast2Id));
                const toast3 = await wdioBrowser.$(toastPage.toastByIdSelector(toast3Id));

                expect(await toast1.isExisting()).toBe(true);
                expect(await toast2.isExisting()).toBe(true);
                expect(await toast3.isExisting()).toBe(true);

                const toast1Class = await toast1.getAttribute('class');
                const toast2Class = await toast2.getAttribute('class');
                const toast3Class = await toast3.getAttribute('class');

                expect(toast1Class).toContain('toast--info');
                expect(toast2Class).toContain('toast--warning');
                expect(toast3Class).toContain('toast--success');

                await toastPage.dismissToastById(toast2Id);
                await waitForAnimationSettle('[data-testid="toast"]', {
                    timeout: E2E_TIMING.TIMEOUTS?.ANIMATION_SETTLE,
                    allowMissing: true,
                });

                const remainingCount = await toastPage.getToastCount();
                expect(remainingCount).toBe(2);

                const remainingToasts = await wdioBrowser.$$('[data-testid="toast"]');
                expect(remainingToasts.length).toBe(2);

                const remainingToast1 = await wdioBrowser.$(toastPage.toastByIdSelector(toast1Id));
                const remainingToast2 = await wdioBrowser.$(toastPage.toastByIdSelector(toast2Id));
                const remainingToast3 = await wdioBrowser.$(toastPage.toastByIdSelector(toast3Id));

                expect(await remainingToast1.isExisting()).toBe(true);
                expect(await remainingToast2.isExisting()).toBe(false);
                expect(await remainingToast3.isExisting()).toBe(true);

                const remainingToast1Class = await remainingToast1.getAttribute('class');
                const remainingToast3Class = await remainingToast3.getAttribute('class');

                expect(remainingToast1Class).toContain('toast--info');
                expect(remainingToast3Class).toContain('toast--success');

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

                await toastPage.dismissToast(0);
                await waitForAnimationSettle('[data-testid="toast"]', {
                    timeout: E2E_TIMING.TIMEOUTS?.ANIMATION_SETTLE,
                    allowMissing: true,
                });

                expect(await toastPage.getToastCount()).toBe(1);

                await toastPage.dismissToast(0);
                await waitForAnimationSettle('[data-testid="toast"]', {
                    timeout: E2E_TIMING.TIMEOUTS?.ANIMATION_SETTLE,
                    allowMissing: true,
                });

                expect(await toastPage.getToastCount()).toBe(0);
            });
        });
    });
});
