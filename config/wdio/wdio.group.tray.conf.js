import { baseConfig } from './wdio.base.conf.js';

export const config = {
  ...baseConfig,
  specs: [
    '../../tests/e2e/tray.spec.ts',
    '../../tests/e2e/tray-quit.spec.ts',
    '../../tests/e2e/minimize-to-tray.spec.ts',
  ],
};
