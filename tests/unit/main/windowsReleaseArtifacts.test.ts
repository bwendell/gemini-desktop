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

    it('does not upload or checksum MSI artifacts in the Windows release workflow', () => {
        expect(workflow).not.toContain('release/*.msi');
        expect(workflow).not.toContain('Get-ChildItem -Path *.msi -File');
        expect(workflow).toContain('release/*.exe');
        expect(workflow).toContain('release/*.exe.blockmap');
        expect(workflow).toContain('release/checksums-windows.txt');
        expect(workflow).toContain('release/checksums-windows-arm64.txt');
    });
});
