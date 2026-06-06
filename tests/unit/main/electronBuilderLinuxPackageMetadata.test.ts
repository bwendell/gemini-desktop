import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

type ElectronBuilderConfig = {
    deb?: {
        depends?: string[];
        recommends?: string[];
    };
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const configPath = path.resolve(__dirname, '../../..', 'config/electron-builder.config.cjs');
const builderConfig = require(configPath) as ElectronBuilderConfig;

describe('electron-builder Linux package metadata', () => {
    it('does not hard-depend on deprecated Debian packages', () => {
        expect(builderConfig.deb?.depends).toEqual(
            expect.arrayContaining(['libnotify4', 'libxtst6', 'libnss3', 'libasound2'])
        );
        expect(builderConfig.deb?.depends).not.toEqual(expect.arrayContaining(['gconf2']));
        expect(builderConfig.deb?.depends).not.toEqual(expect.arrayContaining(['gconf-service']));
        expect(builderConfig.deb?.depends).not.toEqual(expect.arrayContaining(['libappindicator1']));
    });

    it('recommends modern Ayatana AppIndicator support for tray integration', () => {
        expect(builderConfig.deb?.recommends).toEqual(expect.arrayContaining(['libayatana-appindicator3-1']));
    });
});
