import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workflowPath = path.resolve(__dirname, '../../..', '.github/workflows/_release.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');
const require = createRequire(import.meta.url);
const builderConfigPath = path.resolve(__dirname, '../../..', 'config/electron-builder.config.cjs');

type TargetConfig = string | { target: string };
type ElectronBuilderConfig = {
    mac?: {
        target?: TargetConfig[];
    };
};

const builderConfig = require(builderConfigPath) as ElectronBuilderConfig;

function getTargetNames(targets: TargetConfig[] | undefined): string[] {
    return targets?.map((target) => (typeof target === 'string' ? target : target.target)) ?? [];
}

describe('release workflow Windows metadata aliases', () => {
    it('prepares aliases inline for per-architecture release jobs', () => {
        expect(workflow).not.toContain('prepare-windows-release-assets.cjs');
        expect(workflow).toContain('Copy-Item -Path latest-x64.yml -Destination x64.yml -Force');
        expect(workflow).toContain('Copy-Item -Path latest.yml -Destination latest-arm64.yml -Force');
        expect(workflow).toContain('Copy-Item -Path latest-arm64.yml -Destination arm64.yml -Force');
    });

    it('keeps Windows compatibility alias files in the publish contract', () => {
        expect(workflow).toContain('release/latest.yml');
        expect(workflow).toContain('release/x64.yml');
        expect(workflow).toContain('release/arm64.yml');
        expect(workflow).toContain('release/latest-x64.yml');
        expect(workflow).toContain('release/latest-arm64.yml');
        expect(workflow).toContain('release/checksums-windows.txt');
        expect(workflow).toContain('release/checksums-windows-arm64.txt');
        expect(workflow).not.toContain('release/*.msi');
    });
});

describe('electron-builder macOS release artifacts', () => {
    it('builds macOS ZIP artifacts for update metadata', () => {
        const macTargetNames = getTargetNames(builderConfig.mac?.target);

        expect(macTargetNames).toContain('dmg');
        expect(macTargetNames).toContain('zip');
    });

    it('does not publish unsupported macOS ZIP artifact globs', () => {
        expect(workflow).not.toContain('*.dmg *.zip');
        expect(workflow).not.toContain('release/*.zip');
        expect(workflow).not.toContain('release/*.zip.blockmap');
    });
});
