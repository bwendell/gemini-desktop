import { baseConfig } from './wdio.base.conf.js';

export const config = {
  ...baseConfig,
  specs: [
    '../../tests/e2e/hotkeys.spec.ts',
    '../../tests/e2e/hotkey-registration.spec.ts',
    '../../tests/e2e/hotkey-toggle.spec.ts',
  ],
};
