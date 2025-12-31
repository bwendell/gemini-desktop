import { baseConfig } from './wdio.base.conf.js';

export const config = {
  ...baseConfig,
  specs: [
    '../../tests/e2e/auth.spec.ts',
    '../../tests/e2e/oauth-links.spec.ts',
    '../../tests/e2e/external-links.spec.ts',
  ],
};
