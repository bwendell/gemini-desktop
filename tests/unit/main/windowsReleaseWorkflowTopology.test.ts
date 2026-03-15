import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workflowPath = path.resolve(__dirname, '../../..', '.github/workflows/_release.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');

describe('Windows release workflow topology', () => {
    it('uses build validate publish Windows jobs', () => {
        expect(workflow).toContain('windows-build:');
        expect(workflow).toContain('windows-validate-x64:');
        expect(workflow).toContain('windows-validate-arm64:');
        expect(workflow).toContain('runs-on: windows-11-arm');
        expect(workflow).toContain('windows-publish:');
    });

    it('removes obsolete Windows release flow pieces', () => {
        expect(workflow).not.toContain('RUN_WINDOWS_ARM64_VALIDATION');
        expect(workflow).not.toContain('windows-release-manifest-x64.json');
        expect(workflow).not.toContain('windows-release-manifest-arm64.json');
        expect(workflow).not.toContain('checksums-windows-arm64.txt');
        expect(workflow).not.toContain('Attach ARM64 validation gate reminder');
        expect(workflow).toContain('release/windows-release-manifest.json');
    });
});
