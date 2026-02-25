/**
 * Centralized Electron arguments and Linux service configuration for WDIO.
 *
 * All wdio config files import from here to ensure consistent Electron flags
 * across local development and CI environments.
 *
 * Linux (local + CI):
 *   --no-sandbox, --disable-setuid-sandbox, --disable-dev-shm-usage, --disable-gpu
 *
 * CI-only (Linux):
 *   --enable-logging, autoXvfb, AppArmor auto-install
 */

const isLinux = process.platform === 'linux';
const isWin32 = process.platform === 'win32';

function isCiEnvironment() {
    return Boolean(process.env.CI);
}

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
    const isCI = isCiEnvironment();
    const linuxArgs = isLinux
        ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        : [];
    const windowsArgs = isWin32 && isCI ? ['--disable-gpu', '--disable-software-rasterizer', '--no-sandbox'] : [];
    const ciArgs = isCI ? ['--enable-logging'] : [];

    return [...linuxArgs, ...windowsArgs, ...ciArgs, ...extraArgs];
}

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
export function getLinuxServiceConfig() {
    const isCI = isCiEnvironment();

    return {
        // Ubuntu 24.04+ requires AppArmor profile for Electron (Linux only)
        // See: https://github.com/electron/electron/issues/41066
        ...(isLinux && isCI ? { apparmorAutoInstall: 'sudo' } : { apparmorAutoInstall: false }),
        // Enable wdio-electron-service's built-in Xvfb management for Linux CI
        // This is required for headless test execution - do NOT use xvfb-run wrapper
        // as it sets DISPLAY which prevents autoXvfb from working properly with workers
        ...(isLinux && isCI
            ? {
                  autoXvfb: true,
                  xvfbAutoInstall: true,
                  xvfbAutoInstallMode: 'sudo',
                  xvfbMaxRetries: 5,
              }
            : {}),
    };
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
