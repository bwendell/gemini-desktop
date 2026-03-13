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
    it('preserves compatibility aliases after the unified installer build and validates them before upload', () => {
        const windowsX64 = section(
            '    windows-x64:',
            '    # =========================================================================='
        );

        expect(windowsX64).toContain('name: Build promoted unified Windows installer');
        expect(windowsX64).toContain('name: Preserve Windows compatibility metadata aliases');
        expect(windowsX64).toContain('Copy-Item -Path latest.yml -Destination latest-x64.yml -Force');
        expect(windowsX64).toContain('Copy-Item -Path latest.yml -Destination latest-arm64.yml -Force');
        expect(windowsX64).toContain('name: Prepare Windows update metadata');
        expect(windowsX64).toContain('Copy-Item -Path latest.yml -Destination $alias -Force');
        expect(windowsX64).toContain('name: Validate Windows update metadata (x64)');
        expect(windowsX64).toContain('release/windows-release-manifest-x64.json');
    });

    it('keeps ARM64 compatibility aliases and validates them before upload', () => {
        expect(workflow).toContain('name: Validate Windows update metadata (arm64)');
        expect(workflow).toContain('release/windows-release-manifest-arm64.json');
    });

    it('keeps Windows metadata aliases while publishing deterministic manifest-driven upload lists', () => {
        expect(workflow).toContain('latest.yml');
        expect(workflow).toContain('latest-x64.yml');
        expect(workflow).toContain('latest-arm64.yml');
        expect(workflow).toContain('x64.yml');
        expect(workflow).toContain('arm64.yml');
        expect(workflow).toContain('checksums-windows-x64.txt');
        expect(workflow).toContain('checksums-windows-arm64.txt');
        expect(workflow).toContain('release/windows-release-manifest-x64.json');
        expect(workflow).toContain('release/windows-release-manifest-arm64.json');
        expect(workflow).toContain('id: windows_x64_upload');
        expect(workflow).toContain('id: windows_arm64_upload');
        expect(workflow).toContain('${{ steps.windows_x64_upload.outputs.files }}');
        expect(workflow).toContain('${{ steps.windows_arm64_upload.outputs.files }}');
        expect(workflow).not.toContain('release/*.exe');
        expect(workflow).not.toContain('release/*.msi');
    });

    it('downloads a previous x64 installer and runs a real upgrade lane before metadata publication', () => {
        const windowsX64 = section(
            '    windows-x64:',
            '    # =========================================================================='
        );

        expect(windowsX64).toContain('name: Resolve previous x64 installer for upgrade validation');
        expect(windowsX64).toContain('gh release download "$previous_tag" --pattern');
        expect(windowsX64).toContain('WINDOWS_BASELINE_INSTALLER');
        expect(windowsX64).toContain('WINDOWS_BASELINE_VERSION');
        expect(windowsX64).toContain('name: Install previous Windows baseline build');
        expect(windowsX64).toContain('name: Upgrade baseline install to promoted Windows installer (x64)');
        expect(windowsX64).toContain('name: Run Windows installer upgrade test (x64)');
    });

    it('runs Windows jobs in build → smoke/upgrade tests → metadata → checksums → validation → upload order', () => {
        const windowsX64 = section(
            '    windows-x64:',
            '    # =========================================================================='
        );
        const build = windowsX64.indexOf('name: Build promoted unified Windows installer');
        const preserve = windowsX64.indexOf('name: Preserve Windows compatibility metadata aliases');
        const smoke = windowsX64.indexOf('name: Run Windows installer smoke test (x64)');
        const upgrade = windowsX64.indexOf('name: Run Windows installer upgrade test (x64)');
        const metadata = windowsX64.indexOf('name: Prepare Windows update metadata');
        const checksums = windowsX64.indexOf('name: Generate Checksums (x64 lane)');
        const validation = windowsX64.indexOf('name: Validate Windows update metadata (x64)');
        const upload = windowsX64.indexOf(
            'name: Upload Windows installer and x64 compatibility metadata to GitHub Release'
        );

        expect(build).toBeGreaterThan(-1);
        expect(preserve).toBeGreaterThan(build);
        expect(smoke).toBeGreaterThan(build);
        expect(upgrade).toBeGreaterThan(smoke);
        expect(metadata).toBeGreaterThan(upgrade);
        expect(checksums).toBeGreaterThan(metadata);
        expect(validation).toBeGreaterThan(checksums);
        expect(upload).toBeGreaterThan(validation);
    });
});
