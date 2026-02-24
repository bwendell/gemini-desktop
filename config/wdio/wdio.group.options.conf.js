import { baseConfig } from './wdio.base.conf.js';

export const config = {
    ...baseConfig,
    specs: [
        '../../tests/e2e/options-window.spec.ts',
        '../../tests/e2e/options-tabs.spec.ts',
        '../../tests/e2e/settings-persistence.spec.ts',
        '../../tests/e2e/response-notifications.spec.ts',
        '../../tests/e2e/tab-persistence.spec.ts',
        '../../tests/e2e/text-prediction-options.spec.ts',
    ],
};
