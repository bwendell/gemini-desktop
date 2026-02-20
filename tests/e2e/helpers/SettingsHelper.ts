/**
 * Settings Helper for E2E Tests.
 *
 * Encapsulates settings file read operations for E2E tests.
 * Provides typed access to persisted settings for verification.
 *
 * **Implementation Note:**
 * This helper delegates to persistenceActions.ts which reads settings
 * using local Node.js fs after getting the userData path from Electron.
 * This approach is more reliable than using require('fs') inside
 * browser.electron.execute().
 *
 * @module SettingsHelper
 */

import { E2ELogger } from './logger';
import {
    readUserPreferences,
    getThemePreference,
    getAlwaysOnTopSetting,
    getHotkeyEnabledSetting,
    getUserPreferencesPath,
    userPreferencesFileExists,
    UserPreferencesData,
} from './persistenceActions';

/**
 * Interface for the settings file structure.
 * Extensible for future settings additions.
 */
export interface SettingsData extends UserPreferencesData {
    // Window state (not currently persisted to user-preferences.json)
    windowBounds?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    isMaximized?: boolean;
    // Auto-update (may be in separate update-settings.json)
    autoCheckUpdates?: boolean;
}

/**
 * Helper class for reading settings from the Electron app's settings file.
 * Used to verify that settings are correctly persisted to disk.
 *
 * Delegates to persistenceActions.ts for reliable file system access.
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
        const settings = await readUserPreferences();
        this.log(`Read settings: ${settings ? 'found' : 'not found'}`);
        return settings as SettingsData | null;
    }

    /**
     * Get the absolute path to the settings file.
     * @returns The full path to user-preferences.json
     */
    async getFilePath(): Promise<string> {
        const filePath = await getUserPreferencesPath();
        this.log(`Settings file path: ${filePath}`);
        return filePath;
    }

    /**
     * Check if the settings file exists.
     * @returns true if the settings file exists
     */
    async exists(): Promise<boolean> {
        return userPreferencesFileExists();
    }

    // ===========================================================================
    // Theme Settings
    // ===========================================================================

    /**
     * Get the persisted theme setting.
     * @returns The theme value, or undefined if not set
     */
    async getTheme(): Promise<'light' | 'dark' | 'system' | undefined> {
        return getThemePreference();
    }

    // ===========================================================================
    // Hotkey Settings
    // ===========================================================================

    /**
     * Get the master hotkeys enabled state.
     * @returns true if hotkeys are enabled, undefined if not set
     * @deprecated There is no master hotkeys toggle - use getHotkeyEnabled() instead
     */
    async getHotkeysEnabled(): Promise<boolean | undefined> {
        const settings = await this.readSettings();
        return settings?.hotkeyAlwaysOnTop; // Use alwaysOnTop as representative
    }

    /**
     * Get the enabled state of a specific hotkey.
     * @param hotkeyId - The hotkey identifier ('alwaysOnTop', 'peekAndHide', 'quickChat')
     * @returns true if the hotkey is enabled, undefined if not set
     */
    async getHotkeyEnabled(hotkeyId: 'alwaysOnTop' | 'peekAndHide' | 'quickChat'): Promise<boolean | undefined> {
        return getHotkeyEnabledSetting(hotkeyId);
    }

    // ===========================================================================
    // Always On Top Settings
    // ===========================================================================

    /**
     * Get the alwaysOnTop window state setting.
     * @returns true if always on top is enabled, undefined if not set
     */
    async getAlwaysOnTop(): Promise<boolean | undefined> {
        return getAlwaysOnTopSetting();
    }

    // ===========================================================================
    // Window State Settings
    // ===========================================================================

    /**
     * Get the persisted window bounds.
     * Note: Window bounds may be in a different settings file.
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
     * Note: This may be stored in update-settings.json instead.
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
