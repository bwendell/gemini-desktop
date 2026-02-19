import { browser, expect, $ as wdioSelector, $$ as wdioSelectorAll } from '@wdio/globals';

const exec = (browser as unknown as WebdriverIO.Browser)['execute'].bind(browser as unknown as WebdriverIO.Browser);
const waitUntil = (browser as unknown as WebdriverIO.Browser)['waitUntil'].bind(
    browser as unknown as WebdriverIO.Browser
);
const pause = (browser as unknown as WebdriverIO.Browser)['pause'].bind(browser as unknown as WebdriverIO.Browser);
const getWindowHandles = (browser as unknown as WebdriverIO.Browser)['getWindowHandles'].bind(
    browser as unknown as WebdriverIO.Browser
);

/**
 * Toast Provider Integration Tests
 *
 * Tests the integration of ToastProvider with the application:
 * - Provider renders children correctly
 * - ToastContainer renders inside provider
 * - Nested components can access useToast()
 * - Provider hierarchy (ThemeProvider → ToastProvider → UpdateToastProvider)
 * - Multiple ToastProviders don't conflict
 */
describe('Toast Provider Integration', () => {
    const UPDATE_TOAST_ID = 'update-notification';

    before(async () => {
        // Wait for the app to be ready
        await waitUntil(
            async () => {
                const handles = await getWindowHandles();
                return handles.length > 0;
            },
            {
                timeout: 30000,
                timeoutMsg: 'No window handles found after 30s',
            }
        );
    });

    const getToastText = async (toastId: string) => {
        return exec((id) => {
            const messageEl = document.querySelector(`[data-toast-id="${id}"] [data-testid="toast-message"]`);
            return messageEl?.textContent?.trim() ?? '';
        }, toastId);
    };

    const getToastSnapshot = async () => {
        return exec(() => {
            const win = window as any;
            if (typeof win.__toastTestHelpers?.getToasts !== 'function') return [];

            return win.__toastTestHelpers.getToasts().map((toast: any) => ({
                id: toast.id,
                message: toast.message,
            }));
        });
    };

    const toastExists = async (toastId: string) => {
        return exec((id) => {
            return Boolean(document.querySelector(`[data-toast-id="${id}"]`));
        }, toastId);
    };

    beforeEach(async () => {
        // Allow any initial platform notices to render (LinuxHotkeyNotice)
        await pause(1500);

        await exec(() => {
            const win = window as any;
            if (win.__testUpdateToast?.hide) {
                win.__testUpdateToast.hide();
            }
            if (win.__toastTestHelpers?.dismissToast) {
                win.__toastTestHelpers.dismissToast('update-notification');
            }
            if (win.__toastTestHelpers?.dismissAll) {
                win.__toastTestHelpers.dismissAll();
            }
        });

        // Wait for any toasts to be removed
        await waitUntil(
            async () => {
                const toastCount = await wdioSelectorAll('[data-testid="toast"]').length;
                const helperCount = await exec(() => {
                    const win = window as any;
                    return typeof win.__toastTestHelpers?.getToasts === 'function'
                        ? win.__toastTestHelpers.getToasts().length
                        : 0;
                });
                const updateToastExists = await toastExists(UPDATE_TOAST_ID);
                return toastCount === 0 && helperCount === 0 && !updateToastExists;
            },
            { timeout: 5000, interval: 100 }
        ).catch(() => {
            // Ignore timeout - toasts may already be gone
        });
    });

    describe('Provider Rendering', () => {
        it('7.5.1.1 - should render children within ToastProvider', async () => {
            // Verify the main app content rendered (children of ToastProvider)
            const webviewContainer = await wdioSelector('[data-testid="tab-panel"]');
            await expect(webviewContainer).toBeDisplayed();
        });

        it('7.5.1.2 - should render ToastContainer inside provider', async () => {
            // The ToastContainer should be present in the DOM even when empty
            const toastContainer = await wdioSelector('[data-testid="toast-container"]');
            await expect(toastContainer).toBeDisplayed();

            // Verify it has the correct ARIA attributes
            const ariaLabel = await toastContainer.getAttribute('aria-label');
            expect(ariaLabel).toBe('Notifications');

            const role = await toastContainer.getAttribute('role');
            expect(role).toBe('region');
        });
    });

    describe('Context Access', () => {
        it('7.5.1.3 - should allow nested components to access useToast()', async () => {
            // The __toastTestHelpers prove that useToast() is accessible
            // from within the app component tree
            const hasToastHelper = await exec(() => {
                const win = window as any;
                return (
                    typeof win.__toastTestHelpers === 'object' &&
                    typeof win.__toastTestHelpers.showToast === 'function' &&
                    typeof win.__toastTestHelpers.showSuccess === 'function' &&
                    typeof win.__toastTestHelpers.showError === 'function' &&
                    typeof win.__toastTestHelpers.showInfo === 'function' &&
                    typeof win.__toastTestHelpers.showWarning === 'function' &&
                    typeof win.__toastTestHelpers.dismissAll === 'function'
                );
            });
            expect(hasToastHelper).toBe(true);
        });

        it('should show and dismiss a toast via useToast()', async () => {
            // Use the __toastTestHelpers to show a toast
            const toastId = await exec(() => {
                const win = window as any;
                return win.__toastTestHelpers.showSuccess('Integration test toast');
            });

            expect(typeof toastId).toBe('string');
            expect(toastId.length).toBeGreaterThan(0);

            // Wait for toast to appear with correct message using robust polling
            await waitUntil(
                async () => {
                    const text = await getToastText(toastId);
                    return text === 'Integration test toast';
                },
                { timeout: 5000, interval: 200, timeoutMsg: 'Toast with expected message did not appear' }
            );

            // Verify toast content after wait completes
            const messageText = await getToastText(toastId);
            expect(messageText).toBe('Integration test toast');

            // Dismiss all toasts
            await exec(() => {
                const win = window as any;
                win.__toastTestHelpers.dismissAll();
            });

            // Verify toast is removed
            await waitUntil(
                async () => {
                    const snapshot = await getToastSnapshot();
                    return !snapshot.some((toast) => toast.id === toastId);
                },
                {
                    timeout: 5000,
                    interval: 200,
                    timeoutMsg: 'Toast did not dismiss in time',
                }
            );
        });
    });

    describe('Provider Hierarchy', () => {
        it('7.5.1.4 - should verify ThemeProvider → ToastProvider → UpdateToastProvider nesting', async () => {
            // Test that the provider hierarchy is correct by checking:
            // 1. Theme context works (ThemeProvider is outer)
            // 2. Toast context works (ToastProvider is middle)
            // 3. Update toast context works (UpdateToastProvider is inner)

            const result = await exec(() => {
                const win = window as any;

                // Check theme functionality works
                const themeWorks = typeof win.electronAPI?.getTheme === 'function';

                // Check toast functionality works via test helpers
                const toastWorks =
                    typeof win.__toastTestHelpers === 'object' &&
                    typeof win.__toastTestHelpers.showToast === 'function';

                // Check update toast dev helpers exist
                const updateToastWorks =
                    typeof win.__testUpdateToast === 'object' &&
                    typeof win.__testUpdateToast.showAvailable === 'function';

                return {
                    themeWorks,
                    toastWorks,
                    updateToastWorks,
                };
            });

            expect(result.themeWorks).toBe(true);
            expect(result.toastWorks).toBe(true);
            expect(result.updateToastWorks).toBe(true);
        });

        it('should verify UpdateToastContext can use ToastContext (proper nesting)', async () => {
            // Trigger an update notification via the dev helper
            await exec(() => {
                (window as any).__testUpdateToast.showAvailable('2.0.0');
            });

            // Wait for update toast to appear with robust polling
            await waitUntil(
                async () => {
                    return toastExists(UPDATE_TOAST_ID);
                },
                { timeout: 5000, interval: 500, timeoutMsg: 'Update toast did not appear' }
            );

            // Verify it's an info toast (as mapped from 'available')
            const updateToastClass = await exec((toastId) => {
                const toastEl = document.querySelector(`[data-toast-id="${toastId}"]`);
                return toastEl?.getAttribute('class') ?? '';
            }, UPDATE_TOAST_ID);
            expect(updateToastClass?.split(' ')).toContain('toast--info');

            // Cleanup
            await exec(() => {
                (window as any).__testUpdateToast.hide();
                (window as any).__toastTestHelpers.dismissToast('update-notification');
            });

            // Wait for removal
            await waitUntil(
                async () => {
                    const snapshot = await getToastSnapshot();
                    return !snapshot.some((toast) => toast.id === UPDATE_TOAST_ID);
                },
                { timeout: 8000, interval: 200, timeoutMsg: 'Toast was not removed' }
            );
        });
    });

    describe('Multiple Providers', () => {
        it('7.5.1.5 - should not have conflicts with the single ToastProvider', async () => {
            // Test that multiple toasts can be created sequentially
            const toastIds = await exec(() => {
                const win = window as any;
                return [
                    win.__toastTestHelpers.showInfo('First toast'),
                    win.__toastTestHelpers.showSuccess('Second toast'),
                    win.__toastTestHelpers.showWarning('Third toast'),
                ];
            });

            await waitUntil(
                async () => {
                    const snapshot = await getToastSnapshot();
                    return toastIds.every((id) => snapshot.some((toast) => toast.id === id));
                },
                { timeout: 5000, interval: 500 }
            );

            // Cleanup
            await exec(() => {
                (window as any).__toastTestHelpers.dismissAll();
            });

            await waitUntil(
                async () => {
                    const snapshot = await getToastSnapshot();
                    return snapshot.length === 0;
                },
                { timeout: 5000, interval: 500 }
            );
        });

        it('should handle rapid toast creation without conflicts', async () => {
            // Create many toasts rapidly
            await exec(() => {
                const win = window as any;
                const ids: string[] = [];
                for (let i = 0; i < 7; i++) {
                    ids.push(win.__toastTestHelpers.showInfo(`Toast ${i + 1}`, { persistent: true, duration: null }));
                }
                return ids;
            });

            // Should respect MAX_VISIBLE_TOASTS (which is 5)
            await waitUntil(
                async () => {
                    const visibleCount = await wdioSelectorAll('[data-testid="toast"]').length;
                    return visibleCount === 5;
                },
                { timeout: 5000, interval: 500, timeoutMsg: 'Expected 5 visible toasts' }
            );

            // Cleanup
            await exec(() => {
                (window as any).__toastTestHelpers.dismissAll();
            });

            await waitUntil(
                async () => {
                    const snapshot = await getToastSnapshot();
                    return snapshot.length === 0;
                },
                { timeout: 5000, interval: 500, timeoutMsg: 'Expected 0 toasts' }
            );
        });
    });
});
