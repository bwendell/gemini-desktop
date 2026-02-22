import { baseConfig } from './wdio.base.conf.js';

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
