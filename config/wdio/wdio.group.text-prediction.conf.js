import { baseConfig } from './wdio.base.conf.js';

export const config = {
    ...baseConfig,
    specs: ['../../tests/e2e/text-prediction-options.spec.ts', '../../tests/e2e/text-prediction-quickchat.spec.ts'],
};
