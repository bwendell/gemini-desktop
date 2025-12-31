import { baseConfig } from './wdio.base.conf.js';

export const config = {
  ...baseConfig,
  specs: [
    '../../tests/e2e/theme.spec.ts',
    '../../tests/e2e/theme-selector-visual.spec.ts',
    '../../tests/e2e/theme-selector-keyboard.spec.ts',
  ],
};
