import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

const scriptPath = path.resolve(process.cwd(), 'scripts/release/validate-windows-release-metadata.cjs');
const tempDirs: string[] = [];

function sha512Base64(value: Buffer): string {
    return createHash('sha512').update(value).digest('base64');
}

function sha256Hex(value: Buffer): string {
    return createHash('sha256').update(value).digest('hex');
}

function createReleaseFixture(
    lane: 'x64' | 'arm64',
    overrides: Partial<{ metadataPath: string; latestPath: string; includeMsi: boolean }> = {}
) {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `windows-release-${lane}-`));
    tempDirs.push(tempDir);

    const installers = ['Gemini-Desktop-1.2.3-installer.exe'];

    const hashes = new Map<string, { sha512: string; sha256: string; size: number }>();

    for (const installerName of installers) {
        const buffer = Buffer.from(`fixture:${installerName}`);
        hashes.set(installerName, {
            sha512: sha512Base64(buffer),
            sha256: sha256Hex(buffer),
            size: buffer.length,
        });
        fs.writeFileSync(path.join(tempDir, installerName), buffer);
        fs.writeFileSync(path.join(tempDir, `${installerName}.blockmap`), 'blockmap');
    }

    const checksumFile = lane === 'x64' ? 'checksums-windows-x64.txt' : 'checksums-windows-arm64.txt';
    fs.writeFileSync(
        path.join(tempDir, checksumFile),
        installers.map((installerName) => `${hashes.get(installerName)?.sha256}  ${installerName}`).join('\n') + '\n',
        'utf8'
    );

    const metadataTargets =
        lane === 'x64'
            ? {
                  'latest.yml': overrides.latestPath ?? 'Gemini-Desktop-1.2.3-installer.exe',
                  'latest-x64.yml': overrides.metadataPath ?? 'Gemini-Desktop-1.2.3-installer.exe',
                  'x64.yml': overrides.metadataPath ?? 'Gemini-Desktop-1.2.3-installer.exe',
              }
            : {
                  'latest-arm64.yml': overrides.metadataPath ?? 'Gemini-Desktop-1.2.3-installer.exe',
                  'arm64.yml': overrides.metadataPath ?? 'Gemini-Desktop-1.2.3-installer.exe',
              };

    for (const [metadataFile, installerName] of Object.entries(metadataTargets)) {
        const expected = hashes.get(installerName);
        fs.writeFileSync(
            path.join(tempDir, metadataFile),
            `version: 1.2.3\npath: ${installerName}\nsha512: ${expected?.sha512}\nfiles:\n  - url: ${installerName}\n    sha512: ${expected?.sha512}\n    size: ${expected?.size}\n`,
            'utf8'
        );
    }

    if (overrides.includeMsi) {
        fs.writeFileSync(path.join(tempDir, 'Gemini-Desktop-1.2.3.msi'), 'forbidden');
    }

    return tempDir;
}

function runValidator(lane: 'x64' | 'arm64', releaseDir: string) {
    return spawnSync(process.execPath, [scriptPath, '--lane', lane, '--release-dir', releaseDir], {
        encoding: 'utf8',
    });
}

afterEach(() => {
    while (tempDirs.length > 0) {
        const target = tempDirs.pop();
        if (target) {
            fs.rmSync(target, { recursive: true, force: true });
        }
    }
});

describe('validate-windows-release-metadata', () => {
    it('passes when x64 metadata aliases target the promoted unified installer', () => {
        const releaseDir = createReleaseFixture('x64');
        const result = runValidator('x64', releaseDir);

        expect(result.status).toBe(0);
        expect(fs.existsSync(path.join(releaseDir, 'windows-release-manifest-x64.json'))).toBe(true);
        const manifest = JSON.parse(
            fs.readFileSync(path.join(releaseDir, 'windows-release-manifest-x64.json'), 'utf8')
        ) as { uploadFiles: string[] };
        expect(manifest.uploadFiles).toContain('Gemini-Desktop-1.2.3-installer.exe');
        expect(manifest.uploadFiles).toContain('Gemini-Desktop-1.2.3-installer.exe.blockmap');
    });

    it('passes when arm64 compatibility metadata points to the promoted unified installer', () => {
        const releaseDir = createReleaseFixture('arm64');
        const result = runValidator('arm64', releaseDir);

        expect(result.status).toBe(0);
        expect(fs.existsSync(path.join(releaseDir, 'windows-release-manifest-arm64.json'))).toBe(true);
        const manifest = JSON.parse(
            fs.readFileSync(path.join(releaseDir, 'windows-release-manifest-arm64.json'), 'utf8')
        ) as { uploadFiles: string[] };
        expect(manifest.uploadFiles).not.toContain('Gemini-Desktop-1.2.3-installer.exe');
        expect(manifest.uploadFiles).not.toContain('Gemini-Desktop-1.2.3-installer.exe.blockmap');
    });

    it('fails when latest-arm64.yml points to an unexpected installer', () => {
        const releaseDir = createReleaseFixture('arm64', {
            metadataPath: 'Gemini-Desktop-1.2.3-arm64-installer.exe',
        });
        const result = runValidator('arm64', releaseDir);

        expect(result.status).toBe(1);
        expect(result.stderr).toContain('path mismatch');
    });

    it('fails when MSI artifacts appear in the validated Windows release set', () => {
        const releaseDir = createReleaseFixture('x64', {
            includeMsi: true,
        });
        const result = runValidator('x64', releaseDir);

        expect(result.status).toBe(1);
        expect(result.stderr).toContain('MSI artifacts are forbidden');
    });
});
