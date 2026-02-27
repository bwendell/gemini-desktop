import { baseConfig, electronMainPath } from './wdio.base.conf.js';
import { getAppArgs, linuxServiceConfig } from './electron-args.js';

export const config = {
    ...baseConfig,
    specs: ['../../tests/e2e/lifecycle.spec.ts'],

    services: [
        [
            'electron',
            {
                appEntryPoint: electronMainPath,
                appArgs: getAppArgs(),
                ...linuxServiceConfig,
            },
        ],
    ],

    specFileRetries: 0,
    mochaOpts: {
        ...baseConfig.mochaOpts,
        timeout: 60000,
        retries: 0,
    },

    after: async function () {},
};
