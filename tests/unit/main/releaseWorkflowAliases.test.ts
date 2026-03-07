import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const workflowPath = path.resolve(process.cwd(), '.github/workflows/_release.yml');

describe('release workflow Windows metadata aliases', () => {
    it('creates and uploads x64 alias metadata in windows-x64 job', () => {
        const workflow = fs.readFileSync(workflowPath, 'utf8');

        expect(workflow).toContain('name: Prepare Windows update metadata (x64)');
        expect(workflow).toContain('Copy-Item -Path latest-x64.yml -Destination x64.yml -Force');
        expect(workflow).toContain('release/x64.yml');
    });

    it('creates and uploads arm64 alias metadata in windows-arm64 job', () => {
        const workflow = fs.readFileSync(workflowPath, 'utf8');

        expect(workflow).toContain('name: Prepare Windows update metadata (arm64)');
        expect(workflow).toContain('Copy-Item -Path latest.yml -Destination latest-arm64.yml -Force');
        expect(workflow).toContain('Copy-Item -Path latest-arm64.yml -Destination arm64.yml -Force');
        expect(workflow).toContain('release/arm64.yml');
    });

    it('documents temporary compatibility window for removing aliases', () => {
        const workflow = fs.readFileSync(workflowPath, 'utf8');

        expect(workflow).toContain('TODO(v0.10.x cleanup): Remove legacy x64.yml/arm64.yml aliases');
        expect(workflow).toContain('after ~3-4 releases past v0.10.1');
    });
});
