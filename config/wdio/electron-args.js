/**
 * Centralized Electron arguments and Linux service configuration for WDIO.
 *
 * All wdio config files import from here to ensure consistent Electron flags
 * across local development and CI environments.
 *
 * Linux (local + CI):
 *   --no-sandbox, --disable-setuid-sandbox, --disable-dev-shm-usage, --disable-gpu
 *
 * Headless Linux (CI or no DISPLAY):
 *   --enable-logging, autoXvfb, AppArmor auto-install
 */

import fs from 'fs';
import https from 'https';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(import.meta.url);

const isLinux = process.platform === 'linux';
const isWin32 = process.platform === 'win32';
const isCI = Boolean(process.env.CI);
const isHeadless = isLinux && !process.env.DISPLAY;
const isArm64 = process.arch === 'arm64';

function resolveElectronVersion() {
    const electronPackage = require('electron/package.json');
    if (!electronPackage?.version) {
        throw new Error('Unable to resolve Electron version for chromedriver download.');
    }
    return electronPackage.version;
}

const electronVersion = resolveElectronVersion();
const armChromedriverDir = path.resolve(__dirname, `../../.cache/chromedriver/v${electronVersion}`);
const armChromedriverPath = process.env.CHROMEDRIVER_PATH ?? path.join(armChromedriverDir, 'chromedriver');

const linuxArgs = isLinux
    ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    : [];
const windowsArgs = isWin32 && isCI ? ['--disable-gpu', '--disable-software-rasterizer', '--no-sandbox'] : [];
const ciArgs = isCI || isHeadless ? ['--enable-logging'] : [];
const baseAppArgs = [...linuxArgs, ...windowsArgs, ...ciArgs];

/**
 * Build the final appArgs array by merging platform/CI args with config-specific args.
 *
 * @param {...string} extraArgs - Additional args specific to a config (e.g. '--test-auto-update')
 * @returns {string[]}
 *
 * @example
 *   getAppArgs('--test-auto-update', '--e2e-disable-auto-submit')
 */
export function getAppArgs(...extraArgs) {
    return [...baseAppArgs, ...extraArgs];
}

export const chromedriverCapabilities =
    isLinux && isArm64
        ? {
              'wdio:chromedriverOptions': {
                  binary: armChromedriverPath,
              },
          }
        : {};

/**
 * Linux-specific WDIO electron service options (Xvfb, AppArmor).
 * Spread into the electron service config object.
 *
 * @example
 *   services: [['electron', {
 *       appEntryPoint: electronMainPath,
 *       appArgs: getAppArgs('--test-auto-update'),
 *       ...linuxServiceConfig,
 *   }]]
 */
export const linuxServiceConfig = {
    // Ubuntu 24.04+ requires AppArmor profile for Electron (Linux only)
    // See: https://github.com/electron/electron/issues/41066
    ...(isLinux && (isCI || isHeadless) ? { apparmorAutoInstall: 'sudo' } : { apparmorAutoInstall: false }),
    // Enable wdio-electron-service's built-in Xvfb management for Linux CI
    // This is required for headless test execution - do NOT use xvfb-run wrapper
    // as it sets DISPLAY which prevents autoXvfb from working properly with workers
    ...(isLinux && (isCI || isHeadless)
        ? {
              autoXvfb: true,
              xvfbAutoInstall: true,
              xvfbAutoInstallMode: 'sudo',
              xvfbMaxRetries: 5,
          }
        : {}),
};

async function downloadFile(url, destination, options = {}) {
    const { retries = 2, timeoutMs = 30000 } = options;
    let attempt = 0;

    while (true) {
        try {
            await new Promise((resolve, reject) => {
                const request = https.get(url, (response) => {
                    if (
                        response.statusCode &&
                        response.statusCode >= 300 &&
                        response.statusCode < 400 &&
                        response.headers.location
                    ) {
                        response.resume();
                        downloadFile(response.headers.location, destination, { retries, timeoutMs })
                            .then(resolve)
                            .catch(reject);
                        return;
                    }
                    if (response.statusCode !== 200) {
                        reject(new Error(`Failed to download ${url}. Status code: ${response.statusCode}`));
                        response.resume();
                        return;
                    }
                    const fileStream = fs.createWriteStream(destination);
                    response.pipe(fileStream);
                    fileStream.on('finish', () => fileStream.close(resolve));
                    fileStream.on('error', reject);
                });
                request.setTimeout(timeoutMs, () => {
                    request.destroy(new Error(`Timed out while downloading ${url}`));
                });
                request.on('error', reject);
            });
            return;
        } catch (error) {
            if (attempt >= retries) {
                throw error;
            }
            const backoffMs = 1000 * (attempt + 1);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            attempt += 1;
        }
    }
}

