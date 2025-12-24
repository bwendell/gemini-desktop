import { config } from 'dotenv';

config();

export const config = {
    runner: 'local',
    specs: ['./tests/integration/**/*.test.ts'],
    exclude: [],
    maxInstances: 1,
    capabilities: [
        {
            browserName: 'electron',
            'wdio:electronServiceOptions': {
                appBinaryPath: './node_modules/electron/dist/electron.exe',
                appArgs: ['./dist-electron/main.cjs'],
            },
        },
    ],
    logLevel: 'info',
    bail: 0,
    baseUrl: 'http://localhost',
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    services: ['electron'],
    framework: 'mocha',
    reporters: ['spec'],
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000,
    },

    /**
     * Gets executed before test execution begins.
     * Build the Electron app before running tests.
     */
    onPrepare: async function () {
        const { execSync } = await import('child_process');
        console.log('Building Electron app for integration tests...');
        execSync('npm run build:electron', { stdio: 'inherit' });
    },

    /**
     * Gets executed before each worker process is spawned.
     */
    onWorkerStart: function () {
        // Worker setup if needed
    },

    /**
     * Gets executed after all tests are done.
     */
    onComplete: function () {
        console.log('Integration tests completed');
    },
};
