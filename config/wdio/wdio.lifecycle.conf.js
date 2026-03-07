import { baseConfig } from './wdio.base.conf.js';
import { getAppArgs } from './electron-args.js';

const baseElectronService = baseConfig.services?.find(([name]) => name === 'electron');
const baseElectronServiceOptions = baseElectronService ? baseElectronService[1] : {};

export const config = {
    ...baseConfig,
    specs: ['../../tests/e2e/lifecycle.spec.ts'],
    services: [
        [
            'electron',
            {
                ...baseElectronServiceOptions,
                appArgs: getAppArgs(),
            },
        ],
    ],
    after: async function () {},
};
