import { baseConfig } from './wdio.base.conf.js';

export const config = {
  ...baseConfig,
  specs: [
    '../../tests/e2e/auto-update-error-recovery.spec.ts',
    '../../tests/e2e/auto-update-happy-path.spec.ts',
    '../../tests/e2e/auto-update-interactions.spec.ts',
    '../../tests/e2e/auto-update-persistence.spec.ts',
    '../../tests/e2e/auto-update-platform.spec.ts',
    '../../tests/e2e/auto-update-startup.spec.ts',
    '../../tests/e2e/auto-update-toggle.spec.ts',
    '../../tests/e2e/auto-update-tray.spec.ts',
  ],
};
