import { baseConfig } from './wdio.base.conf.js';

export const config = {
  ...baseConfig,
  specs: [
    '../../tests/e2e/menu_bar.spec.ts',
    '../../tests/e2e/menu-actions.spec.ts',
    '../../tests/e2e/menu-interactions.spec.ts',
    '../../tests/e2e/context-menu.spec.ts',
  ],
};
