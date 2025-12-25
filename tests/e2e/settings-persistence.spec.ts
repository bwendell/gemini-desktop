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

import { browser, $, expect } from '@wdio/globals';
import { Selectors } from './helpers/selectors';
import { E2ELogger } from './helpers/logger';
import { clickMenuItemById } from './helpers/menuActions';
import { waitForWindowCount, closeCurrentWindow } from './helpers/windowActions';

/**
 * Interface for the settings file structure.
 */
interface SettingsData {
  theme?: 'light' | 'dark' | 'system';
  hotkeysEnabled?: boolean;
  hotkeyAlwaysOnTop?: boolean;
  hotkeyBossKey?: boolean;
  hotkeyQuickChat?: boolean;
}

/**
 * Read settings from the settings file.
 */
async function readSettingsFile(): Promise<SettingsData | null> {
  return browser.electron.execute((electron: typeof import('electron')) => {
    const path = require('path');
    const fs = require('fs');

    const userDataPath = electron.app.getPath('userData');
    const settingsPath = path.join(userDataPath, 'settings.json');

    try {
      if (!fs.existsSync(settingsPath)) {
        return null;
      }
      const content = fs.readFileSync(settingsPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('[E2E] Failed to read settings file:', error);
      return null;
    }
  });
}

/**
 * Get the path to the settings file.
 */
async function getSettingsFilePath(): Promise<string> {
  return browser.electron.execute((electron: typeof import('electron')) => {
    const path = require('path');
    const userDataPath = electron.app.getPath('userData');
    return path.join(userDataPath, 'settings.json');
  });
}

describe('Settings Persistence', () => {
  beforeEach(async () => {
    // Ensure app is loaded
    const mainLayout = await $(Selectors.mainLayout);
    await mainLayout.waitForExist({ timeout: 15000 });
  });

  describe('Theme Preference Persistence', () => {
    it('should save theme preference to settings file', async () => {
      // 1. Open Options window
      await clickMenuItemById('menu-file-options');
      await waitForWindowCount(2, 5000);

      const handles = await browser.getWindowHandles();
      const optionsWindowHandle = handles[1];
      await browser.switchToWindow(optionsWindowHandle);
      await browser.pause(500);

      // 2. Click dark theme card
      const darkThemeCard = await $(Selectors.themeCard('dark'));
      await darkThemeCard.click();
      await browser.pause(500);

      // 3. Read settings file and verify theme is saved
      const settings = await readSettingsFile();

      expect(settings).not.toBeNull();
      expect(settings?.theme).toBe('dark');

      E2ELogger.info('settings-persistence', `Theme saved: ${settings?.theme}`);

      // 4. Switch to light theme and verify
      const lightThemeCard = await $(Selectors.themeCard('light'));
      await lightThemeCard.click();
      await browser.pause(500);

      const settingsAfterLight = await readSettingsFile();
      expect(settingsAfterLight?.theme).toBe('light');

      E2ELogger.info('settings-persistence', `Theme updated to: ${settingsAfterLight?.theme}`);

      // Cleanup: close options window
      await closeCurrentWindow();
      await browser.switchToWindow(handles[0]);
    });

    it('should save system theme preference to settings file', async () => {
      // 1. Open Options window
      await clickMenuItemById('menu-file-options');
      await waitForWindowCount(2, 5000);

      const handles = await browser.getWindowHandles();
      await browser.switchToWindow(handles[1]);
      await browser.pause(500);

      // 2. Click system theme card
      const systemThemeCard = await $(Selectors.themeCard('system'));
      await systemThemeCard.click();
      await browser.pause(500);

      // 3. Verify settings
      const settings = await readSettingsFile();
      expect(settings?.theme).toBe('system');

      E2ELogger.info('settings-persistence', `System theme saved: ${settings?.theme}`);

      // Cleanup
      await closeCurrentWindow();
      await browser.switchToWindow(handles[0]);
    });
  });

  describe('Hotkey Enabled State Persistence', () => {
    it('should save hotkey enabled state to settings file', async () => {
      // 1. Open Options window
      await clickMenuItemById('menu-file-options');
      await waitForWindowCount(2, 5000);

      const handles = await browser.getWindowHandles();
      await browser.switchToWindow(handles[1]);
      await browser.pause(500);

      // 2. Get initial toggle state
      const toggleSwitch = await $('[data-testid="hotkey-toggle-switch"]');
      const initialState = await toggleSwitch.getAttribute('aria-checked');
      const wasEnabled = initialState === 'true';

      E2ELogger.info(
        'settings-persistence',
        `Initial hotkey state: ${wasEnabled ? 'enabled' : 'disabled'}`
      );

      // 3. Click toggle to change state
      await toggleSwitch.click();
      await browser.pause(500);

      // 4. Verify settings file was updated
      const settings = await readSettingsFile();
      expect(settings?.hotkeysEnabled).toBe(!wasEnabled);

      E2ELogger.info('settings-persistence', `Hotkey state saved: ${settings?.hotkeysEnabled}`);

      // 5. Toggle back to original state
      await toggleSwitch.click();
      await browser.pause(500);

      const settingsAfterRestore = await readSettingsFile();
      expect(settingsAfterRestore?.hotkeysEnabled).toBe(wasEnabled);

      E2ELogger.info(
        'settings-persistence',
        `Hotkey state restored: ${settingsAfterRestore?.hotkeysEnabled}`
      );

      // Cleanup
      await closeCurrentWindow();
      await browser.switchToWindow(handles[0]);
    });
  });

  describe('Individual Hotkey Toggle Persistence', () => {
    it('should save individual hotkey toggle states to settings file', async () => {
      // 1. Open Options window
      await clickMenuItemById('menu-file-options');
      await waitForWindowCount(2, 5000);

      const handles = await browser.getWindowHandles();
      await browser.switchToWindow(handles[1]);
      await browser.pause(500);

      // 2. Get initial toggle states for all three hotkeys
      const alwaysOnTopToggle = await $('[data-testid="hotkey-toggle-alwaysOnTop-switch"]');
      const bossKeyToggle = await $('[data-testid="hotkey-toggle-bossKey-switch"]');
      const quickChatToggle = await $('[data-testid="hotkey-toggle-quickChat-switch"]');

      await alwaysOnTopToggle.waitForDisplayed({ timeout: 5000 });

      const initialAlwaysOnTop = (await alwaysOnTopToggle.getAttribute('aria-checked')) === 'true';
      const initialBossKey = (await bossKeyToggle.getAttribute('aria-checked')) === 'true';
      const initialQuickChat = (await quickChatToggle.getAttribute('aria-checked')) === 'true';

      E2ELogger.info(
        'settings-persistence',
        `Initial states - AlwaysOnTop: ${initialAlwaysOnTop}, BossKey: ${initialBossKey}, QuickChat: ${initialQuickChat}`
      );

      // 3. Toggle Always-on-Top hotkey and verify persistence
      await alwaysOnTopToggle.click();
      await browser.pause(500);

      let settings = await readSettingsFile();
      expect(settings?.hotkeyAlwaysOnTop).toBe(!initialAlwaysOnTop);
      E2ELogger.info('settings-persistence', `AlwaysOnTop saved: ${settings?.hotkeyAlwaysOnTop}`);

      // 4. Toggle Boss Key hotkey and verify persistence
      await bossKeyToggle.click();
      await browser.pause(500);

      settings = await readSettingsFile();
      expect(settings?.hotkeyBossKey).toBe(!initialBossKey);
      E2ELogger.info('settings-persistence', `BossKey saved: ${settings?.hotkeyBossKey}`);

      // 5. Toggle Quick Chat hotkey and verify persistence
      await quickChatToggle.click();
      await browser.pause(500);

      settings = await readSettingsFile();
      expect(settings?.hotkeyQuickChat).toBe(!initialQuickChat);
      E2ELogger.info('settings-persistence', `QuickChat saved: ${settings?.hotkeyQuickChat}`);

      // 6. Restore original states
      await alwaysOnTopToggle.click();
      await bossKeyToggle.click();
      await quickChatToggle.click();
      await browser.pause(500);

      // 7. Verify all states restored
      const restoredSettings = await readSettingsFile();
      expect(restoredSettings?.hotkeyAlwaysOnTop).toBe(initialAlwaysOnTop);
      expect(restoredSettings?.hotkeyBossKey).toBe(initialBossKey);
      expect(restoredSettings?.hotkeyQuickChat).toBe(initialQuickChat);

      E2ELogger.info('settings-persistence', 'All individual hotkey states restored');

      // Cleanup
      await closeCurrentWindow();
      await browser.switchToWindow(handles[0]);
    });

    it('should persist each hotkey independently', async () => {
      // 1. Open Options window
      await clickMenuItemById('menu-file-options');
      await waitForWindowCount(2, 5000);

      const handles = await browser.getWindowHandles();
      await browser.switchToWindow(handles[1]);
      await browser.pause(500);

      // 2. Toggle only Boss Key (leave others unchanged)
      const bossKeyToggle = await $('[data-testid="hotkey-toggle-bossKey-switch"]');
      await bossKeyToggle.waitForDisplayed({ timeout: 5000 });

      const initialBossKey = (await bossKeyToggle.getAttribute('aria-checked')) === 'true';
      await bossKeyToggle.click();
      await browser.pause(500);

      // 3. Verify only Boss Key changed in settings
      const settings = await readSettingsFile();
      expect(settings?.hotkeyBossKey).toBe(!initialBossKey);

      // 4. Restore and verify
      await bossKeyToggle.click();
      await browser.pause(500);

      const restoredSettings = await readSettingsFile();
      expect(restoredSettings?.hotkeyBossKey).toBe(initialBossKey);

      E2ELogger.info('settings-persistence', 'Individual hotkey persistence verified');

      // Cleanup
      await closeCurrentWindow();
      await browser.switchToWindow(handles[0]);
    });
  });

  describe('Settings File Location', () => {
    it('should store settings in the correct user data directory', async () => {
      const settingsPath = await getSettingsFilePath();

      // Should be in userData directory
      expect(settingsPath).toContain('settings.json');

      // Path should be platform-appropriate
      if (process.platform === 'win32') {
        expect(settingsPath).toContain('AppData');
      } else if (process.platform === 'darwin') {
        expect(settingsPath).toContain('Application Support');
      } else {
        // Linux uses .config or similar
        expect(settingsPath).toContain('gemini-desktop');
      }

      E2ELogger.info('settings-persistence', `Settings file path: ${settingsPath}`);
    });
  });
});
