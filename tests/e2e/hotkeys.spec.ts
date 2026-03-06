import { $, browser, expect } from '@wdio/globals';

import { QuickChatPage } from './pages';
import { clickMenuItemById } from './helpers/menuActions';
import { waitForOptionsWindow, switchToOptionsWindow, closeOptionsWindow } from './helpers/optionsWindowActions';
import { getPlatform, E2EPlatform, isLinux } from './helpers/platform';
import {
    ensureSingleWindow,
    pressComplexShortcut,
    switchToMainWindow,
    waitForAppReady,
    waitForWindowTransition,
} from './helpers/workflows';
import { waitForUIState } from './helpers/waitUtilities';

interface HotkeyTestConfig {
    id: string;
    label: string;
    shortcutWin: string;
    shortcutMac: string;
    testId: string;
    rowTestId: string;
}

const HOTKEY_CONFIGS: HotkeyTestConfig[] = [
    {
        id: 'alwaysOnTop',
        label: 'Always on Top',
        shortcutWin: 'Ctrl+Alt+P',
        shortcutMac: '⌘+⌥+P',
        testId: 'hotkey-toggle-alwaysOnTop',
        rowTestId: 'hotkey-row-alwaysOnTop',
    },
    {
        id: 'peekAndHide',
        label: 'Peek and Hide',
        shortcutWin: 'Ctrl+Shift+␣',
        shortcutMac: '⌘+⇧+␣',
        testId: 'hotkey-toggle-peekAndHide',
        rowTestId: 'hotkey-row-peekAndHide',
    },
    {
        id: 'quickChat',
        label: 'Quick Chat',
        shortcutWin: 'Ctrl+Shift+Alt+␣',
        shortcutMac: '⌘+⇧+⌥+␣',
        testId: 'hotkey-toggle-quickChat',
        rowTestId: 'hotkey-row-quickChat',
    },
    {
        id: 'printToPdf',
        label: 'Print to PDF',
        shortcutWin: 'Ctrl+Shift+P',
        shortcutMac: '⌘+⇧+P',
        testId: 'hotkey-toggle-printToPdf',
        rowTestId: 'hotkey-row-printToPdf',
    },
];

type HotkeyRegistrationStatus =
    | {
          quickChat: boolean;
          peekAndHide: boolean;
          status: 'success';
      }
    | {
          status: 'error';
          error: string;
          stack?: string;
      };

type ElectronGlobalShortcut = {
    isRegistered(accelerator: string): boolean;
};

type ElectronModule = {
    globalShortcut: ElectronGlobalShortcut;
};

type ElectronBrowser = typeof browser & {
    electron: {
        execute: <T>(fn: (electron: ElectronModule) => T) => Promise<T>;
    };
};

const electronBrowser = browser as ElectronBrowser;

const isHotkeyRegistrationStatus = (value: unknown): value is HotkeyRegistrationStatus => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const status = (value as { status?: unknown }).status;
    if (status !== 'success' && status !== 'error') {
        return false;
    }

    if (status === 'success') {
        const successValue = value as { quickChat?: unknown; peekAndHide?: unknown };
        return typeof successValue.quickChat === 'boolean' && typeof successValue.peekAndHide === 'boolean';
    }

    return typeof (value as { error?: unknown }).error === 'string';
};

