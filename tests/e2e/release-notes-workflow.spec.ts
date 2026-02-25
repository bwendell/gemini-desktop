/// <reference path="./helpers/wdio-electron.d.ts" />

import { browser as wdioBrowser, expect } from '@wdio/globals';
import { MainWindowPage, UpdateToastPage } from './pages';
import { getReleaseNotesUrl } from '../../src/shared/utils/releaseNotes';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { waitForUIState } from './helpers/waitUtilities';

describe('Release Notes Workflow E2E', () => {
    const browser = wdioBrowser as unknown as {
        execute<R, TArgs extends unknown[]>(script: string | ((...args: TArgs) => R), ...args: TArgs): Promise<R>;
        electron: {
            execute<R, TArgs extends unknown[]>(
                fn: (electron: typeof import('electron'), ...args: TArgs) => R,
                ...args: TArgs
            ): Promise<R>;
        };
    };
    const mainWindow = new MainWindowPage();
    const updateToast = new UpdateToastPage();

    const setupWindowOpenSpy = async () => {
        await browser.execute(() => {
            const win = window as Window & {
                __releaseNotesTest?: { openedUrls: string[]; originalOpen?: typeof window.open };
            };

            if (!win.__releaseNotesTest) {
                win.__releaseNotesTest = { openedUrls: [] };
            } else {
                win.__releaseNotesTest.openedUrls = [];
            }

            if (!win.__releaseNotesTest.originalOpen) {
                win.__releaseNotesTest.originalOpen = window.open;
            }

            const openSpy: typeof window.open = (url?: string | URL, _target?: string, _features?: string) => {
                win.__releaseNotesTest?.openedUrls.push(String(url ?? ''));
                return null;
            };

            window.open = openSpy;
        });
    };

    const restoreWindowOpenSpy = async () => {
        await browser.execute(() => {
            const win = window as Window & {
                __releaseNotesTest?: { openedUrls: string[]; originalOpen?: typeof window.open };
            };

            if (win.__releaseNotesTest?.originalOpen) {
                window.open = win.__releaseNotesTest.originalOpen;
            }

            delete win.__releaseNotesTest;
        });
    };

    const getOpenedUrls = async (): Promise<string[]> => {
        return await browser.execute(() => {
            const win = window as Window & {
                __releaseNotesTest?: { openedUrls: string[] };
            };

            return win.__releaseNotesTest?.openedUrls ?? [];
        });
    };

    beforeEach(async () => {
        await waitForAppReady();
        await setupWindowOpenSpy();
        await updateToast.clearAll();
    });

    afterEach(async () => {
        await restoreWindowOpenSpy();
        await updateToast.clearAll();
        await ensureSingleWindow();
    });

    it('opens release notes from Help menu for current version', async () => {
        await mainWindow.clickMenuById('menu-help-release-notes');

        await waitForUIState(async () => (await getOpenedUrls()).length > 0, {
            description: 'Release notes URL opened from menu',
        });

        const openedUrls = await getOpenedUrls();
        const version = await browser.electron.execute((electron) => electron.app.getVersion());
        const expectedUrl = getReleaseNotesUrl(version);

        expect(openedUrls[0]).toBe(expectedUrl);
    });

    it('opens release notes from update available toast for update version', async () => {
        await updateToast.showAvailable('3.5.0');
        await updateToast.waitForVisible();
        expect(await updateToast.isReleaseNotesPrimaryExisting()).toBe(true);
        expect(await updateToast.getReleaseNotesPrimaryText()).toBe('View Release Notes');

        await updateToast.clickReleaseNotesPrimary();

        await waitForUIState(async () => (await getOpenedUrls()).length > 0, {
            description: 'Release notes URL opened from update toast',
        });

        const openedUrls = await getOpenedUrls();
        expect(openedUrls[0]).toBe(getReleaseNotesUrl('3.5.0'));
    });

    it('opens release notes from downloaded update toast for update version', async () => {
        await updateToast.showDownloaded('3.6.0');
        await updateToast.waitForVisible();
        expect(await updateToast.isReleaseNotesDownloadedExisting()).toBe(true);
        expect(await updateToast.getReleaseNotesDownloadedText()).toBe('View Release Notes');

        await updateToast.clickReleaseNotesDownloaded();
        await waitForUIState(async () => (await getOpenedUrls()).length > 0, {
            description: 'Release notes URL opened from downloaded toast',
        });

        const openedUrls = await getOpenedUrls();
        expect(openedUrls[0]).toBe(getReleaseNotesUrl('3.6.0'));
    });
});
