import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workflowPath = path.resolve(__dirname, '../../..', '.github/workflows/_release.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');

describe('release workflow Windows metadata aliases', () => {
    it('prepares aliases through the shared Windows release helper', () => {
        expect(workflow).toContain('prepare-windows-release-assets.cjs');
        expect(workflow).not.toContain('Copy-Item -Path latest-x64.yml -Destination x64.yml -Force');
        expect(workflow).not.toContain('Copy-Item -Path latest.yml -Destination latest-arm64.yml -Force');
        expect(workflow).not.toContain('Copy-Item -Path latest-arm64.yml -Destination arm64.yml -Force');
    });

    it('keeps Windows compatibility alias files in the publish contract', () => {
        expect(workflow).toContain('release/latest.yml');
        expect(workflow).toContain('release/x64.yml');
        expect(workflow).toContain('release/arm64.yml');
        expect(workflow).toContain('release/latest-x64.yml');
        expect(workflow).toContain('release/latest-arm64.yml');
        expect(workflow).toContain('release/checksums-windows.txt');
        expect(workflow).not.toContain('release/checksums-windows-arm64.txt');
        expect(workflow).not.toContain('release/*.msi');
    });
});
