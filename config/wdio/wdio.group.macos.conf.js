import { baseConfig } from './wdio.base.conf.js';

export const config = {
    ...baseConfig,
    specs: [
        '../../tests/e2e/macos-dock.spec.ts',
        '../../tests/e2e/macos-menu.spec.ts',
        '../../tests/e2e/macos-window-behavior.spec.ts',
        '../../tests/e2e/macos-tab-visibility.spec.ts',
    ],
};
