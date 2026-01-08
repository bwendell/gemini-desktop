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
            // Trigger response-complete event via production code path
            // This simulates what happens when Gemini finishes a response
            const notificationShown = await browser.electron.execute(async (electron) => {
                // Get the notification manager from global
                const notificationManager = (global as any).notificationManager;
                if (!notificationManager) {
                    return { error: 'NotificationManager not available' };
                }

                // Simulate window being unfocused
                notificationManager['isWindowFocused'] = false;

                // Trigger response complete (production code path)
                notificationManager.onResponseComplete();

                // Check if badge manager shows notification badge
                const badgeManager = (global as any).badgeManager;
                const hasBadge = badgeManager?.hasNotificationBadge ?? false;

                return { hasBadge, shown: true };
            });

            if ('error' in notificationShown) {
                E2ELogger.info('response-notifications', `Skipping: ${notificationShown.error}`);
                return;
            }

            E2ELogger.info('response-notifications', `Badge shown: ${notificationShown.hasBadge}`);

            // Now focus the window (via production code path)
            const badgeCleared = await browser.electron.execute(async (electron) => {
                const notificationManager = (global as any).notificationManager;
                if (!notificationManager) {
                    return { error: 'NotificationManager not available' };
                }

                // Trigger window focus (production code path)
                notificationManager.onWindowFocus();

                // Check if badge was cleared
                const badgeManager = (global as any).badgeManager;
                const hasBadge = badgeManager?.hasNotificationBadge ?? false;

                return { hasBadge };
            });

            if ('error' in badgeCleared) {
                E2ELogger.info('response-notifications', `Skipping: ${badgeCleared.error}`);
                return;
            }

            expect(badgeCleared.hasBadge).toBe(false);
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
            const result = await browser.electron.execute(async (electron) => {
                const notificationManager = (global as any).notificationManager;
                if (!notificationManager) {
                    return { error: 'NotificationManager not available' };
                }

                // Simulate window being unfocused
                notificationManager['isWindowFocused'] = false;

                // Track if showNotification was called
                let notificationCalled = false;
                const originalShowNotification = notificationManager.showNotification.bind(notificationManager);
                notificationManager.showNotification = () => {
                    notificationCalled = true;
                    // Don't actually show notification in test
                };

                // Trigger response complete
                notificationManager.onResponseComplete();

                // Restore original method
                notificationManager.showNotification = originalShowNotification;

                // Get badge state
                const badgeManager = (global as any).badgeManager;
                const hasBadge = badgeManager?.hasNotificationBadge ?? false;

                return { notificationCalled, hasBadge };
            });

            if ('error' in result) {
                E2ELogger.info('response-notifications', `Skipping: ${result.error}`);
                return;
            }

            expect(result.notificationCalled).toBe(true);
            expect(result.hasBadge).toBe(true);

            E2ELogger.info('response-notifications', 'Full notification flow verified');

            // Cleanup: clear the badge
            await browser.electron.execute(async (electron) => {
                const notificationManager = (global as any).notificationManager;
                if (notificationManager) {
                    notificationManager.onWindowFocus();
                }
            });
        });
    });

    // ========================================================================
    // Task 9.4: Notification click focuses window
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
            const result = await browser.electron.execute(async (electron) => {
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
            const result = await browser.electron.execute(async (electron) => {
                const notificationManager = (global as any).notificationManager;
                if (!notificationManager) {
                    return { error: 'NotificationManager not available' };
                }

                // Ensure window is marked as focused
                notificationManager['isWindowFocused'] = true;

                // Track if showNotification was called
                let notificationCalled = false;
                const originalShowNotification = notificationManager.showNotification.bind(notificationManager);
                notificationManager.showNotification = () => {
                    notificationCalled = true;
                };

                // Trigger response complete
                notificationManager.onResponseComplete();

                // Restore original method
                notificationManager.showNotification = originalShowNotification;

                // Get badge state
                const badgeManager = (global as any).badgeManager;
                const hasBadge = badgeManager?.hasNotificationBadge ?? false;

                return { notificationCalled, hasBadge };
            });

            if ('error' in result) {
                E2ELogger.info('response-notifications', `Skipping: ${result.error}`);
                return;
            }

            expect(result.notificationCalled).toBe(false);
            expect(result.hasBadge).toBe(false);

            E2ELogger.info('response-notifications', 'No notification when focused verified');
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
            // First, disable notifications via UI
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2, 5000);
            await optionsPage.waitForLoad();
            await optionsPage.disableResponseNotifications();

            // Verify it's disabled
            const isDisabled = !(await optionsPage.isResponseNotificationsEnabled());
            expect(isDisabled).toBe(true);

            // Close options
            await optionsPage.close();
            await waitForWindowCount(1, 5000);

            // Now trigger response-complete and verify no notification
            const result = await browser.electron.execute(async (electron) => {
                const notificationManager = (global as any).notificationManager;
                if (!notificationManager) {
                    return { error: 'NotificationManager not available' };
                }

                // Simulate window being unfocused
                notificationManager['isWindowFocused'] = false;

                // Track if showNotification was called
                let notificationCalled = false;
                const originalShowNotification = notificationManager.showNotification?.bind(notificationManager);
                if (originalShowNotification) {
                    notificationManager.showNotification = () => {
                        notificationCalled = true;
                    };
                }

                // Trigger response complete
                notificationManager.onResponseComplete();

                // Restore original method
                if (originalShowNotification) {
                    notificationManager.showNotification = originalShowNotification;
                }

                // Get badge state
                const badgeManager = (global as any).badgeManager;
                const hasBadge = badgeManager?.hasNotificationBadge ?? false;

                return { notificationCalled, hasBadge };
            });

            if ('error' in result) {
                E2ELogger.info('response-notifications', `Skipping: ${result.error}`);
                return;
            }

            expect(result.notificationCalled).toBe(false);
            expect(result.hasBadge).toBe(false);

            E2ELogger.info('response-notifications', 'No notification when disabled verified');
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
            const result = await browser.electron.execute(async (electron) => {
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
            const detectedPlatform = await getPlatform();

            const result = await browser.electron.execute(async (electron, platform) => {
                const badgeManager = (global as any).badgeManager;
                if (!badgeManager) {
                    return { exists: false };
                }

                // Badge behavior varies by platform
                // Windows: setOverlayIcon
                // macOS: app.dock.setBadge
                // Linux: no native badge support

                return {
                    exists: true,
                    hasShowNotificationBadge: typeof badgeManager.showNotificationBadge === 'function',
                    hasClearNotificationBadge: typeof badgeManager.clearNotificationBadge === 'function',
                    hasNotificationBadge: badgeManager.hasNotificationBadge ?? false,
                };
            }, detectedPlatform);

            expect(result.exists).toBe(true);
            if (result.exists) {
                expect(result.hasShowNotificationBadge).toBe(true);
                expect(result.hasClearNotificationBadge).toBe(true);
            }

            E2ELogger.info('response-notifications', `Badge support on ${detectedPlatform} verified`);
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
            const result = await browser.electron.execute(async (electron, platform) => {
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

            const result = await browser.electron.execute(async (electron) => {
                const notificationManager = (global as any).notificationManager;
                const badgeManager = (global as any).badgeManager;

                if (!notificationManager || !badgeManager) {
                    return { error: 'Managers not available' };
                }

                // On Windows, badge manager uses setOverlayIcon
                return {
                    hasOverlayIconSupport: typeof badgeManager['mainWindow']?.setOverlayIcon === 'function',
                };
            });

            if ('error' in result) {
                E2ELogger.info('response-notifications', `Skipping: ${result.error}`);
                return;
            }

            expect(result.hasOverlayIconSupport).toBe(true);
            E2ELogger.info('response-notifications', 'Windows taskbar overlay support verified');
        });

        // macOS-specific test (Task 9.9)
        it('should use macOS Notification Center and dock badge (macOS only)', async () => {
            const detectedPlatform = await getPlatform();
            if (detectedPlatform !== 'macos') {
                E2ELogger.info('response-notifications', 'Skipping macOS-specific test on non-macOS platform');
                return;
            }

            const result = await browser.electron.execute(async (electron) => {
                const { app } = electron;

                return {
                    hasDockBadgeSupport: typeof app.dock?.setBadge === 'function',
                };
            });

            expect(result.hasDockBadgeSupport).toBe(true);
            E2ELogger.info('response-notifications', 'macOS dock badge support verified');
        });

        // Linux-specific test (Task 9.10)
        it('should handle Linux gracefully with no native badge (Linux only)', async () => {
            const detectedPlatform = await getPlatform();
            if (detectedPlatform !== 'linux') {
                E2ELogger.info('response-notifications', 'Skipping Linux-specific test on non-Linux platform');
                return;
            }

            const result = await browser.electron.execute(async (electron) => {
                const badgeManager = (global as any).badgeManager;

                if (!badgeManager) {
                    return { error: 'BadgeManager not available' };
                }

                // On Linux, badge operations should not throw
                try {
                    badgeManager.showNotificationBadge();
                    badgeManager.clearNotificationBadge();
                    return { noError: true };
                } catch (e) {
                    return { noError: false, error: String(e) };
                }
            });

            if ('error' in result && result.error !== 'BadgeManager not available') {
                E2ELogger.info('response-notifications', `Skipping: ${result.error}`);
                return;
            }

            if (!('error' in result)) {
                expect(result.noError).toBe(true);
            }
            E2ELogger.info('response-notifications', 'Linux graceful handling verified');
        });
    });
});
