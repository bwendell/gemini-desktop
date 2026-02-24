import { baseConfig } from './wdio.base.conf.js';

export const config = {
    ...baseConfig,
    specs: [
        '../../tests/e2e/always-on-top.spec.ts',
        '../../tests/e2e/peek-and-hide.spec.ts',
        '../../tests/e2e/dependent-windows.spec.ts',
        '../../tests/e2e/window-bounds.spec.ts',
        '../../tests/e2e/window-controls.spec.ts',
        '../../tests/e2e/window-management-edge-cases.spec.ts',
        '../../tests/e2e/zoom-control.spec.ts',
        '../../tests/e2e/zoom-titlebar.spec.ts',
        '../../tests/e2e/tab-keyboard-shortcuts.spec.ts',
    ],
};
