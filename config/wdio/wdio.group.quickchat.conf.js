import { baseConfig } from './wdio.base.conf.js';

export const config = {
    ...baseConfig,
    specs: ['../../tests/e2e/quick-chat.spec.ts'],
};
