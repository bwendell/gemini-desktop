import { baseConfig } from './wdio.base.conf.js';

if (!process.env.E2E_GROUP || process.env.E2E_GROUP === 'unknown') {
    process.env.E2E_GROUP = 'debug';
}

export const config = {
    ...baseConfig,
    logLevel: 'debug',
    specFileRetries: 0,
    specFileRetriesDelay: 0,
    mochaOpts: {
        ...baseConfig.mochaOpts,
        timeout: 180000, // 3 minutes for debugging
    },
    waitforTimeout: 30000,
    connectionRetryTimeout: 300000,
};
