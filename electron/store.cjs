/**
 * Simple file-based settings store.
 * 
 * Persists application settings to a JSON file in the user data directory.
 * This store is cross-platform compatible (Windows, macOS, Linux) as it uses
 * Electron's app.getPath('userData') which resolves correctly on all platforms.
 * 
 * @module SettingsStore
 * @example
 * const store = new SettingsStore({
 *     configName: 'user-preferences',
 *     defaults: { theme: 'system' }
 * });
 * store.set('theme', 'dark');
 * const theme = store.get('theme'); // 'dark'
 */
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * Settings store options.
 * @typedef {Object} SettingsStoreOptions
 * @property {string} configName - Name of the config file (without extension)
 * @property {Object} [defaults={}] - Default values for settings
 */

/**
 * A simple JSON-based settings store for Electron applications.
 * Automatically handles file I/O with graceful error handling.
 */
class SettingsStore {
    /**
     * Creates a new SettingsStore instance.
     * @param {SettingsStoreOptions} opts - Configuration options
     */
    constructor(opts = {}) {
        if (!opts.configName) {
            console.error('[SettingsStore] Missing required configName option');
            opts.configName = 'settings';
        }

        const userDataPath = app.getPath('userData');
        this.path = path.join(userDataPath, opts.configName + '.json');
        this.defaults = opts.defaults || {};
        this.data = this._loadData();

        console.log(`[SettingsStore] Initialized at: ${this.path}`);
    }

    /**
     * Load data from the settings file.
     * Falls back to defaults if file doesn't exist or is corrupted.
     * @private
     * @returns {Object} Parsed settings data or defaults
     */
    _loadData() {
        try {
            const fileContent = fs.readFileSync(this.path, 'utf-8');
            const parsed = JSON.parse(fileContent);
            console.log('[SettingsStore] Loaded existing settings');
            return { ...this.defaults, ...parsed };
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('[SettingsStore] No existing settings file, using defaults');
            } else {
                console.error('[SettingsStore] Error reading settings file:', {
                    error: error.message,
                    code: error.code,
                    path: this.path
                });
            }
            return { ...this.defaults };
        }
    }

    /**
     * Get a setting value by key.
     * @param {string} key - The setting key
     * @returns {any} The setting value, or undefined if not found
     */
    get(key) {
        return this.data[key];
    }

    /**
     * Set a setting value and persist to disk.
     * @param {string} key - The setting key
     * @param {any} val - The value to store
     * @returns {boolean} True if save succeeded, false otherwise
     */
    set(key, val) {
        this.data[key] = val;
        return this._saveData();
    }

    /**
     * Save current data to disk.
     * @private
     * @returns {boolean} True if save succeeded, false otherwise
     */
    _saveData() {
        try {
            fs.writeFileSync(this.path, JSON.stringify(this.data, null, 2), 'utf-8');
            return true;
        } catch (error) {
            console.error('[SettingsStore] Failed to save settings:', {
                error: error.message,
                code: error.code,
                path: this.path,
                data: this.data
            });
            return false;
        }
    }

    /**
     * Get all settings as an object.
     * @returns {Object} All current settings
     */
    getAll() {
        return { ...this.data };
    }

    /**
     * Reset all settings to defaults.
     * @returns {boolean} True if save succeeded, false otherwise
     */
    reset() {
        this.data = { ...this.defaults };
        return this._saveData();
    }
}

module.exports = SettingsStore;
