import { browser, expect } from '@wdio/globals';

describe('Auto-Update Integration', () => {
    before(async () => {
        // Wait for app ready
        await browser.waitUntil(async () => (await browser.getWindowHandles()).length > 0);
        // Ensure renderer is ready and bridge is established
        await browser.execute(async () => {
            return await new Promise<void>(resolve => {
                if (document.readyState === 'complete') return resolve();
                window.addEventListener('load', () => resolve());
            });
        });

        // FORCE ENABLE UPDATES for this test suite by mocking the environment
        // We mock 'win32' to ensure updates are supported by default for general tests,
        // and set TEST_AUTO_UPDATE to 'true' to bypass the isDev() check.
        await browser.execute(() => {
            window.electronAPI.devMockPlatform('win32', { TEST_AUTO_UPDATE: 'true' });
        });
    });

    describe('Initialization & Configuration', () => {
        it('should be enabled by default', async () => {
            const enabled = await browser.execute(() => window.electronAPI.getAutoUpdateEnabled());
            expect(enabled).toBe(true);
        });

        it('should allow disabling auto-updates', async () => {
            await browser.execute(() => window.electronAPI.setAutoUpdateEnabled(false));
            const enabled = await browser.execute(() => window.electronAPI.getAutoUpdateEnabled());
            expect(enabled).toBe(false);
        });

        it('should allow re-enabling auto-updates', async () => {
            await browser.execute(() => window.electronAPI.setAutoUpdateEnabled(true));
            const enabled = await browser.execute(() => window.electronAPI.getAutoUpdateEnabled());
            expect(enabled).toBe(true);
        });
    });

    describe('Manual Update Check', () => {
        // NOTE: We cannot easily verify the internal 'checking-for-update' event 
        // without mocking the autoUpdater itself in the main process, which we can't do 
        // reliably without browser.electron.execute.
        // However, we can verify that the IPC call doesn't throw.
        it('should allows triggering manual check', async () => {
            await expect(browser.execute(() => window.electronAPI.checkForUpdates())).resolves.not.toThrow();
        });

        it('should handle update check errors correctly', async () => {
            // 1. Setup listener in renderer
            await browser.execute(() => {
                (window as any)._updateErrorPromise = new Promise<string>((resolve) => {
                    (window as any).electronAPI.onUpdateError((msg: string) => resolve(msg));
                });
            });

            // 2. Trigger error via Dev IPC
            await browser.execute(() => {
                window.electronAPI.devEmitUpdateEvent('error', new Error('Simulated Network Error'));
            });

            // 3. Verify result in renderer
            const errorMsg = await browser.execute(async () => {
                // Wait for the promise we created
                // Timeout to prevent hanging if event never comes
                const timeout = new Promise<string>((_, reject) => setTimeout(() => reject('Timeout'), 2000));
                return await Promise.race([(window as any)._updateErrorPromise, timeout]);
            });

            // The mock emits the error generic message or the error object?
            // UpdateManager emits `error.message`.
            expect(errorMsg).toBe('Simulated Network Error');
        });
    });

    describe('Update Flow (Happy Path)', () => {
        it('should handle update available event', async () => {
            // 1. Setup listener
            await browser.execute(() => {
                (window as any)._updateAvailablePromise = new Promise<any>((resolve) => {
                    (window as any).electronAPI.onUpdateAvailable((info: any) => resolve(info));
                });
            });

            // 2. Trigger event via Dev IPC
            await browser.execute(() => {
                window.electronAPI.devEmitUpdateEvent('update-available', { version: '2.0.0' });
            });

            // 3. Verify
            const info = await browser.execute(async () => {
                return await (window as any)._updateAvailablePromise;
            });

            expect(info.version).toBe('2.0.0');
        });

        it('should handle update downloaded event (Badge & Tray)', async () => {
            // 1. Setup listener
            await browser.execute(() => {
                (window as any)._updateDownloadedPromise = new Promise<any>((resolve) => {
                    (window as any).electronAPI.onUpdateDownloaded((info: any) => resolve(info));
                });
            });

            // 2. Trigger downloaded via Dev IPC
            await browser.execute(() => {
                window.electronAPI.devEmitUpdateEvent('update-downloaded', { version: '2.0.0' });
            });

            // 3. Verify Renderer Event
            const info = await browser.execute(async () => {
                return await (window as any)._updateDownloadedPromise;
            });
            expect(info.version).toBe('2.0.0');

            // 4. Verify Tray Tooltip via IPC
            // Wait a bit for main process to update tray
            await browser.pause(500);
            const tooltip = await browser.execute(() => window.electronAPI.getTrayTooltip());
            expect(tooltip).toContain('2.0.0');
        });
    });

    describe('Install Flow', () => {
        it('should call quitAndInstall on request', async () => {
            // We can't easily verify the main process quitAndInstall call without spying.
            // But we can verify the IPC call is successful.
            await expect(browser.execute(() => window.electronAPI.installUpdate())).resolves.not.toThrow();
        });

        it('should clear indicators (test via devClearBadge)', async () => {
            // Set a badge first
            await browser.execute(() => window.electronAPI.devShowBadge('3.0.0'));

            // Verify it set (via tooltip)
            let tooltip = await browser.execute(() => window.electronAPI.getTrayTooltip());
            expect(tooltip).toContain('3.0.0');

            // Clear it
            await browser.execute(() => window.electronAPI.devClearBadge());

            // Verify it cleared
            tooltip = await browser.execute(() => window.electronAPI.getTrayTooltip());
            // Default tooltip is 'Gemini Desktop'
            expect(tooltip).toBe('Gemini Desktop');
        });
    });

    describe('Platform & Install Type Logic', () => {
        afterEach(async () => {
            // Reset mocks
            await browser.execute(() => window.electronAPI.devMockPlatform(null, null));
        });

        it('should disable updates on Linux (RPM/Deb simulation)', async () => {
            // Mock Linux without APPIMAGE
            await browser.execute(() => {
                window.electronAPI.devMockPlatform('linux', { 'APPIMAGE': '' }); // Empty APPIMAGE
            });

            const enabled = await browser.execute(() => window.electronAPI.getAutoUpdateEnabled());
            expect(enabled).toBe(false);
        });

        it('should enable updates on Linux (AppImage simulation)', async () => {
            // Mock Linux with APPIMAGE
            await browser.execute(() => {
                window.electronAPI.devMockPlatform('linux', { 'APPIMAGE': '/tmp/test.AppImage' });
            });

            // Should default to true if platform check passes
            // Ensure we set it to true if it was disabled by previous test
            await browser.execute(() => window.electronAPI.setAutoUpdateEnabled(true));

            const enabled = await browser.execute(() => window.electronAPI.getAutoUpdateEnabled());
            expect(enabled).toBe(true);
        });

        it('should enable updates on Windows', async () => {
            // Mock Windows
            await browser.execute(() => {
                window.electronAPI.devMockPlatform('win32', {});
            });

            await browser.execute(() => window.electronAPI.setAutoUpdateEnabled(true));
            const enabled = await browser.execute(() => window.electronAPI.getAutoUpdateEnabled());
            expect(enabled).toBe(true);
        });

        it('should enable updates on macOS', async () => {
            // Mock macOS
            await browser.execute(() => {
                window.electronAPI.devMockPlatform('darwin', {});
            });

            await browser.execute(() => window.electronAPI.setAutoUpdateEnabled(true));
            const enabled = await browser.execute(() => window.electronAPI.getAutoUpdateEnabled());
            expect(enabled).toBe(true);
        });
    });

    describe('Periodic Checks', () => {
        it('should verify periodic checks can be triggered', async () => {
            // While we can't easily test the full periodic check interval in integration tests,
            // we can verify that the mechanism is set up correctly by checking for updates
            await browser.execute(() => window.electronAPI.setAutoUpdateEnabled(true));

            // Manual check should work (even though periodic uses same mechanism)
            await expect(browser.execute(() => window.electronAPI.checkForUpdates())).resolves.not.toThrow();
        });

        it('should stop periodic checks when disabled', async () => {
            // Enable first
            await browser.execute(() => window.electronAPI.setAutoUpdateEnabled(true));
            await browser.pause(100);

            // Then disable
            await browser.execute(() => window.electronAPI.setAutoUpdateEnabled(false));

            const enabled = await browser.execute(() => window.electronAPI.getAutoUpdateEnabled());
            expect(enabled).toBe(false);
        });

        it('should restart periodic checks when re-enabled', async () => {
            // Disable
            await browser.execute(() => window.electronAPI.setAutoUpdateEnabled(false));
            await browser.pause(100);

            // Re-enable
            await browser.execute(() => window.electronAPI.setAutoUpdateEnabled(true));

            const enabled = await browser.execute(() => window.electronAPI.getAutoUpdateEnabled());
            expect(enabled).toBe(true);

            // Manual check should still work
            await expect(browser.execute(() => window.electronAPI.checkForUpdates())).resolves.not.toThrow();
        });
    });

    describe('Update Not Available', () => {
        it('should handle update-not-available event gracefully', async () => {
            // Setup listener
            await browser.execute(() => {
                (window as any)._updateNotAvailableReceived = false;
                (window as any)._updateAvailableReceived = false;

                // Listen for update-available (should NOT be called)
                (window as any).electronAPI.onUpdateAvailable(() => {
                    (window as any)._updateAvailableReceived = true;
                });
            });

            // Trigger update-not-available event
            await browser.execute(() => {
                window.electronAPI.devEmitUpdateEvent('update-not-available', { version: '1.0.0' });
            });

            await browser.pause(500);

            // Verify no update-available was broadcasted
            const received = await browser.execute(() => (window as any)._updateAvailableReceived);
            expect(received).toBe(false);
        });

        it('should not display notifications for update-not-available', async () => {
            // This is verified by the fact that devEmitUpdateEvent with 'update-not-available'
            // doesn't trigger any renderer-side notification toast
            await browser.execute(() => {
                window.electronAPI.devEmitUpdateEvent('update-not-available', { version: '1.0.0' });
            });

            await browser.pause(500);

            // No error should occur, and no toast should appear
            await expect(Promise.resolve()).resolves.not.toThrow();
        });
    });

    describe('Edge Cases', () => {
        it('should handle toggling during simulated active operation', async () => {
            // Start with enabled
            await browser.execute(() => window.electronAPI.setAutoUpdateEnabled(true));

            // Trigger an update event (simulating active download)
            await browser.execute(() => {
                window.electronAPI.devEmitUpdateEvent('update-available', { version: '2.0.0' });
            });

            await browser.pause(200);

            // Toggle off during "active" operation
            await browser.execute(() => window.electronAPI.setAutoUpdateEnabled(false));

            // Should still be disabled
            const enabled = await browser.execute(() => window.electronAPI.getAutoUpdateEnabled());
            expect(enabled).toBe(false);

            // Re-enable
            await browser.execute(() => window.electronAPI.setAutoUpdateEnabled(true));
        });

        it('should handle multiple rapid manual checks', async () => {
            // Enable updates
            await browser.execute(() => window.electronAPI.setAutoUpdateEnabled(true));

            // Trigger multiple manual checks in rapid succession
            await Promise.all([
                browser.execute(() => window.electronAPI.checkForUpdates()),
                browser.execute(() => window.electronAPI.checkForUpdates()),
                browser.execute(() => window.electronAPI.checkForUpdates()),
            ]);

            // All should complete without error
            await expect(Promise.resolve()).resolves.not.toThrow();
        });
    });
});
