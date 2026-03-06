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

            const expectedRoles = ['undo', 'redo', 'cut', 'copy', 'paste', 'delete', 'selectall'];
            const fetchEditMenu = async () =>
                wdioBrowser.electron.execute((electron) => {
                    const appMenu = electron.Menu.getApplicationMenu();
                    const editMenu = appMenu?.items.find((item) => item.label === 'Edit');
                    const roles = (editMenu?.submenu?.items ?? [])
                        .map((item) => item.role)
                        .flatMap((role) => (typeof role === 'string' ? [role.toLowerCase()] : []));

                    return {
                        hasEditMenu: Boolean(editMenu),
                        roles,
                    };
                });

            await browser.waitUntil(
                async () => {
                    const currentMenu = await fetchEditMenu();
                    return currentMenu.hasEditMenu;
                },
                {
                    timeout: 10000,
                    interval: 250,
                    timeoutMsg: `Edit menu was not available for ${targetPlatform}`,
                }
            );

            const result = await fetchEditMenu();

            expect(result.hasEditMenu).toBe(true);
            expect(result.roles).toEqual(expect.arrayContaining(expectedRoles));
        });
    }
});
