import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const resolverPath = path.resolve(__dirname, '../../../../scripts/release/resolve-windows-baseline-installer.cjs');

function loadResolver() {
    return require(resolverPath);
}

function release(tagName: string, assetNames: string[]) {
    return {
        tag_name: tagName,
        draft: false,
        prerelease: false,
        assets: assetNames.map((name) => ({
            name,
            browser_download_url: `https://example.test/${tagName}/${name}`,
        })),
    };
}

describe('resolve-windows-baseline-installer', () => {
    it('prefers x64-specific installers for the x64 lane', () => {
        const { selectBaselineAsset } = loadResolver();
        const result = selectBaselineAsset(
            [
                release('v0.11.0', ['Gemini-Desktop-0.11.0-installer.exe']),
                release('v0.10.9', ['Gemini-Desktop-0.10.9-x64-installer.exe']),
            ],
            'x64',
            'v0.12.0'
        );

        expect(result.name).toBe('Gemini-Desktop-0.10.9-x64-installer.exe');
        expect(result.kind).toBe('x64-specific');
    });

    it('falls back to the unified installer for the x64 lane', () => {
        const { selectBaselineAsset } = loadResolver();
        const result = selectBaselineAsset(
            [release('v0.11.0', ['Gemini-Desktop-0.11.0-installer.exe'])],
            'x64',
            'v0.12.0'
        );

        expect(result.name).toBe('Gemini-Desktop-0.11.0-installer.exe');
        expect(result.kind).toBe('unified');
    });

    it('rejects arm64-specific installers for the x64 lane', () => {
        const { selectBaselineAsset } = loadResolver();

        expect(() =>
            selectBaselineAsset([release('v0.11.0', ['Gemini-Desktop-0.11.0-arm64-installer.exe'])], 'x64', 'v0.12.0')
        ).toThrow(/No acceptable baseline installer/i);
    });

    it('prefers arm64-specific installers for the arm64 lane', () => {
        const { selectBaselineAsset } = loadResolver();
        const result = selectBaselineAsset(
            [
                release('v0.11.0', ['Gemini-Desktop-0.11.0-installer.exe']),
                release('v0.10.9', ['Gemini-Desktop-0.10.9-arm64-installer.exe']),
            ],
            'arm64',
            'v0.12.0'
        );

        expect(result.name).toBe('Gemini-Desktop-0.10.9-arm64-installer.exe');
        expect(result.kind).toBe('arm64-specific');
    });

    it('falls back to the unified installer for the arm64 lane', () => {
        const { selectBaselineAsset } = loadResolver();
        const result = selectBaselineAsset(
            [release('v0.11.0', ['Gemini-Desktop-0.11.0-installer.exe'])],
            'arm64',
            'v0.12.0'
        );

        expect(result.name).toBe('Gemini-Desktop-0.11.0-installer.exe');
        expect(result.kind).toBe('unified');
    });

    it('rejects x64-specific installers for the arm64 lane', () => {
        const { selectBaselineAsset } = loadResolver();

        expect(() =>
            selectBaselineAsset([release('v0.11.0', ['Gemini-Desktop-0.11.0-x64-installer.exe'])], 'arm64', 'v0.12.0')
        ).toThrow(/No acceptable baseline installer/i);
    });
});
