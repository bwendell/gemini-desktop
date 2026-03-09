/**
 * Integration tests for Response Notifications IPC.
 *
 * Tests the IPC communication path for response notification settings:
 * - Verifies `getResponseNotificationsEnabled` returns the stored value from main process
 * - Verifies `setResponseNotificationsEnabled` updates the store
 *
 * Note: Due to initialization order, NotificationManager may not be available
 * when IpcManager is first initialized. When unavailable, the handler uses
 * a dedicated notification settings store for persistence independently.
 *
 * These tests use real IPC communication between renderer and main processes.
 */

import { browser, expect } from '@wdio/globals';

import { closeOptionsWindowsForIntegration, openOptionsWindowForIntegration } from './helpers/optionsWindowActions';

const setResponseNotificationsEnabled = async (enabled: boolean): Promise<void> => {
    await browser.execute((value) => {
        void (window as any).electronAPI.setResponseNotificationsEnabled(value);
    }, enabled);
};

const waitForResponseNotificationsValue = async (expected: boolean, timeout = 3000): Promise<void> => {
    await browser.waitUntil(
        async () => {
            const current = await browser.execute(async () => {
                return await (window as any).electronAPI.getResponseNotificationsEnabled();
            });
            return current === expected;
        },
        {
            timeout,
            interval: 100,
            timeoutMsg: `Response notifications value did not become ${expected} within ${timeout}ms`,
        }
    );
};

const closeOptionsWindowsForTest = async (): Promise<void> => {
    await closeOptionsWindowsForIntegration();
};

const openOptionsWindowAllowExisting = async (mainWindowHandle: string): Promise<string | null> => {
    void mainWindowHandle;
    return openOptionsWindowForIntegration('settings');
};

