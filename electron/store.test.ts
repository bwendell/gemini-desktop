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
import SettingsStore from './store';

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
                fs: mockFs
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
            mockFs.readFileSync.mockImplementation(() => JSON.stringify({ theme: 'light', custom: 'value' }));

            const store = new SettingsStore({
                configName: 'test',
                defaults: { theme: 'dark' },
                fs: mockFs
            });

            expect(store._data).toEqual({ theme: 'light', custom: 'value' });
        });

        it('merges existing settings with defaults', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(JSON.stringify({ custom: 'value' }));

            const store = new SettingsStore({
                configName: 'test',
                defaults: { theme: 'dark', another: 'default' },
                fs: mockFs
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
                fs: mockFs
            });

            expect(store._data).toEqual({ theme: 'system' });
        });
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
            mockFs.writeFileSync.mockImplementation(() => { });

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
            mockFs.writeFileSync.mockImplementation(() => { });

            const store = new SettingsStore({
                configName: 'test',
                defaults: { theme: 'system' },
                fs: mockFs
            });

            const result = store.reset();

            expect(result).toBe(true);
            expect(store._data).toEqual({ theme: 'system' });
        });
    });
});
