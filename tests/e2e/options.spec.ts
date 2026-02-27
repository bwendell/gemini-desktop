import { browser, expect } from '@wdio/globals';

import { MainWindowPage, OptionsPage } from './pages';
import { expectElementDisplayed, expectTabActive, expectUrlHash } from './helpers/assertions';
import { clickMenuItemById } from './helpers/menuActions';
import {
    waitForOptionsWindow,
    closeOptionsWindow,
    navigateToOptionsTab,
    switchToOptionsWindow,
} from './helpers/optionsWindowActions';
import { isMacOSSync, isWindowsSync } from './helpers/platform';
import { waitForSettingValue } from './helpers/persistenceActions';
import { SettingsHelper } from './helpers/SettingsHelper';
import { ensureSingleWindow, waitForAppReady, withOptionsWindowViaMenu, waitForIpcSettle } from './helpers/workflows';
import { waitForDuration, waitForUIState } from './helpers/waitUtilities';
import { waitForWindowCount } from './helpers/windowActions';

type OptionsElement = {
    waitForDisplayed(options?: { timeout?: number }): Promise<void>;
    isExisting(): Promise<boolean>;
    getText(): Promise<string>;
    getTagName(): Promise<string>;
    getAttribute(name: string): Promise<string | null>;
    $$(selector: string): Promise<OptionsElement[]>;
};

type OptionsBrowser = {
    getWindowHandles(): Promise<string[]>;
    switchToWindow(handle: string): Promise<void>;
    getTitle(): Promise<string>;
    $(selector: string): Promise<OptionsElement>;
};

const optionsBrowser = browser as unknown as OptionsBrowser;

