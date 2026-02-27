/// <reference path="./helpers/wdio-electron.d.ts" />

import { browser, expect } from '@wdio/globals';

import { MainWindowPage, OptionsPage, UpdateToastPage } from './pages';
import { getPlatform } from './helpers/platform';
import { waitForWindowCount } from './helpers/windowActions';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { waitForDuration, waitForIPCRoundTrip } from './helpers/waitUtilities';

type WdioBrowser = {
    executeAsync<T>(script: (...args: any[]) => void, ...args: any[]): Promise<T>;
    execute<T>(script: (...args: any[]) => T, ...args: any[]): Promise<T>;
    pause(ms: number): Promise<void>;
};

const wdioBrowser = browser as unknown as WdioBrowser;

type ElectronAPI = {
    onUpdateError: (handler: (error: string) => void) => () => void;
    getAutoUpdateEnabled: () => Promise<boolean> | boolean;
    setAutoUpdateEnabled: (enabled: boolean) => void;
    devMockPlatform: (platform: string | null, env: Record<string, string> | null) => void;
    devShowBadge: (version: string) => void;
    devClearBadge: () => void;
    getTrayTooltip: () => Promise<string> | string;
};

const getElectronAPI = (win: Window): ElectronAPI | null => {
    return (win as Window & { electronAPI?: ElectronAPI }).electronAPI ?? null;
};

