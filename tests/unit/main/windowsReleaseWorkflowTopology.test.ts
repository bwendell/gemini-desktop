import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workflowPath = path.resolve(__dirname, '../../..', '.github/workflows/_release.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');

const extractJobBlock = (jobName: string) => {
    const jobStart = workflow.indexOf(`    ${jobName}:`);
    expect(jobStart).toBeGreaterThanOrEqual(0);

    const nextJobMatch = workflow.slice(jobStart + 1).match(/\n {4}[a-z0-9-]+:/);
    const nextJobStart = nextJobMatch?.index === undefined ? -1 : jobStart + 1 + nextJobMatch.index;

    return nextJobStart === -1 ? workflow.slice(jobStart) : workflow.slice(jobStart, nextJobStart);
};

describe('Windows release workflow topology', () => {
    it('uses per-architecture Windows release jobs with dedicated installer validation', () => {
        expect(workflow).toContain('windows-x64-build:');
        expect(workflow).toContain('windows-validate-x64:');
        expect(workflow).toContain('windows-arm64-build:');
        expect(workflow).toContain('windows-validate-arm64:');
        expect(workflow).toContain('windows-publish:');
        expect(workflow).toContain('runs-on: windows-11-arm');
        expect(workflow).not.toContain('windows-build:');
    });

    it('restores per-architecture release metadata and checksum handling', () => {
        expect(workflow).toContain('checksums-windows.txt');
        expect(workflow).toContain('checksums-windows-arm64.txt');
        expect(workflow).toContain('latest-x64.yml');
        expect(workflow).toContain('latest-arm64.yml');
        expect(workflow).toContain('x64.yml');
        expect(workflow).toContain('arm64.yml');
        expect(workflow).not.toContain('release/windows-release-manifest.json');
    });

    it('builds each Windows architecture with explicit dist commands', () => {
        expect(workflow).toContain('npm run dist:win-x64');
        expect(workflow).toContain('npm run dist:win-arm64');
        expect(workflow).toContain('release-artifacts-windows-x64');
        expect(workflow).toContain('release-artifacts-windows-arm64');
        expect(workflow).toContain('Install promoted arm64 candidate');
        expect(workflow).toContain('Install promoted x64 candidate');
        expect(workflow).toContain('Run arm64 installer smoke spec');
        expect(workflow).toContain('Run x64 installer smoke spec');
        expect(workflow).toContain('Run x64 upgrade spec');
    });

    it('limits arm64 validation to the promoted installer path', () => {
        expect(workflow).not.toContain('Resolve arm64 baseline installer');
        expect(workflow).not.toContain('Install baseline arm64 build');
        expect(workflow).not.toContain('Upgrade arm64 baseline to promoted installer');
        expect(workflow).not.toContain('Run arm64 upgrade spec');
    });

    it('runs arm64 packaged E2E only on the arm64 validation runner', () => {
        const arm64BuildJob = extractJobBlock('windows-arm64-build');
        const arm64ValidationJob = extractJobBlock('windows-validate-arm64');

        expect(arm64BuildJob).toContain('runs-on: windows-latest');
        expect(arm64BuildJob).not.toContain('npm run test:e2e:release');
        expect(arm64ValidationJob).toContain('runs-on: windows-11-arm');
        expect(arm64ValidationJob).toContain('Run arm64 packaged release E2E tests');
        expect(arm64ValidationJob).toContain('npm run test:e2e:release');
    });
});
