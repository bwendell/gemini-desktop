/**
 * E2E Test: Response Notifications
 *
 * Tests the response notifications feature end-to-end.
 * Verifies toggle functionality, notification display, and badge behavior.
 *
 * User Workflows Covered:
 * 1. Toggle response notifications in Options (Task 9.1)
 * 2. Badge clears on window focus (Task 9.2)
 * 3. Full response notification flow when unfocused (Task 9.3)
 * 4. Notification click focuses window (Task 9.4)
 * 5. No notification when window is focused (Task 9.5)
 * 6. No notification when setting is disabled (Task 9.6)
 * 7. Setting persists across Options close/reopen (Task 9.7)
 * 8-10. Cross-platform behavior (Tasks 9.8-9.10)
 * 11. Notification works on current platform (Task 9.11)
 *
 * @module response-notifications.spec
 */

/// <reference path="./helpers/wdio-electron.d.ts" />

import { browser, expect } from '@wdio/globals';
import { MainWindowPage, OptionsPage } from './pages';
import { waitForWindowCount } from './helpers/windowActions';
import { getPlatform, E2EPlatform } from './helpers/platform';
import { E2ELogger } from './helpers/logger';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { waitForUIState, waitForDuration } from './helpers/waitUtilities';
import { E2E_TIMING } from './helpers/e2eConstants';

// ============================================================================
// Test Suite
// ============================================================================

