import { baseConfig } from './wdio.base.conf.js';

export const config = {
    ...baseConfig,
    specs: [
        '../../tests/e2e/error-boundary.spec.ts',
        '../../tests/e2e/fatal-error-recovery.spec.ts',
        '../../tests/e2e/offline-behavior.spec.ts',
        '../../tests/e2e/session-persistence.spec.ts',
        '../../tests/e2e/single-instance.spec.ts',
        '../../tests/e2e/webview-content.spec.ts',
        '../../tests/e2e/microphone-permission.spec.ts',
        '../../tests/e2e/toast-interactions.spec.ts',
        '../../tests/e2e/toast-stacking.spec.ts',
        '../../tests/e2e/toast-visibility.spec.ts',
        '../../tests/e2e/toast-workflow.spec.ts',
    ],
};
