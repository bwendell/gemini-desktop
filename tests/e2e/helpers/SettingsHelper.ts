/**
 * Settings Helper for E2E Tests.
 *
 * Encapsulates settings file read operations in the Electron main process.
 * Provides typed access to persisted settings for verification in E2E tests.
 *
 * @module SettingsHelper
 */

/// <reference path="./wdio-electron.d.ts" />

import { browser } from '@wdio/globals';
import { E2ELogger } from './logger';

/**
 * Interface for the settings file structure.
 * Extensible for future settings additions.
 */
export interface SettingsData {
  theme?: 'light' | 'dark' | 'system';
  hotkeysEnabled?: boolean;
  hotkeyAlwaysOnTop?: boolean;
  hotkeyBossKey?: boolean;
  hotkeyQuickChat?: boolean;
  // Window state
  windowBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isMaximized?: boolean;
  // Auto-update
  autoCheckUpdates?: boolean;
  // Future extensibility
  [key: string]: unknown;
}

/**
 * Helper class for reading settings from the Electron app's settings file.
 * Used to verify that settings are correctly persisted to disk.
 */
export class SettingsHelper {
  private readonly logName = 'SettingsHelper';

  // ===========================================================================
  // File Operations
  // ===========================================================================

  /**
   * Read all settings from the settings file.
   * @returns The parsed settings object, or null if file doesn't exist or is invalid.
   */
  async readSettings(): Promise<SettingsData | null> {
    const settings = await browser.electron.execute((electron: typeof import('electron')) => {
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

    this.log(`Read settings: ${settings ? 'found' : 'not found'}`);
    return settings;
  }

  /**
   * Get the absolute path to the settings file.
   * @returns The full path to settings.json
   */
  async getFilePath(): Promise<string> {
    const path = await browser.electron.execute((electron: typeof import('electron')) => {
      const pathModule = require('path');
      const userDataPath = electron.app.getPath('userData');
      return pathModule.join(userDataPath, 'settings.json');
    });

    this.log(`Settings file path: ${path}`);
    return path;
  }

  /**
   * Check if the settings file exists.
   * @returns true if the settings file exists
   */
  async exists(): Promise<boolean> {
    const exists = await browser.electron.execute((electron: typeof import('electron')) => {
      const path = require('path');
      const fs = require('fs');

      const userDataPath = electron.app.getPath('userData');
      const settingsPath = path.join(userDataPath, 'settings.json');

      return fs.existsSync(settingsPath);
    });

    return exists;
  }

  // ===========================================================================
  // Theme Settings
  // ===========================================================================

  /**
   * Get the persisted theme setting.
   * @returns The theme value, or undefined if not set
   */
  async getTheme(): Promise<'light' | 'dark' | 'system' | undefined> {
    const settings = await this.readSettings();
    return settings?.theme;
  }

  // ===========================================================================
  // Hotkey Settings
  // ===========================================================================

  /**
   * Get the master hotkeys enabled state.
   * @returns true if hotkeys are enabled, undefined if not set
   */
  async getHotkeysEnabled(): Promise<boolean | undefined> {
    const settings = await this.readSettings();
    return settings?.hotkeysEnabled;
  }

  /**
   * Get the enabled state of a specific hotkey.
   * @param hotkeyId - The hotkey identifier (e.g., 'alwaysOnTop', 'bossKey', 'quickChat')
   * @returns true if the hotkey is enabled, undefined if not set
   */
  async getHotkeyEnabled(hotkeyId: string): Promise<boolean | undefined> {
    const settings = await this.readSettings();
    if (!settings) return undefined;

    // Map hotkey IDs to settings keys
    const keyMap: Record<string, keyof SettingsData> = {
      alwaysOnTop: 'hotkeyAlwaysOnTop',
      bossKey: 'hotkeyBossKey',
      quickChat: 'hotkeyQuickChat',
    };

    const settingsKey = keyMap[hotkeyId];
    if (!settingsKey) {
      this.log(`Unknown hotkey ID: ${hotkeyId}`);
      return undefined;
    }

    return settings[settingsKey] as boolean | undefined;
  }

  // ===========================================================================
  // Window State Settings
  // ===========================================================================

  /**
   * Get the persisted window bounds.
   * @returns The window bounds object, or undefined if not set
   */
  async getWindowBounds(): Promise<SettingsData['windowBounds'] | undefined> {
    const settings = await this.readSettings();
    return settings?.windowBounds;
  }

  /**
   * Get the persisted maximized state.
   * @returns true if window was maximized, undefined if not set
   */
  async getIsMaximized(): Promise<boolean | undefined> {
    const settings = await this.readSettings();
    return settings?.isMaximized;
  }

  // ===========================================================================
  // Auto-Update Settings
  // ===========================================================================

  /**
   * Get the auto-check updates setting.
   * @returns true if auto-check is enabled, undefined if not set
   */
  async getAutoCheckUpdates(): Promise<boolean | undefined> {
    const settings = await this.readSettings();
    return settings?.autoCheckUpdates;
  }

  // ===========================================================================
  // Generic Access
  // ===========================================================================

  /**
   * Get a specific setting value by key.
   * @param key - The settings key to retrieve
   * @returns The setting value, or undefined if not set
   */
  async getSetting<K extends keyof SettingsData>(key: K): Promise<SettingsData[K] | undefined> {
    const settings = await this.readSettings();
    return settings?.[key];
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Log a message with the helper name prefix.
   * @param message - Message to log
   */
  private log(message: string): void {
    E2ELogger.info(this.logName, message);
  }
}
