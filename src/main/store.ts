/**
 * Simple file-based settings store.
 *
 * Persists application settings to a JSON file in the user data directory.
 * This store is cross-platform compatible (Windows, macOS, Linux) as it uses
 * Electron's app.getPath('userData') which resolves correctly on all platforms.
 *
 * @module SettingsStore
 * @example
 * const store = new SettingsStore<UserPreferences>({
 *     configName: 'user-preferences',
 *     defaults: { theme: 'system' }
 * });
 * store.set('theme', 'dark');
 * const theme = store.get('theme'); // 'dark'
 */

import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { createLogger } from './utils/logger';
import type { SettingsStoreOptions } from './types';

const logger = createLogger('[SettingsStore]');

/**
 * Deep merge two objects, with source values taking precedence.
 * Arrays and non-object values in source replace target values entirely.
 *
 * SECURITY: This function filters out dangerous keys like __proto__, constructor,
 * and prototype to prevent prototype pollution attacks.
 *
 * @param target - The base object (defaults)
 * @param source - The object to merge in (loaded settings)
 * @returns Merged object with source values taking precedence
 */
export function deepMerge<T extends Record<string, unknown>>(target: T, source: T): T {
    const result = { ...target } as T;

    // Dangerous keys that could lead to prototype pollution
    const dangerousKeys = new Set(['__proto__', 'constructor', 'prototype']);

    for (const key of Object.keys(source) as (keyof T)[]) {
        // Skip dangerous keys to prevent prototype pollution
        if (dangerousKeys.has(String(key))) {
            continue;
        }

        const sourceValue = source[key];
        const targetValue = target[key];

        // If both values are plain objects (not arrays, not null), merge recursively
        if (
            typeof sourceValue === 'object' &&
            sourceValue !== null &&
            !Array.isArray(sourceValue) &&
            typeof targetValue === 'object' &&
            targetValue !== null &&
            !Array.isArray(targetValue)
        ) {
            result[key] = deepMerge(
                targetValue as Record<string, unknown>,
                sourceValue as Record<string, unknown>
            ) as T[keyof T];
        } else {
            // Otherwise, source value takes precedence
            result[key] = sourceValue;
        }
    }

    return result;
}

/**
 * A simple JSON-based settings store for Electron applications.
 * Automatically handles file I/O with graceful error handling.
 *
 * @template T - The type of settings data stored
 */
export default class SettingsStore<T extends Record<string, unknown> = Record<string, unknown>> {
    readonly _path: string;
    readonly _defaults: Partial<T>;
    readonly _fs: typeof fs;
    _data: T;

    /**
     * Creates a new SettingsStore instance.
     * @param opts - Configuration options
     */
    constructor(opts: SettingsStoreOptions = {}) {
        if (!opts.configName) {
            logger.error('Missing required configName option');
            opts.configName = 'settings';
        }

        const userDataPath = app.getPath('userData');
        this._path = path.join(userDataPath, opts.configName + '.json');
        this._defaults = (opts.defaults as Partial<T>) || {};
        /* v8 ignore next -- production fallback, tests always inject mock fs */
        this._fs = opts.fs || fs;
        this._data = this._loadData();

        logger.log(`Initialized at: ${this._path}`);
    }

    /**
     * Load data from the settings file.
     * Falls back to defaults if file doesn't exist or is corrupted.
     * @private
     * @returns Parsed settings data or defaults
     */
    private _loadData(): T {
        try {
            const fileContent = this._fs.readFileSync(this._path, 'utf-8');
            const parsed = JSON.parse(fileContent) as T;
            logger.log('Loaded existing settings');
            return deepMerge(this._defaults as T, parsed);
        } catch (error) {
            const err = error as NodeJS.ErrnoException;
            if (err.code === 'ENOENT') {
                logger.log('No existing settings file, using defaults');
            } else {
                logger.error('Error reading settings file:', {
                    error: err.message,
                    code: err.code,
                    path: this._path,
                });
            }
            return { ...this._defaults } as T;
        }
    }

    /**
     * Get a setting value by key.
     * @param key - The setting key
     * @returns The setting value, or undefined if not found
     */
    get<K extends keyof T>(key: K): T[K] | undefined {
        return this._data ? this._data[key] : undefined;
    }

    /**
     * Set a setting value and persist to disk.
     * @param key - The setting key
     * @param val - The value to store
     * @returns True if save succeeded, false otherwise
     */
    set<K extends keyof T>(key: K, val: T[K]): boolean {
        this._data[key] = val;
        return this._saveData();
    }

    /**
     * Save current data to disk.
     * @private
     * @returns True if save succeeded, false otherwise
     */
    private _saveData(): boolean {
        try {
            this._fs.writeFileSync(this._path, JSON.stringify(this._data, null, 2), 'utf-8');
            return true;
        } catch (error) {
            const err = error as NodeJS.ErrnoException;
            logger.error('Failed to save settings:', {
                error: err.message,
                code: err.code,
                path: this._path,
                data: this._data,
            });
            return false;
        }
    }

    /**
     * Get all settings as an object.
     * @returns All current settings
     */
    getAll(): T {
        return { ...this._data };
    }

    /**
     * Reset all settings to defaults.
     * @returns True if save succeeded, false otherwise
     */
    reset(): boolean {
        this._data = { ...this._defaults } as T;
        return this._saveData();
    }
}
