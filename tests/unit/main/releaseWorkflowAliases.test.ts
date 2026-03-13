import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workflowPath = path.resolve(__dirname, '../../..', '.github/workflows/_release.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');

function section(startMarker: string, endMarker: string): string {
    const start = workflow.indexOf(startMarker);
    const end = workflow.indexOf(endMarker, start + startMarker.length);
    return workflow.slice(start, end === -1 ? workflow.length : end);
}

describe('release workflow Windows metadata aliases', () => {
    it('keeps Phase A x64 bridge metadata aliases and validates them before upload', () => {
        const windowsX64 = section('    windows-x64:', '    windows-arm64:');

        expect(windowsX64).toContain('name: Prepare Windows update metadata (x64)');
        expect(windowsX64).toContain('Copy-Item -Path latest.yml -Destination latest-x64.yml -Force');
        expect(windowsX64).toContain('Copy-Item -Path latest-x64.yml -Destination x64.yml -Force');
        expect(windowsX64).toContain('name: Validate Windows update metadata (x64)');
        expect(windowsX64).toContain('release/windows-release-manifest-x64.json');
    });

    it('keeps Phase A arm64 bridge metadata aliases and validates them before upload', () => {
        const windowsArm64 = section(
            '    windows-arm64:',
            '    # =========================================================================='
        );

        expect(windowsArm64).toContain('name: Prepare Windows update metadata (arm64)');
        expect(windowsArm64).toContain('Copy-Item -Path latest.yml -Destination latest-arm64.yml -Force');
        expect(windowsArm64).toContain('Copy-Item -Path latest-arm64.yml -Destination arm64.yml -Force');
        expect(windowsArm64).toContain('name: Validate Windows update metadata (arm64)');
        expect(windowsArm64).not.toContain('Remove-Item -Path latest.yml -Force');
        expect(windowsArm64).toContain('release/windows-release-manifest-arm64.json');
    });

    it('documents temporary compatibility window for removing aliases', () => {
        expect(workflow).toContain('TODO(v0.10.x cleanup): Remove legacy x64.yml/arm64.yml aliases');
        expect(workflow).toContain('after ~3-4 releases past v0.10.1');
    });

    it('keeps Windows metadata aliases while publishing deterministic upload sets', () => {
        expect(workflow).toContain('latest.yml');
        expect(workflow).toContain('latest-x64.yml');
        expect(workflow).toContain('latest-arm64.yml');
        expect(workflow).toContain('x64.yml');
        expect(workflow).toContain('arm64.yml');
        expect(workflow).toContain('checksums-windows-x64.txt');
        expect(workflow).toContain('checksums-windows-arm64.txt');
        expect(workflow).toContain('release/windows-release-manifest-x64.json');
        expect(workflow).toContain('release/windows-release-manifest-arm64.json');
        expect(workflow).toContain('foreach ($file in $manifest.uploadFiles)');
        expect(workflow).toContain('release/upload-x64/*');
        expect(workflow).toContain('release/upload-arm64/*');
        expect(workflow).not.toContain('release/*.exe');
        expect(workflow).not.toContain('release/*.msi');
    });

    it('downloads a previous x64 installer and runs a real upgrade lane before metadata publication', () => {
        const windowsX64 = section('    windows-x64:', '    windows-arm64:');

        expect(windowsX64).toContain('name: Resolve previous x64 installer for upgrade validation');
        expect(windowsX64).toContain('gh release download "$previous_tag" --pattern');
        expect(windowsX64).toContain('WINDOWS_BASELINE_INSTALLER');
        expect(windowsX64).toContain('WINDOWS_BASELINE_VERSION');
        expect(windowsX64).toContain('name: Install previous x64 baseline build');
        expect(windowsX64).toContain('name: Upgrade baseline install to promoted Windows installer (x64)');
        expect(windowsX64).toContain('name: Run Windows installer upgrade test (x64)');
    });

    it('runs Windows jobs in build → smoke/upgrade tests → metadata → checksums → validation → upload order', () => {
        const windowsX64 = section('    windows-x64:', '    windows-arm64:');
        const build = windowsX64.indexOf('name: Build Windows x64 updater installer');
        const smoke = windowsX64.indexOf('name: Run Windows installer smoke test (x64)');
        const upgrade = windowsX64.indexOf('name: Run Windows installer upgrade test (x64)');
        const metadata = windowsX64.indexOf('name: Prepare Windows update metadata (x64)');
        const checksums = windowsX64.indexOf('name: Generate Checksums (x64 lane)');
        const validation = windowsX64.indexOf('name: Validate Windows update metadata (x64)');
        const upload = windowsX64.indexOf('name: Upload to GitHub Release');

        expect(build).toBeGreaterThan(-1);
        expect(smoke).toBeGreaterThan(build);
        expect(upgrade).toBeGreaterThan(smoke);
        expect(metadata).toBeGreaterThan(upgrade);
        expect(checksums).toBeGreaterThan(metadata);
        expect(validation).toBeGreaterThan(checksums);
        expect(upload).toBeGreaterThan(validation);
    });
});