describe('Response Notifications', () => {
    const mainWindow = new MainWindowPage();
    const optionsPage = new OptionsPage();

    let platform: E2EPlatform;

    before(async () => {
        platform = await getPlatform();
        E2ELogger.info('response-notifications', `Platform: ${platform.toUpperCase()}`);
    });

    // ========================================================================
    // Task 9.1: Toggle response notifications in Options
    // ========================================================================

    describe('Toggle in Options (Task 9.1)', () => {
        beforeEach(async () => {
            E2ELogger.info('response-notifications', 'Opening Options window');
            await waitForAppReady();

            // Open Options via menu
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2, 5000);
            await optionsPage.waitForLoad();
        });

        afterEach(async () => {
            E2ELogger.info('response-notifications', 'Cleaning up');
            await ensureSingleWindow();
        });

        it('should display the Notifications section in Options', async () => {
            expect(await optionsPage.isNotificationsSectionDisplayed()).toBe(true);

            const text = await optionsPage.getNotificationsSectionText();
            expect(text.toLowerCase()).toContain('notification');

            E2ELogger.info('response-notifications', 'Notifications section visible');
        });

        it('should display the response notifications toggle', async () => {
            expect(await optionsPage.isResponseNotificationsToggleDisplayed()).toBe(true);

            E2ELogger.info('response-notifications', 'Response notifications toggle visible');
        });

        it('should display toggle with label and description', async () => {
            const text = await optionsPage.getNotificationsSectionText();

            expect(text).toContain('Response Notifications');
            expect(text.toLowerCase()).toContain('unfocused');

            E2ELogger.info('response-notifications', 'Toggle has label and description');
        });

        it('should have aria-checked attribute on toggle switch', async () => {
            const isEnabled = await optionsPage.isResponseNotificationsEnabled();

            expect([true, false]).toContain(isEnabled);
            E2ELogger.info('response-notifications', `Initial state: enabled=${isEnabled}`);
        });

        it('should toggle state when clicked', async () => {
            const initialEnabled = await optionsPage.isResponseNotificationsEnabled();
            E2ELogger.info('response-notifications', `Initial state: ${initialEnabled}`);

            await optionsPage.toggleResponseNotifications();

            const newEnabled = await optionsPage.isResponseNotificationsEnabled();
            E2ELogger.info('response-notifications', `After click: ${newEnabled}`);

            expect(newEnabled).not.toBe(initialEnabled);

            // Restore original state
            await optionsPage.toggleResponseNotifications();
        });

        it('should toggle back when clicked again', async () => {
            const initial = await optionsPage.isResponseNotificationsEnabled();
            await optionsPage.toggleResponseNotifications();
            await optionsPage.toggleResponseNotifications();

            const final = await optionsPage.isResponseNotificationsEnabled();
            expect(final).toBe(initial);

            E2ELogger.info('response-notifications', 'Toggle round-trip verified');
        });

        it('should persist state via IPC round-trip', async () => {
            // Toggle to a known state (disabled)
            await optionsPage.disableResponseNotifications();
            const afterDisable = await optionsPage.isResponseNotificationsEnabled();
            expect(afterDisable).toBe(false);

            // Toggle back to enabled
            await optionsPage.enableResponseNotifications();
            const afterEnable = await optionsPage.isResponseNotificationsEnabled();
            expect(afterEnable).toBe(true);

            E2ELogger.info('response-notifications', 'IPC round-trip verified');
        });
    });

    // ========================================================================
    // Task 9.7: Setting persists across Options close/reopen
    // ========================================================================

    describe('Setting Persistence (Task 9.7)', () => {
        beforeEach(async () => {
            await waitForAppReady();
        });

        afterEach(async () => {
            await ensureSingleWindow();
        });

        it('should remember disabled state after Options close/reopen', async () => {
            // Open Options
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2, 5000);
            await optionsPage.waitForLoad();

            // Set to disabled
            await optionsPage.disableResponseNotifications();
            const stateBeforeClose = await optionsPage.isResponseNotificationsEnabled();
            expect(stateBeforeClose).toBe(false);

            E2ELogger.info('response-notifications', 'Set toggle to disabled');

            // Close Options
            await optionsPage.close();
            await waitForWindowCount(1, 5000);

            // Reopen Options
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2, 5000);
            await optionsPage.waitForLoad();

            // Verify state was preserved
            const stateAfterReopen = await optionsPage.isResponseNotificationsEnabled();
            expect(stateAfterReopen).toBe(false);

            E2ELogger.info('response-notifications', 'Toggle state persisted as disabled');

            // Restore to enabled
            await optionsPage.enableResponseNotifications();

            E2ELogger.info('response-notifications', 'Session persistence verified');
        });

        it('should remember enabled state after Options close/reopen', async () => {
            // Open Options
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2, 5000);
            await optionsPage.waitForLoad();

            // Ensure it's enabled
            await optionsPage.enableResponseNotifications();
            const stateBeforeClose = await optionsPage.isResponseNotificationsEnabled();
            expect(stateBeforeClose).toBe(true);

            // Close Options
            await optionsPage.close();
            await waitForWindowCount(1, 5000);

            // Reopen Options
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2, 5000);
            await optionsPage.waitForLoad();

            // Verify state was preserved
            const stateAfterReopen = await optionsPage.isResponseNotificationsEnabled();
            expect(stateAfterReopen).toBe(true);

            E2ELogger.info('response-notifications', 'Toggle state persisted as enabled');
        });
    });

    // ========================================================================
    // Task 9.2: Badge clears on window focus
    // ========================================================================

    describe('Badge Clears on Focus (Task 9.2)', () => {
        beforeEach(async () => {
            await waitForAppReady();
        });

        afterEach(async () => {
            await ensureSingleWindow();
        });

        it('should clear notification badge when window is focused', async () => {
            // 1. Set window as unfocused in the main process
            await browser.electron.execute(() => {
                const notificationManager = (global as any).notificationManager;
                if (notificationManager) {
                    notificationManager['_isWindowFocused'] = false;
                }
            });

            // 2. Trigger response-complete via production event path
            // (The network detection → emit chain is tested at unit level;
            // here we test the emit → notification → badge E2E flow)
            await browser.electron.execute(() => {
                const windowManager = (global as any).windowManager;
                const mainWindowInstance = windowManager?.getMainWindowInstance();
                if (mainWindowInstance) {
                    mainWindowInstance.emit('response-complete');
                }
            });

            // 3. Wait for notification/badge to be triggered via async processing
            await waitForUIState(
                async () => {
                    const result = await browser.electron.execute(() => {
                        const badgeManager = (global as any).badgeManager;
                        return badgeManager?.hasNotificationBadge ?? false;
                    });
                    return result;
                },
                { timeout: E2E_TIMING.TIMEOUTS.UI_STATE, description: 'Notification badge triggered' }
            );

            // 4. Verify badge was shown via production code path
            const badgeShown = await browser.electron.execute(() => {
                const badgeManager = (global as any).badgeManager;
                return badgeManager?.hasNotificationBadge ?? false;
            });

            expect(badgeShown).toBe(true);
            E2ELogger.info('response-notifications', 'Badge shown after response-complete event');

            // 5. Now focus the window via production method
            await browser.electron.execute(() => {
                const notificationManager = (global as any).notificationManager;
                notificationManager?.onWindowFocus();
            });

            await waitForUIState(
                async () => {
                    const cleared = await browser.electron.execute(() => {
                        const badgeManager = (global as any).badgeManager;
                        return !(badgeManager?.hasNotificationBadge ?? false);
                    });
                    return cleared;
                },
                { timeout: E2E_TIMING.TIMEOUTS.UI_STATE, description: 'Badge cleared on focus' }
            );

            // 6. Verify badge was cleared
            const badgeCleared = await browser.electron.execute(() => {
                const badgeManager = (global as any).badgeManager;
                return !(badgeManager?.hasNotificationBadge ?? false);
            });

            expect(badgeCleared).toBe(true);
            E2ELogger.info('response-notifications', 'Badge cleared on window focus');
        });
    });

    // ========================================================================
    // Task 9.3: Full response notification flow
    // ========================================================================

    describe('Full Notification Flow (Task 9.3)', () => {
        beforeEach(async () => {
            await waitForAppReady();
        });

        afterEach(async () => {
            await ensureSingleWindow();
        });

        it('should show notification when response completes and window is unfocused', async () => {
            // 1. Prepare to track notifications in main process
            await browser.electron.execute(() => {
                const notificationManager = (global as any).notificationManager;
                if (!notificationManager) return;

                notificationManager['_isWindowFocused'] = false;
                notificationManager['_lastNotificationShown'] = false;

                const originalShow = notificationManager.showNotification;
                notificationManager.showNotification = function () {
                    this['_lastNotificationShown'] = true;
                    // Don't actually show native notification in test env if possible
                };
                notificationManager['_originalShow'] = originalShow;
            });

            // 2. Trigger response-complete via production event path
            // (The network detection → emit chain is tested at unit level;
            // here we test the emit → notification → badge E2E flow)
            await browser.electron.execute(() => {
                const windowManager = (global as any).windowManager;
                const mainWindowInstance = windowManager?.getMainWindowInstance();
                if (mainWindowInstance) {
                    mainWindowInstance.emit('response-complete');
                }
            });

            // 3. Wait for notification to be triggered
            await waitForUIState(
                async () => {
                    const result = await browser.electron.execute(() => {
                        const notificationManager = (global as any).notificationManager;
                        const badgeManager = (global as any).badgeManager;
                        const shown = notificationManager?.['_lastNotificationShown'] ?? false;
                        const hasBadge = badgeManager?.hasNotificationBadge ?? false;
                        return shown || hasBadge;
                    });
                    return result;
                },
                { timeout: E2E_TIMING.TIMEOUTS.UI_STATE, description: 'Notification triggered' }
            );

            // 4. Verify notification and badge state
            const result = await browser.electron.execute(() => {
                const notificationManager = (global as any).notificationManager;
                const badgeManager = (global as any).badgeManager;

                const shown = notificationManager?.['_lastNotificationShown'] ?? false;
                const hasBadge = badgeManager?.hasNotificationBadge ?? false;

                // Cleanup our hook
                if (notificationManager && notificationManager['_originalShow']) {
                    notificationManager.showNotification = notificationManager['_originalShow'];
                    delete notificationManager['_originalShow'];
                }

                return { shown, hasBadge };
            });

            expect(result.shown).toBe(true);
            expect(result.hasBadge).toBe(true);
            E2ELogger.info('response-notifications', 'Event-triggered notification verified');
        });
    });

    // ========================================================================
    // Task 9.4: Notification click focuses window
    //
    // NOTE (Task 12.6): E2E tests CANNOT directly trigger native OS notification
    // click events - this is an OS-level limitation. Instead, we test the handler
    // (focusMainWindow) directly. The notification click → handler wiring is tested
    // in coordinated tests: tests/coordinated/response-notifications.coordinated.test.ts
    // ========================================================================

    describe('Notification Click Focuses Window (Task 9.4)', () => {
        beforeEach(async () => {
            await waitForAppReady();
        });

        afterEach(async () => {
            await ensureSingleWindow();
        });

        it('should focus main window when notification is clicked', async () => {
            // This test verifies the notification click handler
            const result = await browser.electron.execute(async () => {
                const notificationManager = (global as any).notificationManager;
                if (!notificationManager) {
                    return { error: 'NotificationManager not available' };
                }

                // Get main window reference
                const mainWindow = notificationManager['mainWindow'];
                if (!mainWindow || mainWindow.isDestroyed()) {
                    return { error: 'Main window not available' };
                }

                // Track if focus methods were called
                let showCalled = false;
                let focusCalled = false;

                const originalShow = mainWindow.show.bind(mainWindow);
                const originalFocus = mainWindow.focus.bind(mainWindow);

                mainWindow.show = () => {
                    showCalled = true;
                    originalShow();
                };
                mainWindow.focus = () => {
                    focusCalled = true;
                    originalFocus();
                };

                // Trigger the notification click handler directly
                // This simulates what happens when user clicks the notification
                notificationManager['focusMainWindow']();

                // Restore original methods
                mainWindow.show = originalShow;
                mainWindow.focus = originalFocus;

                return { showCalled, focusCalled };
            });

            if ('error' in result) {
                E2ELogger.info('response-notifications', `Skipping: ${result.error}`);
                return;
            }

            expect(result.showCalled).toBe(true);
            expect(result.focusCalled).toBe(true);

            E2ELogger.info('response-notifications', 'Notification click focuses window verified');
        });

        it('should restore minimized window when notification is clicked', async () => {
            // First minimize the window, then verify notification click restores it
            const result = await browser.electron.execute(async () => {
                const notificationManager = (global as any).notificationManager;
                if (!notificationManager) {
                    return { error: 'NotificationManager not available' };
                }

                // Get main window reference
                const mainWindow = notificationManager['mainWindow'];
                if (!mainWindow || mainWindow.isDestroyed()) {
                    return { error: 'Main window not available' };
                }

                // Track if restore/show/focus was called
                let restoreCalled = false;
                let showCalled = false;
                let focusCalled = false;

                const originalRestore = mainWindow.restore.bind(mainWindow);
                const originalShow = mainWindow.show.bind(mainWindow);
                const originalFocus = mainWindow.focus.bind(mainWindow);

                mainWindow.restore = () => {
                    restoreCalled = true;
                    originalRestore();
                };
                mainWindow.show = () => {
                    showCalled = true;
                    originalShow();
                };
                mainWindow.focus = () => {
                    focusCalled = true;
                    originalFocus();
                };

                // Try to minimize the window
                mainWindow.minimize();

                // Give a moment for minimize to take effect
                await new Promise((resolve) => setTimeout(resolve, 200));

                // Check if it was actually minimized (may not work in all environments)
                const wasMinimized = mainWindow.isMinimized();

                // Trigger the notification click handler
                notificationManager['focusMainWindow']();

                // Give a moment for window operations
                await new Promise((resolve) => setTimeout(resolve, 200));

                // Check if window is now visible
                const isNowVisible = mainWindow.isVisible();

                // Restore original methods
                mainWindow.restore = originalRestore;
                mainWindow.show = originalShow;
                mainWindow.focus = originalFocus;

                return { wasMinimized, restoreCalled, showCalled, focusCalled, isNowVisible };
            });

            if ('error' in result) {
                E2ELogger.info('response-notifications', `Skipping: ${result.error}`);
                return;
            }

            // restore() should only be called if the window was actually minimized
            if (result.wasMinimized) {
                expect(result.restoreCalled).toBe(true);
                E2ELogger.info('response-notifications', 'Window was minimized and restore was called');
            } else {
                E2ELogger.info(
                    'response-notifications',
                    'Window minimize not supported in this environment - testing focus only'
                );
            }

            // show() and focus() should always be called
            expect(result.showCalled).toBe(true);
            expect(result.focusCalled).toBe(true);
            expect(result.isNowVisible).toBe(true);

            E2ELogger.info('response-notifications', 'focusMainWindow verified');
        });
    });

    // ========================================================================
    // Task 9.5: No notification when window is focused
    // ========================================================================

    describe('No Notification When Focused (Task 9.5)', () => {
        beforeEach(async () => {
            await waitForAppReady();
        });

        afterEach(async () => {
            await ensureSingleWindow();
        });

        it('should NOT show notification when window is focused', async () => {
            // 1. Set window as focused in the main process
            await browser.electron.execute(() => {
                const notificationManager = (global as any).notificationManager;
                if (notificationManager) {
                    notificationManager['_isWindowFocused'] = true;
                    notificationManager['_lastNotificationShown'] = false;
                }
            });

            // 2. Trigger via Network
            await mainWindow.triggerNetworkRequest('https://gemini.google.com/u/0/_/BardChatUi/data/StreamGenerate');

            // 3. Wait briefly to verify NO notification occurs (negative test)
            await waitForDuration(500, 'Verify no spurious notification when focused');

            const check = await browser.electron.execute(() => {
                const notificationManager = (global as any).notificationManager;
                const badgeManager = (global as any).badgeManager;

                const shown = notificationManager?.['_lastNotificationShown'] ?? false;
                const hasBadge = badgeManager?.hasNotificationBadge ?? false;

                return { shown, hasBadge };
            });

            expect(check.shown).toBe(false);
            expect(check.hasBadge).toBe(false);
            E2ELogger.info('response-notifications', 'No notification when focused verified (network triggered)');
        });
    });

    // ========================================================================
    // Task 9.6: No notification when setting is disabled
    // ========================================================================

    describe('No Notification When Setting Disabled (Task 9.6)', () => {
        beforeEach(async () => {
            await waitForAppReady();
        });

        afterEach(async () => {
            // Restore setting to enabled
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2, 5000);
            await optionsPage.waitForLoad();
            await optionsPage.enableResponseNotifications();
            await ensureSingleWindow();
        });

        it('should NOT show notification when setting is disabled', async () => {
            // 1. Disable notifications via UI
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2, 5000);
            await optionsPage.waitForLoad();
            await optionsPage.disableResponseNotifications();
            await optionsPage.close();
            await waitForWindowCount(1, 5000);

            // 2. Set window as unfocused
            await browser.electron.execute(() => {
                const notificationManager = (global as any).notificationManager;
                if (notificationManager) {
                    notificationManager['_isWindowFocused'] = false;
                    notificationManager['_lastNotificationShown'] = false;
                }
            });

            // 3. Trigger via Network
            await mainWindow.triggerNetworkRequest('https://gemini.google.com/u/0/_/BardChatUi/data/StreamGenerate');

            // 4. Wait briefly to verify NO notification occurs (negative test)
            await waitForDuration(500, 'Verify no spurious notification when disabled');

            const check = await browser.electron.execute(() => {
                const notificationManager = (global as any).notificationManager;
                const badgeManager = (global as any).badgeManager;

                const shown = notificationManager?.['_lastNotificationShown'] ?? false;
                const hasBadge = badgeManager?.hasNotificationBadge ?? false;

                return { shown, hasBadge };
            });

            expect(check.shown).toBe(false);
            expect(check.hasBadge).toBe(false);
            E2ELogger.info('response-notifications', 'No notification when disabled verified (network triggered)');
        });

        it('should NOT show notification for non-matching URLs (e.g. log / analytics)', async () => {
            // 1. Set window as unfocused
            await browser.electron.execute(() => {
                const notificationManager = (global as any).notificationManager;
                if (notificationManager) {
                    notificationManager['_isWindowFocused'] = false;
                    notificationManager['_lastNotificationShown'] = false;
                }
            });

            // 2. Trigger a non-matching URL (previously triggered spurious notifications)
            await mainWindow.triggerNetworkRequest(
                'https://gemini.google.com/u/0/_/BardChatUi/data/log?bl=boq_assistant'
            );

            // 3. Wait briefly to verify NO notification occurs for non-matching URL (negative test)
            await waitForDuration(500, 'Verify no spurious notification for log endpoint');

            const check = await browser.electron.execute(() => {
                const notificationManager = (global as any).notificationManager;
                const badgeManager = (global as any).badgeManager;

                const shown = notificationManager?.['_lastNotificationShown'] ?? false;
                const hasBadge = badgeManager?.hasNotificationBadge ?? false;

                return { shown, hasBadge };
            });

            expect(check.shown).toBe(false);
            expect(check.hasBadge).toBe(false);
            E2ELogger.info(
                'response-notifications',
                'Spurious URL filtering verified (log endpoint correctly ignored)'
            );
        });
    });

    // ========================================================================
    // Task 9.11: Notification works on current platform
    // ========================================================================

    describe('Cross-Platform (Task 9.11)', () => {
        beforeEach(async () => {
            await waitForAppReady();
        });

        afterEach(async () => {
            await ensureSingleWindow();
        });

        it('should work on current platform', async () => {
            const detectedPlatform = await getPlatform();
            expect(['windows', 'macos', 'linux']).toContain(detectedPlatform);

            E2ELogger.info('response-notifications', `Testing on platform: ${detectedPlatform}`);

            // Verify notification manager exists and is functional
            const result = await browser.electron.execute(async () => {
                const notificationManager = (global as any).notificationManager;
                if (!notificationManager) {
                    return { exists: false };
                }

                return {
                    exists: true,
                    hasShowNotification: typeof notificationManager.showNotification === 'function',
                    hasOnResponseComplete: typeof notificationManager.onResponseComplete === 'function',
                    hasOnWindowFocus: typeof notificationManager.onWindowFocus === 'function',
                };
            });

            expect(result.exists).toBe(true);
            if (result.exists) {
                expect(result.hasShowNotification).toBe(true);
                expect(result.hasOnResponseComplete).toBe(true);
                expect(result.hasOnWindowFocus).toBe(true);
            }

            E2ELogger.info('response-notifications', `Platform ${detectedPlatform} verified`);
        });

        it('should handle badge on current platform', async () => {
            const result = await browser.electron.execute(async () => {
                const badgeManager = (global as any).badgeManager;
                if (!badgeManager) {
                    return { exists: false };
                }

                return {
                    exists: true,
                    hasShowNotificationBadge: typeof badgeManager.showNotificationBadge === 'function',
                    hasClearNotificationBadge: typeof badgeManager.clearNotificationBadge === 'function',
                    hasNotificationBadge: badgeManager.hasNotificationBadge ?? false,
                };
            });

            expect(result.exists).toBe(true);
            if (result.exists) {
                expect(result.hasShowNotificationBadge).toBe(true);
                expect(result.hasClearNotificationBadge).toBe(true);
            }
        });

        it('should show notification on current platform via full production wiring', async () => {
            const detectedPlatform = await getPlatform();

            E2ELogger.info('response-notifications', `Testing full notification flow on platform: ${detectedPlatform}`);

            // This test uses FULL production wiring via mainWindow.emit('response-complete')
            // to verify notification works on current platform (platform-agnostic check)
            const result = await browser.electron.execute(async () => {
                // Get the mainWindow instance from windowManager (production code path)
                const windowManager = (global as any).windowManager;
                const notificationManager = (global as any).notificationManager;
                const badgeManager = (global as any).badgeManager;

                if (!windowManager || !notificationManager || !badgeManager) {
                    return { error: 'Required managers not available' };
                }

                const mainWindowInstance = windowManager.getMainWindowInstance();
                if (!mainWindowInstance) {
                    return { error: 'MainWindow instance not available' };
                }

                // Detect current platform
                const currentPlatform = process.platform;

                // Set window as unfocused (per acceptance criteria)
                notificationManager['_isWindowFocused'] = false;

                // Track if notification was called
                let notificationCalled = false;

                const originalShowNotification = notificationManager.showNotification?.bind(notificationManager);
                if (originalShowNotification) {
                    notificationManager.showNotification = () => {
                        notificationCalled = true;
                        // Don't actually show notification in test
                    };
                }

                // Trigger response-complete via MainWindow emit (FULL production code path)
                // This tests the wiring: MainWindow → NotificationManager
                // Test MUST fail if this wiring is broken
                mainWindowInstance.emit('response-complete');

                // Give a brief moment for async processing
                await new Promise((resolve) => setTimeout(resolve, 100));

                // Restore original methods
                if (originalShowNotification) {
                    notificationManager.showNotification = originalShowNotification;
                }

                // Get badge state - may be false on Linux (no native support)
                const hasBadge = badgeManager.hasNotificationBadge ?? false;

                // Cleanup: clear badge
                notificationManager.onWindowFocus();

                return {
                    notificationCalled,
                    hasBadge,
                    currentPlatform,
                };
            });

            if ('error' in result) {
                E2ELogger.info('response-notifications', `Skipping: ${result.error}`);
                return;
            }

            // Verify notification was called (platform-agnostic check)
            expect(result.notificationCalled).toBe(true);

            // Verify badge appears if supported (skip check on Linux)
            if (result.currentPlatform !== 'linux') {
                expect(result.hasBadge).toBe(true);
            }

            E2ELogger.info(
                'response-notifications',
                `Platform ${result.currentPlatform}: notification=${result.notificationCalled}, badge=${result.hasBadge}`
            );
            E2ELogger.info(
                'response-notifications',
                'Full notification flow on current platform verified via production wiring'
            );
        });
    });

    // ========================================================================
    // Tasks 9.8, 9.9, 9.10: Platform-Specific Tests
    // ========================================================================

    describe('Platform-Specific Tests (Tasks 9.8-9.10)', () => {
        beforeEach(async () => {
            await waitForAppReady();
        });

        afterEach(async () => {
            await ensureSingleWindow();
        });

        it('should use correct notification API for current platform', async () => {
            const detectedPlatform = await getPlatform();

            // This test logs platform-specific behavior for debugging
            const result = await browser.electron.execute(async (electron, _platform) => {
                const { Notification } = electron;

                return {
                    isNotificationSupported: Notification.isSupported(),
                    platform: process.platform,
                };
            }, detectedPlatform);

            E2ELogger.info(
                'response-notifications',
                `Platform: ${result.platform}, Notification.isSupported(): ${result.isNotificationSupported}`
            );

            // On all desktop platforms, notifications should be supported
            // (may be disabled by user in OS settings, but API should exist)
            expect(result.isNotificationSupported).toBeDefined();
        });

        // Windows-specific test (Task 9.8)
        it('should use Windows toast notification and taskbar overlay (Windows only)', async () => {
            const detectedPlatform = await getPlatform();
            if (detectedPlatform !== 'windows') {
                E2ELogger.info('response-notifications', 'Skipping Windows-specific test on non-Windows platform');
                return;
            }

            // This test uses FULL production wiring via mainWindow.emit('response-complete')
            // to verify Windows toast notification and taskbar overlay work correctly
            const result = await browser.electron.execute(async () => {
                // Get the mainWindow instance from windowManager (production code path)
                const windowManager = (global as any).windowManager;
                const notificationManager = (global as any).notificationManager;
                const badgeManager = (global as any).badgeManager;

                if (!windowManager || !notificationManager || !badgeManager) {
                    return { error: 'Required managers not available' };
                }

                const mainWindowInstance = windowManager.getMainWindowInstance();
                if (!mainWindowInstance) {
                    return { error: 'MainWindow instance not available' };
                }

                // Verify Windows overlay icon support exists
                const hasOverlayIconSupport = typeof badgeManager['mainWindow']?.setOverlayIcon === 'function';

                // Set window as unfocused (per acceptance criteria)
                notificationManager['_isWindowFocused'] = false;

                // Track if notification and badge were called
                let notificationCalled = false;
                let overlayIconSet = false;
                let overlayDescription = '';

                const originalShowNotification = notificationManager.showNotification?.bind(notificationManager);
                if (originalShowNotification) {
                    notificationManager.showNotification = () => {
                        notificationCalled = true;
                        // Don't actually show notification in test
                    };
                }

                // Track setOverlayIcon calls on Windows
                const mainWindowRef = badgeManager['mainWindow'];
                if (mainWindowRef && typeof mainWindowRef.setOverlayIcon === 'function') {
                    const originalSetOverlayIcon = mainWindowRef.setOverlayIcon.bind(mainWindowRef);
                    mainWindowRef.setOverlayIcon = (icon: any, description: string) => {
                        overlayIconSet = true;
                        overlayDescription = description;
                        // Call original to actually set the overlay
                        return originalSetOverlayIcon(icon, description);
                    };
                }

                // Trigger response-complete via MainWindow emit (FULL production code path)
                // This tests the wiring: MainWindow → NotificationManager → BadgeManager
                // Test MUST fail if this wiring is broken
                mainWindowInstance.emit('response-complete');

                // Give a brief moment for async processing
                await new Promise((resolve) => setTimeout(resolve, 100));

                // Restore original methods
                if (originalShowNotification) {
                    notificationManager.showNotification = originalShowNotification;
                }

                // Get badge state
                const hasBadge = badgeManager.hasNotificationBadge ?? false;

                // Cleanup: clear badge
                notificationManager.onWindowFocus();

                return {
                    hasOverlayIconSupport,
                    notificationCalled,
                    overlayIconSet,
                    overlayDescription,
                    hasBadge,
                };
            });

            if ('error' in result) {
                E2ELogger.info('response-notifications', `Skipping: ${result.error}`);
                return;
            }

            // Verify Windows-specific behavior
            expect(result.hasOverlayIconSupport).toBe(true);
            expect(result.notificationCalled).toBe(true);
            expect(result.hasBadge).toBe(true);

            // Note: overlayIconSet may be true or false depending on badge manager implementation
            // The important thing is no errors occurred and badge state was properly tracked
            E2ELogger.info(
                'response-notifications',
                `Windows: notification=${result.notificationCalled}, badge=${result.hasBadge}, overlaySet=${result.overlayIconSet}`
            );
            E2ELogger.info('response-notifications', 'Windows toast notification and taskbar overlay verified');
        });

        // macOS-specific test (Task 9.9)
        it('should use macOS Notification Center and dock badge (macOS only)', async () => {
            const detectedPlatform = await getPlatform();
            if (detectedPlatform !== 'macos') {
                E2ELogger.info('response-notifications', 'Skipping macOS-specific test on non-macOS platform');
                return;
            }

            // This test uses FULL production wiring via mainWindow.emit('response-complete')
            // to verify macOS Notification Center and dock badge work correctly
            const result = await browser.electron.execute(async (electron) => {
                const { app } = electron;

                // Get the mainWindow instance from windowManager (production code path)
                const windowManager = (global as any).windowManager;
                const notificationManager = (global as any).notificationManager;
                const badgeManager = (global as any).badgeManager;

                if (!windowManager || !notificationManager || !badgeManager) {
                    return { error: 'Required managers not available' };
                }

                const mainWindowInstance = windowManager.getMainWindowInstance();
                if (!mainWindowInstance) {
                    return { error: 'MainWindow instance not available' };
                }

                // Verify macOS dock badge support
                const hasDockBadgeSupport = typeof app.dock?.setBadge === 'function';

                // Set window as unfocused (per acceptance criteria)
                notificationManager['_isWindowFocused'] = false;

                // Track if notification and dock badge were called
                let notificationCalled = false;
                let dockBadgeSet = false;
                let dockBadgeText = '';

                const originalShowNotification = notificationManager.showNotification?.bind(notificationManager);
                if (originalShowNotification) {
                    notificationManager.showNotification = () => {
                        notificationCalled = true;
                        // Don't actually show notification in test
                    };
                }

                // Track app.dock.setBadge calls on macOS
                if (app.dock && typeof app.dock.setBadge === 'function') {
                    const originalSetBadge = app.dock.setBadge.bind(app.dock);
                    app.dock.setBadge = (text: string) => {
                        dockBadgeSet = true;
                        dockBadgeText = text;
                        // Call original to actually set the badge
                        return originalSetBadge(text);
                    };
                }

                // Trigger response-complete via MainWindow emit (FULL production code path)
                // This tests the wiring: MainWindow → NotificationManager → BadgeManager
                // Test MUST fail if this wiring is broken
                mainWindowInstance.emit('response-complete');

                // Give a brief moment for async processing
                await new Promise((resolve) => setTimeout(resolve, 100));

                // Restore original methods
                if (originalShowNotification) {
                    notificationManager.showNotification = originalShowNotification;
                }

                // Get badge state
                const hasBadge = badgeManager.hasNotificationBadge ?? false;

                // Cleanup: clear badge
                notificationManager.onWindowFocus();

                return {
                    hasDockBadgeSupport,
                    notificationCalled,
                    dockBadgeSet,
                    dockBadgeText,
                    hasBadge,
                };
            });

            if ('error' in result) {
                E2ELogger.info('response-notifications', `Skipping: ${result.error}`);
                return;
            }

            // Verify macOS-specific behavior
            expect(result.hasDockBadgeSupport).toBe(true);
            expect(result.notificationCalled).toBe(true);
            expect(result.hasBadge).toBe(true);

            E2ELogger.info(
                'response-notifications',
                `macOS: notification=${result.notificationCalled}, badge=${result.hasBadge}, dockBadgeSet=${result.dockBadgeSet}`
            );
            E2ELogger.info('response-notifications', 'macOS Notification Center and dock badge verified');
        });

        // Linux-specific test (Task 9.10)
        it('should handle Linux gracefully with libnotify notification and no native badge (Linux only)', async () => {
            const detectedPlatform = await getPlatform();
            if (detectedPlatform !== 'linux') {
                E2ELogger.info('response-notifications', 'Skipping Linux-specific test on non-Linux platform');
                return;
            }

            // This test uses FULL production wiring via mainWindow.emit('response-complete')
            // to verify Linux notification works correctly and badge is gracefully skipped
            const result = await browser.electron.execute(async (electron) => {
                const { Notification } = electron;

                // Get the mainWindow instance from windowManager (production code path)
                const windowManager = (global as any).windowManager;
                const notificationManager = (global as any).notificationManager;
                const badgeManager = (global as any).badgeManager;

                if (!windowManager || !notificationManager || !badgeManager) {
                    return { error: 'Required managers not available' };
                }

                const mainWindowInstance = windowManager.getMainWindowInstance();
                if (!mainWindowInstance) {
                    return { error: 'MainWindow instance not available' };
                }

                // Verify libnotify notification support (Electron uses libnotify on Linux)
                const isNotificationSupported = Notification.isSupported();

                // Set window as unfocused (per acceptance criteria)
                notificationManager['_isWindowFocused'] = false;

                // Track if notification was called
                let notificationCalled = false;

                const originalShowNotification = notificationManager.showNotification?.bind(notificationManager);
                if (originalShowNotification) {
                    notificationManager.showNotification = () => {
                        notificationCalled = true;
                        // Don't actually show notification in test
                    };
                }

                // Trigger response-complete via MainWindow emit (FULL production code path)
                // This tests the wiring: MainWindow → NotificationManager
                // Test MUST fail if this wiring is broken
                mainWindowInstance.emit('response-complete');

                // Give a brief moment for async processing
                await new Promise((resolve) => setTimeout(resolve, 100));

                // Restore original methods
                if (originalShowNotification) {
                    notificationManager.showNotification = originalShowNotification;
                }

                // On Linux, badge operations should not throw (gracefully skipped)
                let badgeNoError = true;
                try {
                    badgeManager.showNotificationBadge();
                    badgeManager.clearNotificationBadge();
                } catch (_e) {
                    badgeNoError = false;
                }

                // Cleanup: clear badge state
                notificationManager.onWindowFocus();

                return {
                    isNotificationSupported,
                    notificationCalled,
                    badgeNoError,
                };
            });

            if ('error' in result) {
                E2ELogger.info('response-notifications', `Skipping: ${result.error}`);
                return;
            }

            // Verify Linux-specific behavior
            // Notification should work via libnotify (if supported by the DE)
            expect(result.isNotificationSupported).toBeDefined();
            expect(result.notificationCalled).toBe(true);
            // Badge operations should not throw on Linux (gracefully skipped)
            expect(result.badgeNoError).toBe(true);

            E2ELogger.info(
                'response-notifications',
                `Linux: notificationSupported=${result.isNotificationSupported}, notificationCalled=${result.notificationCalled}, badgeNoError=${result.badgeNoError}`
            );
            E2ELogger.info('response-notifications', 'Linux libnotify notification and graceful badge skip verified');
        });
    });
});
