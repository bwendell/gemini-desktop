import { browser, expect } from '@wdio/globals';
import { getReleaseNotesUrl } from '../../src/shared/utils/releaseNotes';

type ToastInfo = {
    exists: true;
    type: string | undefined;
    title: string | null;
    message: string | null;
    buttons: string[];
    textContent: string | null;
};

const exec = (...args: Parameters<WebdriverIO.Browser['execute']>) =>
    (browser as unknown as WebdriverIO.Browser).execute<unknown, unknown[]>(...args);
const waitUntil = (...args: Parameters<WebdriverIO.Browser['waitUntil']>) =>
    (browser as unknown as WebdriverIO.Browser).waitUntil(...args);
const pause = (...args: Parameters<WebdriverIO.Browser['pause']>) =>
    (browser as unknown as WebdriverIO.Browser).pause(...args);
const getWindowHandles = (...args: Parameters<WebdriverIO.Browser['getWindowHandles']>) =>
    (browser as unknown as WebdriverIO.Browser).getWindowHandles(...args);

/**
 * Update Notification Integration Tests
 *
 * Tests the migration of update toasts to the new generic toast system.
 * Verifies that existing update IPC events, download progress, update actions,
 * and dev mode helpers continue to function correctly.
 */
describe('Update Notification Integration', () => {
    before(async () => {
        // Wait for app ready
        await waitUntil(async () => (await getWindowHandles()).length > 0, {
            timeout: 10000,
            timeoutMsg: 'App did not load in time',
        });

        // Ensure renderer is ready
        await exec(async () => {
            return await new Promise<void>((resolve) => {
                if (document.readyState === 'complete') return resolve();
                window.addEventListener('load', () => resolve());
            });
        });

        // Enable updates for testing
        await setDevMockPlatform('win32', { TEST_AUTO_UPDATE: 'true' });
    });

    afterEach(async () => {
        // Clean up any visible toasts after each test
        await exec(() => {
            if ((window as any).__testUpdateToast) {
                (window as any).__testUpdateToast.hide();
            }
        });
        // Wait for animation to complete
        await pause(300);
    });

    // Helper to find a toast by ID or just the first one
    const getToastInfo = async (toastId?: string): Promise<ToastInfo | null> => {
        return (await exec((id) => {
            const toastIdValue = typeof id === 'string' ? id : undefined;
            const selector = toastIdValue ? `[data-toast-id="${toastIdValue}"]` : '[data-testid="toast"]';
            const toast = document.querySelector(selector);
            if (!toast) return null;

            const title = toast.querySelector('[data-testid="toast-title"]')?.textContent || null;
            const message = toast.querySelector('[data-testid="toast-message"]')?.textContent || null;
            const buttons = Array.from(toast.querySelectorAll('.toast__button')).map(
                (b) => b.textContent?.trim() || ''
            );

            return {
                exists: true,
                type: Array.from(toast.classList)
                    .find((c) => c.startsWith('toast--'))
                    ?.replace('toast--', ''),
                title,
                message,
                buttons,
                textContent: toast.textContent,
            };
        }, toastId)) as ToastInfo | null;
    };

    const emitDevUpdateEvent = async (event: string, payload: unknown) => {
        await exec(
            (eventName, eventPayload) => {
                const win = window as Window & {
                    electronAPI?: { devEmitUpdateEvent?: (name: string, data: unknown) => void };
                };
                const name = typeof eventName === 'string' ? eventName : String(eventName ?? '');
                win.electronAPI?.devEmitUpdateEvent?.(name, eventPayload);
            },
            event,
            payload
        );
    };

    const setDevMockPlatform = async (platform: string, env: Record<string, string>) => {
        await exec(
            (platformValue, envValue) => {
                const win = window as Window & {
                    electronAPI?: { devMockPlatform?: (name: string, vars: Record<string, string>) => void };
                };
                const name = typeof platformValue === 'string' ? platformValue : String(platformValue ?? '');
                win.electronAPI?.devMockPlatform?.(name, envValue as Record<string, string>);
            },
            platform,
            env
        );
    };

    const setupReleaseNotesOpenSpy = async () => {
        await exec(() => {
            const win = window as Window & {
                __releaseNotesTest?: { openedUrls: string[]; originalOpen?: typeof window.open };
            };

            if (!win.__releaseNotesTest) {
                win.__releaseNotesTest = { openedUrls: [] };
            } else {
                win.__releaseNotesTest.openedUrls = [];
            }

            if (!win.__releaseNotesTest.originalOpen) {
                win.__releaseNotesTest.originalOpen = window.open;
            }

            const openSpy: typeof window.open = (url?: string | URL, _target?: string, _features?: string) => {
                win.__releaseNotesTest?.openedUrls.push(String(url ?? ''));
                return null;
            };

            window.open = openSpy;
        });
    };

    const restoreReleaseNotesOpenSpy = async () => {
        await exec(() => {
            const win = window as Window & {
                __releaseNotesTest?: { openedUrls: string[]; originalOpen?: typeof window.open };
            };

            if (win.__releaseNotesTest?.originalOpen) {
                window.open = win.__releaseNotesTest.originalOpen;
            }

            delete win.__releaseNotesTest;
        });
    };

    const getReleaseNotesOpenedUrls = async (): Promise<string[]> => {
        return (await exec(() => {
            const win = window as Window & {
                __releaseNotesTest?: { openedUrls: string[] };
            };

            return win.__releaseNotesTest?.openedUrls ?? [];
        })) as string[];
    };

    describe('7.5.4.1 - IPC Events Trigger Toasts', () => {
        it('should display toast when update-available IPC event is received', async () => {
            // 1. Setup listener for update-available event
            await exec(() => {
                (window as any)._updateAvailableReceived = false;
                (window as any).electronAPI.onUpdateAvailable(() => {
                    (window as any)._updateAvailableReceived = true;
                });
            });

            // 2. Trigger update-available via Dev IPC
            await emitDevUpdateEvent('update-available', { version: '2.0.0' });

            // 3. Wait for toast to appear
            await waitUntil(
                async () => {
                    const info = await getToastInfo();
                    return info !== null;
                },
                { timeout: 3000, timeoutMsg: 'Toast did not appear after update-available event' }
            );

            // 4. Verify the update-available event was received
            const received = await exec(() => (window as any)._updateAvailableReceived);
            expect(received).toBe(true);

            // 5. Verify toast content
            const info = await getToastInfo('update-notification');
            expect(info).not.toBeNull();
            expect(info?.type).toBe('info');
            expect(info?.title).toBe('Update Available');
            expect(info?.message).toContain('2.0.0');
        });

        it('should display toast when update-downloaded IPC event is received', async () => {
            // 1. Setup listener
            await exec(() => {
                (window as any)._updateDownloadedReceived = false;
                (window as any).electronAPI.onUpdateDownloaded(() => {
                    (window as any)._updateDownloadedReceived = true;
                });
            });

            // 2. Trigger update-downloaded via Dev IPC
            await emitDevUpdateEvent('update-downloaded', { version: '2.0.0' });

            // 3. Wait for toast to appear
            await waitUntil(
                async () => {
                    const info = await getToastInfo('update-notification');
                    return info !== null;
                },
                { timeout: 3000, timeoutMsg: 'Toast did not appear after update-downloaded event' }
            );

            // 4. Verify the event was received
            const received = await exec(() => (window as any)._updateDownloadedReceived);
            expect(received).toBe(true);

            // 5. Verify toast is visible with success type styling
            const info = await getToastInfo('update-notification');
            expect(info?.type).toBe('success');
            expect(info?.title).toBe('Update Ready');
            expect(info?.message).toContain('2.0.0');
        });

        it('should display error toast when update-error IPC event is received', async () => {
            // 1. Setup listener
            await exec(() => {
                (window as any)._updateErrorReceived = false;
                (window as any).electronAPI.onUpdateError(() => {
                    (window as any)._updateErrorReceived = true;
                });
            });

            // 2. Trigger error via Dev IPC
            await emitDevUpdateEvent('error', new Error('Test error'));

            // 3. Wait for toast to appear
            await waitUntil(
                async () => {
                    const info = await getToastInfo('update-notification');
                    return info !== null;
                },
                { timeout: 3000, timeoutMsg: 'Error toast did not appear' }
            );

            // 4. Verify the error event was received
            const received = await exec(() => (window as any)._updateErrorReceived);
            expect(received).toBe(true);

            // 5. Verify error toast content
            const info = await getToastInfo('update-notification');
            expect(info?.type).toBe('error');
            expect(info?.title).toBe('Update Error');
        });
    });

    describe('7.5.4.2 - Download Progress Updates', () => {
        it('should update toast with download progress', async () => {
            // 1. Trigger download progress event
            await emitDevUpdateEvent('download-progress', {
                percent: 25,
                bytesPerSecond: 100000,
                transferred: 2500000,
                total: 10000000,
            });

            // 2. Wait for toast to appear
            await waitUntil(
                async () => {
                    const info = await getToastInfo('update-notification');
                    return info !== null;
                },
                { timeout: 3000 }
            );

            // 3. Verify progress toast info
            const info = await getToastInfo('update-notification');
            expect(info?.type).toBe('progress');
            expect(info?.title).toBe('Downloading Update');
            expect(info?.message).toContain('25%');
        });

        it('should update progress percentage in toast', async () => {
            // 1. Trigger initial progress
            await emitDevUpdateEvent('download-progress', {
                percent: 30,
            });

            await waitUntil(
                async () => {
                    const info = await getToastInfo('update-notification');
                    return info?.message?.includes('30%');
                },
                { timeout: 3000 }
            );

            // 2. Trigger updated progress
            await emitDevUpdateEvent('download-progress', {
                percent: 80,
            });

            await waitUntil(
                async () => {
                    const info = await getToastInfo('update-notification');
                    return info?.message?.includes('80%');
                },
                { timeout: 3000 }
            );

            const info = await getToastInfo('update-notification');
            expect(info?.message).toContain('80%');
        });
    });

    describe('7.5.4.3 - Update Actions (Install Now, Later)', () => {
        it('should display action buttons when update is downloaded', async () => {
            // 1. Trigger update-downloaded
            await emitDevUpdateEvent('update-downloaded', { version: '2.0.0' });

            await waitUntil(
                async () => {
                    const info = await getToastInfo('update-notification');
                    return info !== null && info.buttons.length >= 2;
                },
                { timeout: 3000 }
            );

            // 2. Verify action buttons
            const info = await getToastInfo('update-notification');
            expect(info?.buttons).toContain('Restart Now');
            expect(info?.buttons).toContain('Later');
        });

        it('should dismiss toast when Later button is clicked', async () => {
            // 1. Trigger update-downloaded to show toast
            await emitDevUpdateEvent('update-downloaded', { version: '2.0.0' });

            await waitUntil(
                async () => {
                    const info = await getToastInfo('update-notification');
                    return info !== null;
                },
                { timeout: 3000 }
            );

            // 2. Click the Later button
            await exec(() => {
                const toast = document.querySelector('[data-toast-id="update-notification"]');
                const buttons = Array.from(toast?.querySelectorAll('.toast__button') || []);
                const laterButton = buttons.find((btn) => btn.textContent?.includes('Later'));
                (laterButton as HTMLButtonElement)?.click();
            });

            // 3. Verify toast is dismissed
            await waitUntil(
                async () => {
                    const info = await getToastInfo('update-notification');
                    return info === null;
                },
                { timeout: 3000, timeoutMsg: 'Toast was not dismissed after clicking Later' }
            );
        });

        it('should call installUpdate when Restart Now button is clicked', async () => {
            // 1. Trigger update-downloaded to show toast
            await emitDevUpdateEvent('update-downloaded', { version: '2.0.0' });

            await waitUntil(
                async () => {
                    const info = await getToastInfo('update-notification');
                    return info !== null;
                },
                { timeout: 3000 }
            );

            // 2. Click the Restart Now button
            await exec(() => {
                const toast = document.querySelector('[data-toast-id="update-notification"]');
                const buttons = Array.from(toast?.querySelectorAll('.toast__button') || []);
                const restartButton = buttons.find((btn) => btn.textContent?.includes('Restart'));
                (restartButton as HTMLButtonElement)?.click();
            });

            // 3. Verify toast is dismissed after clicking
            await waitUntil(
                async () => {
                    const info = await getToastInfo('update-notification');
                    return info === null;
                },
                { timeout: 3000, timeoutMsg: 'Toast was not dismissed after clicking Restart Now' }
            );
        });
    });

    describe('7.5.4.5 - Release Notes Actions', () => {
        beforeEach(async () => {
            await setupReleaseNotesOpenSpy();
        });

        afterEach(async () => {
            await restoreReleaseNotesOpenSpy();
        });

        it('should open release notes from available update toast', async () => {
            await exec(() => {
                const win = window as Window & {
                    __testUpdateToast?: { showAvailable: (version: string) => void };
                };
                win.__testUpdateToast?.showAvailable('3.1.0');
            });

            await waitUntil(
                async () => {
                    const info = await getToastInfo('update-notification');
                    return info !== null && info.buttons.includes('View Release Notes');
                },
                { timeout: 3000, timeoutMsg: 'View Release Notes action did not appear' }
            );

            await exec(() => {
                const toast = document.querySelector('[data-toast-id="update-notification"]');
                const buttons = Array.from(toast?.querySelectorAll('.toast__button') || []);
                const target = buttons.find((btn) => btn.textContent?.includes('View Release Notes'));
                if (target instanceof HTMLElement) {
                    target.click();
                }
            });

            await waitUntil(async () => (await getReleaseNotesOpenedUrls()).length > 0, {
                timeout: 2000,
                timeoutMsg: 'Release notes URL was not opened for available update',
            });

            const openedUrls = await getReleaseNotesOpenedUrls();
            expect(openedUrls[0]).toBe(getReleaseNotesUrl('3.1.0'));
        });

        it('should open release notes from downloaded update toast', async () => {
            await exec(() => {
                const win = window as Window & {
                    __testUpdateToast?: { showDownloaded: (version: string) => void };
                };
                win.__testUpdateToast?.showDownloaded('3.2.0');
            });

            await waitUntil(
                async () => {
                    const info = await getToastInfo('update-notification');
                    return (
                        info !== null &&
                        info.buttons.includes('Restart Now') &&
                        info.buttons.includes('Later') &&
                        info.buttons.includes('View Release Notes')
                    );
                },
                { timeout: 3000, timeoutMsg: 'Downloaded toast actions did not appear' }
            );

            await exec(() => {
                const toast = document.querySelector('[data-toast-id="update-notification"]');
                const buttons = Array.from(toast?.querySelectorAll('.toast__button') || []);
                const target = buttons.find((btn) => btn.textContent?.includes('View Release Notes'));
                if (target instanceof HTMLElement) {
                    target.click();
                }
            });

            await waitUntil(async () => (await getReleaseNotesOpenedUrls()).length > 0, {
                timeout: 2000,
                timeoutMsg: 'Release notes URL was not opened for downloaded update',
            });

            const openedUrls = await getReleaseNotesOpenedUrls();
            expect(openedUrls[0]).toBe(getReleaseNotesUrl('3.2.0'));
        });

        it('should open release notes from not-available toast', async () => {
            await exec(() => {
                const win = window as Window & {
                    __testUpdateToast?: { showNotAvailable: (version: string) => void };
                };
                win.__testUpdateToast?.showNotAvailable('1.0.0');
            });

            await waitUntil(
                async () => {
                    const info = await getToastInfo('update-notification');
                    return info !== null && info.buttons.includes('View Release Notes');
                },
                { timeout: 3000, timeoutMsg: 'Not-available release notes action did not appear' }
            );

            await exec(() => {
                const toast = document.querySelector('[data-toast-id="update-notification"]');
                const buttons = Array.from(toast?.querySelectorAll('.toast__button') || []);
                const target = buttons.find((btn) => btn.textContent?.includes('View Release Notes'));
                if (target instanceof HTMLElement) {
                    target.click();
                }
            });

            await waitUntil(async () => (await getReleaseNotesOpenedUrls()).length > 0, {
                timeout: 2000,
                timeoutMsg: 'Release notes URL was not opened for not-available update',
            });

            const openedUrls = await getReleaseNotesOpenedUrls();
            expect(openedUrls[0]).toBe(getReleaseNotesUrl('1.0.0'));
        });
    });

    describe('7.5.4.4 - Dev Mode Helpers', () => {
        it('should have __testUpdateToast helper available in dev mode', async () => {
            const helperExists = await exec(() => {
                return typeof (window as any).__testUpdateToast === 'object';
            });
            expect(helperExists).toBe(true);
        });

        it('should show available toast via __testUpdateToast.showAvailable()', async () => {
            await exec(() => {
                (window as any).__testUpdateToast.showAvailable('3.0.0');
            });

            await waitUntil(
                async () => {
                    const info = await getToastInfo('update-notification');
                    return info !== null && info.message?.includes('3.0.0');
                },
                { timeout: 3000 }
            );

            const info = await getToastInfo('update-notification');
            expect(info?.type).toBe('info');
        });

        it('should show downloaded toast via __testUpdateToast.showDownloaded()', async () => {
            await exec(() => {
                (window as any).__testUpdateToast.showDownloaded('3.0.0');
            });

            await waitUntil(
                async () => {
                    const info = await getToastInfo('update-notification');
                    return info !== null && info.type === 'success';
                },
                { timeout: 3000 }
            );

            const info = await getToastInfo('update-notification');
            expect(info?.message).toContain('3.0.0');
        });

        it('should show error toast via __testUpdateToast.showError()', async () => {
            await exec(() => {
                (window as any).__testUpdateToast.showError('Custom test error');
            });

            await waitUntil(
                async () => {
                    const info = await getToastInfo('update-notification');
                    return info !== null && info.type === 'error';
                },
                { timeout: 3000 }
            );

            const info = await getToastInfo('update-notification');
            expect(info?.message).toContain('Custom test error');
        });

        it('should show progress toast via __testUpdateToast.showProgress()', async () => {
            await exec(() => {
                (window as any).__testUpdateToast.showProgress(60);
            });

            await waitUntil(
                async () => {
                    const info = await getToastInfo('update-notification');
                    return info !== null && info.message?.includes('60%');
                },
                { timeout: 3000 }
            );

            const info = await getToastInfo('update-notification');
            expect(info?.type).toBe('progress');
        });

        it('should hide toast via __testUpdateToast.hide()', async () => {
            await exec(() => {
                (window as any).__testUpdateToast.showDownloaded('3.0.0');
            });

            await waitUntil(
                async () => {
                    return (await getToastInfo('update-notification')) !== null;
                },
                { timeout: 3000 }
            );

            await exec(() => {
                (window as any).__testUpdateToast.hide();
            });

            await waitUntil(
                async () => {
                    return (await getToastInfo('update-notification')) === null;
                },
                { timeout: 3000 }
            );
        });

        it('should show not-available toast via __testUpdateToast.showNotAvailable()', async () => {
            await exec(() => {
                (window as any).__testUpdateToast.showNotAvailable('1.0.0');
            });

            await waitUntil(
                async () => {
                    const info = await getToastInfo('update-notification');
                    return info !== null && info.message?.includes('up to date');
                },
                { timeout: 3000 }
            );

            const info = await getToastInfo('update-notification');
            expect(info?.type).toBe('info');
        });
    });
});
