import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const helperModulePath = path.resolve(__dirname, '../../../../scripts/release/lib/windows-release-contract.cjs');
const cliModulePath = path.resolve(__dirname, '../../../../scripts/release/prepare-windows-release-assets.cjs');

function loadWindowsReleaseContract() {
    const targetPath = fs.existsSync(helperModulePath) ? helperModulePath : cliModulePath;
    return require(targetPath);
}

function makeTempReleaseDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'gemini-windows-release-'));
}

function sha512Base64(buffer: Buffer): string {
    return createHash('sha512').update(buffer).digest('base64');
}

function writeLatestYml(releaseDir: string, installerName: string, contents: Buffer): void {
    const sha512 = sha512Base64(contents);
    const latestYml = [
        'version: 0.12.0',
        'files:',
        `  - url: ${installerName}`,
        `    sha512: ${sha512}`,
        `    size: ${contents.length}`,
        `path: ${installerName}`,
        `sha512: ${sha512}`,
        "releaseDate: '2026-03-15T00:00:00.000Z'",
        '',
    ].join('\n');

    fs.writeFileSync(path.join(releaseDir, 'latest.yml'), latestYml, 'utf8');
}

function writeBaseReleaseFiles(
    releaseDir: string,
    installerName = 'Gemini-Desktop-0.12.0-installer.exe'
): {
    installerName: string;
    installerBuffer: Buffer;
} {
    const installerBuffer = Buffer.from('gemini-desktop-installer');
    fs.writeFileSync(path.join(releaseDir, installerName), installerBuffer);
    fs.writeFileSync(path.join(releaseDir, `${installerName}.blockmap`), 'blockmap', 'utf8');
    writeLatestYml(releaseDir, installerName, installerBuffer);
    return { installerName, installerBuffer };
}

describe('prepare-windows-release-assets', () => {
    it('accepts exactly one promoted unified installer', () => {
        const { discoverWindowsReleaseFiles } = loadWindowsReleaseContract();
        const releaseDir = makeTempReleaseDir();
        writeBaseReleaseFiles(releaseDir);

        const result = discoverWindowsReleaseFiles(releaseDir, '0.12.0');

        expect(result.installerName).toBe('Gemini-Desktop-0.12.0-installer.exe');
        expect(result.blockmapName).toBe('Gemini-Desktop-0.12.0-installer.exe.blockmap');
    });

    it('rejects arch-specific installers from the public contract', () => {
        const { discoverWindowsReleaseFiles } = loadWindowsReleaseContract();
        const releaseDir = makeTempReleaseDir();
        writeBaseReleaseFiles(releaseDir);
        fs.writeFileSync(path.join(releaseDir, 'Gemini-Desktop-0.12.0-x64-installer.exe'), 'x64', 'utf8');

        expect(() => discoverWindowsReleaseFiles(releaseDir, '0.12.0')).toThrow(/x64-installer/i);
    });

    it('rejects msi artifacts from the public contract', () => {
        const { discoverWindowsReleaseFiles } = loadWindowsReleaseContract();
        const releaseDir = makeTempReleaseDir();
        writeBaseReleaseFiles(releaseDir);
        fs.writeFileSync(path.join(releaseDir, 'Gemini-Desktop-0.12.0.msi'), 'msi', 'utf8');

        expect(() => discoverWindowsReleaseFiles(releaseDir, '0.12.0')).toThrow(/\.msi/i);
    });

    it('creates compatibility aliases exactly once and keeps them aligned', () => {
        const { createCompatibilityAliases, readMetadata } = loadWindowsReleaseContract();
        const releaseDir = makeTempReleaseDir();
        const { installerName } = writeBaseReleaseFiles(releaseDir);

        createCompatibilityAliases(releaseDir);
        createCompatibilityAliases(releaseDir);

        const aliases = ['latest-x64.yml', 'latest-arm64.yml', 'x64.yml', 'arm64.yml'];
        for (const alias of aliases) {
            const metadata = readMetadata(path.join(releaseDir, alias));
            expect(metadata.path).toBe(installerName);
            expect(metadata.files[0].url).toBe(installerName);
        }
    });

    it('creates checksums-windows.txt that matches the promoted installer hash', () => {
        const { prepareWindowsReleaseAssets } = loadWindowsReleaseContract();
        const releaseDir = makeTempReleaseDir();
        const githubOutputPath = path.join(releaseDir, 'github-output.txt');
        const { installerName, installerBuffer } = writeBaseReleaseFiles(releaseDir);

        prepareWindowsReleaseAssets({
            releaseDir,
            version: '0.12.0',
            githubOutputPath,
        });

        const checksumFile = path.join(releaseDir, 'checksums-windows.txt');
        expect(fs.existsSync(checksumFile)).toBe(true);
        const expectedHash = createHash('sha256').update(installerBuffer).digest('hex');
        const checksumContents = fs.readFileSync(checksumFile, 'utf8');
        expect(checksumContents).toContain(expectedHash);
        expect(checksumContents).toContain(installerName);
    });

    it('emits upload files without the internal manifest', () => {
        const { prepareWindowsReleaseAssets } = loadWindowsReleaseContract();
        const releaseDir = makeTempReleaseDir();
        const githubOutputPath = path.join(releaseDir, 'github-output.txt');
        writeBaseReleaseFiles(releaseDir);

        prepareWindowsReleaseAssets({
            releaseDir,
            version: '0.12.0',
            githubOutputPath,
        });

        const outputContents = fs.readFileSync(githubOutputPath, 'utf8');
        expect(outputContents).toContain('windows_upload_files<<EOF');
        expect(outputContents).toContain('checksums-windows.txt');
        expect(outputContents).not.toContain('windows-release-manifest.json');
    });

    it('normalizes workflow contract paths to forward slashes', () => {
        const { prepareWindowsReleaseAssets } = loadWindowsReleaseContract();
        const releaseDir = makeTempReleaseDir();

        writeBaseReleaseFiles(releaseDir);

        const result = prepareWindowsReleaseAssets({
            releaseDir,
            version: '0.12.0',
        });

        expect(result.windowsManifestPath).toBe('release/windows-release-manifest.json');
        expect(result.windowsUploadFiles).toEqual([
            'release/Gemini-Desktop-0.12.0-installer.exe',
            'release/Gemini-Desktop-0.12.0-installer.exe.blockmap',
            'release/latest.yml',
            'release/latest-x64.yml',
            'release/latest-arm64.yml',
            'release/x64.yml',
            'release/arm64.yml',
            'release/checksums-windows.txt',
        ]);
    });
});
