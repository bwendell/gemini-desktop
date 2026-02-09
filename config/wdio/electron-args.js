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
const isCI = Boolean(process.env.CI);

const linuxArgs = isLinux
    ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    : [];
const ciArgs = isCI ? ['--enable-logging'] : [];
const baseAppArgs = [...linuxArgs, ...ciArgs];

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
