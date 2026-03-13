import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const configPath = path.resolve(__dirname, '../../..', 'config/electron-builder.config.cjs');
const packagePath = path.resolve(__dirname, '../../..', 'package.json');
const builderConfigSource = fs.readFileSync(configPath, 'utf8');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8')) as {
    scripts: Record<string, string>;
};

const ENV_KEYS = ['BUILD_ARCH', 'BUILD_PLATFORM', 'BUILD_WINDOWS_UNIFIED'] as const;
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]])) as Record<
    string,
    string | undefined
>;

function restoreEnv() {
    for (const key of ENV_KEYS) {
        const value = originalEnv[key];
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }
}

function loadBuilderConfig(overrides: Record<string, string | undefined>) {
    restoreEnv();
    for (const [key, value] of Object.entries(overrides)) {
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }

    delete require.cache[configPath];
    return require(configPath) as {
        files: string[];
        win: {
            target: Array<{ target: string; arch: string[] }>;
        };
        nsis: {
            artifactName: string;
            buildUniversalInstaller?: boolean;
            runAfterFinish?: boolean;
        };
    };
}

afterEach(() => {
    restoreEnv();
    delete require.cache[configPath];
});

describe('Windows unified installer bridge-release metadata contract', () => {
    it('documents the Windows unified installer filename in the builder contract', () => {
        expect(builderConfigSource).toContain('Windows unified installer contract');
        expect(builderConfigSource).toContain('Gemini-Desktop-${version}-installer.${ext}');
        expect(builderConfigSource).toContain('compatibility metadata aliases');
    });

    it('builds a single promoted Windows installer when BUILD_WINDOWS_UNIFIED is enabled', () => {
        const builderConfig = loadBuilderConfig({
            BUILD_PLATFORM: 'win32',
            BUILD_ARCH: 'x64',
            BUILD_WINDOWS_UNIFIED: 'true',
        });

        expect(builderConfig.win.target).toEqual([
            {
                target: 'nsis',
                arch: ['x64', 'arm64'],
            },
        ]);
        expect(builderConfig.nsis.buildUniversalInstaller).toBe(true);
        expect(builderConfig.nsis.artifactName).toBe('Gemini-Desktop-${version}-installer.${ext}');
        expect(builderConfig.files).not.toContain('!node_modules/@node-llama-cpp/win-arm64');
        expect(builderConfig.files).not.toContain('!node_modules/@node-llama-cpp/win-x64');
        expect(builderConfig.files).not.toContain('!node_modules/@node-llama-cpp/win-x64-cuda');
    });

    it('still allows explicitly scoped x64 builds when BUILD_WINDOWS_UNIFIED is disabled', () => {
        const builderConfig = loadBuilderConfig({
            BUILD_PLATFORM: 'win32',
            BUILD_ARCH: 'x64',
            BUILD_WINDOWS_UNIFIED: undefined,
        });

        expect(builderConfig.win.target).toEqual([
            {
                target: 'nsis',
                arch: ['x64'],
            },
        ]);
        expect(builderConfig.nsis.buildUniversalInstaller).toBe(false);
        expect(builderConfig.nsis.artifactName).toBe('Gemini-Desktop-${version}-${arch}-installer.${ext}');
        expect(builderConfig.files).toContain('!node_modules/@node-llama-cpp/win-arm64');
    });

    it('still allows explicitly scoped arm64 builds when BUILD_WINDOWS_UNIFIED is disabled', () => {
        const builderConfig = loadBuilderConfig({
            BUILD_PLATFORM: 'win32',
            BUILD_ARCH: 'arm64',
            BUILD_WINDOWS_UNIFIED: undefined,
        });

        expect(builderConfig.win.target).toEqual([
            {
                target: 'nsis',
                arch: ['arm64'],
            },
        ]);
        expect(builderConfig.nsis.buildUniversalInstaller).toBe(false);
        expect(builderConfig.files).toContain('!node_modules/@node-llama-cpp/win-x64');
    });

    it('does not allow both Windows jobs to emit overlapping NSIS installer sets', () => {
        expect(builderConfigSource).toContain('buildUniversalInstaller');
        expect(builderConfigSource).toContain('resolvedWindowsArchTargets');
    });

    it('exposes a unified Windows build script', () => {
        expect(packageJson.scripts['dist:win']).toContain('scripts/release/run-windows-dist.cjs');
    });
});