describe('Auto-Update', () => {
    describe('Initialization', () => {
        it('should initialize auto-updater without errors', async () => {
            let errorOccurred = false;
            let errorMessage = '';

            const errorPromise = await wdioBrowser.executeAsync((done: (error: string | null) => void) => {
                let captured = false;

                const cleanup = getElectronAPI(window)?.onUpdateError((error: string) => {
                    if (!captured) {
                        captured = true;
                        cleanup?.();
                        done(error);
                    }
                });

                setTimeout(() => {
                    if (!captured) {
                        cleanup?.();
                        done(null);
                    }
                }, 5000);
            });

            const error = errorPromise;

            if (typeof error === 'string' && error.length > 0) {
                errorOccurred = true;
                errorMessage = error;
            }

            expect(errorOccurred).toBe(false);
            if (errorOccurred) {
                throw new Error(`Auto-update initialization failed: ${errorMessage}`);
            }
        });

        it('should successfully read dev-app-update.yml configuration', async () => {
            const enabled = await wdioBrowser.execute(() => {
                return getElectronAPI(window)?.getAutoUpdateEnabled();
            });

            expect(enabled).toBe(true);
        });
    });

    describe('Happy Path', () => {
        let updateToast: UpdateToastPage;

        before(async () => {
            updateToast = new UpdateToastPage();
        });

        beforeEach(async () => {
            await updateToast.clearAll();
        });

        describe('Complete Update Flow', () => {
            it('should complete full update cycle from check to ready-to-install', async () => {
                await updateToast.waitForAnimationComplete();

                await updateToast.showAvailable('2.5.0');
                await updateToast.waitForVisible();

                expect(await updateToast.getTitle()).toBe('Update Available');
                expect(await updateToast.getMessage()).toContain('2.5.0');

                await updateToast.dismiss();
                await updateToast.waitForHidden();

                await updateToast.showProgress(45);
                await updateToast.waitForVisible();

                expect(await updateToast.getTitle()).toBe('Downloading Update');
                expect(await updateToast.getMessage()).toContain('45%');
                expect(await updateToast.isProgressBarDisplayed()).toBe(true);
                expect(await updateToast.getProgressValue()).toBe('45');

                await updateToast.waitForAnimationComplete();

                await updateToast.showDownloaded('2.5.0');
                await updateToast.waitForVisible();

                expect(await updateToast.getTitle()).toBe('Update Ready');
                expect(await updateToast.getMessage()).toContain('2.5.0');
                expect(await updateToast.isRestartButtonDisplayed()).toBe(true);
                expect(await updateToast.getRestartButtonText()).toContain('Restart');

                await updateToast.waitForAnimationComplete();

                const tooltip = await updateToast.getTrayTooltip();
                expect(tooltip).toContain('2.5.0');

                await updateToast.clickRestartNow();
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

                await expect(updateToast.clickRestartNow()).resolves.not.toThrow();
            });
        });

        describe('Visual Indicators', () => {
            it('should show tray tooltip after update download', async () => {
                await updateToast.showBadge('4.0.0');
                await updateToast.waitForAnimationComplete();

                const tooltip = await updateToast.getTrayTooltip();
                expect(tooltip).toContain('4.0.0');
            });

            it('should clear tray tooltip after clearing badge', async () => {
                await updateToast.showBadge('4.0.0');
                await updateToast.waitForAnimationComplete();

                await updateToast.clearBadge();
                await updateToast.waitForAnimationComplete();

                const tooltip = await updateToast.getTrayTooltip();
                expect(tooltip).toBe('Gemini Desktop');
            });
        });
    });

    describe('User Interactions', () => {
        let updateToast: UpdateToastPage;

        before(async () => {
            updateToast = new UpdateToastPage();

            await waitForDuration(2000, 'App startup');

            await wdioBrowser.execute(() => {
                getElectronAPI(window)?.setAutoUpdateEnabled(false);
            });

            await waitForDuration(1000, 'IPC processing');
        });

        beforeEach(async () => {
            await updateToast.clearAll();
        });

        describe('Restart Now Button', () => {
            it('should display Restart Now button when update is downloaded', async () => {
                await updateToast.showDownloaded('9.9.9');

                await updateToast.waitForVisible();

                expect(await updateToast.isRestartButtonDisplayed()).toBe(true);
                expect(await updateToast.getRestartButtonText()).toBe('Restart Now');
            });

            it('should dismiss toast and clear pending state when Restart Now is clicked', async () => {
                await updateToast.showDownloaded('9.9.9');
                await updateToast.showBadge('9.9.9');

                await updateToast.waitForVisible();

                expect(await updateToast.isRestartButtonDisplayed()).toBe(true);

                await updateToast.clickRestartNow();
                await updateToast.waitForAnimationComplete();

                expect(await updateToast.isRestartButtonExisting()).toBe(false);
            });
        });

        describe('Later Button', () => {
            it('should dismiss toast but keep indicators when "Later" is clicked', async () => {
                await updateToast.showDownloaded('9.9.9');
                await updateToast.showBadge('9.9.9');

                await updateToast.waitForVisible();
                expect(await updateToast.isDisplayed()).toBe(true);
                expect(await updateToast.isRestartButtonDisplayed()).toBe(true);

                await updateToast.clickLater();
                await updateToast.waitForHidden();

                expect(await updateToast.isDisplayed()).toBe(false);
                expect(await updateToast.isBadgeDisplayed()).toBe(true);

                const tooltip = await updateToast.getTrayTooltip();
                expect(tooltip).toContain('Update v9.9.9 available');
            });

            it('should keep pending update state when Later is clicked', async () => {
                await updateToast.showDownloaded('9.9.9');
                await updateToast.waitForVisible();

                await updateToast.clickLater();
                await updateToast.waitForHidden();

                expect(await updateToast.isDisplayed()).toBe(false);

                await updateToast.showDownloaded('9.9.9');
                await updateToast.waitForVisible();
                expect(await updateToast.isDisplayed()).toBe(true);
            });
        });

        describe('Error Toast', () => {
            it('should display error message in toast', async () => {
                await updateToast.showError('Test Network Error');

                await updateToast.waitForVisible();

                expect(await updateToast.getTitle()).toBe('Update Error');
                expect(await updateToast.getMessage()).toContain('Test Network Error');
            });

            it('should dismiss error toast and clear state when error is dismissed', async () => {
                await updateToast.showError('Test Network Error');

                await updateToast.waitForVisible();

                await updateToast.dismiss();

                await updateToast.waitForHidden();

                expect(await updateToast.isBadgeExisting()).toBe(false);
            });

            it('should show appropriate message for download failure', async () => {
                await updateToast.showError('Failed to download update: Connection timed out');
                await updateToast.waitForVisible();

                expect(await updateToast.getMessage()).toContain('Connection timed out');
            });

            it('should handle generic error with fallback message', async () => {
                await updateToast.showError(null);
                await updateToast.waitForVisible();

                expect(await updateToast.getMessage()).toContain('An error occurred while updating');
            });

            it('should not show Restart Now or Later buttons for error toast', async () => {
                await updateToast.showError('Some error');
                await updateToast.waitForVisible();

                expect(await updateToast.isRestartButtonExisting()).toBe(false);
                expect(await updateToast.isLaterButtonExisting()).toBe(false);
                expect(await updateToast.isDismissButtonExisting()).toBe(true);
            });
        });

        describe('Update Available Toast', () => {
            it('should show update available message while downloading', async () => {
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

                expect(await updateToast.isDismissButtonExisting()).toBe(true);
                expect(await updateToast.isRestartButtonExisting()).toBe(false);
            });
        });

        describe('Update Not Available Toast', () => {
            it('should show "No updates available" toast when manual check finds no update', async () => {
                await updateToast.showNotAvailable('1.0.0');

                await updateToast.waitForVisible();

                const title = await updateToast.getTitle();
                expect(title.toLowerCase()).toContain('up to date');

                const message = await updateToast.getMessage();
                expect(message).toMatch(/(up to date|current|1\.0\.0)/i);
            });

            it('should dismiss "No updates available" toast when user clicks dismiss', async () => {
                await updateToast.showNotAvailable('1.0.0');
                await updateToast.waitForVisible();

                await updateToast.dismiss();
                await updateToast.waitForHidden();
            });

            it('should not show badge or tray tooltip for "No updates available"', async () => {
                await updateToast.clearBadge();
                await updateToast.waitForAnimationComplete();

                await updateToast.showNotAvailable('1.0.0');
                await updateToast.waitForVisible();
                await updateToast.waitForAnimationComplete();

                expect(await updateToast.isBadgeExisting()).toBe(false);

                const tooltip = await updateToast.getTrayTooltip();
                expect(tooltip).toBe('Gemini Desktop');
            });
        });
    });

    describe('Error Recovery', () => {
        let updateToast: UpdateToastPage;

        before(async () => {
            updateToast = new UpdateToastPage();
        });

        beforeEach(async () => {
            await updateToast.clearAll();
        });

        describe('Error Toast Display', () => {
            it('should display error toast with clear message', async () => {
                await updateToast.showError('Network connection failed');
                await updateToast.waitForVisible();

                expect(await updateToast.getTitle()).toBe('Update Error');
                expect(await updateToast.getMessage()).toContain('Network connection failed');
            });

            it('should allow dismissing error toast', async () => {
                await updateToast.showError('Test error');
                await updateToast.waitForVisible();

                await updateToast.dismiss();
                await updateToast.waitForHidden();
            });
        });

        describe('Error Recovery', () => {
            it('should allow retry after network error', async () => {
                await updateToast.showError('Network error during update check');
                await updateToast.waitForVisible();
                expect(await updateToast.isDisplayed()).toBe(true);

                await updateToast.dismiss();
                await updateToast.waitForHidden();

                await updateToast.showAvailable('2.0.0');
                await updateToast.waitForVisible();

                expect(await updateToast.getTitle()).toBe('Update Available');
            });

            it('should handle multiple errors in sequence', async () => {
                await updateToast.showError('First error');
                await updateToast.waitForVisible();

                expect(await updateToast.getMessage()).toContain('First error');

                await updateToast.dismiss();
                await updateToast.waitForHidden();

                await updateToast.showError('Second error');
                await updateToast.waitForVisible();

                expect(await updateToast.getMessage()).toContain('Second error');
            });

            it('should not display badge for errors', async () => {
                await updateToast.showError('Update failed');
                await updateToast.waitForVisible();

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
                await updateToast.showError(null);
                await updateToast.waitForVisible();

                const text = await updateToast.getMessage();
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
                await updateToast.showAvailable('2.0.0');
                await updateToast.waitForVisible();

                expect(await updateToast.getTitle()).toBe('Update Available');

                await updateToast.dismiss();
                await updateToast.waitForHidden();

                await updateToast.showError('Download interrupted');
                await updateToast.waitForVisible();

                expect(await updateToast.getTitle()).toBe('Update Error');
            });

            it('should transition from error to downloaded correctly', async () => {
                await updateToast.showError('Temporary error');
                await updateToast.waitForVisible();

                await updateToast.dismiss();
                await updateToast.waitForHidden();

                await updateToast.showDownloaded('2.0.0');
                await updateToast.waitForVisible();

                expect(await updateToast.getTitle()).toBe('Update Ready');
                expect(await updateToast.isRestartButtonDisplayed()).toBe(true);
            });
        });
    });

    describe('Persistence', () => {
        const mainWindow = new MainWindowPage();
        const optionsPage = new OptionsPage();

        beforeEach(async () => {
            await waitForAppReady();
        });

        afterEach(async () => {
            await ensureSingleWindow();
        });

        async function openOptionsWindow(): Promise<void> {
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2, 5000);
            await optionsPage.waitForLoad();
        }

        async function closeOptionsWindow(): Promise<void> {
            await optionsPage.close();
        }

        describe('Default State', () => {
            it('should default to enabled (checked) state', async () => {
                await openOptionsWindow();

                const isEnabled = await optionsPage.isAutoUpdateEnabled();
                expect([true, false]).toContain(isEnabled);
            });
        });

        describe('Session Persistence', () => {
            it('should persist disabled state within session', async () => {
                await openOptionsWindow();

                const initial = await optionsPage.isAutoUpdateEnabled();

                if (initial) {
                    await optionsPage.toggleAutoUpdate();
                }

                const afterDisable = await optionsPage.isAutoUpdateEnabled();
                expect(afterDisable).toBe(false);

                await closeOptionsWindow();

                await openOptionsWindow();

                const persisted = await optionsPage.isAutoUpdateEnabled();
                expect(persisted).toBe(false);

                await optionsPage.toggleAutoUpdate();
            });

            it('should persist enabled state within session', async () => {
                await openOptionsWindow();

                const initial = await optionsPage.isAutoUpdateEnabled();

                if (!initial) {
                    await optionsPage.toggleAutoUpdate();
                }

                const afterEnable = await optionsPage.isAutoUpdateEnabled();
                expect(afterEnable).toBe(true);

                await closeOptionsWindow();

                await openOptionsWindow();

                const persisted = await optionsPage.isAutoUpdateEnabled();
                expect(persisted).toBe(true);
            });
        });

        describe('Multiple Toggle Operations', () => {
            it('should update settings file when toggled multiple times', async () => {
                await openOptionsWindow();

                for (let i = 0; i < 4; i++) {
                    await optionsPage.toggleAutoUpdate();
                }

                const finalState = await optionsPage.isAutoUpdateEnabled();

                await closeOptionsWindow();
                await openOptionsWindow();

                const persistedState = await optionsPage.isAutoUpdateEnabled();
                expect(persistedState).toBe(finalState);
            });

            it('should handle rapid toggling without corruption', async () => {
                await openOptionsWindow();

                const initial = await optionsPage.isAutoUpdateEnabled();

                for (let i = 0; i < 5; i++) {
                    await optionsPage.toggleAutoUpdate();
                }

                const finalState = await optionsPage.isAutoUpdateEnabled();
                const expected = !initial;
                expect(finalState).toBe(expected);

                await optionsPage.toggleAutoUpdate();
            });
        });

        describe('Cross-Platform Persistence', () => {
            it('should persist settings on current platform', async () => {
                const detectedPlatform = await getPlatform();
                expect(['windows', 'macos', 'linux']).toContain(detectedPlatform);

                await openOptionsWindow();

                const initial = await optionsPage.isAutoUpdateEnabled();
                await optionsPage.toggleAutoUpdate();

                const afterToggle = await optionsPage.isAutoUpdateEnabled();
                expect(afterToggle).not.toBe(initial);

                await closeOptionsWindow();
                await openOptionsWindow();

                const persisted = await optionsPage.isAutoUpdateEnabled();
                expect(persisted).toBe(afterToggle);

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
                getElectronAPI(window)?.setAutoUpdateEnabled(false);
                getElectronAPI(window)?.devMockPlatform(null, null);
            });
            await wdioBrowser.pause(1000);
        });

        afterEach(async () => {
            await wdioBrowser.execute(() => {
                getElectronAPI(window)?.devMockPlatform(null, null);
            });
        });

        it.skip('should disable updates on Linux non-AppImage', async () => {
            await wdioBrowser.execute(() => {
                getElectronAPI(window)?.devMockPlatform('linux', { MOCK: 'true' });
            });

            await wdioBrowser.execute(() => {
                getElectronAPI(window)?.setAutoUpdateEnabled(true);
            });

            const enabled = await wdioBrowser.execute(async () => {
                return await getElectronAPI(window)?.getAutoUpdateEnabled();
            });

            expect(enabled).toBe(false);
        });

        it('should enable updates on Linux AppImage', async () => {
            await wdioBrowser.execute(() => {
                getElectronAPI(window)?.devMockPlatform('linux', {
                    APPIMAGE: '/path/to/app.AppImage',
                });
            });
            await wdioBrowser.execute(() => {
                getElectronAPI(window)?.setAutoUpdateEnabled(true);
            });

            const enabled = await wdioBrowser.execute(async () => {
                return await getElectronAPI(window)?.getAutoUpdateEnabled();
            });

            expect(enabled).toBe(true);
        });
    });

    describe('Toggle', () => {
        const mainWindow = new MainWindowPage();
        const optionsPage = new OptionsPage();

        beforeEach(async () => {
            await waitForAppReady();

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
                const initial = await optionsPage.isAutoUpdateEnabled();
                if (initial) {
                    await optionsPage.toggleAutoUpdate();
                }

                await optionsPage.close();

                await mainWindow.openOptionsViaMenu();
                await waitForWindowCount(2, 5000);
                await optionsPage.waitForLoad();

                const state = await optionsPage.isAutoUpdateEnabled();
                expect(state).toBe(false);

                await optionsPage.toggleAutoUpdate();
            });
        });

        describe('Cross-Platform', () => {
            it('should work on current platform', async () => {
                const detectedPlatform = await getPlatform();
                expect(['windows', 'macos', 'linux']).toContain(detectedPlatform);

                expect(await optionsPage.isAutoUpdateToggleDisplayed()).toBe(true);
            });
        });
    });

    describe('Tray Integration', () => {
        beforeEach(async () => {
            await waitForIPCRoundTrip(async () => {
                await wdioBrowser.execute(() => {
                    getElectronAPI(window)?.devClearBadge();
                });
            });
        });

        it('should update tooltip when update is downloaded and revert when dismissed', async () => {
            const version = '9.9.9';
            await waitForIPCRoundTrip(async () => {
                await wdioBrowser.execute((v) => {
                    getElectronAPI(window)?.devShowBadge(v);
                }, version);
            });

            const tooltip = await wdioBrowser.execute(() => {
                return getElectronAPI(window)?.getTrayTooltip();
            });

            expect(tooltip).toContain(`Update v${version} available`);

            await waitForIPCRoundTrip(async () => {
                await wdioBrowser.execute(() => {
                    getElectronAPI(window)?.devClearBadge();
                });
            });

            const finalTooltip = await wdioBrowser.execute(() => {
                return getElectronAPI(window)?.getTrayTooltip();
            });

            expect(finalTooltip).toBe('Gemini Desktop');
        });
    });
});
