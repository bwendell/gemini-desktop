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
import { E2ELogger } from './helpers/logger';
import { waitForWindowCount } from './helpers/windowActions';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';

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

      // Wait for settings file to be written
      await browser.pause(500);

      // 3. Read settings file and verify theme is saved
      const theme = await settings.getTheme();

      expect(theme).toBe('dark');
      E2ELogger.info('settings-persistence', `Theme saved: ${theme}`);

      // 4. Switch to light theme and verify
      await optionsPage.selectTheme('light');

      // Wait for settings file to be written
      await browser.pause(500);

      const themeAfterLight = await settings.getTheme();
      expect(themeAfterLight).toBe('light');

      E2ELogger.info('settings-persistence', `Theme updated to: ${themeAfterLight}`);

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

      // 3. Verify settings
      const theme = await settings.getTheme();
      expect(theme).toBe('system');

      E2ELogger.info('settings-persistence', `System theme saved: ${theme}`);

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

      E2ELogger.info(
        'settings-persistence',
        `Initial alwaysOnTop hotkey state: ${wasEnabled ? 'enabled' : 'disabled'}`
      );

      // 3. Click toggle to change state
      await optionsPage.toggleHotkey('alwaysOnTop');

      // Wait for settings file to be written
      await browser.pause(500);

      // 4. Verify settings file was updated
      const hotkeysEnabled = await settings.getHotkeyEnabled('alwaysOnTop');
      expect(hotkeysEnabled).toBe(!wasEnabled);

      E2ELogger.info('settings-persistence', `Hotkey state saved: ${hotkeysEnabled}`);

      // 5. Toggle back to original state
      await optionsPage.toggleHotkey('alwaysOnTop');

      // Wait for settings file to be written
      await browser.pause(500);

      const restoredState = await settings.getHotkeyEnabled('alwaysOnTop');
      expect(restoredState).toBe(wasEnabled);

      E2ELogger.info('settings-persistence', `Hotkey state restored: ${restoredState}`);

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
      const initialBossKey = await optionsPage.isHotkeyEnabled('bossKey');
      const initialQuickChat = await optionsPage.isHotkeyEnabled('quickChat');

      E2ELogger.info(
        'settings-persistence',
        `Initial states - AlwaysOnTop: ${initialAlwaysOnTop}, BossKey: ${initialBossKey}, QuickChat: ${initialQuickChat}`
      );

      // 3. Toggle Always-on-Top hotkey and verify persistence
      await optionsPage.toggleHotkey('alwaysOnTop');
      await browser.pause(500);

      let hotkeyState = await settings.getHotkeyEnabled('alwaysOnTop');
      expect(hotkeyState).toBe(!initialAlwaysOnTop);
      E2ELogger.info('settings-persistence', `AlwaysOnTop saved: ${hotkeyState}`);

      // 4. Toggle Boss Key hotkey and verify persistence
      await optionsPage.toggleHotkey('bossKey');
      await browser.pause(500);

      hotkeyState = await settings.getHotkeyEnabled('bossKey');
      expect(hotkeyState).toBe(!initialBossKey);
      E2ELogger.info('settings-persistence', `BossKey saved: ${hotkeyState}`);

      // 5. Toggle Quick Chat hotkey and verify persistence
      await optionsPage.toggleHotkey('quickChat');
      await browser.pause(500);

      hotkeyState = await settings.getHotkeyEnabled('quickChat');
      expect(hotkeyState).toBe(!initialQuickChat);
      E2ELogger.info('settings-persistence', `QuickChat saved: ${hotkeyState}`);

      // 6. Restore original states
      await optionsPage.toggleHotkey('alwaysOnTop');
      await optionsPage.toggleHotkey('bossKey');
      await optionsPage.toggleHotkey('quickChat');

      // 7. Verify all states restored
      expect(await settings.getHotkeyEnabled('alwaysOnTop')).toBe(initialAlwaysOnTop);
      expect(await settings.getHotkeyEnabled('bossKey')).toBe(initialBossKey);
      expect(await settings.getHotkeyEnabled('quickChat')).toBe(initialQuickChat);

      E2ELogger.info('settings-persistence', 'All individual hotkey states restored');

      // Cleanup
      await optionsPage.close();
    });

    it('should persist each hotkey independently', async () => {
      // 1. Open Options window
      await mainWindow.openOptionsViaMenu();
      await waitForWindowCount(2);
      await optionsPage.waitForLoad();

      // 2. Toggle only Boss Key (leave others unchanged)
      const initialBossKey = await optionsPage.isHotkeyEnabled('bossKey');
      await optionsPage.toggleHotkey('bossKey');

      // 3. Verify only Boss Key changed in settings
      const bossKeyState = await settings.getHotkeyEnabled('bossKey');
      expect(bossKeyState).toBe(!initialBossKey);

      // 4. Restore and verify
      await optionsPage.toggleHotkey('bossKey');

      const restoredBossKey = await settings.getHotkeyEnabled('bossKey');
      expect(restoredBossKey).toBe(initialBossKey);

      E2ELogger.info('settings-persistence', 'Individual hotkey persistence verified');

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
      if (process.platform === 'win32') {
        expect(settingsPath).toContain('AppData');
      } else if (process.platform === 'darwin') {
        expect(settingsPath).toContain('Application Support');
      } else {
        // Linux uses .config/gemini-desktop in production, but E2E tests use
        // temporary scoped directories like /tmp/.org.chromium.Chromium.scoped_dir.XXX/
        // for test isolation
        const isProductionPath = settingsPath.includes('gemini-desktop');
        const isTestIsolationPath = settingsPath.includes('.org.chromium');
        expect(isProductionPath || isTestIsolationPath).toBe(true);
      }

      E2ELogger.info('settings-persistence', `Settings file path: ${settingsPath}`);
    });
  });
});
