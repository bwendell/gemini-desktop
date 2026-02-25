import { browser, expect } from '@wdio/globals';

type ElectronBrowser = WebdriverIO.Browser & {
    electron: {
        execute<T>(fn: (electron: typeof import('electron')) => T): Promise<T>;
        execute<T, A>(fn: (electron: typeof import('electron'), arg: A) => T, arg: A): Promise<T>;
    };
};

const wdioBrowser = browser as unknown as ElectronBrowser;

describe('Edit Menu Integration', () => {
    for (const targetPlatform of ['darwin', 'win32', 'linux'] as const) {
        it(`should include Edit menu with expected roles on ${targetPlatform}`, async function () {
            const currentPlatform = await wdioBrowser.electron.execute(() => process.platform);
            if (currentPlatform !== targetPlatform) {
                this.skip();
            }

            const result = await wdioBrowser.electron.execute((electron) => {
                const appMenu = electron.Menu.getApplicationMenu();
                const editMenu = appMenu?.items.find((item) => item.label === 'Edit');
                const roles = (editMenu?.submenu?.items ?? [])
                    .map((item) => item.role)
                    .filter((role) => role !== undefined);

                return {
                    hasEditMenu: Boolean(editMenu),
                    roles,
                };
            });

            expect(result.hasEditMenu).toBe(true);
            expect(result.roles).toEqual(expect.arrayContaining(['undo', 'redo', 'cut', 'copy', 'paste', 'delete', 'selectAll']));
        });
    }
});