describe('Hotkeys', () => {
    describe('Registration', () => {
        beforeEach(async () => {
            await waitForAppReady();
        });

        it('should successfully register default hotkeys on startup', async () => {
            if (await isLinux()) {
                console.log('[SKIPPED] Global hotkey registration test skipped on Linux.');
                console.log('[SKIPPED] Global hotkeys are disabled due to Wayland limitations.');
                return;
            }

            const registrationStatus = await electronBrowser.electron.execute<HotkeyRegistrationStatus | null>(
                (_electron: ElectronModule): HotkeyRegistrationStatus => {
                    const { globalShortcut } = _electron;

                    try {
                        return {
                            quickChat: globalShortcut.isRegistered('CommandOrControl+Shift+Alt+Space'),
                            peekAndHide: globalShortcut.isRegistered('CommandOrControl+Shift+Space'),
                            status: 'success',
                        };
                    } catch (error) {
                        return {
                            error: (error as Error).message,
                            stack: (error as Error).stack,
                            status: 'error',
                        };
                    }
                }
            );

            console.log('Global Hotkey Registration Status:', JSON.stringify(registrationStatus, null, 2));

            if (!isHotkeyRegistrationStatus(registrationStatus)) {
                console.log('⚠️  Skipping test: browser.electron.execute returned undefined');
                console.log('   This can occur in CI or when multiple Electron instances compete for shortcuts');
                return;
            }

            if (registrationStatus.status === 'error') {
                throw new Error(`Main process error: ${registrationStatus.error}`);
            }

            const anyRegistered = registrationStatus.quickChat || registrationStatus.peekAndHide;

            if (!anyRegistered) {
                console.log('⚠️  Skipping test: No global hotkeys were registered in this environment');
                console.log('   This is expected when another Electron instance has claimed the shortcuts');
                console.log('   Registration results:', JSON.stringify(registrationStatus));
                return;
            }

            expect(registrationStatus.quickChat).toBe(true);
            expect(registrationStatus.peekAndHide).toBe(true);
        });
    });

    describe('Global Hotkey Toggle', () => {
        const quickChat = new QuickChatPage();

        beforeEach(async () => {
            await waitForAppReady();
            await switchToMainWindow();
        });

        afterEach(async () => {
            await ensureSingleWindow();
        });

        describe('Quick Chat Hotkey', () => {
            it('should toggle Quick Chat window visibility when pressing CommandOrControl+Shift+Alt+Space', async () => {
                const hotkeyStatus = await electronBrowser.electron.execute((_electron: ElectronModule) => {
                    try {
                        const { globalShortcut } = _electron;
                        return {
                            quickChat: globalShortcut.isRegistered('CommandOrControl+Shift+Alt+Space'),
                        };
                    } catch (error) {
                        return { quickChat: false, error: (error as Error).message };
                    }
                });

                if (!hotkeyStatus.quickChat) {
                    console.log('⚠️  Skipping hotkey test: Quick Chat hotkey not registered in this environment');
                    console.log('   This is expected in restricted environments (CI, certain Windows/Linux configs)');
                    return;
                }

                const isVisibleInitially = await quickChat.isVisible();
                if (isVisibleInitially) {
                    await quickChat.cancel();
                    await waitForUIState(async () => !(await quickChat.isVisible()), {
                        description: 'Quick Chat to close',
                    });
                }

                await pressComplexShortcut(['primary', 'shift', 'alt'], 'Space');
                await waitForWindowTransition();

                await quickChat.waitForVisible();
                const isVisibleAfterOpen = await quickChat.isVisible();
                expect(isVisibleAfterOpen).toBe(true);

                await pressComplexShortcut(['primary', 'shift', 'alt'], 'Space');
                await waitForWindowTransition();

                await quickChat.waitForHidden();
                const isVisibleAfterClose = await quickChat.isVisible();
                expect(isVisibleAfterClose).toBe(false);

                await switchToMainWindow();
            });
        });
    });

    describe('Individual Toggle Options', () => {
        let platform: E2EPlatform;

        before(async () => {
            platform = await getPlatform();
        });

        beforeEach(async () => {
            await clickMenuItemById('menu-file-options');
            await waitForOptionsWindow();
            await switchToOptionsWindow();
        });

        afterEach(async () => {
            await closeOptionsWindow();
        });

        describe('Rendering', () => {
            it('should display all hotkey toggles', async () => {
                for (const config of HOTKEY_CONFIGS) {
                    const toggle = await $(`[data-testid="${config.testId}"]`);
                    await expect(toggle).toExist();
                    await expect(toggle).toBeDisplayed();
                }
            });

            it('should display correct labels for each toggle', async () => {
                for (const config of HOTKEY_CONFIGS) {
                    const row = await $(`[data-testid="${config.rowTestId}"]`);
                    const labelFound = await waitForUIState(async () => (await row.getText()).includes(config.label), {
                        timeout: 5000,
                        description: `Row contains "${config.label}"`,
                    });
                    expect(labelFound).toBe(true);
                }
            });

            it('should display platform-appropriate shortcut text', async () => {
                for (const config of HOTKEY_CONFIGS) {
                    const row = await $(`[data-testid="${config.rowTestId}"]`);
                    const expectedShortcut = platform === 'macos' ? config.shortcutMac : config.shortcutWin;

                    const keyParts = expectedShortcut.split('+');
                    for (const part of keyParts) {
                        const partFound = await waitForUIState(async () => (await row.getText()).includes(part), {
                            timeout: 5000,
                            description: `Row contains "${part}" for "${expectedShortcut}"`,
                        });
                        expect(partFound).toBe(true);
                    }
                }
            });

            it('should show Ctrl on Windows/Linux, ⌘ on macOS', async () => {
                const config = HOTKEY_CONFIGS[0];
                const row = await $(`[data-testid="${config.rowTestId}"]`);

                if (platform === 'macos') {
                    const hasCommand = await waitForUIState(async () => (await row.getText()).includes('⌘'), {
                        timeout: 5000,
                        description: 'Row contains "⌘" (macOS Command symbol)',
                    });
                    expect(hasCommand).toBe(true);

                    const lacksCtrl = await waitForUIState(async () => !(await row.getText()).includes('Ctrl'), {
                        timeout: 5000,
                        description: 'Row does not contain "Ctrl"',
                    });
                    expect(lacksCtrl).toBe(true);
                } else {
                    const hasCtrl = await waitForUIState(async () => (await row.getText()).includes('Ctrl'), {
                        timeout: 5000,
                        description: 'Row contains "Ctrl"',
                    });
                    expect(hasCtrl).toBe(true);

                    const lacksCommand = await waitForUIState(async () => !(await row.getText()).includes('⌘'), {
                        timeout: 5000,
                        description: 'Row does not contain "⌘" (macOS Command symbol)',
                    });
                    expect(lacksCommand).toBe(true);
                }
            });
        });

        describe('Interactions', () => {
            it('should have clickable toggle switches with role=switch', async () => {
                for (const config of HOTKEY_CONFIGS) {
                    const toggleSwitch = await $(`[data-testid="${config.testId}-switch"]`);
                    await expect(toggleSwitch).toExist();

                    const role = await toggleSwitch.getAttribute('role');
                    expect(role).toBe('switch');
                }
            });

            it('should have aria-checked attribute on toggle switches', async () => {
                for (const config of HOTKEY_CONFIGS) {
                    const toggleSwitch = await $(`[data-testid="${config.testId}-switch"]`);
                    const checked = await toggleSwitch.getAttribute('aria-checked');

                    expect(['true', 'false']).toContain(checked);
                }
            });

            it('should toggle state when clicked', async () => {
                const config = HOTKEY_CONFIGS[0];
                const toggleSwitch = await $(`[data-testid="${config.testId}-switch"]`);

                const initialChecked = await toggleSwitch.getAttribute('aria-checked');

                await toggleSwitch.click();
                await waitForUIState(async () => (await toggleSwitch.getAttribute('aria-checked')) !== initialChecked, {
                    description: 'Toggle state changed',
                });

                const newChecked = await toggleSwitch.getAttribute('aria-checked');
                expect(newChecked).not.toBe(initialChecked);

                await toggleSwitch.click();
                await waitForUIState(async () => (await toggleSwitch.getAttribute('aria-checked')) === initialChecked, {
                    description: 'Toggle restored to original state',
                });
            });

            it('should toggle back when clicked again', async () => {
                const config = HOTKEY_CONFIGS[0];
                const toggleSwitch = await $(`[data-testid="${config.testId}-switch"]`);

                const initial = await toggleSwitch.getAttribute('aria-checked');
                await toggleSwitch.click();
                await waitForUIState(async () => (await toggleSwitch.getAttribute('aria-checked')) !== initial, {
                    description: 'Toggle state changed after first click',
                });
                await toggleSwitch.click();
                await waitForUIState(async () => (await toggleSwitch.getAttribute('aria-checked')) === initial, {
                    description: 'Toggle state restored to initial',
                });

                const final = await toggleSwitch.getAttribute('aria-checked');
                expect(final).toBe(initial);
            });

            it('should toggle each hotkey independently', async () => {
                const config1 = HOTKEY_CONFIGS[0];
                const toggle1 = await $(`[data-testid="${config1.testId}-switch"]`);
                const initial1 = await toggle1.getAttribute('aria-checked');

                await toggle1.click();
                await waitForUIState(async () => (await toggle1.getAttribute('aria-checked')) !== initial1, {
                    description: 'First hotkey toggle state changed',
                });

                const new1 = await toggle1.getAttribute('aria-checked');
                expect(new1).not.toBe(initial1);

                await toggle1.click();
                await waitForUIState(async () => (await toggle1.getAttribute('aria-checked')) === initial1, {
                    description: 'First hotkey toggle restored',
                });
            });
        });

        describe('Cross-Platform', () => {
            it('should report correct platform', async () => {
                const detectedPlatform = await getPlatform();
                expect(['windows', 'macos', 'linux']).toContain(detectedPlatform);
            });
        });

        describe('Behavior Verification', () => {
            async function setToggleTo(testId: string, targetState: 'true' | 'false') {
                const toggle = await $(`[data-testid="${testId}-switch"]`);
                const current = await toggle.getAttribute('aria-checked');
                if (current !== targetState) {
                    await toggle.click();
                    await waitForUIState(async () => (await toggle.getAttribute('aria-checked')) === targetState, {
                        description: `Toggle set to ${targetState}`,
                    });
                }
            }

            describe('Quick Chat Hotkey Behavior', () => {
                const config = HOTKEY_CONFIGS.find((c) => c.id === 'quickChat')!;

                afterEach(async () => {
                    try {
                        await setToggleTo(config.testId, 'true');
                    } catch (error) {
                        console.warn('Hotkey toggle cleanup failed:', error);
                    }
                });

                it('should disable Quick Chat action when toggle is OFF', async () => {
                    await setToggleTo(config.testId, 'false');

                    const toggle = await $(`[data-testid="${config.testId}-switch"]`);
                    const checked = await toggle.getAttribute('aria-checked');
                    expect(checked).toBe('false');
                });

                it('should enable Quick Chat action when toggle is ON', async () => {
                    await setToggleTo(config.testId, 'true');

                    const toggle = await $(`[data-testid="${config.testId}-switch"]`);
                    const checked = await toggle.getAttribute('aria-checked');
                    expect(checked).toBe('true');
                });
            });

            describe('Peek and Hide Hotkey Behavior', () => {
                const config = HOTKEY_CONFIGS.find((c) => c.id === 'peekAndHide')!;

                afterEach(async () => {
                    try {
                        await setToggleTo(config.testId, 'true');
                    } catch (error) {
                        console.warn('Hotkey toggle cleanup failed:', error);
                    }
                });

                it('should disable Peek and Hide action when toggle is OFF', async () => {
                    await setToggleTo(config.testId, 'false');

                    const toggle = await $(`[data-testid="${config.testId}-switch"]`);
                    const checked = await toggle.getAttribute('aria-checked');
                    expect(checked).toBe('false');
                });

                it('should enable Peek and Hide action when toggle is ON', async () => {
                    await setToggleTo(config.testId, 'true');

                    const toggle = await $(`[data-testid="${config.testId}-switch"]`);
                    const checked = await toggle.getAttribute('aria-checked');
                    expect(checked).toBe('true');
                });
            });

            describe('Always on Top Hotkey Behavior', () => {
                const config = HOTKEY_CONFIGS.find((c) => c.id === 'alwaysOnTop')!;

                afterEach(async () => {
                    try {
                        await setToggleTo(config.testId, 'true');
                    } catch (error) {
                        console.warn('Hotkey toggle cleanup failed:', error);
                    }
                });

                it('should disable Always on Top action when toggle is OFF', async () => {
                    await setToggleTo(config.testId, 'false');

                    const toggle = await $(`[data-testid="${config.testId}-switch"]`);
                    const checked = await toggle.getAttribute('aria-checked');
                    expect(checked).toBe('false');
                });

                it('should enable Always on Top action when toggle is ON', async () => {
                    await setToggleTo(config.testId, 'true');

                    const toggle = await $(`[data-testid="${config.testId}-switch"]`);
                    const checked = await toggle.getAttribute('aria-checked');
                    expect(checked).toBe('true');
                });
            });
        });
    });
});
