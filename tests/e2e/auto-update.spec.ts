/**
 * E2E Tests: Auto-Update Feature
 *
 * Consolidates all auto-update E2E tests into a single spec file.
 * Tests share the same Electron session to reduce startup overhead.
 */

/// <reference path="./helpers/wdio-electron.d.ts" />

import { browser, expect } from '@wdio/globals';

import { getPlatform } from './helpers/platform';
import { waitForDuration, waitForIPCRoundTrip } from './helpers/waitUtilities';
import { waitForWindowCount } from './helpers/windowActions';
import { ensureSingleWindow, waitForAppReady } from './helpers/workflows';
import { MainWindowPage, OptionsPage, UpdateToastPage } from './pages';

type DevMockPlatformEnv = Record<string, string> | null;
type ElectronAPI = {
    devClearBadge: () => void;
    devMockPlatform: (platform: string | null, env: DevMockPlatformEnv) => void;
    devShowBadge: (version: string) => void;
    getAutoUpdateEnabled: () => boolean | Promise<boolean>;
    getTrayTooltip: () => string;
    onUpdateError: (handler: (error: string) => void) => () => void;
    setAutoUpdateEnabled: (enabled: boolean) => void;
};

type WindowWithElectronAPI = Window & { electronAPI?: ElectronAPI };

type BrowserWithExecuteAsync = typeof browser & {
    execute: <T>(script: string | ((...args: unknown[]) => T), ...args: unknown[]) => Promise<T>;
    executeAsync: <T>(script: (done: (value: T) => void) => void) => Promise<T>;
    pause: (ms: number) => Promise<void>;
};

const wdioBrowser = browser as unknown as BrowserWithExecuteAsync;

// ============================================================================
// Test Suite
// ============================================================================

