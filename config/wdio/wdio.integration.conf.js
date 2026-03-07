import 'dotenv/config';

import { baseConfig } from './wdio.base.conf.js';
import { ensureArmChromedriver, getAppArgs } from './electron-args.js';

const VITE_TEST_MODE = 'integration';
const baseElectronService = baseConfig.services?.find(([name]) => name === 'electron');
const baseElectronServiceOptions = baseElectronService ? baseElectronService[1] : {};

export const config = {
    ...baseConfig,
    runner: 'local',
    specs: ['../../tests/integration/**/*.test.ts'],
    exclude: ['../../tests/integration/macos-titlebar.integration.test.ts'],
    logLevel: 'debug',
    bail: 0,
    baseUrl: 'http://localhost',
    waitforTimeout: 30000,
    mochaOpts: {
        ...baseConfig.mochaOpts,
        timeout: 60000,
    },
    services: [
        [
            'electron',
            {
                ...baseElectronServiceOptions,
                appArgs: getAppArgs(
                    '--disable-web-security',
                    '--integration-test',
                    '--test-auto-update',
                    '--remote-debugging-address=127.0.0.1'
                ),
            },
        ],
    ],
    onPrepare: async function () {
        await ensureArmChromedriver();
        const { execSync } = await import('child_process');
        console.log('Building Electron app for integration tests...');
        execSync(`vite build --mode ${VITE_TEST_MODE} && npm run build:electron`, {
            stdio: 'inherit',
        });
    },
};
