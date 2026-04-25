import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const packageJsonPath = path.resolve(__dirname, '../../..', 'package.json');
const scriptPath = path.resolve(__dirname, '../../..', 'scripts/release/run-windows-dist.cjs');
const packageJson = require(packageJsonPath);
const scriptSource = fs.readFileSync(scriptPath, 'utf8');

describe('Windows release metadata and build scripts', () => {
    it('uses targeted Windows dist entrypoints without a unified default', () => {
        expect(packageJson.scripts['dist:win']).not.toContain('unified');
        expect(packageJson.scripts['dist:win-x64']).toContain('run-windows-dist.cjs x64');
        expect(packageJson.scripts['dist:win-arm64']).toContain('run-windows-dist.cjs arm64');
    });

    it('supports only x64 and arm64 modes in the release helper', () => {
        expect(scriptSource).not.toContain("case 'unified'");
        expect(scriptSource).toContain("case 'x64'");
        expect(scriptSource).toContain("case 'arm64'");
    });

    it('uses x64 as the default Windows dist entrypoint', () => {
        expect(packageJson.scripts['dist:win']).toContain('run-windows-dist.cjs x64');
    });
});
