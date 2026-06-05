import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const installerSmokeScriptPath = path.resolve(__dirname, '../../..', 'scripts/windows/installer-smoke.ps1');
const installerSmokeScript = fs.readFileSync(installerSmokeScriptPath, 'utf8');

describe('Windows installer smoke script', () => {
    it('retries the known NSIS Windows-on-ARM access violation without weakening final failure handling', () => {
        expect(installerSmokeScript).toContain('$RetryableInstallerExitCodes = @(-1073741819)');
        expect(installerSmokeScript).toContain('$MaxInstallerAttempts = 2');
        expect(installerSmokeScript).toContain('$attempt -lt $MaxInstallerAttempts');
        expect(installerSmokeScript).toContain('Installer exited with code $installerExitCode');
    });
});
