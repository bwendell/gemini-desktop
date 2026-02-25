/**
 * E2E Test: Settings Persistence
 *
 * Tests that user settings are correctly persisted to disk.
 * Instead of restarting the app, we verify settings are written
 * to the settings.json file.
 *
 * Verifies:
 * 1. Theme preference is saved to disk
 * 2. Hotkey enabled state is saved to disk
 *
 * Cross-platform: Windows, macOS, Linux
 *
 * @module settings-persistence.spec
 */

import { expect } from '@wdio/globals';
import { MainWindowPage, OptionsPage } from './pages';
import { SettingsHelper } from './helpers/SettingsHelper';
import { waitForWindowCount } from './helpers/windowActions';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { waitForSettingValue } from './helpers/persistenceActions';
import { isWindowsSync, isMacOSSync } from './helpers/platform';

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
            // 1. Open Options window
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2);
            await optionsPage.waitForLoad();

            // 2. Click dark theme card
            await optionsPage.selectTheme('dark');

            // Wait for settings file to be written and assert it succeeded
            const darkThemePersisted = await waitForSettingValue('theme', 'dark', 3000);
            expect(darkThemePersisted).toBe(true);

            // 3. Read settings file and verify theme is saved
            const theme = await settings.getTheme();

            expect(theme).toBe('dark');

            // 4. Switch to light theme and verify
            await optionsPage.selectTheme('light');

            // Wait for settings file to be written and assert it succeeded
            const lightThemePersisted = await waitForSettingValue('theme', 'light', 3000);
            expect(lightThemePersisted).toBe(true);

            const themeAfterLight = await settings.getTheme();
            expect(themeAfterLight).toBe('light');

            // Cleanup: close options window
            await optionsPage.close();
        });

        it('should save system theme preference to settings file', async () => {
            // 1. Open Options window
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2);
            await optionsPage.waitForLoad();

            // 2. Click system theme card
            await optionsPage.selectTheme('system');

            // Wait for settings file to be written and assert it succeeded
            const systemThemePersisted = await waitForSettingValue('theme', 'system', 3000);
            expect(systemThemePersisted).toBe(true);

            // 3. Verify settings
            const theme = await settings.getTheme();
            expect(theme).toBe('system');

            // Cleanup
            await optionsPage.close();
        });
    });

    describe('Hotkey Enabled State Persistence', () => {
        it('should save hotkey enabled state to settings file', async () => {
            // 1. Open Options window
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2);
            await optionsPage.waitForLoad();

            // 2. Get initial toggle state using individual hotkey (alwaysOnTop as representative)
            const wasEnabled = await optionsPage.isHotkeyEnabled('alwaysOnTop');

            // 3. Click toggle to change state
            await optionsPage.toggleHotkey('alwaysOnTop');

            // 4. Wait for settings to be persisted (condition-based, not static timeout) and assert
            const hotkeyPersisted = await waitForSettingValue('hotkeyAlwaysOnTop', !wasEnabled, 3000);
            expect(hotkeyPersisted).toBe(true);

            // 5. Verify settings file was updated
            const hotkeysEnabled = await settings.getHotkeyEnabled('alwaysOnTop');
            expect(hotkeysEnabled).toBe(!wasEnabled);

            // 6. Toggle back to original state
            await optionsPage.toggleHotkey('alwaysOnTop');

            // Wait for settings to be persisted and assert
            const restoredPersisted = await waitForSettingValue('hotkeyAlwaysOnTop', wasEnabled, 3000);
            expect(restoredPersisted).toBe(true);

            const restoredState = await settings.getHotkeyEnabled('alwaysOnTop');
            expect(restoredState).toBe(wasEnabled);

            // Cleanup
            await optionsPage.close();
        });
    });

    describe('Individual Hotkey Toggle Persistence', () => {
        it('should save individual hotkey toggle states to settings file', async () => {
            // 1. Open Options window
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2);
            await optionsPage.waitForLoad();

            // 2. Get initial toggle states for all three hotkeys
            const initialAlwaysOnTop = await optionsPage.isHotkeyEnabled('alwaysOnTop');
            const initialPeekAndHide = await optionsPage.isHotkeyEnabled('peekAndHide');
            const initialQuickChat = await optionsPage.isHotkeyEnabled('quickChat');

            // 3. Toggle Always-on-Top hotkey and verify persistence
            await optionsPage.toggleHotkey('alwaysOnTop');
            const alwaysOnTopPersisted = await waitForSettingValue('hotkeyAlwaysOnTop', !initialAlwaysOnTop, 3000);
            expect(alwaysOnTopPersisted).toBe(true);

            let hotkeyState = await settings.getHotkeyEnabled('alwaysOnTop');
            expect(hotkeyState).toBe(!initialAlwaysOnTop);

            // 4. Toggle Peek and Hide hotkey and verify persistence
            await optionsPage.toggleHotkey('peekAndHide');
            const peekAndHidePersisted = await waitForSettingValue('hotkeyPeekAndHide', !initialPeekAndHide, 3000);
            expect(peekAndHidePersisted).toBe(true);

            hotkeyState = await settings.getHotkeyEnabled('peekAndHide');
            expect(hotkeyState).toBe(!initialPeekAndHide);

            // 5. Toggle Quick Chat hotkey and verify persistence
            await optionsPage.toggleHotkey('quickChat');
            const quickChatPersisted = await waitForSettingValue('hotkeyQuickChat', !initialQuickChat, 3000);
            expect(quickChatPersisted).toBe(true);

            hotkeyState = await settings.getHotkeyEnabled('quickChat');
            expect(hotkeyState).toBe(!initialQuickChat);

            // 6. Restore original states
            await optionsPage.toggleHotkey('alwaysOnTop');
            await optionsPage.toggleHotkey('peekAndHide');
            await optionsPage.toggleHotkey('quickChat');

            // Wait for all to be persisted and assert
            const alwaysOnTopRestored = await waitForSettingValue('hotkeyAlwaysOnTop', initialAlwaysOnTop, 3000);
            const peekAndHideRestored = await waitForSettingValue('hotkeyPeekAndHide', initialPeekAndHide, 3000);
            const quickChatRestored = await waitForSettingValue('hotkeyQuickChat', initialQuickChat, 3000);
            expect(alwaysOnTopRestored).toBe(true);
            expect(peekAndHideRestored).toBe(true);
            expect(quickChatRestored).toBe(true);

            // 7. Verify all states restored
            expect(await settings.getHotkeyEnabled('alwaysOnTop')).toBe(initialAlwaysOnTop);
            expect(await settings.getHotkeyEnabled('peekAndHide')).toBe(initialPeekAndHide);
            expect(await settings.getHotkeyEnabled('quickChat')).toBe(initialQuickChat);

            // Cleanup
            await optionsPage.close();
        });

        it('should persist each hotkey independently', async () => {
            // 1. Open Options window
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2);
            await optionsPage.waitForLoad();

            // 2. Toggle only Peek and Hide (leave others unchanged)
            const initialPeekAndHide = await optionsPage.isHotkeyEnabled('peekAndHide');
            await optionsPage.toggleHotkey('peekAndHide');

            // Wait for settings to be persisted and assert
            const peekAndHideChanged = await waitForSettingValue('hotkeyPeekAndHide', !initialPeekAndHide, 3000);
            expect(peekAndHideChanged).toBe(true);

            // 3. Verify only Peek and Hide changed in settings
            const peekAndHideState = await settings.getHotkeyEnabled('peekAndHide');
            expect(peekAndHideState).toBe(!initialPeekAndHide);

            // 4. Restore and verify
            await optionsPage.toggleHotkey('peekAndHide');

            // Wait for settings to be persisted and assert
            const peekAndHideRestored2 = await waitForSettingValue('hotkeyPeekAndHide', initialPeekAndHide, 3000);
            expect(peekAndHideRestored2).toBe(true);

            const restoredPeekAndHide = await settings.getHotkeyEnabled('peekAndHide');
            expect(restoredPeekAndHide).toBe(initialPeekAndHide);

            // Cleanup
            await optionsPage.close();
        });
    });

    describe('Settings File Location', () => {
        it('should store settings in the correct user data directory', async () => {
            const settingsPath = await settings.getFilePath();

            // Should be in userData directory with correct filename
            expect(settingsPath).toContain('user-preferences.json');

            // Path should be platform-appropriate
            if (isWindowsSync()) {
                // Windows uses AppData in production, but E2E tests use temporary scoped
                // directories like C:\Windows\SystemTemp\scoped_dir... for test isolation
                const isProductionPath = settingsPath.includes('AppData');
                const isTestIsolationPath = settingsPath.includes('scoped_dir');
                expect(isProductionPath || isTestIsolationPath).toBe(true);
            } else if (isMacOSSync()) {
                // macOS uses Application Support in production, but E2E tests use
                // temporary scoped directories like /private/var/folders/.../T/.org.chromium.Chromium.scoped_dir.XXX/
                // for test isolation
                const isProductionPath = settingsPath.includes('Application Support');
                const isTestIsolationPath = settingsPath.includes('scoped_dir');
                expect(isProductionPath || isTestIsolationPath).toBe(true);
            } else {
                // Linux uses .config/gemini-desktop in production, but E2E tests use
                // temporary scoped directories like /tmp/.org.chromium.Chromium.scoped_dir.XXX/
                // for test isolation
                const isProductionPath = settingsPath.includes('gemini-desktop');
                const isTestIsolationPath = settingsPath.includes('.org.chromium');
                expect(isProductionPath || isTestIsolationPath).toBe(true);
            }
        });
    });
});
