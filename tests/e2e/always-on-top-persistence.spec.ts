/**
 * E2E Test: Always On Top - Settings Persistence
 *
 * Tests that the always-on-top setting is correctly persisted to the settings file.
 * Verifies:
 * - Enabling always-on-top saves to settings.json
 * - Disabling always-on-top updates settings.json
 * - Setting persists correctly across toggles
 * - Cross-platform file persistence
 */

import { browser, expect } from '@wdio/globals';
import { E2ELogger } from './helpers/logger';
import { getPlatform } from './helpers/platform';

interface SettingsData {
    alwaysOnTop?: boolean;
    theme?: string;
    hotkeysEnabled?: boolean;
}

declare global {
    interface Window {
        electronAPI: {
            getAlwaysOnTop: () => Promise<{ enabled: boolean }>;
            setAlwaysOnTop: (enabled: boolean) => void;
        };
    }
}

/**
 * Read settings from the settings.json file.
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

describe('Always On Top - Settings Persistence', () => {
    let platform: string;

    before(async () => {
        platform = await getPlatform();
        E2ELogger.info('always-on-top-persistence', `Running on platform: ${platform}`);
    });

    describe('Enabling and Disabling Persistence', () => {
        it('should save enabled state to settings file', async () => {
            E2ELogger.info('always-on-top-persistence', 'Testing persistence when enabling');

            // Enable always-on-top
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(500); // Wait for file write

            // Read settings file
            const settings = await readSettingsFile();

            expect(settings).not.toBeNull();
            expect(settings?.alwaysOnTop).toBe(true);

            E2ELogger.info('always-on-top-persistence', `Settings file: alwaysOnTop=${settings?.alwaysOnTop}`);
        });

        it('should save disabled state to settings file', async () => {
            E2ELogger.info('always-on-top-persistence', 'Testing persistence when disabling');

            // Disable always-on-top
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(500);

            // Read settings file
            const settings = await readSettingsFile();

            expect(settings?.alwaysOnTop).toBe(false);

            E2ELogger.info('always-on-top-persistence', `Settings file: alwaysOnTop=${settings?.alwaysOnTop}`);
        });

        it('should update settings file when toggled multiple times', async () => {
            E2ELogger.info('always-on-top-persistence', 'Testing multiple toggle persistence');

            // Get initial state
            const initialState = await browser.execute(() => {
                return window.electronAPI?.getAlwaysOnTop?.();
            });
            const startEnabled = initialState?.enabled ?? false;

            // Toggle ON
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(400);

            let settings = await readSettingsFile();
            expect(settings?.alwaysOnTop).toBe(true);
            E2ELogger.info('always-on-top-persistence', 'After enable: alwaysOnTop=true');

            // Toggle OFF
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(400);

            settings = await readSettingsFile();
            expect(settings?.alwaysOnTop).toBe(false);
            E2ELogger.info('always-on-top-persistence', 'After disable: alwaysOnTop=false');

            // Restore to initial state
            await browser.execute((enabled: boolean) => {
                window.electronAPI?.setAlwaysOnTop?.(enabled);
            }, startEnabled);
            await browser.pause(400);

            settings = await readSettingsFile();
            expect(settings?.alwaysOnTop).toBe(startEnabled);
            E2ELogger.info('always-on-top-persistence', `Restored to initial: alwaysOnTop=${startEnabled}`);
        });
    });

    describe('File Format Validation', () => {
        it('should store alwaysOnTop as boolean in settings.json', async () => {
            E2ELogger.info('always-on-top-persistence', 'Validating settings file format');

            // Set to true
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(500);

            const settings = await readSettingsFile();

            expect(settings).not.toBeNull();
            expect(typeof settings?.alwaysOnTop).toBe('boolean');
            expect(settings?.alwaysOnTop).toBe(true);

            E2ELogger.info('always-on-top-persistence', 'Settings file format is correct (boolean type)');

            // Reset
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(300);
        });

        it('should not corrupt other settings when updating alwaysOnTop', async () => {
            E2ELogger.info('always-on-top-persistence', 'Testing settings file integrity');

            // Read initial settings
            const initialSettings = await readSettingsFile();
            const initialTheme = initialSettings?.theme;
            const initialHotkeys = initialSettings?.hotkeysEnabled;

            E2ELogger.info('always-on-top-persistence', `Initial settings: theme=${initialTheme}, hotkeys=${initialHotkeys}`);

            // Toggle always-on-top
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(500);

            // Read settings again
            const newSettings = await readSettingsFile();

            // Other settings should be unchanged
            expect(newSettings?.theme).toBe(initialTheme);
            expect(newSettings?.hotkeysEnabled).toBe(initialHotkeys);

            E2ELogger.info('always-on-top-persistence', 'Other settings remain intact');

            // Reset
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(300);
        });
    });

    describe('Cross-Platform File Persistence', () => {
        it('should persist on current platform', async () => {
            E2ELogger.info('always-on-top-persistence', `Testing persistence on ${platform}`);

            // Enable
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(500);

            const settings = await readSettingsFile();
            expect(settings?.alwaysOnTop).toBe(true);

            E2ELogger.info('always-on-top-persistence', `${platform}: File persistence verified`);

            // Reset
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(300);
        });
    });
});
