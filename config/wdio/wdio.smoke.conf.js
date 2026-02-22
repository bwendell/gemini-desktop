import { baseConfig } from './wdio.base.conf.js';

export const config = {
    ...baseConfig,
    specs: [
        '../../tests/e2e/app-startup.spec.ts',
        '../../tests/e2e/auth.spec.ts',
        '../../tests/e2e/tray.spec.ts',
        '../../tests/e2e/window-controls.spec.ts',
    ],
    specFileRetries: 0, // Fail fast for smoke tests
    bail: 1, // Stop on first failure
};