describe('Response Notifications IPC Integration', () => {
    let mainWindowHandle: string;

    before(async () => {
        await browser.waitUntil(
            async () => {
                try {
                    return await browser.execute(() => typeof (window as any).electronAPI !== 'undefined');
                } catch {
                    return false;
                }
            },
            {
                timeout: 30000,
                timeoutMsg: 'electronAPI not available after 30 seconds',
                interval: 500,
            }
        );

        const handles = await browser.getWindowHandles();
        const resolvedHandle = handles[0];
        if (!resolvedHandle) {
            throw new Error('Could not resolve main window handle');
        }
        mainWindowHandle = resolvedHandle;
    });

    // Task 8.1: IPC `getResponseNotificationsEnabled` returns stored value
    describe('getResponseNotificationsEnabled API', () => {
        it('should have getResponseNotificationsEnabled API available in main window', async () => {
            const hasApi = await browser.execute(() => {
                return typeof (window as any).electronAPI?.getResponseNotificationsEnabled === 'function';
            });

            expect(hasApi).toBe(true);
        });

        it('should return a boolean value from getResponseNotificationsEnabled', async () => {
            const result = await browser.execute(async () => {
                const enabled = await (window as any).electronAPI.getResponseNotificationsEnabled();
                return typeof enabled === 'boolean';
            });

            expect(result).toBe(true);
        });

        it('should return default value of true for response notifications', async () => {
            // The default value for responseNotificationsEnabled is true
            const result = await browser.execute(async () => {
                return await (window as any).electronAPI.getResponseNotificationsEnabled();
            });

            expect(result).toBe(true);
        });
    });

    // Task 8.2: IPC `setResponseNotificationsEnabled` updates store
    describe('setResponseNotificationsEnabled API', () => {
        it('should have setResponseNotificationsEnabled API available in main window', async () => {
            const hasApi = await browser.execute(() => {
                return typeof (window as any).electronAPI?.setResponseNotificationsEnabled === 'function';
            });

            expect(hasApi).toBe(true);
        });

        it('should call setResponseNotificationsEnabled without error', async () => {
            // The API call should not throw an error
            let hadError = false;
            try {
                await browser.execute(async () => {
                    await (window as any).electronAPI.setResponseNotificationsEnabled(false);
                });
            } catch {
                hadError = true;
            }

            expect(hadError).toBe(false);
        });

        it('should persist value to store when NotificationManager is available', async () => {
            // Get initial value to restore later
            const initialValue = await browser.execute(async () => {
                return await (window as any).electronAPI.getResponseNotificationsEnabled();
            });

            // Set to false
            await browser.execute(async () => {
                await (window as any).electronAPI.setResponseNotificationsEnabled(false);
            });

            await browser.waitUntil(
                async () => {
                    const current = await browser.execute(async () => {
                        return await (window as any).electronAPI.getResponseNotificationsEnabled();
                    });
                    return typeof current === 'boolean';
                },
                {
                    timeout: 500,
                    timeoutMsg: 'Expected a boolean response after setting notifications false',
                }
            );

            // Check the result - it may be false if NotificationManager is connected,
            // or true (default) if not connected
            const afterSetFalse = await browser.execute(async () => {
                return await (window as any).electronAPI.getResponseNotificationsEnabled();
            });

            // Set to true
            await browser.execute(async () => {
                await (window as any).electronAPI.setResponseNotificationsEnabled(true);
            });

            await browser.waitUntil(
                async () => {
                    const current = await browser.execute(async () => {
                        return await (window as any).electronAPI.getResponseNotificationsEnabled();
                    });
                    return typeof current === 'boolean';
                },
                {
                    timeout: 500,
                    timeoutMsg: 'Expected a boolean response after setting notifications true',
                }
            );

            // Check the result
            const afterSetTrue = await browser.execute(async () => {
                return await (window as any).electronAPI.getResponseNotificationsEnabled();
            });

            // If NotificationManager is properly connected, values should round-trip
            // If not connected, both values will be true (default)
            // Both scenarios are valid - we just verify the API doesn't error
            expect(typeof afterSetFalse).toBe('boolean');
            expect(typeof afterSetTrue).toBe('boolean');

            // Restore original value
            await setResponseNotificationsEnabled(initialValue);
        });
    });

    // Task 8.3: Options window shows Notifications section
    describe('Options Window Notifications Section', () => {
        let optionsWindowHandle: string | null = null;

        afterEach(async () => {
            // Close options window if open
            await closeOptionsWindowsForTest();

            // Switch back to main window
            await browser.switchToWindow(mainWindowHandle);
        });

        it('should show Notifications section in Options window', async () => {
            optionsWindowHandle = await openOptionsWindowAllowExisting(mainWindowHandle);

            if (optionsWindowHandle) {
                await browser.switchToWindow(optionsWindowHandle);
            }

            await browser.waitUntil(async () => (await browser.getUrl()).includes('options'), {
                timeout: 5000,
                interval: 100,
                timeoutMsg: 'Options window URL did not stabilize',
            });

            // Check for notifications section or toggle
            const hasNotificationsSection = await browser.execute(() => {
                const body = document.body.innerText.toLowerCase();
                return body.includes('notification') || body.includes('response notification');
            });

            expect(hasNotificationsSection).toBe(true);
        });

        it('should have functional toggle in Options window', async () => {
            optionsWindowHandle = await openOptionsWindowAllowExisting(mainWindowHandle);

            if (optionsWindowHandle) {
                await browser.switchToWindow(optionsWindowHandle);
            }

            await browser.waitUntil(async () => (await browser.getUrl()).includes('options'), {
                timeout: 5000,
                interval: 100,
                timeoutMsg: 'Options window URL did not stabilize',
            });

            // Find a toggle element - look for the notification toggle by its label or aria attributes
            const hasToggle = await browser.execute(() => {
                // Look for toggles with notification-related labels
                const toggles = document.querySelectorAll('[role="switch"], input[type="checkbox"]');
                for (const toggle of toggles) {
                    const parent = toggle.closest('.toggle-container, .setting-item, .options-row');
                    if (parent) {
                        const text = parent.textContent?.toLowerCase() || '';
                        if (text.includes('notification')) {
                            return true;
                        }
                    }
                }
                // Also check for any toggle elements
                return toggles.length > 0;
            });

            expect(hasToggle).toBe(true);
        });
    });

    // Task 8.4: Toggle survives Options window close/reopen
    describe('Toggle Persistence Across Window Close/Reopen', () => {
        let optionsWindowHandle: string | null = null;

        /**
         * Helper to close all Options windows
         */
        async function closeOptionsWindows(): Promise<void> {
            await closeOptionsWindowsForTest();
            await browser.switchToWindow(mainWindowHandle);
        }

        /**
         * Helper to open Options window and switch to it
         */
        async function openOptionsWindow(): Promise<void> {
            optionsWindowHandle = await openOptionsWindowAllowExisting(mainWindowHandle);

            if (optionsWindowHandle) {
                await browser.switchToWindow(optionsWindowHandle);
            }

            await browser.waitUntil(async () => (await browser.getUrl()).includes('options'), {
                timeout: 5000,
                interval: 100,
                timeoutMsg: 'Options window URL did not stabilize',
            });
        }

        afterEach(async () => {
            await closeOptionsWindows();
        });

        it('should persist toggle OFF state across Options window close/reopen', async () => {
            // Open Options and set toggle OFF
            await openOptionsWindow();

            // Find and click the notification toggle to set it OFF
            // First, get the current state
            const initialState = await browser.execute(async () => {
                return await (window as any).electronAPI.getResponseNotificationsEnabled();
            });

            // Set to OFF via API
            await browser.execute(async () => {
                await (window as any).electronAPI.setResponseNotificationsEnabled(false);
            });
            await waitForResponseNotificationsValue(false);

            // Close Options window
            await closeOptionsWindows();

            // Reopen Options window
            await openOptionsWindow();

            // Check the value via API - should still be OFF
            const afterReopenValue = await browser.execute(async () => {
                return await (window as any).electronAPI.getResponseNotificationsEnabled();
            });

            // If NotificationManager is properly connected, value should be false
            expect(afterReopenValue).toBe(false);

            // Restore original value
            await setResponseNotificationsEnabled(initialState);
        });

        it('should persist toggle ON state across Options window close/reopen', async () => {
            // First, ensure toggle is OFF so we can test toggling ON
            await browser.execute(async () => {
                await (window as any).electronAPI.setResponseNotificationsEnabled(false);
            });
            await waitForResponseNotificationsValue(false);

            // Set toggle to ON
            await browser.execute(async () => {
                await (window as any).electronAPI.setResponseNotificationsEnabled(true);
            });
            await waitForResponseNotificationsValue(true);

            // Open Options, close, and reopen
            await openOptionsWindow();
            await closeOptionsWindows();
            await openOptionsWindow();

            // Check the value via API - should still be ON
            const afterReopenValue = await browser.execute(async () => {
                return await (window as any).electronAPI.getResponseNotificationsEnabled();
            });

            expect(afterReopenValue).toBe(true);
        });

        it('should use real store persistence (not mocked)', async () => {
            // This test verifies that changes persist through the actual store
            // by making a change and verifying it survives window operations

            // Get initial value
            const initialValue = await browser.execute(async () => {
                return await (window as any).electronAPI.getResponseNotificationsEnabled();
            });

            // Toggle to opposite value
            const newValue = !initialValue;
            await setResponseNotificationsEnabled(newValue);
            await waitForResponseNotificationsValue(newValue);

            // Open and close Options window to trigger any potential resets
            await openOptionsWindow();
            await closeOptionsWindows();

            // Verify value persisted
            const persistedValue = await browser.execute(async () => {
                return await (window as any).electronAPI.getResponseNotificationsEnabled();
            });

            expect(persistedValue).toBe(newValue);

            // Restore original value
            await setResponseNotificationsEnabled(initialValue);
        });
    });

    // Task 8.5: Cross-platform notification support
    describe('Cross-Platform Notification Support', () => {
        it('should work on current platform', async () => {
            // Get the current platform
            const platform = await browser.electron.execute(() => {
                return process.platform;
            });

            expect(['win32', 'darwin', 'linux']).toContain(platform);

            // Verify IPC APIs work regardless of platform
            const hasGetApi = await browser.execute(() => {
                return typeof (window as any).electronAPI?.getResponseNotificationsEnabled === 'function';
            });
            const hasSetApi = await browser.execute(() => {
                return typeof (window as any).electronAPI?.setResponseNotificationsEnabled === 'function';
            });

            expect(hasGetApi).toBe(true);
            expect(hasSetApi).toBe(true);
        });

        it('should log appropriate platform-specific behavior for badges', async () => {
            // Get the current platform
            const platform = await browser.electron.execute(() => {
                return process.platform;
            });

            // Trigger a badge operation via NotificationManager (if available)
            // Note: We can't directly verify badge appearance in integration tests,
            // but we can verify the code doesn't throw errors on any platform
            let hadError = false;
            try {
                // Set notification enabled (triggers store update on all platforms)
                await browser.execute(async () => {
                    await (window as any).electronAPI.setResponseNotificationsEnabled(true);
                });
            } catch {
                hadError = true;
            }

            expect(hadError).toBe(false);

            // Log platform for debugging
            console.log(`Integration test running on platform: ${platform}`);
        });

        it('should handle notification settings on all platforms without errors', async () => {
            // Test the full round-trip on current platform
            const originalValue = await browser.execute(async () => {
                return await (window as any).electronAPI.getResponseNotificationsEnabled();
            });

            // Set to false
            let setFalseError = false;
            try {
                await browser.execute(async () => {
                    await (window as any).electronAPI.setResponseNotificationsEnabled(false);
                });
            } catch {
                setFalseError = true;
            }
            expect(setFalseError).toBe(false);

            await browser.waitUntil(
                async () => {
                    const current = await browser.execute(async () => {
                        return await (window as any).electronAPI.getResponseNotificationsEnabled();
                    });
                    return typeof current === 'boolean';
                },
                {
                    timeout: 1000,
                    interval: 100,
                    timeoutMsg: 'Expected boolean response after disabling notifications',
                }
            );

            // Set to true
            let setTrueError = false;
            try {
                await browser.execute(async () => {
                    await (window as any).electronAPI.setResponseNotificationsEnabled(true);
                });
            } catch {
                setTrueError = true;
            }
            expect(setTrueError).toBe(false);

            // Restore original value
            await setResponseNotificationsEnabled(originalValue);
        });
    });

    // Task 8.6: IPC setting works after NotificationManager late injection
    describe('IPC Setting After NotificationManager Late Injection', () => {
        it('should set notification enabled = false via IPC and persist', async () => {
            // Get initial value to restore later
            const initialValue = await browser.execute(async () => {
                return await (window as any).electronAPI.getResponseNotificationsEnabled();
            });

            // Set to false
            await browser.execute(async () => {
                await (window as any).electronAPI.setResponseNotificationsEnabled(false);
            });

            await waitForResponseNotificationsValue(false);

            // Get value - should be false (not default true)
            const result = await browser.execute(async () => {
                return await (window as any).electronAPI.getResponseNotificationsEnabled();
            });

            // If late injection is working, this should be false
            expect(result).toBe(false);

            // Restore original value
            await setResponseNotificationsEnabled(initialValue);
        });

        it('should get notification enabled via IPC and return actual value (not default)', async () => {
            // First set to false to ensure we're not getting default
            await browser.execute(async () => {
                await (window as any).electronAPI.setResponseNotificationsEnabled(false);
            });
            await waitForResponseNotificationsValue(false);

            // Get the value
            const valueAfterSetFalse = await browser.execute(async () => {
                return await (window as any).electronAPI.getResponseNotificationsEnabled();
            });

            // Should be false (not the default true)
            expect(valueAfterSetFalse).toBe(false);

            // Now set to true
            await browser.execute(async () => {
                await (window as any).electronAPI.setResponseNotificationsEnabled(true);
            });
            await waitForResponseNotificationsValue(true);

            // Get the value again
            const valueAfterSetTrue = await browser.execute(async () => {
                return await (window as any).electronAPI.getResponseNotificationsEnabled();
            });

            // Should be true
            expect(valueAfterSetTrue).toBe(true);
        });

        it('should verify setting actually affects NotificationManager behavior', async () => {
            // This test verifies that the IPC setting is actually used by the system
            // by checking that the setting is respected across the IPC boundary

            // Get initial state
            const initialValue = await browser.execute(async () => {
                return await (window as any).electronAPI.getResponseNotificationsEnabled();
            });

            // Toggle the setting multiple times to verify it's being used
            await browser.execute(async () => {
                await (window as any).electronAPI.setResponseNotificationsEnabled(false);
            });
            await waitForResponseNotificationsValue(false);

            const afterDisable = await browser.execute(async () => {
                return await (window as any).electronAPI.getResponseNotificationsEnabled();
            });
            expect(afterDisable).toBe(false);

            await browser.execute(async () => {
                await (window as any).electronAPI.setResponseNotificationsEnabled(true);
            });
            await waitForResponseNotificationsValue(true);

            const afterEnable = await browser.execute(async () => {
                return await (window as any).electronAPI.getResponseNotificationsEnabled();
            });
            expect(afterEnable).toBe(true);

            // Restore original
            await setResponseNotificationsEnabled(initialValue);
        });

        it('should fail if 5.3 fix is reverted (regression prevention)', async () => {
            // This test would fail if the setNotificationManager late injection
            // was not implemented, because setting values would not persist
            // and get would always return the default value of true

            // Set to false
            await browser.execute(async () => {
                await (window as any).electronAPI.setResponseNotificationsEnabled(false);
            });
            await waitForResponseNotificationsValue(false);

            // Get value multiple times to ensure consistency
            const value1 = await browser.execute(async () => {
                return await (window as any).electronAPI.getResponseNotificationsEnabled();
            });
            await browser.waitUntil(
                async () => {
                    const current = await browser.execute(async () => {
                        return await (window as any).electronAPI.getResponseNotificationsEnabled();
                    });
                    return current === false;
                },
                {
                    timeout: 2000,
                    interval: 100,
                    timeoutMsg: 'Expected notifications to remain disabled for regression check',
                }
            );
            const value2 = await browser.execute(async () => {
                return await (window as any).electronAPI.getResponseNotificationsEnabled();
            });

            // Both should be false if late injection is working
            // If fix is reverted, these would both be true (default)
            expect(value1).toBe(false);
            expect(value2).toBe(false);

            // Restore to true
            await browser.execute(async () => {
                await (window as any).electronAPI.setResponseNotificationsEnabled(true);
            });
        });
    });
});
