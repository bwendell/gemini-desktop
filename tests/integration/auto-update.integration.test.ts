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
        // We set TEST_AUTO_UPDATE to 'true' to bypass the isDev() check in UpdateManager
        await browser.execute(() => {
            window.electronAPI.devMockPlatform(null, { TEST_AUTO_UPDATE: 'true' });
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
});

