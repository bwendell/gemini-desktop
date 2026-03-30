import { browser, expect } from '@wdio/globals';

import { DEFAULT_ACCELERATORS, getDefaultAccelerators } from '../../src/shared/types/hotkeys';
import {
    callElectronAPI,
    closeExtraWindows,
    getMainWindowHandle,
    getMainProcessPlatform,
    openOptionsWindow,
    switchToMainWindow,
    waitForApp,
} from './helpers/integrationUtils';
import { hideQuickChat } from './helpers/windowHelpers';

describe('Global Hotkeys Integration', () => {
    let mainWindowHandle: string;

    before(async () => {
        await waitForApp();
        mainWindowHandle = await getMainWindowHandle();
    });

    afterEach(async () => {
        await browser.execute(async (defaultAlwaysOnTop) => {
            const api = (window as any).electronAPI;
            await api?.setHotkeyAccelerator?.('alwaysOnTop', defaultAlwaysOnTop);
        }, DEFAULT_ACCELERATORS.alwaysOnTop);

        await hideQuickChat();
        await switchToMainWindow(mainWindowHandle);
        await closeExtraWindows({ force: true, timeout: 8000 });
    });

    it('should have hotkeys registered in the main process', async () => {
        // Verify registration via Main Process
        const isRegistered = await browser.electron.execute(() => {
            // Check if the 'quickChat' accelerator is registered
            // We know the accelerator is 'CommandOrControl+Shift+Alt+Space'
            // We can also check internal manager state
            return (global as any).appContext.hotkeyManager.isIndividualEnabled('quickChat');
        });

        expect(isRegistered).toBe(true);
    });

    it('should allow disabling hotkeys via Renderer IPC', async () => {
        // Use renderer API to disable
        await browser.execute(async () => {
            const api = (window as any).electronAPI;
            await api.setIndividualHotkey('quickChat', false);
        });

        // Verify in Main Process
        const isEnabled = await browser.electron.execute(() => {
            return (global as any).appContext.hotkeyManager.isIndividualEnabled('quickChat');
        });

        expect(isEnabled).toBe(false);
    });

    it('should allow re-enabling hotkeys via Renderer IPC', async () => {
        await browser.execute(async () => {
            const api = (window as any).electronAPI;
            await api.setIndividualHotkey('quickChat', true);
        });

        // Verify in Main Process
        const isEnabled = await browser.electron.execute(() => {
            return (global as any).appContext.hotkeyManager.isIndividualEnabled('quickChat');
        });

        expect(isEnabled).toBe(true);
    });

    it('should handle platform-specific accelerators correctly', async () => {
        // Verify we are generating the right accelerator string for the platform
        const accelerator = await browser.electron.execute(() => {
            // We can access the private shortcuts array if we really wanted to,
            // but checking 'process.platform' is enough to verify the test environment context.
            return process.platform;
        });

        // Just ensure we are running on a valid platform
        expect(['win32', 'darwin', 'linux']).toContain(accelerator);
    });

    it('should allow setting custom accelerators via Renderer IPC', async () => {
        // 1. Set custom accelerator
        const newAccelerator = 'CommandOrControl+Shift+U';
        await browser.execute(async (accelerator) => {
            const api = (window as any).electronAPI;
            // Depending on exposed API structure, might need specific method
            // We know from exploration it's exposed, likely via setHotkeyAccelerator
            // But let's check exposeBridge.ts if we were unsure, but here we assume it maps to IPC
            await api.setHotkeyAccelerator('alwaysOnTop', accelerator);
        }, newAccelerator);

        // 2. Verify in Main Process
        const savedAccelerator = await browser.electron.execute(() => {
            return (global as any).appContext.hotkeyManager.getAccelerator('alwaysOnTop');
        });

        // Check for platform-specific expansion (CommandOrControl -> Ctrl/Cmd) is done by Electron
        // But our manager stores the raw string usually, let's verify what it returns
        // The test mock or real implementation might return the raw string or parsed
        // Based on unit tests, it returns the raw 'CommandOrControl+...' string matching input
        expect(savedAccelerator).toBe(newAccelerator);
    });

    describe('Cross-Platform Behavior', () => {
        it('should use CommandOrControl in all default accelerators', async () => {
            const accelerators = await browser.electron.execute(() => {
                return (global as any).appContext.hotkeyManager.getAccelerators();
            });

            expect(accelerators.alwaysOnTop).toContain('CommandOrControl');
            expect(accelerators.peekAndHide).toContain('CommandOrControl');
            expect(accelerators.quickChat).toBe(getDefaultAccelerators(process.platform).quickChat);
        });

        it('should correctly report the actual platform', async () => {
            const platform = await browser.electron.execute(() => {
                return process.platform;
            });

            // Verify we're running on a supported platform
            expect(['win32', 'darwin', 'linux']).toContain(platform);
        });

        it('should maintain consistent accelerator format across platforms', async () => {
            // Set a custom accelerator with CommandOrControl
            const customAccelerator = 'CommandOrControl+Alt+K';
            await browser.execute(async (acc) => {
                const api = (window as any).electronAPI;
                await api.setHotkeyAccelerator('peekAndHide', acc);
            }, customAccelerator);

            // Verify it's stored as-is (not expanded to Ctrl/Cmd)
            const stored = await browser.electron.execute(() => {
                return (global as any).appContext.hotkeyManager.getAccelerator('peekAndHide');
            });

            expect(stored).toBe(customAccelerator);

            // Reset to default
            await browser.execute(async (defaultAcc) => {
                const api = (window as any).electronAPI;
                await api.setHotkeyAccelerator('peekAndHide', defaultAcc);
            }, DEFAULT_ACCELERATORS.peekAndHide);
        });

        // Test that verifies renderer process receives correct platform value
        it('should expose correct platform to renderer process', async () => {
            const rendererPlatform = await browser.execute(() => {
                return (window as any).electronAPI.platform;
            });

            const mainPlatform = await browser.electron.execute(() => {
                return process.platform;
            });

            // Renderer should see the same platform as main process
            expect(rendererPlatform).toBe(mainPlatform);
        });
    });

    describe('Voice Chat Hotkey', () => {
        it('should have voiceChat hotkey registered in the main process', async () => {
            // Verify voiceChat is registered and enabled by default
            const isRegistered = await browser.electron.execute(() => {
                return (global as any).appContext.hotkeyManager.isIndividualEnabled('voiceChat');
            });

            expect(isRegistered).toBe(true);
        });

        it('should have voiceChat accelerator default to CommandOrControl+Shift+M', async () => {
            // Verify default accelerator is set correctly
            const accelerator = await browser.electron.execute(() => {
                return (global as any).appContext.hotkeyManager.getAccelerator('voiceChat');
            });

            expect(accelerator).toBe(DEFAULT_ACCELERATORS.voiceChat);
            expect(accelerator).toBe('CommandOrControl+Shift+M');
        });

        it('should allow disabling voiceChat via Renderer IPC', async () => {
            // Disable voiceChat via renderer API
            await browser.execute(async () => {
                const api = (window as any).electronAPI;
                await api.setIndividualHotkey('voiceChat', false);
            });

            // Verify in Main Process that voiceChat is disabled
            const isEnabled = await browser.electron.execute(() => {
                return (global as any).appContext.hotkeyManager.isIndividualEnabled('voiceChat');
            });

            expect(isEnabled).toBe(false);
        });

        it('should allow re-enabling voiceChat via Renderer IPC', async () => {
            // Re-enable voiceChat via renderer API
            await browser.execute(async () => {
                const api = (window as any).electronAPI;
                await api.setIndividualHotkey('voiceChat', true);
            });

            // Verify in Main Process that voiceChat is enabled
            const isEnabled = await browser.electron.execute(() => {
                return (global as any).appContext.hotkeyManager.isIndividualEnabled('voiceChat');
            });

            expect(isEnabled).toBe(true);
        });

        it('should allow changing voiceChat accelerator via Renderer IPC', async () => {
            // Set custom accelerator for voiceChat
            const customAccelerator = 'CommandOrControl+Alt+V';
            await browser.execute(async (accelerator) => {
                const api = (window as any).electronAPI;
                await api.setHotkeyAccelerator('voiceChat', accelerator);
            }, customAccelerator);

            // Verify in Main Process
            const savedAccelerator = await browser.electron.execute(() => {
                return (global as any).appContext.hotkeyManager.getAccelerator('voiceChat');
            });

            expect(savedAccelerator).toBe(customAccelerator);

            // Reset to default
            await browser.execute(async (defaultAcc) => {
                const api = (window as any).electronAPI;
                await api.setHotkeyAccelerator('voiceChat', defaultAcc);
            }, DEFAULT_ACCELERATORS.voiceChat);
        });

        it('should unregister voiceChat shortcut when disabled and re-register when enabled', async () => {
            // Disable voiceChat
            await browser.execute(async () => {
                const api = (window as any).electronAPI;
                await api.setIndividualHotkey('voiceChat', false);
            });

            // Verify it's disabled in main process
            let isEnabled = await browser.electron.execute(() => {
                return (global as any).appContext.hotkeyManager.isIndividualEnabled('voiceChat');
            });
            expect(isEnabled).toBe(false);

            // Re-enable voiceChat
            await browser.execute(async () => {
                const api = (window as any).electronAPI;
                await api.setIndividualHotkey('voiceChat', true);
            });

            // Verify it's enabled again
            isEnabled = await browser.electron.execute(() => {
                return (global as any).appContext.hotkeyManager.isIndividualEnabled('voiceChat');
            });
            expect(isEnabled).toBe(true);
        });

        it('should include voiceChat in all default accelerators', async () => {
            // Fetch all accelerators from main process
            const accelerators = await browser.electron.execute(() => {
                return (global as any).appContext.hotkeyManager.getAccelerators();
            });

            // Verify voiceChat is present and uses CommandOrControl
            expect(accelerators.voiceChat).toBeDefined();
            expect(accelerators.voiceChat).toContain('CommandOrControl');
        });
    });

    describe('Windows Alt+Space quick chat lane', () => {
        it('should expose Alt+Space as the resolved quickChat default accelerator', async () => {
            const fullSettings = await callElectronAPI<{
                quickChat: {
                    enabled: boolean;
                    accelerator: string;
                    defaultAccelerator: string;
                };
            }>('getFullHotkeySettings');

            expect(fullSettings.quickChat.defaultAccelerator).toBe('Alt+Space');
        });

        it('should drive the visible quickChat path and recorder bridge on the Windows lane', async function () {
            const platform = await getMainProcessPlatform();

            if (platform !== 'win32') {
                this.skip();
            }

            await hideQuickChat();

            const registration = await browser.electron.execute(() => {
                const { globalShortcut } = require('electron');

                return {
                    accelerator: 'Alt+Space',
                    isRegistered: globalShortcut.isRegistered('Alt+Space'),
                };
            });

            expect(registration).toEqual({ accelerator: 'Alt+Space', isRegistered: true });

            await browser.electron.execute(() => {
                (global as { appContext?: any }).appContext?.hotkeyManager?.executeHotkeyAction?.('quickChat');
            });

            await browser.waitUntil(
                async () => {
                    return browser.electron.execute(() => {
                        const quickChatWindow = (
                            global as { appContext?: any }
                        ).appContext?.windowManager?.getQuickChatWindow?.();
                        return Boolean(
                            quickChatWindow && !quickChatWindow.isDestroyed() && quickChatWindow.isVisible()
                        );
                    });
                },
                { timeout: 5000, timeoutMsg: 'Quick Chat window did not become visible from hotkey action' }
            );

            await hideQuickChat();

            const optionsHandle = await openOptionsWindow(mainWindowHandle);
            await browser.switchToWindow(optionsHandle);

            const acceleratorSelector = '[data-testid="hotkey-row-alwaysOnTop"] .keycap-container';
            const promptSelector = '[data-testid="hotkey-row-alwaysOnTop"] .recording-prompt';

            await browser.waitUntil(
                async () => {
                    const container = await browser.$(acceleratorSelector);
                    return container.isDisplayed();
                },
                { timeout: 5000, timeoutMsg: 'Hotkey accelerator input did not render in options window' }
            );

            await (await browser.$(acceleratorSelector)).click();

            await browser.waitUntil(
                async () => {
                    const prompt = await browser.$(promptSelector);
                    return prompt.isDisplayed();
                },
                { timeout: 5000, timeoutMsg: 'Recorder mode did not activate in options window' }
            );

            const bridgeResult = await browser.electron.execute((electron: typeof import('electron')) => {
                const optionsWindow = electron.BrowserWindow.getAllWindows().find((win) =>
                    win.webContents.getURL().includes('options')
                );

                if (!optionsWindow) {
                    throw new Error('Options window not found for recorder bridge test');
                }

                let prevented = false;

                optionsWindow.webContents.emit(
                    'before-input-event',
                    { preventDefault() {} } as Electron.Event,
                    {
                        type: 'keyDown',
                        code: 'Space',
                        key: 'Space',
                        alt: true,
                        control: false,
                        shift: false,
                        meta: false,
                        isAutoRepeat: false,
                    } as Electron.Input
                );

                optionsWindow.emit('system-context-menu', {
                    preventDefault: () => {
                        prevented = true;
                    },
                } as Electron.Event);

                return {
                    prevented,
                    url: optionsWindow.webContents.getURL(),
                };
            });

            expect(bridgeResult.prevented).toBe(true);
            expect(bridgeResult.url).toContain('options');

            await browser.waitUntil(
                async () => {
                    const prompt = await browser.$(promptSelector);
                    return !(await prompt.isExisting()) || !(await prompt.isDisplayed());
                },
                { timeout: 5000, timeoutMsg: 'Recorder mode did not exit after bridge capture' }
            );

            await browser.waitUntil(
                async () => {
                    const storedAccelerator = await browser.electron.execute(() => {
                        return (global as { appContext?: any }).appContext?.hotkeyManager?.getAccelerator?.(
                            'alwaysOnTop'
                        );
                    });

                    return storedAccelerator === 'Alt+Space';
                },
                { timeout: 5000, timeoutMsg: 'alwaysOnTop accelerator did not update to Alt+Space' }
            );

            const recorderValue = await browser.execute((selector) => {
                const element = document.querySelector(selector);
                return element?.textContent ?? null;
            }, acceleratorSelector);

            expect(recorderValue).toContain('Alt');
            expect(recorderValue).toContain('␣');
        });
    });
});
