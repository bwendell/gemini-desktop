import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workflowPath = path.resolve(__dirname, '../../..', '.github/workflows/_release.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');

describe('release workflow Windows metadata aliases', () => {
    it('creates and uploads x64 alias metadata in windows-x64 job', () => {
        expect(workflow).toContain('name: Prepare Windows update metadata (x64)');
        expect(workflow).toContain('Copy-Item -Path latest-x64.yml -Destination x64.yml -Force');
        expect(workflow).toContain('release/x64.yml');
    });

    it('creates and uploads arm64 alias metadata in windows-arm64 job', () => {
        expect(workflow).toContain('name: Prepare Windows update metadata (arm64)');
        expect(workflow).toContain('Copy-Item -Path latest.yml -Destination latest-arm64.yml -Force');
        expect(workflow).toContain('Copy-Item -Path latest-arm64.yml -Destination arm64.yml -Force');
        expect(workflow).toContain('Remove-Item -Path latest.yml -Force');
        expect(workflow).toContain('release/arm64.yml');
    });

    it('documents temporary compatibility window for removing aliases', () => {
        expect(workflow).toContain('TODO(v0.10.x cleanup): Remove legacy x64.yml/arm64.yml aliases');
        expect(workflow).toContain('after ~3-4 releases past v0.10.1');
    });

    it('keeps Windows metadata aliases while publishing exe-only Windows artifacts', () => {
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
