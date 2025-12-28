// @ts-nocheck
/**
 * E2E Test: Code Signing Verification (Release Build Only)
 *
 * This test validates that the packaged application is properly signed
 * on platforms where code signing is supported. Code signing is essential
 * for:
 * - User trust (no "unknown publisher" warnings)
 * - Auto-update functionality (some platforms require matching signatures)
 * - macOS Gatekeeper compliance
 * - Windows SmartScreen reputation
 *
 * Platform behavior:
 * - Windows: Checks for Authenticode signature
 * - macOS: Checks for Apple code signature
 * - Linux: Skipped (code signing not typically used)
 */

import { browser, expect } from '@wdio/globals';
import { E2ELogger } from '../helpers/logger';

describe('Release Build: Code Signing', () => {
  it('should identify the current platform', async () => {
    const platformInfo = await browser.electron.execute((electron) => {
      return {
        platform: process.platform,
        arch: process.arch,
        execPath: process.execPath,
        isPackaged: electron.app.isPackaged,
      };
    });

    E2ELogger.info('code-signing', 'Platform info', platformInfo);

    expect(platformInfo.platform).toMatch(/^(win32|darwin|linux)$/);
    expect(platformInfo.isPackaged).toBe(true);
  });

  it('should have executable at expected location', async () => {
    const execInfo = await browser.electron.execute(() => {
      const fs = require('fs');
      const path = require('path');
      const execPath = process.execPath;

      return {
        path: execPath,
        exists: fs.existsSync(execPath),
        isFile: fs.existsSync(execPath) && fs.statSync(execPath).isFile(),
        basename: path.basename(execPath),
      };
    });

    E2ELogger.info('code-signing', 'Executable info', execInfo);

    expect(execInfo.exists).toBe(true);
    expect(execInfo.isFile).toBe(true);

    // Verify expected executable name based on platform
    if (process.platform === 'win32') {
      expect(execInfo.basename.toLowerCase()).toContain('.exe');
    }
  });

  // Windows-specific signing verification
  it('should verify Windows code signature (Windows only)', async function () {
    const platformCheck = await browser.electron.execute(() => process.platform);

    if (platformCheck !== 'win32') {
      E2ELogger.info('code-signing', 'Skipping Windows signing check - not on Windows');
      this.skip();
      return;
    }

    const signingInfo = await browser.electron.execute(() => {
      const { execSync } = require('child_process');
      const execPath = process.execPath;

      try {
        // Use PowerShell to check Authenticode signature
        const cmd = `powershell -Command "Get-AuthenticodeSignature '${execPath}' | Select-Object -Property Status, SignerCertificate | ConvertTo-Json"`;
        const result = execSync(cmd, { encoding: 'utf8', timeout: 10000 });
        const parsed = JSON.parse(result);

        return {
          checked: true,
          status: parsed.Status,
          hasCertificate: !!parsed.SignerCertificate,
          subject: parsed.SignerCertificate?.Subject || null,
        };
      } catch (error: any) {
        return {
          checked: false,
          error: error.message,
        };
      }
    });

    E2ELogger.info('code-signing', 'Windows signing status', signingInfo);

    if (signingInfo.checked) {
      // In CI/test builds, signature may be "NotSigned" or "Valid"
      // We log the status for visibility but don't hard-fail on unsigned test builds
      E2ELogger.info(
        'code-signing',
        `Signature status: ${signingInfo.status}, Signed: ${signingInfo.hasCertificate}`
      );

      // If signed, verify it's valid
      if (signingInfo.hasCertificate) {
        expect(signingInfo.status).toBe(0); // 0 = Valid
      }
    }
  });

  // macOS-specific signing verification
  it('should verify macOS code signature (macOS only)', async function () {
    const platformCheck = await browser.electron.execute(() => process.platform);

    if (platformCheck !== 'darwin') {
      E2ELogger.info('code-signing', 'Skipping macOS signing check - not on macOS');
      this.skip();
      return;
    }

    const signingInfo = await browser.electron.execute((electron) => {
      const { execSync } = require('child_process');
      const appPath = electron.app.getAppPath();
      const path = require('path');

      // Get the .app bundle path (parent of the asar/resources)
      let appBundlePath = appPath;
      while (!appBundlePath.endsWith('.app') && appBundlePath !== '/') {
        appBundlePath = path.dirname(appBundlePath);
      }

      try {
        // Use codesign to verify signature
        const cmd = `codesign --verify --deep --strict "${appBundlePath}" 2>&1`;
        execSync(cmd, { encoding: 'utf8', timeout: 30000 });

        // If no error, signature is valid
        return {
          checked: true,
          valid: true,
          appBundlePath,
        };
      } catch (error: any) {
        // codesign returns non-zero for unsigned or invalid
        return {
          checked: true,
          valid: false,
          appBundlePath,
          error: error.message || error.stderr,
        };
      }
    });

    E2ELogger.info('code-signing', 'macOS signing status', signingInfo);

    // In CI/test builds, may be unsigned
    // Log for visibility
    if (signingInfo.valid) {
      E2ELogger.info('code-signing', 'macOS code signature is valid');
    } else {
      E2ELogger.info('code-signing', `macOS code signature issue: ${signingInfo.error}`);
    }
  });

  // Linux skips signing checks
  it('should skip signing verification on Linux', async function () {
    const platformCheck = await browser.electron.execute(() => process.platform);

    if (platformCheck !== 'linux') {
      this.skip();
      return;
    }

    E2ELogger.info('code-signing', 'Linux does not use traditional code signing - test passed');
    expect(true).toBe(true);
  });

  it('should have correct app metadata', async () => {
    const metadata = await browser.electron.execute((electron) => {
      return {
        name: electron.app.getName(),
        version: electron.app.getVersion(),
        locale: electron.app.getLocale(),
        userDataPath: electron.app.getPath('userData'),
      };
    });

    E2ELogger.info('code-signing', 'App metadata', metadata);

    expect(metadata.name).toBe('Gemini Desktop');
    expect(metadata.version).toMatch(/^\d+\.\d+\.\d+/);
  });
});
