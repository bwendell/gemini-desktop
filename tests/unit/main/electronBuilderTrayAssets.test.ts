import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';

type ElectronBuilderConfig = {
    extraFiles?: Array<{ from?: string; to?: string; filter?: string[] }>;
};

const resolveBuildPath = (...segments: string[]): string => path.resolve(__dirname, '../../..', ...segments);

const matchesAnyPattern = (patterns: string[] | undefined, filename: string): boolean => {
    if (!patterns || patterns.length === 0) {
        return true;
    }

    return patterns.some((pattern) => {
        if (pattern === '*') {
            return true;
        }

        if (pattern.startsWith('*.')) {
            return filename.endsWith(pattern.slice(1));
        }

        if (pattern.includes('*')) {
            const prefix = pattern.split('*')[0];
            return filename.startsWith(prefix);
        }

        return filename === pattern;
    });
};

describe('electron-builder tray template assets', () => {
    it('includes tray template assets via extraFiles filter', () => {
        const configPath = resolveBuildPath('config', 'electron-builder.config.cjs');
        const config = require(configPath) as ElectronBuilderConfig;

        const buildEntry = config.extraFiles?.find((entry) => entry.from === 'build' && entry.to === 'resources');
        expect(buildEntry).toBeDefined();

        const templateAssets = ['icon-mac-trayTemplate.png', 'icon-mac-trayTemplate@2x.png'];
        templateAssets.forEach((asset) => {
            expect(matchesAnyPattern(buildEntry?.filter, asset)).toBe(true);
        });
    });

    it('ensures tray template assets exist in build directory', () => {
        const buildDir = resolveBuildPath('build');
        const assets = ['icon-mac-trayTemplate.png', 'icon-mac-trayTemplate@2x.png'];

        assets.forEach((asset) => {
            expect(fs.existsSync(path.join(buildDir, asset))).toBe(true);
        });
    });
});
