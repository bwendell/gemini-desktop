import { baseConfig } from './wdio.base.conf.js';

export const config = {
  ...baseConfig,
  specs: [
    '../../tests/e2e/app-startup.spec.ts',
    '../../tests/e2e/first-run.spec.ts',
    '../../tests/e2e/auto-update-init.spec.ts',
  ],
};
