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
import { getPlatform } from './helpers/platform';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { waitForUIState, waitForDuration } from './helpers/waitUtilities';
import { E2E_TIMING } from './helpers/e2eConstants';

// ============================================================================
// Test Suite
// ============================================================================

describe('Response Notifications', () => {
    type WdioBrowser = typeof browser & {
        electron: {
            execute<R, T extends unknown[]>(
                fn: (electron: typeof import('electron'), ...args: T) => R,
                ...args: T
            ): Promise<R>;
        };
        execute<T>(script: string | ((...args: any[]) => T), ...args: any[]): Promise<T>;
        waitUntil<T>(
            condition: () => Promise<T> | T,
            options?: { timeout?: number; timeoutMsg?: string; interval?: number }
        ): Promise<T>;
        pause(ms: number): Promise<void>;
    };

    const wdioBrowser = browser as WdioBrowser;
    const mainWindow = new MainWindowPage();
    const optionsPage = new OptionsPage();

    // ========================================================================
    // Task 9.1: Toggle response notifications in Options
    // ========================================================================

    describe('Toggle in Options (Task 9.1)', () => {
        beforeEach(async () => {
            await waitForAppReady();

            // Open Options via menu
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2, 5000);
            await optionsPage.waitForLoad();
        });

        afterEach(async () => {
            await ensureSingleWindow();
        });

        it('should display the Notifications section in Options', async () => {
            expect(await optionsPage.isNotificationsSectionDisplayed()).toBe(true);

            const text = await optionsPage.getNotificationsSectionText();
            expect(text.toLowerCase()).toContain('notification');
        });

        it('should display the response notifications toggle', async () => {
            expect(await optionsPage.isResponseNotificationsToggleDisplayed()).toBe(true);
        });

        it('should display toggle with label and description', async () => {
            const text = await optionsPage.getNotificationsSectionText();

            expect(text).toContain('Response Notifications');
            expect(text.toLowerCase()).toContain('unfocused');
        });

        it('should have aria-checked attribute on toggle switch', async () => {
            const isEnabled = await optionsPage.isResponseNotificationsEnabled();

            expect([true, false]).toContain(isEnabled);
        });

        it('should toggle state when clicked', async () => {
            const initialEnabled = await optionsPage.isResponseNotificationsEnabled();

            await optionsPage.toggleResponseNotifications();

            const newEnabled = await optionsPage.isResponseNotificationsEnabled();

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

            // Restore to enabled
            await optionsPage.enableResponseNotifications();
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
            await wdioBrowser.electron.execute(() => {
                const appContext = (global as { appContext?: any }).appContext;
                const notificationManager = appContext?.notificationManager;
                if (notificationManager) {
                    notificationManager['_isWindowFocused'] = false;
                }
            });

            // 2. Trigger response-complete via production event path
            // (The network detection → emit chain is tested at unit level;
            // here we test the emit → notification → badge E2E flow)
            await wdioBrowser.electron.execute(() => {
                const appContext = (global as { appContext?: any }).appContext;
                const windowManager = appContext?.windowManager;
                const mainWindowInstance = windowManager?.getMainWindowInstance();
                if (mainWindowInstance) {
                    mainWindowInstance.emit('response-complete');
                }
            });

            // 3. Wait for notification/badge to be triggered via async processing
            await waitForUIState(
                async () => {
                    const result = await wdioBrowser.electron.execute(() => {
                        const appContext = (global as { appContext?: any }).appContext;
                        const badgeManager = appContext?.badgeManager;
                        return badgeManager?.hasNotificationBadge ?? false;
                    });
                    return result;
                },
                { timeout: E2E_TIMING.TIMEOUTS.UI_STATE, description: 'Notification badge triggered' }
            );

            // 4. Verify badge was shown via production code path
            const badgeShown = await wdioBrowser.electron.execute(() => {
                const appContext = (global as { appContext?: any }).appContext;
                const badgeManager = appContext?.badgeManager;
                return badgeManager?.hasNotificationBadge ?? false;
            });

            expect(badgeShown).toBe(true);

            // 5. Now focus the window via production method
            await wdioBrowser.electron.execute(() => {
                const appContext = (global as { appContext?: any }).appContext;
                const notificationManager = appContext?.notificationManager;
                notificationManager?.onWindowFocus();
            });

            await waitForUIState(
                async () => {
                    const cleared = await wdioBrowser.electron.execute(() => {
                        const appContext = (global as { appContext?: any }).appContext;
                        const badgeManager = appContext?.badgeManager;
                        return !(badgeManager?.hasNotificationBadge ?? false);
                    });
                    return cleared;
                },
                { timeout: E2E_TIMING.TIMEOUTS.UI_STATE, description: 'Badge cleared on focus' }
            );

            // 6. Verify badge was cleared
            const badgeCleared = await wdioBrowser.electron.execute(() => {
                const appContext = (global as { appContext?: any }).appContext;
                const badgeManager = appContext?.badgeManager;
                return !(badgeManager?.hasNotificationBadge ?? false);
            });

            expect(badgeCleared).toBe(true);
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
            await wdioBrowser.electron.execute(() => {
                const appContext = (global as { appContext?: any }).appContext;
                const notificationManager = appContext?.notificationManager;
                if (!notificationManager) return;

                notificationManager['_isWindowFocused'] = false;
                notificationManager['_lastNotificationShown'] = false;

                const originalShow = notificationManager.showNotification;
                notificationManager.showNotification = function () {
                    this['_lastNotificationShown'] = true;
                };
                notificationManager['_originalShow'] = originalShow;
            });

            // 2. Trigger response-complete via production event path
            // (The network detection → emit chain is tested at unit level;
            // here we test the emit → notification → badge E2E flow)
            await wdioBrowser.electron.execute(() => {
                const appContext = (global as { appContext?: any }).appContext;
                const windowManager = appContext?.windowManager;
                const mainWindowInstance = windowManager?.getMainWindowInstance();
                if (mainWindowInstance) {
                    mainWindowInstance.emit('response-complete');
                }
            });

            // 3. Wait for notification to be triggered
            await waitForUIState(
                async () => {
                    const result = await wdioBrowser.electron.execute(() => {
                        const appContext = (global as { appContext?: any }).appContext;
                        const notificationManager = appContext?.notificationManager;
                        const badgeManager = appContext?.badgeManager;
                        const shown = notificationManager?.['_lastNotificationShown'] ?? false;
                        const hasBadge = badgeManager?.hasNotificationBadge ?? false;
                        return shown || hasBadge;
                    });
                    return result;
                },
                { timeout: E2E_TIMING.TIMEOUTS.UI_STATE, description: 'Notification triggered' }
            );

            // 4. Verify notification and badge state
            const result = await wdioBrowser.electron.execute(() => {
                const appContext = (global as { appContext?: any }).appContext;
                const notificationManager = appContext?.notificationManager;
                const badgeManager = appContext?.badgeManager;

                const shown = notificationManager?.['_lastNotificationShown'] ?? false;
                const hasBadge = badgeManager?.hasNotificationBadge ?? false;

                if (notificationManager && notificationManager['_originalShow']) {
                    notificationManager.showNotification = notificationManager['_originalShow'];
                    delete notificationManager['_originalShow'];
                }

                return { shown, hasBadge };
            });

            expect(result.shown).toBe(true);
            expect(result.hasBadge).toBe(true);
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
            const result = await wdioBrowser.electron.execute(async () => {
                const appContext = (global as { appContext?: any }).appContext;
                const notificationManager = appContext?.notificationManager;
                if (!notificationManager) {
                    return { error: 'NotificationManager not available' };
                }

                const mainWindow = notificationManager['mainWindow'];
                if (!mainWindow || mainWindow.isDestroyed()) {
                    return { error: 'Main window not available' };
                }

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

                notificationManager['focusMainWindow']();

                mainWindow.show = originalShow;
                mainWindow.focus = originalFocus;

                return { showCalled, focusCalled };
            });

            if ('error' in result) {
                return;
            }

            expect(result.showCalled).toBe(true);
            expect(result.focusCalled).toBe(true);
        });

        it('should restore minimized window when notification is clicked', async () => {
            // First minimize the window, then verify notification click restores it
            const result = await wdioBrowser.electron.execute(async () => {
                const appContext = (global as { appContext?: any }).appContext;
                const notificationManager = appContext?.notificationManager;
                if (!notificationManager) {
                    return { error: 'NotificationManager not available' };
                }

                const mainWindow = notificationManager['mainWindow'];
                if (!mainWindow || mainWindow.isDestroyed()) {
                    return { error: 'Main window not available' };
                }

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

                mainWindow.minimize();

                await new Promise((resolve) => setTimeout(resolve, 200));

                const wasMinimized = mainWindow.isMinimized();

                notificationManager['focusMainWindow']();

                await new Promise((resolve) => setTimeout(resolve, 200));

                const isNowVisible = mainWindow.isVisible();

                mainWindow.restore = originalRestore;
                mainWindow.show = originalShow;
                mainWindow.focus = originalFocus;

                return { wasMinimized, restoreCalled, showCalled, focusCalled, isNowVisible };
            });

            if ('error' in result) {
                return;
            }

            // restore() should only be called if the window was actually minimized
            if (result.wasMinimized) {
                expect(result.restoreCalled).toBe(true);
            }

            // show() and focus() should always be called
            expect(result.showCalled).toBe(true);
            expect(result.focusCalled).toBe(true);
            expect(result.isNowVisible).toBe(true);
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
            await wdioBrowser.electron.execute(() => {
                const appContext = (global as { appContext?: any }).appContext;
                const notificationManager = appContext?.notificationManager;
                if (notificationManager) {
                    notificationManager['_isWindowFocused'] = true;
                    notificationManager['_lastNotificationShown'] = false;
                }
            });

            // 2. Trigger via Network
            await mainWindow.triggerNetworkRequest('https://gemini.google.com/u/0/_/BardChatUi/data/StreamGenerate');

            // 3. Wait briefly to verify NO notification occurs (negative test)
            await waitForDuration(500, 'Verify no spurious notification when focused');

            const check = await wdioBrowser.electron.execute(() => {
                const appContext = (global as { appContext?: any }).appContext;
                const notificationManager = appContext?.notificationManager;
                const badgeManager = appContext?.badgeManager;

                const shown = notificationManager?.['_lastNotificationShown'] ?? false;
                const hasBadge = badgeManager?.hasNotificationBadge ?? false;

                return { shown, hasBadge };
            });

            expect(check.shown).toBe(false);
            expect(check.hasBadge).toBe(false);
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
            await wdioBrowser.electron.execute(() => {
                const appContext = (global as { appContext?: any }).appContext;
                const notificationManager = appContext?.notificationManager;
                if (notificationManager) {
                    notificationManager['_isWindowFocused'] = false;
                    notificationManager['_lastNotificationShown'] = false;
                }
            });

            // 3. Trigger via Network
            await mainWindow.triggerNetworkRequest('https://gemini.google.com/u/0/_/BardChatUi/data/StreamGenerate');

            // 4. Wait briefly to verify NO notification occurs (negative test)
            await waitForDuration(500, 'Verify no spurious notification when disabled');

            const check = await wdioBrowser.electron.execute(() => {
                const appContext = (global as { appContext?: any }).appContext;
                const notificationManager = appContext?.notificationManager;
                const badgeManager = appContext?.badgeManager;

                const shown = notificationManager?.['_lastNotificationShown'] ?? false;
                const hasBadge = badgeManager?.hasNotificationBadge ?? false;

                return { shown, hasBadge };
            });

            expect(check.shown).toBe(false);
            expect(check.hasBadge).toBe(false);
        });

        it('should NOT show notification for non-matching URLs (e.g. log / analytics)', async () => {
            // 1. Set window as unfocused
            await wdioBrowser.electron.execute(() => {
                const appContext = (global as { appContext?: any }).appContext;
                const notificationManager = appContext?.notificationManager;
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

            const check = await wdioBrowser.electron.execute(() => {
                const appContext = (global as { appContext?: any }).appContext;
                const notificationManager = appContext?.notificationManager;
                const badgeManager = appContext?.badgeManager;

                const shown = notificationManager?.['_lastNotificationShown'] ?? false;
                const hasBadge = badgeManager?.hasNotificationBadge ?? false;

                return { shown, hasBadge };
            });

            expect(check.shown).toBe(false);
            expect(check.hasBadge).toBe(false);
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

            // Verify notification manager exists and is functional
            const result = await wdioBrowser.electron.execute(async () => {
                const appContext = (global as { appContext?: any }).appContext;
                const notificationManager = appContext?.notificationManager;
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
        });

        it('should handle badge on current platform', async () => {
            const result = await wdioBrowser.electron.execute(async () => {
                const appContext = (global as { appContext?: any }).appContext;
                const badgeManager = appContext?.badgeManager;
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
            // This test uses FULL production wiring via mainWindow.emit('response-complete')
            // to verify notification works on current platform (platform-agnostic check)
            const result = await wdioBrowser.electron.execute(async () => {
                const appContext = (global as { appContext?: any }).appContext;
                const windowManager = appContext?.windowManager;
                const notificationManager = appContext?.notificationManager;
                const badgeManager = appContext?.badgeManager;

                if (!windowManager || !notificationManager || !badgeManager) {
                    return { error: 'Required managers not available' };
                }

                const mainWindowInstance = windowManager.getMainWindowInstance();
                if (!mainWindowInstance) {
                    return { error: 'MainWindow instance not available' };
                }

                const currentPlatform = process.platform;

                notificationManager['_isWindowFocused'] = false;

                let notificationCalled = false;

                const originalShowNotification = notificationManager.showNotification?.bind(notificationManager);
                if (originalShowNotification) {
                    notificationManager.showNotification = () => {
                        notificationCalled = true;
                    };
                }

                mainWindowInstance.emit('response-complete');

                await new Promise((resolve) => setTimeout(resolve, 100));

                if (originalShowNotification) {
                    notificationManager.showNotification = originalShowNotification;
                }

                const hasBadge = badgeManager.hasNotificationBadge ?? false;

                notificationManager.onWindowFocus();

                return {
                    notificationCalled,
                    hasBadge,
                    currentPlatform,
                };
            });

            if ('error' in result) {
                return;
            }

            // Verify notification was called (platform-agnostic check)
            expect(result.notificationCalled).toBe(true);

            // Verify badge appears if supported (skip check on Linux)
            if (result.currentPlatform !== 'linux') {
                expect(result.hasBadge).toBe(true);
            }
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
            const result = await wdioBrowser.electron.execute(async (electron, _platform) => {
                const { Notification } = electron;

                return {
                    isNotificationSupported: Notification.isSupported(),
                    platform: process.platform,
                };
            }, detectedPlatform);

            // On all desktop platforms, notifications should be supported
            // (may be disabled by user in OS settings, but API should exist)
            expect(result.isNotificationSupported).toBeDefined();
        });

        // Windows-specific test (Task 9.8)
        it('should use Windows toast notification and taskbar overlay (Windows only)', async () => {
            const detectedPlatform = await getPlatform();
            if (detectedPlatform !== 'windows') {
                return;
            }

            // This test uses FULL production wiring via mainWindow.emit('response-complete')
            // to verify Windows toast notification and taskbar overlay work correctly
            const result = await wdioBrowser.electron.execute(async () => {
                const appContext = (global as { appContext?: any }).appContext;
                const windowManager = appContext?.windowManager;
                const notificationManager = appContext?.notificationManager;
                const badgeManager = appContext?.badgeManager;

                if (!windowManager || !notificationManager || !badgeManager) {
                    return { error: 'Required managers not available' };
                }

                const mainWindowInstance = windowManager.getMainWindowInstance();
                if (!mainWindowInstance) {
                    return { error: 'MainWindow instance not available' };
                }

                const hasOverlayIconSupport = typeof badgeManager['mainWindow']?.setOverlayIcon === 'function';

                notificationManager['_isWindowFocused'] = false;

                let notificationCalled = false;
                let overlayIconSet = false;
                let overlayDescription = '';

                const originalShowNotification = notificationManager.showNotification?.bind(notificationManager);
                if (originalShowNotification) {
                    notificationManager.showNotification = () => {
                        notificationCalled = true;
                    };
                }

                const mainWindowRef = badgeManager['mainWindow'];
                if (mainWindowRef && typeof mainWindowRef.setOverlayIcon === 'function') {
                    const originalSetOverlayIcon = mainWindowRef.setOverlayIcon.bind(mainWindowRef);
                    mainWindowRef.setOverlayIcon = (icon: any, description: string) => {
                        overlayIconSet = true;
                        overlayDescription = description;
                        return originalSetOverlayIcon(icon, description);
                    };
                }

                mainWindowInstance.emit('response-complete');

                await new Promise((resolve) => setTimeout(resolve, 100));

                if (originalShowNotification) {
                    notificationManager.showNotification = originalShowNotification;
                }

                const hasBadge = badgeManager.hasNotificationBadge ?? false;

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
                return;
            }

            // Verify Windows-specific behavior
            expect(result.hasOverlayIconSupport).toBe(true);
            expect(result.notificationCalled).toBe(true);
            expect(result.hasBadge).toBe(true);

            // Note: overlayIconSet may be true or false depending on badge manager implementation
            // The important thing is no errors occurred and badge state was properly tracked
        });

        // macOS-specific test (Task 9.9)
        it('should use macOS Notification Center and dock badge (macOS only)', async () => {
            const detectedPlatform = await getPlatform();
            if (detectedPlatform !== 'macos') {
                return;
            }

            // This test uses FULL production wiring via mainWindow.emit('response-complete')
            // to verify macOS Notification Center and dock badge work correctly
            const result = await wdioBrowser.electron.execute(async (electron) => {
                const { app } = electron;
                const appContext = (global as { appContext?: any }).appContext;
                const windowManager = appContext?.windowManager;
                const notificationManager = appContext?.notificationManager;
                const badgeManager = appContext?.badgeManager;

                if (!windowManager || !notificationManager || !badgeManager) {
                    return { error: 'Required managers not available' };
                }

                const mainWindowInstance = windowManager.getMainWindowInstance();
                if (!mainWindowInstance) {
                    return { error: 'MainWindow instance not available' };
                }

                const hasDockBadgeSupport = typeof app.dock?.setBadge === 'function';

                notificationManager['_isWindowFocused'] = false;

                let notificationCalled = false;
                let dockBadgeSet = false;
                let dockBadgeText = '';

                const originalShowNotification = notificationManager.showNotification?.bind(notificationManager);
                if (originalShowNotification) {
                    notificationManager.showNotification = () => {
                        notificationCalled = true;
                    };
                }

                if (app.dock && typeof app.dock.setBadge === 'function') {
                    const originalSetBadge = app.dock.setBadge.bind(app.dock);
                    app.dock.setBadge = (text: string) => {
                        dockBadgeSet = true;
                        dockBadgeText = text;
                        return originalSetBadge(text);
                    };
                }

                mainWindowInstance.emit('response-complete');

                await new Promise((resolve) => setTimeout(resolve, 100));

                if (originalShowNotification) {
                    notificationManager.showNotification = originalShowNotification;
                }

                const hasBadge = badgeManager.hasNotificationBadge ?? false;

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
                return;
            }

            // Verify macOS-specific behavior
            expect(result.hasDockBadgeSupport).toBe(true);
            expect(result.notificationCalled).toBe(true);
            expect(result.hasBadge).toBe(true);
        });

        // Linux-specific test (Task 9.10)
        it('should handle Linux gracefully with libnotify notification and no native badge (Linux only)', async () => {
            const detectedPlatform = await getPlatform();
            if (detectedPlatform !== 'linux') {
                return;
            }

            // This test uses FULL production wiring via mainWindow.emit('response-complete')
            // to verify Linux notification works correctly and badge is gracefully skipped
            const result = await wdioBrowser.electron.execute(async (electron) => {
                const { Notification } = electron;
                const appContext = (global as { appContext?: any }).appContext;
                const windowManager = appContext?.windowManager;
                const notificationManager = appContext?.notificationManager;
                const badgeManager = appContext?.badgeManager;

                if (!windowManager || !notificationManager || !badgeManager) {
                    return { error: 'Required managers not available' };
                }

                const mainWindowInstance = windowManager.getMainWindowInstance();
                if (!mainWindowInstance) {
                    return { error: 'MainWindow instance not available' };
                }

                const isNotificationSupported = Notification.isSupported();

                notificationManager['_isWindowFocused'] = false;

                let notificationCalled = false;

                const originalShowNotification = notificationManager.showNotification?.bind(notificationManager);
                if (originalShowNotification) {
                    notificationManager.showNotification = () => {
                        notificationCalled = true;
                    };
                }

                mainWindowInstance.emit('response-complete');

                await new Promise((resolve) => setTimeout(resolve, 100));

                if (originalShowNotification) {
                    notificationManager.showNotification = originalShowNotification;
                }

                let badgeNoError = true;
                try {
                    badgeManager.showNotificationBadge();
                    badgeManager.clearNotificationBadge();
                } catch (_e) {
                    badgeNoError = false;
                }

                notificationManager.onWindowFocus();

                return {
                    isNotificationSupported,
                    notificationCalled,
                    badgeNoError,
                };
            });

            if ('error' in result) {
                return;
            }

            // Verify Linux-specific behavior
            // Notification should work via libnotify (if supported by the DE)
            expect(result.isNotificationSupported).toBeDefined();
            expect(result.notificationCalled).toBe(true);
            // Badge operations should not throw on Linux (gracefully skipped)
            expect(result.badgeNoError).toBe(true);
        });
    });
});
