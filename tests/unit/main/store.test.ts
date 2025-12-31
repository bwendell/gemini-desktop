/**
 * Unit tests for SettingsStore.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs module before importing store
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

import * as fs from 'fs';
import SettingsStore from '../../../src/main/store';

const mockFs = vi.mocked(fs);

describe('SettingsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('initializes with config name and defaults', () => {
      mockFs.readFileSync.mockImplementation(() => {
        const error = new Error('ENOENT') as Error & { code: string };
        error.code = 'ENOENT';
        throw error;
      });

      const store = new SettingsStore({
        configName: 'test-config',
        defaults: { theme: 'dark' },
        fs: mockFs,
      });

      expect(store._path).toContain('test-config.json');
      expect(store._defaults).toEqual({ theme: 'dark' });
    });

    it('uses default config name when not provided', () => {
      mockFs.readFileSync.mockImplementation(() => {
        const error = new Error('ENOENT') as Error & { code: string };
        error.code = 'ENOENT';
        throw error;
      });

      const store = new SettingsStore({ fs: mockFs });

      expect(store._path).toContain('settings.json');
    });

    it('loads existing settings from file', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() =>
        JSON.stringify({ theme: 'light', custom: 'value' })
      );

      const store = new SettingsStore({
        configName: 'test',
        defaults: { theme: 'dark' },
        fs: mockFs,
      });

      expect(store._data).toEqual({ theme: 'light', custom: 'value' });
    });

    it('merges existing settings with defaults', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ custom: 'value' }));

      const store = new SettingsStore({
        configName: 'test',
        defaults: { theme: 'dark', another: 'default' },
        fs: mockFs,
      });

      expect(store._data).toEqual({ theme: 'dark', another: 'default', custom: 'value' });
    });

    it('handles file read errors gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        const error = new Error('Permission denied') as Error & { code: string };
        error.code = 'EACCES';
        throw error;
      });

      const store = new SettingsStore({
        configName: 'test',
        defaults: { theme: 'system' },
        fs: mockFs,
      });

      expect(store._data).toEqual({ theme: 'system' });
    });
  });

  it('handles corrupted JSON gracefully', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('invalid-json{');

    const store = new SettingsStore({
      configName: 'test',
      defaults: { theme: 'system' },
      fs: mockFs,
    });

    // Should fall back to defaults
    expect(store._data).toEqual({ theme: 'system' });
  });

  it('handles undefined internal data on get', () => {
    const store = new SettingsStore({ configName: 'test', defaults: {}, fs: mockFs });
    // Force undefined data to simulate potential runtime corruption
    (store as any)._data = undefined;

    // Should not crash
    expect(store.get('theme')).toBeUndefined();
  });

  describe('get', () => {
    it('returns value for existing key', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => JSON.stringify({ theme: 'dark' }));

      const store = new SettingsStore({ configName: 'test', defaults: {}, fs: mockFs });

      expect(store.get('theme')).toBe('dark');
    });

    it('returns undefined for non-existent key', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({}));

      const store = new SettingsStore({ configName: 'test', defaults: {}, fs: mockFs });

      expect(store.get('nonexistent')).toBeUndefined();
    });
  });

  describe('set', () => {
    it('sets value and saves to disk', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({}));
      mockFs.writeFileSync.mockImplementation(() => {});

      const store = new SettingsStore({ configName: 'test', defaults: {}, fs: mockFs });
      const result = store.set('theme', 'light');

      expect(result).toBe(true);
      expect(store._data.theme).toBe('light');
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('returns false on save error', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({}));
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });

      const store = new SettingsStore({ configName: 'test', defaults: {}, fs: mockFs });
      const result = store.set('theme', 'dark');

      expect(result).toBe(false);
    });
  });

  describe('getAll', () => {
    it('returns copy of all data', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ a: 1, b: 2 }));

      const store = new SettingsStore({ configName: 'test', defaults: {}, fs: mockFs });
      const all = store.getAll();

      expect(all).toEqual({ a: 1, b: 2 });
      // Ensure it's a copy, not the original
      all.c = 3;
      expect(store._data.c).toBeUndefined();
    });
  });

  describe('reset', () => {
    it('resets data to defaults and saves', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ theme: 'dark', custom: 'value' }));
      mockFs.writeFileSync.mockImplementation(() => {});

      const store = new SettingsStore({
        configName: 'test',
        defaults: { theme: 'system' },
        fs: mockFs,
      });

      const result = store.reset();

      expect(result).toBe(true);
      expect(store._data).toEqual({ theme: 'system' });
    });
  });

  // ==========================================================================
  // printToPdf Settings Persistence Tests
  // ==========================================================================

  describe('printToPdf settings persistence', () => {
    // Default values matching src/shared/types/hotkeys.ts
    const DEFAULT_HOTKEY_SETTINGS = {
      individualHotkeys: {
        alwaysOnTop: true,
        bossKey: true,
        quickChat: true,
        printToPdf: true,
      },
      hotkeyAccelerators: {
        alwaysOnTop: 'CommandOrControl+Alt+P',
        bossKey: 'CommandOrControl+Alt+H',
        quickChat: 'CommandOrControl+Shift+Space',
        printToPdf: 'CommandOrControl+Shift+P',
      },
    };

    describe('enabled state persistence', () => {
      it('should persist printToPdf.enabled as false across store reload', () => {
        // Simulate existing file with printToPdf disabled
        const savedSettings = {
          individualHotkeys: {
            ...DEFAULT_HOTKEY_SETTINGS.individualHotkeys,
            printToPdf: false,
          },
          hotkeyAccelerators: DEFAULT_HOTKEY_SETTINGS.hotkeyAccelerators,
        };

        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify(savedSettings));
        mockFs.writeFileSync.mockImplementation(() => {});

        // Create store (simulates app restart reading from file)
        const store = new SettingsStore({
          configName: 'hotkey-settings',
          defaults: DEFAULT_HOTKEY_SETTINGS,
          fs: mockFs,
        });

        // Verify the disabled state was restored
        const loaded = store.get(
          'individualHotkeys'
        ) as typeof DEFAULT_HOTKEY_SETTINGS.individualHotkeys;
        expect(loaded.printToPdf).toBe(false);
      });

      it('should persist printToPdf.enabled as true across store reload', () => {
        const savedSettings = {
          individualHotkeys: {
            ...DEFAULT_HOTKEY_SETTINGS.individualHotkeys,
            printToPdf: true,
          },
          hotkeyAccelerators: DEFAULT_HOTKEY_SETTINGS.hotkeyAccelerators,
        };

        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify(savedSettings));

        const store = new SettingsStore({
          configName: 'hotkey-settings',
          defaults: DEFAULT_HOTKEY_SETTINGS,
          fs: mockFs,
        });

        const loaded = store.get(
          'individualHotkeys'
        ) as typeof DEFAULT_HOTKEY_SETTINGS.individualHotkeys;
        expect(loaded.printToPdf).toBe(true);
      });
    });

    describe('accelerator persistence', () => {
      it('should persist custom printToPdf accelerator across store reload', () => {
        const customAccelerator = 'CommandOrControl+Alt+P';
        const savedSettings = {
          individualHotkeys: DEFAULT_HOTKEY_SETTINGS.individualHotkeys,
          hotkeyAccelerators: {
            ...DEFAULT_HOTKEY_SETTINGS.hotkeyAccelerators,
            printToPdf: customAccelerator,
          },
        };

        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify(savedSettings));

        const store = new SettingsStore({
          configName: 'hotkey-settings',
          defaults: DEFAULT_HOTKEY_SETTINGS,
          fs: mockFs,
        });

        const loaded = store.get(
          'hotkeyAccelerators'
        ) as typeof DEFAULT_HOTKEY_SETTINGS.hotkeyAccelerators;
        expect(loaded.printToPdf).toBe(customAccelerator);
      });

      it('should persist default printToPdf accelerator across store reload', () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify(DEFAULT_HOTKEY_SETTINGS));

        const store = new SettingsStore({
          configName: 'hotkey-settings',
          defaults: DEFAULT_HOTKEY_SETTINGS,
          fs: mockFs,
        });

        const loaded = store.get(
          'hotkeyAccelerators'
        ) as typeof DEFAULT_HOTKEY_SETTINGS.hotkeyAccelerators;
        expect(loaded.printToPdf).toBe('CommandOrControl+Shift+P');
      });
    });

    describe('default values for new installations', () => {
      it('should default printToPdf.enabled to true for new users', () => {
        // Simulate no existing file (new installation)
        mockFs.readFileSync.mockImplementation(() => {
          const error = new Error('ENOENT') as Error & { code: string };
          error.code = 'ENOENT';
          throw error;
        });

        const store = new SettingsStore({
          configName: 'hotkey-settings',
          defaults: DEFAULT_HOTKEY_SETTINGS,
          fs: mockFs,
        });

        const loaded = store.get(
          'individualHotkeys'
        ) as typeof DEFAULT_HOTKEY_SETTINGS.individualHotkeys;
        expect(loaded.printToPdf).toBe(true);
      });

      it('should default printToPdf accelerator to CommandOrControl+Shift+P for new users', () => {
        mockFs.readFileSync.mockImplementation(() => {
          const error = new Error('ENOENT') as Error & { code: string };
          error.code = 'ENOENT';
          throw error;
        });

        const store = new SettingsStore({
          configName: 'hotkey-settings',
          defaults: DEFAULT_HOTKEY_SETTINGS,
          fs: mockFs,
        });

        const loaded = store.get(
          'hotkeyAccelerators'
        ) as typeof DEFAULT_HOTKEY_SETTINGS.hotkeyAccelerators;
        expect(loaded.printToPdf).toBe('CommandOrControl+Shift+P');
      });
    });

    describe('settings migration for existing users', () => {
      /**
       * Note: SettingsStore performs SHALLOW merging of defaults.
       * This means nested objects (like individualHotkeys) are replaced entirely
       * if they exist in the saved file. Deep merging would need to be handled
       * at the application level (e.g., in HotkeyManager).
       */

      it('should apply top-level defaults when key is completely missing', () => {
        // Simulate existing user who never saved hotkey settings
        // (e.g., only has other app settings saved)
        const legacySettings = {
          theme: 'dark',
          windowBounds: { width: 800, height: 600 },
          // No hotkey settings at all - these are completely missing keys
        };

        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify(legacySettings));

        const store = new SettingsStore({
          configName: 'app-settings',
          defaults: {
            theme: 'system',
            ...DEFAULT_HOTKEY_SETTINGS,
          },
          fs: mockFs,
        });

        // When top-level keys are missing, defaults are applied
        const loadedHotkeys = store.get(
          'individualHotkeys'
        ) as typeof DEFAULT_HOTKEY_SETTINGS.individualHotkeys;
        const loadedAccelerators = store.get(
          'hotkeyAccelerators'
        ) as typeof DEFAULT_HOTKEY_SETTINGS.hotkeyAccelerators;

        // printToPdf gets defaults since individualHotkeys was missing entirely
        expect(loadedHotkeys.printToPdf).toBe(true);
        expect(loadedAccelerators.printToPdf).toBe('CommandOrControl+Shift+P');
        // Saved theme preference should be preserved
        expect(store.get('theme')).toBe('dark');
      });

      it('should preserve existing user settings at nested level', () => {
        // When a user has existing hotkey settings saved, they are preserved
        const savedSettings = {
          individualHotkeys: {
            alwaysOnTop: false, // User's custom setting
            bossKey: true,
            quickChat: false, // User's custom setting
            printToPdf: true, // User already has printToPdf
          },
          hotkeyAccelerators: {
            alwaysOnTop: 'CommandOrControl+Shift+T', // User's custom accelerator
            bossKey: 'CommandOrControl+Alt+H',
            quickChat: 'CommandOrControl+Shift+Space',
            printToPdf: 'CommandOrControl+Alt+P', // User changed the accelerator
          },
        };

        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify(savedSettings));

        const store = new SettingsStore({
          configName: 'hotkey-settings',
          defaults: DEFAULT_HOTKEY_SETTINGS,
          fs: mockFs,
        });

        const loadedHotkeys = store.get(
          'individualHotkeys'
        ) as typeof DEFAULT_HOTKEY_SETTINGS.individualHotkeys;
        const loadedAccelerators = store.get(
          'hotkeyAccelerators'
        ) as typeof DEFAULT_HOTKEY_SETTINGS.hotkeyAccelerators;

        // All saved settings should be preserved exactly
        expect(loadedHotkeys.alwaysOnTop).toBe(false);
        expect(loadedHotkeys.quickChat).toBe(false);
        expect(loadedHotkeys.printToPdf).toBe(true);
        expect(loadedAccelerators.alwaysOnTop).toBe('CommandOrControl+Shift+T');
        expect(loadedAccelerators.printToPdf).toBe('CommandOrControl+Alt+P');
      });

      it('should deep merge nested objects (filling missing keys from defaults)', () => {
        // SettingsStore now does deep merge - missing keys in nested objects get defaults
        const partialNestedSettings = {
          individualHotkeys: {
            bossKey: false,
            // Other keys are missing - deep merge will fill them from defaults
          },
        };

        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify(partialNestedSettings));

        const store = new SettingsStore({
          configName: 'hotkey-settings',
          defaults: DEFAULT_HOTKEY_SETTINGS,
          fs: mockFs,
        });

        const loadedHotkeys = store.get('individualHotkeys') as Record<string, boolean | undefined>;
        const loadedAccelerators = store.get(
          'hotkeyAccelerators'
        ) as typeof DEFAULT_HOTKEY_SETTINGS.hotkeyAccelerators;

        // User's setting is preserved
        expect(loadedHotkeys.bossKey).toBe(false);
        // Missing nested keys get filled from defaults (deep merge)
        expect(loadedHotkeys.printToPdf).toBe(true);
        expect(loadedHotkeys.alwaysOnTop).toBe(true);
        expect(loadedHotkeys.quickChat).toBe(true);
        // Entirely missing top-level keys get defaults
        expect(loadedAccelerators).toEqual(DEFAULT_HOTKEY_SETTINGS.hotkeyAccelerators);
      });
    });
  });
});
