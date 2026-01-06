/**
 * E2E Persistence Helpers.
 *
 * Provides reusable utilities for testing session persistence, cookies,
 * and storage functionality across E2E tests.
 *
 * @module persistenceActions
 */

/// <reference path="./wdio-electron.d.ts" />

import { browser } from '@wdio/globals';
import path from 'path';
import fs from 'fs';
import { E2ELogger } from './logger';
import { E2E_TIMING } from './e2eConstants';

// =============================================================================
// Session State
// =============================================================================

/**
 * Checks if the default Electron session is persistent.
 * @returns true if the session has a storage path (is persistent)
 */
export async function isSessionPersistent(): Promise<boolean> {
    const isPersistent = await browser.electron.execute((electron) => {
        const sess = electron.session.defaultSession;
        // No partition name means it's the default persistent session
        return sess.getStoragePath() !== '';
    });
    E2ELogger.info('persistence', `Session persistent: ${isPersistent}`);
    return isPersistent;
}

/**
 * Gets the userData path from Electron.
 * @returns The userData directory path
 */
export async function getUserDataPath(): Promise<string> {
    return browser.electron.execute((electron) => electron.app.getPath('userData'));
}

// =============================================================================
// Cookie File Operations
// =============================================================================

/**
 * Checks if the Cookies file exists in the userData directory.
 * Electron stores cookies in 'Cookies' or 'Network/Cookies'.
 *
 * @param userDataPath - The userData directory path
 * @returns true if either cookies file location exists
 */
export function cookiesFileExists(userDataPath: string): boolean {
    const cookiesPath = path.join(userDataPath, 'Cookies');
    const networkCookiesPath = path.join(userDataPath, 'Network', 'Cookies');
    return fs.existsSync(cookiesPath) || fs.existsSync(networkCookiesPath);
}

/**
 * Waits for the Cookies file to exist (Electron may need time to flush).
 * @param userDataPath - The userData directory path
 * @param timeout - Max wait time in ms (default: 5000)
 */
export async function waitForCookiesFile(userDataPath: string, timeout = 5000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        if (cookiesFileExists(userDataPath)) {
            E2ELogger.info('persistence', 'Cookies file found');
            return true;
        }
        await browser.pause(500);
    }

    E2ELogger.info('persistence', 'Cookies file not found within timeout');
    return false;
}

// =============================================================================
// Cookie Operations via Session API
// =============================================================================

interface CookieOptions {
    url: string;
    name: string;
    value: string;
    expirationDate?: number;
}

/**
 * Sets a cookie via the Electron session API.
 * @param options - Cookie options (url, name, value, optional expiration)
 */
export async function setCookieViaSession(options: CookieOptions): Promise<void> {
    const { url, name, value, expirationDate } = options;

    await browser.electron.execute(
        (electron, opts) => {
            const sess = electron.session.defaultSession;
            return sess.cookies.set({
                url: opts.url,
                name: opts.name,
                value: opts.value,
                expirationDate: opts.expirationDate || Math.floor(Date.now() / 1000) + 3600,
            });
        },
        { url, name, value, expirationDate }
    );

    E2ELogger.info('persistence', `Set cookie: ${name}`);
}

/**
 * Gets cookies from the Electron session API.
 * @param name - Cookie name to filter by
 * @returns Array of matching cookies
 */
export async function getCookiesFromSession(name: string): Promise<Array<{ name: string; value: string }>> {
    const cookies = await browser.electron.execute((electron, cookieName) => {
        const sess = electron.session.defaultSession;
        return sess.cookies.get({ name: cookieName });
    }, name);

    return cookies;
}

// =============================================================================
// Page Operations
// =============================================================================

/**
 * Reloads the current page and waits for it to settle.
 * @param waitMs - Time to wait after reload (default: 2000)
 */
export async function reloadPage(waitMs = E2E_TIMING.PAGE_LOAD): Promise<void> {
    await browser.execute(() => window.location.reload());
    await browser.pause(waitMs);
    E2ELogger.info('persistence', 'Page reloaded');
}

// =============================================================================
// Settings File Operations
// =============================================================================

/** Settings file configuration constants */
const SETTINGS_FILES = {
    /** User preferences (theme, hotkeys, alwaysOnTop) */
    USER_PREFERENCES: 'user-preferences.json',
    /** Update settings (auto-update) */
    UPDATE_SETTINGS: 'update-settings.json',
} as const;

/**
 * Interface for user preferences stored in user-preferences.json
 */
