import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const configPath = path.resolve(__dirname, '../../..', 'config/electron-builder.config.cjs');
const workflowPath = path.resolve(__dirname, '../../..', '.github/workflows/_release.yml');
const builderConfig = require(configPath);
const workflow = fs.readFileSync(workflowPath, 'utf8');

describe('Windows release artifacts', () => {
    it('keeps NSIS and removes MSI from Windows builder targets', () => {
        const targets = builderConfig.win.target.map((target: { target: string }) => target.target);

        expect(targets).toContain('nsis');
        expect(targets).not.toContain('msi');
    });

    it('publishes Windows assets from per-architecture release globs', () => {
        expect(workflow).toContain('release/*-x64-installer.exe');
        expect(workflow).toContain('release/*-x64-installer.exe.blockmap');
        expect(workflow).toContain('release/*.x64.nsis.7z');
        expect(workflow).toContain('release/*-arm64-installer.exe');
        expect(workflow).toContain('release/*-arm64-installer.exe.blockmap');
        expect(workflow).toContain('release/*.arm64.nsis.7z');
        expect(workflow).not.toContain('release/*.msi');
        expect(workflow).toContain('release/checksums-windows.txt');
        expect(workflow).toContain('release/checksums-windows-arm64.txt');
        expect(workflow).not.toContain('${{ needs.windows-build.outputs.windows_upload_files }}');
        expect(workflow).not.toContain('release/windows-release-manifest.json');
    });

    it('restores per-architecture Windows metadata aliases', () => {
        expect(workflow).toContain('release/latest.yml');
        expect(workflow).toContain('release/latest-x64.yml');
        expect(workflow).toContain('release/latest-arm64.yml');
        expect(workflow).toContain('release/x64.yml');
        expect(workflow).toContain('release/arm64.yml');
    });

    it('removes the unified Windows installer helper assumptions', () => {
        expect(workflow).toContain('release/checksums-windows.txt');
        expect(workflow).not.toContain('name: release-artifacts-windows\n');
        expect(workflow).not.toContain('windows-release-manifest.json');
    });

    it('removes unified Windows binary exclusions from builder config', () => {
        expect(builderConfig.files).toContain('!node_modules/@node-llama-cpp/linux-x64');
        expect(builderConfig.files).toContain('!node_modules/@node-llama-cpp/mac-arm64-metal');
        expect(fs.readFileSync(configPath, 'utf8')).toContain('function getWindowsBinaryExclusions()');
        expect(fs.readFileSync(configPath, 'utf8')).not.toContain('if (isUnifiedWindowsBuild)');
    });
});