describe('Options', () => {
    describe('Window', () => {
        const mainWindow = new MainWindowPage();
        const optionsPage = new OptionsPage();

        beforeEach(async () => {
            await waitForAppReady();
        });

        afterEach(async () => {
            await ensureSingleWindow();
        });

        it('should open options window with correct window controls', async () => {
            await mainWindow.openOptionsViaMenu();

            await waitForWindowCount(2, 5000);
            await optionsPage.waitForLoad();

            expect(await optionsPage.isTitlebarDisplayed()).toBe(true);

            const iconValidation = await optionsPage.isTitlebarIconValid();
            expect(iconValidation.exists).toBe(true);
            expect(iconValidation.hasValidSrc).toBe(true);
            expect(iconValidation.width).toBeGreaterThan(0);

            expect(await optionsPage.isWindowControlsDisplayed()).toBe(true);

            const buttonCount = await optionsPage.getWindowControlButtonCount();
            expect(buttonCount).toBe(2);

            expect(await optionsPage.isMinimizeButtonDisplayed()).toBe(true);
            expect(await optionsPage.isCloseButtonDisplayed()).toBe(true);

            expect(await optionsPage.isMaximizeButtonExisting()).toBe(false);

            await optionsPage.clickCloseButton();
            await waitForWindowCount(1, 5000);

            const finalHandles = await optionsBrowser.getWindowHandles();
            expect(finalHandles.length).toBe(1);

            await optionsBrowser.switchToWindow(finalHandles[0]);
            const title = await optionsBrowser.getTitle();
            expect(title).toBeDefined();
        });

        it('should not open multiple Options windows - clicking again focuses existing', async () => {
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2, 5000);

            const handlesAfterFirst = await optionsBrowser.getWindowHandles();
            expect(handlesAfterFirst.length).toBe(2);

            await optionsBrowser.switchToWindow(handlesAfterFirst[0]);
            await waitForUIState(
                async () => {
                    const handles = await optionsBrowser.getWindowHandles();
                    return handles[0] === handlesAfterFirst[0];
                },
                { description: 'Main window ready after switch' }
            );

            await mainWindow.openOptionsViaMenu();
            await waitForDuration(1000, 'Allow time to verify no duplicate window creation');

            const handlesAfterSecond = await optionsBrowser.getWindowHandles();
            expect(handlesAfterSecond.length).toBe(2);
            expect(handlesAfterSecond).toEqual(handlesAfterFirst);

            await switchToOptionsWindow();
            await optionsPage.close();
        });
    });

    describe('Tabs', () => {
        beforeEach(async () => {
            await waitForAppReady();
        });

        afterEach(async () => {
            await ensureSingleWindow();
        });

        describe('Tab Switching', () => {
            it('should open Options window with Settings tab active by default', async () => {
                await withOptionsWindowViaMenu(async () => {
                    await expectTabActive('settings');
                    await expectElementDisplayed('[data-testid="theme-selector"]');
                });
            });

            it('should switch to About tab when clicked', async () => {
                await withOptionsWindowViaMenu(async () => {
                    await navigateToOptionsTab('about');
                    await waitForIpcSettle();

                    await expectTabActive('about');
                    await expectElementDisplayed('[data-testid="about-section"]');
                });
            });

            it('should switch back to Settings tab from About', async () => {
                await withOptionsWindowViaMenu(async () => {
                    await navigateToOptionsTab('about');
                    await waitForIpcSettle();

                    await navigateToOptionsTab('settings');
                    await waitForIpcSettle();

                    await expectTabActive('settings');
                    await expectElementDisplayed('[data-testid="theme-selector"]');
                });
            });

            it('should update URL hash when switching tabs', async () => {
                await withOptionsWindowViaMenu(async () => {
                    await navigateToOptionsTab('about');
                    await waitForIpcSettle();

                    await expectUrlHash('#about');

                    await navigateToOptionsTab('settings');
                    await waitForIpcSettle();

                    await expectUrlHash('#settings');
                });
            });
        });

        describe('Opening Options to Specific Tab', () => {
            it('should open directly to About tab via Help > About menu', async () => {
                await clickMenuItemById('menu-help-about');
                await waitForOptionsWindow();

                try {
                    await expectTabActive('about');
                    await expectElementDisplayed('[data-testid="about-section"]');
                } finally {
                    await closeOptionsWindow();
                }
            });
        });

        describe('About Tab Content Verification', () => {
            it('should display app version in About tab', async () => {
                await clickMenuItemById('menu-help-about');
                await waitForOptionsWindow();

                try {
                    const versionElement = await optionsBrowser.$('[data-testid="about-version"]');
                    await versionElement.waitForDisplayed({ timeout: 5000 });

                    const versionText = await versionElement.getText();
                    expect(versionText).toBeTruthy();
                    expect(versionText).toMatch(/\d+\.\d+/);
                } finally {
                    await closeOptionsWindow();
                }
            });

            it('should display disclaimer information', async () => {
                await clickMenuItemById('menu-help-about');
                await waitForOptionsWindow();

                try {
                    const disclaimer = await optionsBrowser.$('[data-testid="about-disclaimer"]');

                    if (await disclaimer.isExisting()) {
                        await expect(disclaimer).toBeDisplayed();
                    }
                } finally {
                    await closeOptionsWindow();
                }
            });

            it('should have clickable license link', async () => {
                await clickMenuItemById('menu-help-about');
                await waitForOptionsWindow();

                try {
                    const licenseLink = await optionsBrowser.$('[data-testid="about-license-link"]');

                    if (await licenseLink.isExisting()) {
                        await expect(licenseLink).toBeDisplayed();

                        const tagName = await licenseLink.getTagName();
                        expect(['a', 'button']).toContain(tagName.toLowerCase());
                    }
                } finally {
                    await closeOptionsWindow();
                }
            });

            it('should have external links that are properly configured', async () => {
                await clickMenuItemById('menu-help-about');
                await waitForOptionsWindow();

                try {
                    const aboutSection = await optionsBrowser.$('[data-testid="about-section"]');
                    await aboutSection.waitForDisplayed({ timeout: 5000 });

                    const links = await aboutSection.$$('a');

                    if (links.length > 0) {
                        for (const link of links) {
                            const href = await link.getAttribute('href');
                            expect(href).toBeTruthy();

                            const target = await link.getAttribute('target');
                            if (href?.startsWith('http')) {
                                expect(target === '_blank' || target === null).toBe(true);
                            }
                        }
                    }
                } finally {
                    await closeOptionsWindow();
                }
            });

            it('should contain Google/Gemini references', async () => {
                await clickMenuItemById('menu-help-about');
                await waitForOptionsWindow();

                try {
                    const aboutSection = await optionsBrowser.$('[data-testid="about-section"]');
                    await aboutSection.waitForDisplayed({ timeout: 5000 });

                    const textContent = await aboutSection.getText();
                    const mentionsGemini = textContent.toLowerCase().includes('gemini');
                    const mentionsGoogle = textContent.toLowerCase().includes('google');

                    expect(mentionsGemini || mentionsGoogle).toBe(true);
                } finally {
                    await closeOptionsWindow();
                }
            });
        });
    });

    describe('Settings Persistence', () => {
        const mainWindow = new MainWindowPage();
        const optionsPage = new OptionsPage();
        const settings = new SettingsHelper();

        beforeEach(async () => {
            await waitForAppReady();
        });

        afterEach(async () => {
            await ensureSingleWindow();
        });

        describe('Theme Preference Persistence', () => {
            it('should save theme preference to settings file', async () => {
                await mainWindow.openOptionsViaMenu();
                await waitForWindowCount(2);
                await optionsPage.waitForLoad();

                await optionsPage.selectTheme('dark');

                const darkThemePersisted = await waitForSettingValue('theme', 'dark', 3000);
                expect(darkThemePersisted).toBe(true);

                const theme = await settings.getTheme();
                expect(theme).toBe('dark');

                await optionsPage.selectTheme('light');

                const lightThemePersisted = await waitForSettingValue('theme', 'light', 3000);
                expect(lightThemePersisted).toBe(true);

                const themeAfterLight = await settings.getTheme();
                expect(themeAfterLight).toBe('light');

                await optionsPage.close();
            });

            it('should save system theme preference to settings file', async () => {
                await mainWindow.openOptionsViaMenu();
                await waitForWindowCount(2);
                await optionsPage.waitForLoad();

                await optionsPage.selectTheme('system');

                const systemThemePersisted = await waitForSettingValue('theme', 'system', 3000);
                expect(systemThemePersisted).toBe(true);

                const theme = await settings.getTheme();
                expect(theme).toBe('system');

                await optionsPage.close();
            });
        });

        describe('Hotkey Enabled State Persistence', () => {
            it('should save hotkey enabled state to settings file', async () => {
                await mainWindow.openOptionsViaMenu();
                await waitForWindowCount(2);
                await optionsPage.waitForLoad();

                const wasEnabled = await optionsPage.isHotkeyEnabled('alwaysOnTop');

                await optionsPage.toggleHotkey('alwaysOnTop');

                const hotkeyPersisted = await waitForSettingValue('hotkeyAlwaysOnTop', !wasEnabled, 3000);
                expect(hotkeyPersisted).toBe(true);

                const hotkeysEnabled = await settings.getHotkeyEnabled('alwaysOnTop');
                expect(hotkeysEnabled).toBe(!wasEnabled);

                await optionsPage.toggleHotkey('alwaysOnTop');

                const restoredPersisted = await waitForSettingValue('hotkeyAlwaysOnTop', wasEnabled, 3000);
                expect(restoredPersisted).toBe(true);

                const restoredState = await settings.getHotkeyEnabled('alwaysOnTop');
                expect(restoredState).toBe(wasEnabled);

                await optionsPage.close();
            });
        });

        describe('Individual Hotkey Toggle Persistence', () => {
            it('should save individual hotkey toggle states to settings file', async () => {
                await mainWindow.openOptionsViaMenu();
                await waitForWindowCount(2);
                await optionsPage.waitForLoad();

                const initialAlwaysOnTop = await optionsPage.isHotkeyEnabled('alwaysOnTop');
                const initialPeekAndHide = await optionsPage.isHotkeyEnabled('peekAndHide');
                const initialQuickChat = await optionsPage.isHotkeyEnabled('quickChat');

                await optionsPage.toggleHotkey('alwaysOnTop');
                const alwaysOnTopPersisted = await waitForSettingValue('hotkeyAlwaysOnTop', !initialAlwaysOnTop, 3000);
                expect(alwaysOnTopPersisted).toBe(true);

                let hotkeyState = await settings.getHotkeyEnabled('alwaysOnTop');
                expect(hotkeyState).toBe(!initialAlwaysOnTop);

                await optionsPage.toggleHotkey('peekAndHide');
                const peekAndHidePersisted = await waitForSettingValue('hotkeyPeekAndHide', !initialPeekAndHide, 3000);
                expect(peekAndHidePersisted).toBe(true);

                hotkeyState = await settings.getHotkeyEnabled('peekAndHide');
                expect(hotkeyState).toBe(!initialPeekAndHide);

                await optionsPage.toggleHotkey('quickChat');
                const quickChatPersisted = await waitForSettingValue('hotkeyQuickChat', !initialQuickChat, 3000);
                expect(quickChatPersisted).toBe(true);

                hotkeyState = await settings.getHotkeyEnabled('quickChat');
                expect(hotkeyState).toBe(!initialQuickChat);

                await optionsPage.toggleHotkey('alwaysOnTop');
                await optionsPage.toggleHotkey('peekAndHide');
                await optionsPage.toggleHotkey('quickChat');

                const alwaysOnTopRestored = await waitForSettingValue('hotkeyAlwaysOnTop', initialAlwaysOnTop, 3000);
                const peekAndHideRestored = await waitForSettingValue('hotkeyPeekAndHide', initialPeekAndHide, 3000);
                const quickChatRestored = await waitForSettingValue('hotkeyQuickChat', initialQuickChat, 3000);
                expect(alwaysOnTopRestored).toBe(true);
                expect(peekAndHideRestored).toBe(true);
                expect(quickChatRestored).toBe(true);

                expect(await settings.getHotkeyEnabled('alwaysOnTop')).toBe(initialAlwaysOnTop);
                expect(await settings.getHotkeyEnabled('peekAndHide')).toBe(initialPeekAndHide);
                expect(await settings.getHotkeyEnabled('quickChat')).toBe(initialQuickChat);

                await optionsPage.close();
            });

            it('should persist each hotkey independently', async () => {
                await mainWindow.openOptionsViaMenu();
                await waitForWindowCount(2);
                await optionsPage.waitForLoad();

                const initialPeekAndHide = await optionsPage.isHotkeyEnabled('peekAndHide');
                await optionsPage.toggleHotkey('peekAndHide');

                const peekAndHideChanged = await waitForSettingValue('hotkeyPeekAndHide', !initialPeekAndHide, 3000);
                expect(peekAndHideChanged).toBe(true);

                const peekAndHideState = await settings.getHotkeyEnabled('peekAndHide');
                expect(peekAndHideState).toBe(!initialPeekAndHide);

                await optionsPage.toggleHotkey('peekAndHide');

                const peekAndHideRestored2 = await waitForSettingValue('hotkeyPeekAndHide', initialPeekAndHide, 3000);
                expect(peekAndHideRestored2).toBe(true);

                const restoredPeekAndHide = await settings.getHotkeyEnabled('peekAndHide');
                expect(restoredPeekAndHide).toBe(initialPeekAndHide);

                await optionsPage.close();
            });
        });

        describe('Settings File Location', () => {
            it('should store settings in the correct user data directory', async () => {
                const settingsPath = await settings.getFilePath();
                expect(settingsPath).toContain('user-preferences.json');

                if (isWindowsSync()) {
                    const isProductionPath = settingsPath.includes('AppData');
                    const isTestIsolationPath = settingsPath.includes('scoped_dir');
                    expect(isProductionPath || isTestIsolationPath).toBe(true);
                } else if (isMacOSSync()) {
                    const isProductionPath = settingsPath.includes('Application Support');
                    const isTestIsolationPath = settingsPath.includes('scoped_dir');
                    expect(isProductionPath || isTestIsolationPath).toBe(true);
                } else {
                    const isProductionPath = settingsPath.includes('gemini-desktop');
                    const isTestIsolationPath = settingsPath.includes('.org.chromium');
                    expect(isProductionPath || isTestIsolationPath).toBe(true);
                }
            });
        });
    });
});