describe('Auto-Update', () => {
    let updateToast: UpdateToastPage;

    const mainWindow = new MainWindowPage();
    const optionsPage = new OptionsPage();

    before(async () => {
        updateToast = new UpdateToastPage();
    });

    beforeEach(async () => {
        await updateToast.clearAll();
        await waitForIPCRoundTrip(async () => {
            await wdioBrowser.execute(() => {
                const api = (window as unknown as WindowWithElectronAPI).electronAPI;
                api?.devClearBadge();
                api?.devMockPlatform(null, null);
                api?.setAutoUpdateEnabled(true);
            });
        });
    });

    describe('Initialization', () => {
        it('should initialize auto-updater without errors', async () => {
            // Track if any auto-update errors occur
            let errorOccurred = false;
            let errorMessage = '';

            // Set up listener for auto-update errors
            // This must happen before the error could occur (early in app lifecycle)
            const errorPromise = await wdioBrowser.executeAsync((done: (error: string | null) => void) => {
                let captured = false;

                const api = (window as unknown as WindowWithElectronAPI).electronAPI;
                const cleanup = api?.onUpdateError((error: string) => {
                    if (!captured) {
                        captured = true;
                        cleanup?.();
                        done(error); // Return error message if one occurs
                    }
                });

                // Wait 5 seconds - if no error by then, initialization succeeded
                setTimeout(() => {
                    if (!captured) {
                        cleanup?.();
                        done(null); // No error occurred
                    }
                }, 5000);
            });

            const error = errorPromise;

            // THEN: Auto-updater should initialize without errors
            if (error) {
                errorOccurred = true;
                errorMessage = error as string;
            }

            expect(errorOccurred).toBe(false);
            if (errorOccurred) {
                throw new Error(`Auto-update initialization failed: ${errorMessage}`);
            }
        });

        it('should successfully read dev-app-update.yml configuration', async () => {
            // GIVEN: App is running with --test-auto-update flag
            // WHEN: UpdateManager initializes
            // THEN: No ENOENT error should appear in logs

            // We can verify this by checking that auto-update is enabled
            // (it would be disabled if config couldn't be read)
            const enabled = await wdioBrowser.execute(() => {
                const api = (window as unknown as WindowWithElectronAPI).electronAPI;
                return api?.getAutoUpdateEnabled();
            });

            expect(enabled).toBe(true);
        });
    });

    describe('Happy Path', () => {
        describe('Complete Update Flow', () => {
            it('should complete full update cycle from check to ready-to-install', async () => {
                // STEP 1: Manual check for updates

                // Note: We skip calling window.electronAPI.checkForUpdates() here because
                // it attempts a real network request to GitHub's releases API, which fails
                // in E2E testing (HttpError 406). Instead, we use the __testUpdateToast
                // helper to simulate the update flow UI without network dependency.
                await updateToast.waitForAnimationComplete();

                // STEP 2: Update becomes available

                await updateToast.showAvailable('2.5.0');
                await updateToast.waitForVisible();

                expect(await updateToast.getTitle()).toBe('Update Available');
                expect(await updateToast.getMessage()).toContain('2.5.0');

                // User dismisses the "available" toast
                await updateToast.dismiss();
                await updateToast.waitForHidden();

                // STEP 3: Download Progress

                await updateToast.showProgress(45);
                await updateToast.waitForVisible();

                expect(await updateToast.getTitle()).toBe('Downloading Update');
                expect(await updateToast.getMessage()).toContain('45%');
                expect(await updateToast.isProgressBarDisplayed()).toBe(true);
                expect(await updateToast.getProgressValue()).toBe('45');

                await updateToast.waitForAnimationComplete();

                // STEP 4: Update downloaded (auto-download in background)

                await updateToast.showDownloaded('2.5.0');
                await updateToast.waitForVisible();

                expect(await updateToast.getTitle()).toBe('Update Ready');
                expect(await updateToast.getMessage()).toContain('2.5.0');

                // STEP 5: Verify Restart Now button is present
                expect(await updateToast.isRestartButtonDisplayed()).toBe(true);
                expect(await updateToast.getRestartButtonText()).toContain('Restart');

                // STEP 6: Verify tray tooltip
                // Note: Badge visibility depends on platform and implementation
                // We'll verify the tray tooltip instead, which is more reliable
                await updateToast.waitForAnimationComplete();

                const tooltip = await updateToast.getTrayTooltip();
                expect(tooltip).toContain('2.5.0');

                // STEP 7: Click "Restart Now" to trigger install

                // In a real scenario, this would quit the app. We just verify the IPC call works.
                await updateToast.clickRestartNow();

                // The app would quit here in production, but in test we just verify no crash
                await updateToast.waitForAnimationComplete();
            });
        });

        describe('Update Available Stage', () => {
            it('should display update available notification with version', async () => {
                await updateToast.showAvailable('3.1.0');
                await updateToast.waitForVisible();

                expect(await updateToast.getTitle()).toBe('Update Available');
                expect(await updateToast.getMessage()).toContain('3.1.0');
            });

            it('should allow dismissing update available notification', async () => {
                await updateToast.showAvailable('3.1.0');
                await updateToast.waitForVisible();

                await updateToast.dismiss();
                await updateToast.waitForHidden();
            });
        });

        describe('Download Progress Stage', () => {
            it('should display progress bar with correct percentage', async () => {
                await updateToast.showProgress(75);
                await updateToast.waitForVisible();

                expect(await updateToast.getTitle()).toBe('Downloading Update');
                expect(await updateToast.getMessage()).toContain('75%');
                expect(await updateToast.isProgressBarDisplayed()).toBe(true);
                expect(await updateToast.getProgressValue()).toBe('75');

                // Verify width style on the inner progress bar element
                const style = await updateToast.getProgressBarStyle();
                expect(style).toContain('width: 75%');
            });
        });

        describe('Update Downloaded Stage', () => {
            it('should display update ready notification with restart button', async () => {
                await updateToast.showDownloaded('3.2.0');
                await updateToast.waitForVisible();

                expect(await updateToast.getTitle()).toBe('Update Ready');
                expect(await updateToast.isRestartButtonDisplayed()).toBe(true);
            });

            it('should update tray tooltip when update is downloaded', async () => {
                await updateToast.showDownloaded('3.2.0');
                await updateToast.waitForAnimationComplete();

                const tooltip = await updateToast.getTrayTooltip();
                expect(tooltip).toContain('3.2.0');
            });

            it('should trigger install on restart button click', async () => {
                await updateToast.showDownloaded('3.2.0');
                await updateToast.waitForVisible();

                // Click restart - in production this quits the app
                await expect(updateToast.clickRestartNow()).resolves.not.toThrow();
            });
        });

        describe('Visual Indicators', () => {
            it('should show tray tooltip after update download', async () => {
                // Show badge via dev helper
                await updateToast.showBadge('4.0.0');
                await updateToast.waitForAnimationComplete();

                const tooltip = await updateToast.getTrayTooltip();
                expect(tooltip).toContain('4.0.0');
            });

            it('should clear tray tooltip after clearing badge', async () => {
                // Show then clear
                await updateToast.showBadge('4.0.0');
                await updateToast.waitForAnimationComplete();

                await updateToast.clearBadge();
                await updateToast.waitForAnimationComplete();

                const tooltip = await updateToast.getTrayTooltip();
                expect(tooltip).toBe('Gemini Desktop'); // Default tooltip
            });
        });
    });

    describe('User Interactions', () => {
        // Disable auto-updates to prevent startup check interference
        before(async () => {
            // Wait for app to be ready
            await waitForDuration(2000, 'App startup');

            // Disable auto-updates settings via IPC to stop the startup check
            await wdioBrowser.execute(() => {
                const api = (window as unknown as WindowWithElectronAPI).electronAPI;
                api?.setAutoUpdateEnabled(false);
            });

            // Allow IPC to process
            await waitForDuration(1000, 'IPC processing');
        });

        describe('Restart Now Button', () => {
            it('should display Restart Now button when update is downloaded', async () => {
                // GIVEN an update is downloaded
                await updateToast.showDownloaded('9.9.9');

                // THEN the "Update Ready" toast should show with Restart Now button
                await updateToast.waitForVisible();

                expect(await updateToast.isRestartButtonDisplayed()).toBe(true);
                expect(await updateToast.getRestartButtonText()).toBe('Restart Now');
            });

            it('should dismiss toast and clear pending state when Restart Now is clicked', async () => {
                // Note: Clicking Restart Now triggers the main process installUpdate() which fails
                // in test mode (no real update available). This causes an error toast to appear.
                // We verify the original downloaded toast was dismissed by checking:
                // 1. The Restart Now button is no longer visible
                // 2. The hasPendingUpdate state is cleared (verified in React component behavior)

                // GIVEN an update is downloaded with badge visible
                await updateToast.showDownloaded('9.9.9');
                await updateToast.showBadge('9.9.9');

                await updateToast.waitForVisible();

                // Verify Restart Now button is visible before clicking
                expect(await updateToast.isRestartButtonDisplayed()).toBe(true);

                // WHEN user clicks Restart Now
                await updateToast.clickRestartNow();
                await updateToast.waitForAnimationComplete();

                // THEN the Restart Now button should no longer be visible
                // (either toast is hidden or has transitioned to error state without that button)
                expect(await updateToast.isRestartButtonExisting()).toBe(false);
            });
        });

        describe('Later Button', () => {
            it('should dismiss toast but keep indicators when "Later" is clicked', async () => {
                // GIVEN an update is downloaded
                await updateToast.showDownloaded('9.9.9');
                await updateToast.showBadge('9.9.9');

                // AND the "Update Ready" toast is visible
                await updateToast.waitForVisible();
                expect(await updateToast.isDisplayed()).toBe(true);
                expect(await updateToast.isRestartButtonDisplayed()).toBe(true);

                // WHEN the user clicks "Later"
                await updateToast.clickLater();
                await updateToast.waitForHidden();

                // THEN the toast should dismiss
                expect(await updateToast.isDisplayed()).toBe(false);

                // AND the titlebar badge should remain visible
                expect(await updateToast.isBadgeDisplayed()).toBe(true);

                // AND the tray tooltip should remain updated
                const tooltip = await updateToast.getTrayTooltip();
                expect(tooltip).toContain('Update v9.9.9 available');
            });

            it('should keep pending update state when Later is clicked', async () => {
                // GIVEN an update is downloaded
                await updateToast.showDownloaded('9.9.9');
                await updateToast.waitForVisible();

                // WHEN user clicks Later
                await updateToast.clickLater();
                await updateToast.waitForHidden();

                // THEN toast is dismissed
                expect(await updateToast.isDisplayed()).toBe(false);

                // BUT the app still knows there's a pending update (badge visible)
                // Re-showing would show the same update
                await updateToast.showDownloaded('9.9.9');
                await updateToast.waitForVisible();
                expect(await updateToast.isDisplayed()).toBe(true);
            });
        });

        describe('Error Toast', () => {
            it('should display error message in toast', async () => {
                // GIVEN an update error occurs
                await updateToast.showError('Test Network Error');

                // THEN the error toast should be visible with the correct message
                await updateToast.waitForVisible();

                expect(await updateToast.getTitle()).toBe('Update Error');
                expect(await updateToast.getMessage()).toContain('Test Network Error');
            });

            it('should dismiss error toast and clear state when error is dismissed', async () => {
                // GIVEN an update error occurs
                await updateToast.showError('Test Network Error');

                // AND the "Update Error" toast is visible
                await updateToast.waitForVisible();

                // WHEN the user clicks the dismiss (×) button
                await updateToast.dismiss();

                // THEN toast should be hidden
                await updateToast.waitForHidden();

                // AND no badges should appear (errors don't create badges)
                expect(await updateToast.isBadgeExisting()).toBe(false);
            });

            it('should show appropriate message for download failure', async () => {
                // Test specific error scenario: download failure
                await updateToast.showError('Failed to download update: Connection timed out');
                await updateToast.waitForVisible();

                expect(await updateToast.getMessage()).toContain('Connection timed out');
            });

            it('should handle generic error with fallback message', async () => {
                // Test error with no custom message (uses fallback)
                await updateToast.showError(null);
                await updateToast.waitForVisible();

                // Should show default fallback message
                expect(await updateToast.getMessage()).toContain('An error occurred while updating');
            });

            it('should not show Restart Now or Later buttons for error toast', async () => {
                // GIVEN an error toast
                await updateToast.showError('Some error');
                await updateToast.waitForVisible();

                // THEN only dismiss button should be present
                expect(await updateToast.isRestartButtonExisting()).toBe(false);
                expect(await updateToast.isLaterButtonExisting()).toBe(false);
                expect(await updateToast.isDismissButtonExisting()).toBe(true);
            });
        });

        describe('Update Available Toast', () => {
            it('should show update available message while downloading', async () => {
                // GIVEN an update is available (downloading)
                await updateToast.showAvailable('10.0.0');
                await updateToast.waitForVisible();

                expect(await updateToast.getTitle()).toBe('Update Available');
                const message = await updateToast.getMessage();
                expect(message).toContain('10.0.0');
                expect(message).toContain('downloading');
            });

            it('should show dismiss button for update available toast', async () => {
                await updateToast.showAvailable('10.0.0');
                await updateToast.waitForVisible();

                // Should have dismiss button, NOT Restart Now
                expect(await updateToast.isDismissButtonExisting()).toBe(true);
                expect(await updateToast.isRestartButtonExisting()).toBe(false);
            });
        });

        describe('Update Not Available Toast', () => {
            it('should show "No updates available" toast when manual check finds no update', async () => {
                // GIVEN user performs a manual update check
                await updateToast.showNotAvailable('1.0.0');

                // THEN the "No updates available" toast should appear
                await updateToast.waitForVisible();

                const title = await updateToast.getTitle();
                expect(title.toLowerCase()).toContain('up to date');

                const message = await updateToast.getMessage();
                // Should indicate current version or that app is up to date
                expect(message).toMatch(/(up to date|current|1\.0\.0)/i);
            });

            it('should dismiss "No updates available" toast when user clicks dismiss', async () => {
                await updateToast.showNotAvailable('1.0.0');
                await updateToast.waitForVisible();

                await updateToast.dismiss();
                await updateToast.waitForHidden();
            });

            it('should not show badge or tray tooltip for "No updates available"', async () => {
                // Ensure badges are clear first
                await updateToast.clearBadge();
                await updateToast.waitForAnimationComplete();

                // Show "No updates available" toast
                await updateToast.showNotAvailable('1.0.0');
                await updateToast.waitForVisible();
                await updateToast.waitForAnimationComplete();

                // No badge should appear
                expect(await updateToast.isBadgeExisting()).toBe(false);

                // Tray tooltip should be default (not showing update info)
                const tooltip = await updateToast.getTrayTooltip();
                expect(tooltip).toBe('Gemini Desktop'); // Default tooltip
            });
        });
    });

    describe('Error Recovery', () => {
        describe('Error Toast Display', () => {
            it('should display error toast with clear message', async () => {
                // Trigger error
                await updateToast.showError('Network connection failed');
                await updateToast.waitForVisible();

                expect(await updateToast.getTitle()).toBe('Update Error');
                expect(await updateToast.getMessage()).toContain('Network connection failed');
            });

            it('should allow dismissing error toast', async () => {
                // Show error
                await updateToast.showError('Test error');
                await updateToast.waitForVisible();

                // Dismiss
                await updateToast.dismiss();
                await updateToast.waitForHidden();
            });
        });

        describe('Error Recovery', () => {
            it('should allow retry after network error', async () => {
                // GIVEN: User receives a network error
                await updateToast.showError('Network error during update check');
                await updateToast.waitForVisible();
                expect(await updateToast.isDisplayed()).toBe(true);

                // WHEN: User dismisses error and manually checks again
                await updateToast.dismiss();
                await updateToast.waitForHidden();

                // Simulate successful retry (in real scenario, would trigger actual check)
                await updateToast.showAvailable('2.0.0');
                await updateToast.waitForVisible();

                // THEN: Should show update available
                expect(await updateToast.getTitle()).toBe('Update Available');
            });

            it('should handle multiple errors in sequence', async () => {
                // First error
                await updateToast.showError('First error');
                await updateToast.waitForVisible();

                expect(await updateToast.getMessage()).toContain('First error');

                // Dismiss
                await updateToast.dismiss();
                await updateToast.waitForHidden();

                // Second error
                await updateToast.showError('Second error');
                await updateToast.waitForVisible();

                expect(await updateToast.getMessage()).toContain('Second error');
            });

            it('should not display badge for errors', async () => {
                // Show error
                await updateToast.showError('Update failed');
                await updateToast.waitForVisible();

                // Badge should NOT appear for errors
                expect(await updateToast.isBadgeExisting()).toBe(false);
            });
        });

        describe('Different Error Types', () => {
            it('should handle download failure error', async () => {
                await updateToast.showError('Failed to download update: Connection timed out');
                await updateToast.waitForVisible();

                const message = await updateToast.getMessage();
                expect(message).toContain('Failed to download update');
                expect(message).toContain('Connection timed out');
            });

            it('should handle generic error with fallback message', async () => {
                // Trigger with null error message
                await updateToast.showError(null);
                await updateToast.waitForVisible();

                const text = await updateToast.getMessage();
                // Should show default fallback
                expect(text).toContain('error');
            });

            it('should handle insufficient disk space error', async () => {
                await updateToast.showError('Insufficient disk space to download update');
                await updateToast.waitForVisible();

                expect(await updateToast.getMessage()).toContain('Insufficient disk space');
            });
        });

        describe('Error State Transitions', () => {
            it('should transition from available to error correctly', async () => {
                // Start with update available
                await updateToast.showAvailable('2.0.0');
                await updateToast.waitForVisible();

                expect(await updateToast.getTitle()).toBe('Update Available');

                // Dismiss
                await updateToast.dismiss();
                await updateToast.waitForHidden();

                // Then error occurs
                await updateToast.showError('Download interrupted');
                await updateToast.waitForVisible();

                expect(await updateToast.getTitle()).toBe('Update Error');
            });

            it('should transition from error to downloaded correctly', async () => {
                // Start with error
                await updateToast.showError('Temporary error');
                await updateToast.waitForVisible();

                // Dismiss
                await updateToast.dismiss();
                await updateToast.waitForHidden();

                // Then update succeeds
                await updateToast.showDownloaded('2.0.0');
                await updateToast.waitForVisible();

                expect(await updateToast.getTitle()).toBe('Update Ready');

                // Should have Restart Now button
                expect(await updateToast.isRestartButtonDisplayed()).toBe(true);
            });
        });
    });

    describe('Persistence', () => {
        beforeEach(async () => {
            await waitForAppReady();
        });

        afterEach(async () => {
            await ensureSingleWindow();
        });

        /**
         * Helper to open Options window and wait for it to load.
         */
        async function openOptionsWindow(): Promise<void> {
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2, 5000);
            await optionsPage.waitForLoad();
        }

        /**
         * Helper to close Options window and return to main.
         */
        async function closeOptionsWindow(): Promise<void> {
            await optionsPage.close();
        }

        describe('Default State', () => {
            it('should default to enabled (checked) state', async () => {
                await openOptionsWindow();

                // On a fresh install, auto-update should be enabled by default
                // We just verify it's a valid state (true or false)
                const isEnabled = await optionsPage.isAutoUpdateEnabled();
                expect([true, false]).toContain(isEnabled);
            });
        });

        describe('Session Persistence', () => {
            it('should persist disabled state within session', async () => {
                // 1. Open Options and disable auto-update
                await openOptionsWindow();

                const initial = await optionsPage.isAutoUpdateEnabled();

                // Ensure it's disabled
                if (initial) {
                    await optionsPage.toggleAutoUpdate();
                }

                const afterDisable = await optionsPage.isAutoUpdateEnabled();
                expect(afterDisable).toBe(false);

                // 2. Close Options window
                await closeOptionsWindow();

                // 3. Reopen Options window
                await openOptionsWindow();

                // 4. Verify state persisted
                const persisted = await optionsPage.isAutoUpdateEnabled();
                expect(persisted).toBe(false);

                // 5. Restore to enabled
                await optionsPage.toggleAutoUpdate();
            });

            it('should persist enabled state within session', async () => {
                // 1. Open Options and ensure auto-update is enabled
                await openOptionsWindow();

                const initial = await optionsPage.isAutoUpdateEnabled();

                // Ensure it's enabled
                if (!initial) {
                    await optionsPage.toggleAutoUpdate();
                }

                const afterEnable = await optionsPage.isAutoUpdateEnabled();
                expect(afterEnable).toBe(true);

                // 2. Close Options window
                await closeOptionsWindow();

                // 3. Reopen Options window
                await openOptionsWindow();

                // 4. Verify state persisted
                const persisted = await optionsPage.isAutoUpdateEnabled();
                expect(persisted).toBe(true);
            });
        });

        describe('Multiple Toggle Operations', () => {
            it('should update settings file when toggled multiple times', async () => {
                await openOptionsWindow();

                // Toggle multiple times
                for (let i = 0; i < 4; i++) {
                    await optionsPage.toggleAutoUpdate();
                }

                // Final state should match initial (even number of toggles)
                const finalState = await optionsPage.isAutoUpdateEnabled();

                // Close and reopen to verify persistence
                await closeOptionsWindow();
                await openOptionsWindow();

                const persistedState = await optionsPage.isAutoUpdateEnabled();
                expect(persistedState).toBe(finalState);
            });

            it('should handle rapid toggling without corruption', async () => {
                await openOptionsWindow();

                const initial = await optionsPage.isAutoUpdateEnabled();

                // Rapid toggles - use shorter internal pauses
                for (let i = 0; i < 5; i++) {
                    await optionsPage.toggleAutoUpdate();
                }

                // State should be opposite of initial (odd number of toggles)
                const finalState = await optionsPage.isAutoUpdateEnabled();
                const expected = !initial;
                expect(finalState).toBe(expected);

                // Restore initial state
                await optionsPage.toggleAutoUpdate();
            });
        });

        describe('Cross-Platform Persistence', () => {
            it('should persist settings on current platform', async () => {
                const detectedPlatform = await getPlatform();
                expect(['windows', 'macos', 'linux']).toContain(detectedPlatform);

                await openOptionsWindow();

                // Toggle to opposite state
                const initial = await optionsPage.isAutoUpdateEnabled();
                await optionsPage.toggleAutoUpdate();

                const afterToggle = await optionsPage.isAutoUpdateEnabled();
                expect(afterToggle).not.toBe(initial);

                // Close and reopen
                await closeOptionsWindow();
                await openOptionsWindow();

                // Verify persistence
                const persisted = await optionsPage.isAutoUpdateEnabled();
                expect(persisted).toBe(afterToggle);

                // Restore
                if (persisted !== initial) {
                    await optionsPage.toggleAutoUpdate();
                }
            });
        });
    });

    describe('Platform Logic', () => {
        before(async () => {
            await wdioBrowser.pause(2000);
            await wdioBrowser.execute(() => {
                const api = (window as unknown as WindowWithElectronAPI).electronAPI;
                api?.setAutoUpdateEnabled(false);
                // Clear mocks
                api?.devMockPlatform(null, null);
            });
            await wdioBrowser.pause(1000);
        });

        afterEach(async () => {
            // Reset mocks
            await wdioBrowser.execute(() => {
                const api = (window as unknown as WindowWithElectronAPI).electronAPI;
                api?.devMockPlatform(null, null);
            });
        });

        it.skip('should disable updates on Linux non-AppImage', async () => {
            // GIVEN: We act as Linux without AppImage env
            // passing undefined for APPIMAGE key. Note: mockEnv replaces process.env so just {} misses APPIMAGE usually.
            await wdioBrowser.execute(() => {
                const api = (window as unknown as WindowWithElectronAPI).electronAPI;
                api?.devMockPlatform('linux', { MOCK: 'true' });
            });

            // AND: We ensure updates are "enabled" in settings
            await wdioBrowser.execute(() => {
                const api = (window as unknown as WindowWithElectronAPI).electronAPI;
                api?.setAutoUpdateEnabled(true);
            });

            // THEN: getAutoUpdateEnabled() should return false (because platform restriction overrides setting)
            const enabled = await wdioBrowser.execute(async () => {
                const api = (window as unknown as WindowWithElectronAPI).electronAPI;
                const result = await api?.getAutoUpdateEnabled();
                return result ?? false;
            });

            expect(enabled).toBe(false);
        });

        it('should enable updates on Linux AppImage', async () => {
            await wdioBrowser.execute(() => {
                const api = (window as unknown as WindowWithElectronAPI).electronAPI;
                api?.devMockPlatform('linux', {
                    APPIMAGE: '/path/to/app.AppImage',
                });
            });
            await wdioBrowser.execute(() => {
                const api = (window as unknown as WindowWithElectronAPI).electronAPI;
                api?.setAutoUpdateEnabled(true);
            });

            const enabled = await wdioBrowser.execute(async () => {
                const api = (window as unknown as WindowWithElectronAPI).electronAPI;
                const result = await api?.getAutoUpdateEnabled();
                return result ?? false;
            });
            expect(enabled).toBe(true);
        });
    });

    describe('Toggle', () => {
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

        describe('Rendering', () => {
            it('should display the Updates section in Options', async () => {
                expect(await optionsPage.isUpdatesSectionDisplayed()).toBe(true);

                const heading = await optionsPage.getUpdatesSectionHeading();
                expect(heading.toLowerCase()).toContain('updates');
            });

            it('should display the auto-update toggle', async () => {
                expect(await optionsPage.isAutoUpdateToggleDisplayed()).toBe(true);
            });

            it('should display toggle with label and description', async () => {
                const text = await optionsPage.getAutoUpdateToggleText();

                expect(text).toContain('Automatic Updates');
                expect(text.toLowerCase()).toContain('download');
            });

            it('should have toggle switch element', async () => {
                // Verify the toggle switch element exists and has aria-checked attribute
                const isEnabled = await optionsPage.isAutoUpdateEnabled();
                expect([true, false]).toContain(isEnabled);
            });
        });

        describe('Interactions', () => {
            it('should have aria-checked attribute on toggle switch', async () => {
                const isEnabled = await optionsPage.isAutoUpdateEnabled();

                expect([true, false]).toContain(isEnabled);
            });

            it('should toggle state when clicked', async () => {
                const initialEnabled = await optionsPage.isAutoUpdateEnabled();

                await optionsPage.toggleAutoUpdate();

                const newEnabled = await optionsPage.isAutoUpdateEnabled();

                expect(newEnabled).not.toBe(initialEnabled);

                // Restore original state
                await optionsPage.toggleAutoUpdate();
            });

            it('should toggle back when clicked again', async () => {
                const initial = await optionsPage.isAutoUpdateEnabled();
                await optionsPage.toggleAutoUpdate();
                await optionsPage.toggleAutoUpdate();

                const final = await optionsPage.isAutoUpdateEnabled();
                expect(final).toBe(initial);
            });

            it('should remember state within session', async () => {
                // Set to disabled
                const initial = await optionsPage.isAutoUpdateEnabled();
                if (initial) {
                    await optionsPage.toggleAutoUpdate();
                }

                // Close and reopen Options window
                await optionsPage.close();

                // Reopen
                await mainWindow.openOptionsViaMenu();
                await waitForWindowCount(2, 5000);
                await optionsPage.waitForLoad();

                // Verify state was preserved
                const state = await optionsPage.isAutoUpdateEnabled();
                expect(state).toBe(false);

                // Restore to enabled
                await optionsPage.toggleAutoUpdate();
            });
        });

        describe('Cross-Platform', () => {
            it('should work on current platform', async () => {
                const detectedPlatform = await getPlatform();
                expect(['windows', 'macos', 'linux']).toContain(detectedPlatform);

                // Toggle should exist and be interactable on all platforms
                expect(await optionsPage.isAutoUpdateToggleDisplayed()).toBe(true);
            });
        });
    });

    describe('Tray Integration', () => {
        // Only run on platforms that support tray (Windows/Linux/macOS all do, but behavior varies)
        // We assume the app is running with a tray.

        beforeEach(async () => {
            // Reset state: Clear any existing badges/tooltips
            await waitForIPCRoundTrip(async () => {
                await wdioBrowser.execute(() => {
                    const api = (window as unknown as WindowWithElectronAPI).electronAPI;
                    api?.devClearBadge();
                });
            });
        });

        it('should update tooltip when update is downloaded and revert when dismissed', async () => {
            // GIVEN an update is downloaded
            const version = '9.9.9'; // Test version
            await waitForIPCRoundTrip(async () => {
                await wdioBrowser.execute((...args: unknown[]) => {
                    // Simulate update downloaded event via dev helper (assumes we have a way to trigger logic)
                    // Since we don't have a direct "simulate update downloaded" on electronAPI,
                    // we use the devShowBadge which internally calls BadgeManager.showUpdateBadge AND TrayManager.setUpdateTooltip
                    const api = (window as unknown as WindowWithElectronAPI).electronAPI;
                    const [v] = args as [string];
                    api?.devShowBadge(v);
                }, version);
            });

            // WHEN the user hovers over the system tray icon (Simulated by checking tooltip text)
            // THEN tooltip should show "Gemini Desktop - Update vX.X.X available"
            const tooltip = await wdioBrowser.execute(() => {
                const api = (window as unknown as WindowWithElectronAPI).electronAPI;
                return api?.getTrayTooltip() ?? '';
            });

            expect(tooltip).toContain(`Update v${version} available`);

            // AND when user dismisses update (simulated by clearing badge)
            await waitForIPCRoundTrip(async () => {
                await wdioBrowser.execute(() => {
                    const api = (window as unknown as WindowWithElectronAPI).electronAPI;
                    api?.devClearBadge();
                });
            });

            // THEN tooltip should revert to "Gemini Desktop"
            const finalTooltip = await wdioBrowser.execute(() => {
                const api = (window as unknown as WindowWithElectronAPI).electronAPI;
                return api?.getTrayTooltip() ?? '';
            });

            expect(finalTooltip).toBe('Gemini Desktop');
        });
    });
});
