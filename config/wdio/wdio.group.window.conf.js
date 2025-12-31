import { baseConfig } from './wdio.base.conf.js';

export const config = {
  ...baseConfig,
  specs: [
    '../../tests/e2e/always-on-top.spec.ts',
    '../../tests/e2e/boss-key.spec.ts',
    '../../tests/e2e/dependent-windows.spec.ts',
    '../../tests/e2e/window-bounds.spec.ts',
    '../../tests/e2e/window-controls.spec.ts',
    '../../tests/e2e/window-management-edge-cases.spec.ts',
  ],
};