function resolveZipExtractor() {
    let hasUnzip = false;

    try {
        execSync('unzip -v', { stdio: 'ignore' });
        hasUnzip = true;
    } catch (error) {
        hasUnzip = false;
    }

    if (hasUnzip) {
        return 'unzip';
    }

    try {
        execSync('python3 --version', { stdio: 'ignore' });
        return 'python3';
    } catch (error) {
        throw new Error('Missing unzip or python3. Install one to extract the Electron chromedriver archive.');
    }
}

function extractZip(zipPath, destination) {
    const extractor = resolveZipExtractor();
    if (extractor === 'unzip') {
        execSync(`unzip -o "${zipPath}" -d "${destination}"`, { stdio: 'inherit' });
        return;
    }

    execSync(`python3 -m zipfile -e "${zipPath}" "${destination}"`, { stdio: 'inherit' });
}

async function ensureChromedriverFromElectronRelease() {
    if (fs.existsSync(armChromedriverPath)) {
        fs.chmodSync(armChromedriverPath, 0o755);
        return armChromedriverPath;
    }

    fs.mkdirSync(armChromedriverDir, { recursive: true });
    const zipName = `chromedriver-v${electronVersion}-linux-arm64.zip`;
    const downloadUrl = `https://github.com/electron/electron/releases/download/v${electronVersion}/${zipName}`;
    const zipPath = path.join(armChromedriverDir, zipName);

    await downloadFile(downloadUrl, zipPath, { retries: 2, timeoutMs: 30000 });
    extractZip(zipPath, armChromedriverDir);

    if (!fs.existsSync(armChromedriverPath)) {
        const entries = fs.readdirSync(armChromedriverDir);
        const chromedriverEntry = entries.find((entry) => entry === 'chromedriver');
        if (!chromedriverEntry) {
            throw new Error(`Chromedriver not found after extracting ${zipName}.`);
        }
    }

    fs.chmodSync(armChromedriverPath, 0o755);
    return armChromedriverPath;
}

export async function ensureArmChromedriver() {
    if (!isLinux || !isArm64) return null;

    if (process.env.CHROMEDRIVER_PATH) {
        if (!fs.existsSync(armChromedriverPath)) {
            throw new Error(`CHROMEDRIVER_PATH was set but no file exists at ${armChromedriverPath}`);
        }
        fs.chmodSync(armChromedriverPath, 0o755);
        return armChromedriverPath;
    }

    return ensureChromedriverFromElectronRelease();
}

/**
 * Kill any orphaned Electron processes left behind by test runs.
 *
 * On Linux/macOS, uses `pkill -f` to match the "electron.*gemini-desktop" pattern.
 * On Windows, uses PowerShell CIM queries to find and terminate matching processes.
 *
 * This should be called in `afterSession` hooks to prevent Electron zombie processes
 * from accumulating across test specs and consuming memory.
 */
export async function killOrphanElectronProcesses() {
    const { execSync } = await import('child_process');
    try {
        if (process.platform === 'win32') {
            execSync(
                "powershell -Command \"Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'electron.exe' -and $_.CommandLine -like '*gemini-desktop*' } | ForEach-Object { taskkill /F /PID $_.ProcessId }\"",
                { stdio: 'ignore' }
            );
        } else {
            execSync('pkill -f "electron.*gemini-desktop"', { stdio: 'ignore' });
        }
    } catch (_) {
        // Process might already be gone, or no matching processes found (exit code 1)
    }
}