export interface UserPreferencesData {
    theme?: 'light' | 'dark' | 'system';
    alwaysOnTop?: boolean;
    hotkeyAlwaysOnTop?: boolean;
    hotkeyBossKey?: boolean;
    hotkeyQuickChat?: boolean;
    acceleratorAlwaysOnTop?: string;
    acceleratorBossKey?: string;
    acceleratorQuickChat?: string;
    autoUpdateEnabled?: boolean;
    zoomLevel?: number;
    [key: string]: unknown;
}

/**
 * Reads a settings file from the userData directory.
 * Uses getUserDataPath() to get the path, then local fs to read.
 *
 * @param filename - The settings filename (e.g., 'user-preferences.json')
 * @returns The parsed settings object, or null if file doesn't exist or is invalid
 */
export async function readSettingsFile<T = UserPreferencesData>(
    filename: string = SETTINGS_FILES.USER_PREFERENCES
): Promise<T | null> {
    try {
        const userDataPath = await getUserDataPath();
        const settingsPath = path.join(userDataPath, filename);

        if (!fs.existsSync(settingsPath)) {
            E2ELogger.info('persistence', `Settings file not found: ${filename}`);
            return null;
        }

        const content = fs.readFileSync(settingsPath, 'utf-8');
        const settings = JSON.parse(content) as T;
        E2ELogger.info('persistence', `Read settings from: ${filename}`);
        return settings;
    } catch (error) {
        E2ELogger.info('persistence', `Failed to read settings file: ${error}`);
        return null;
    }
}

/**
 * Read user preferences from user-preferences.json.
 * This file contains theme, hotkey, and alwaysOnTop settings.
 *
 * @returns The user preferences object, or null if not found
 */
export async function readUserPreferences(): Promise<UserPreferencesData | null> {
    return readSettingsFile<UserPreferencesData>(SETTINGS_FILES.USER_PREFERENCES);
}

/**
 * Get the current theme preference from settings.
 *
 * @returns The theme preference, or undefined if not set
 */
export async function getThemePreference(): Promise<'light' | 'dark' | 'system' | undefined> {
    const prefs = await readUserPreferences();
    return prefs?.theme;
}

/**
 * Get the alwaysOnTop state from settings.
 *
 * @returns true/false if set, undefined if not found
 */
export async function getAlwaysOnTopSetting(): Promise<boolean | undefined> {
    const prefs = await readUserPreferences();
    return prefs?.alwaysOnTop;
}

/**
 * Get an individual hotkey enabled state from settings.
 *
 * @param hotkeyId - The hotkey identifier ('alwaysOnTop', 'bossKey', 'quickChat')
 * @returns true/false if set, undefined if not found
 */
export async function getHotkeyEnabledSetting(
    hotkeyId: 'alwaysOnTop' | 'bossKey' | 'quickChat'
): Promise<boolean | undefined> {
    const prefs = await readUserPreferences();
    if (!prefs) return undefined;

    const keyMap: Record<string, keyof UserPreferencesData> = {
        alwaysOnTop: 'hotkeyAlwaysOnTop',
        bossKey: 'hotkeyBossKey',
        quickChat: 'hotkeyQuickChat',
    };

    return prefs[keyMap[hotkeyId]] as boolean | undefined;
}

/**
 * Checks if the user preferences file exists.
 *
 * @returns true if the user preferences file exists
 */
export async function userPreferencesFileExists(): Promise<boolean> {
    const userDataPath = await getUserDataPath();
    const settingsPath = path.join(userDataPath, SETTINGS_FILES.USER_PREFERENCES);
    return fs.existsSync(settingsPath);
}

/**
 * Gets the full path to the user preferences file.
 *
 * @returns The full path to user-preferences.json
 */
export async function getUserPreferencesPath(): Promise<string> {
    const userDataPath = await getUserDataPath();
    return path.join(userDataPath, SETTINGS_FILES.USER_PREFERENCES);
}

/**
 * Wait for user preferences file to exist.
 * The app may take time to initialize and write the settings file.
 *
 * @param timeout - Max wait time in ms (default: 5000)
 * @returns true if file found within timeout
 */
export async function waitForUserPreferencesFile(timeout = 5000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        if (await userPreferencesFileExists()) {
            E2ELogger.info('persistence', 'User preferences file found');
            return true;
        }
        await browser.pause(500);
    }

    E2ELogger.info('persistence', 'User preferences file not found within timeout');
    return false;
}
