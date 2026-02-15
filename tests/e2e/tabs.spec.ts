import { expect } from '@wdio/globals';

import { MainWindowPage, TabBarPage } from './pages';
import { waitForAppReady } from './helpers/workflows';

describe('Tabs E2E', () => {
    const mainWindow = new MainWindowPage();
    const tabBar = new TabBarPage();

    beforeEach(async () => {
        await waitForAppReady();
        await tabBar.waitForTabBar();
    });

    it('renders tab bar on startup with a default tab', async () => {
        expect(await tabBar.getTabCount()).toBeGreaterThanOrEqual(1);
        const titles = await tabBar.getTabTitles();
        expect(titles[0]).toBe('New Chat');
    });

    it('creates a new tab via the plus button', async () => {
        const beforeCount = await tabBar.getTabCount();
        const activeBefore = await tabBar.getActiveTabId();
        await tabBar.clickNewTab();

        await tabBar.waitForTabCount(beforeCount + 1, {
            timeout: 5000,
            timeoutMsg: 'Tab count did not increase after clicking new tab',
        });

        expect(await tabBar.getTabCount()).toBe(beforeCount + 1);
        const activeAfter = await tabBar.getActiveTabId();
        expect(activeAfter).not.toBeNull();
        if (activeBefore) {
            expect(activeAfter).not.toBe(activeBefore);
        }

        const iframeCount = await tabBar.getGeminiIframeCount();
        expect(iframeCount).toBeGreaterThanOrEqual(beforeCount + 1);
    });

    it('switches active tab when clicking another tab', async () => {
        if ((await tabBar.getTabCount()) < 2) {
            await tabBar.clickNewTab();
            await tabBar.waitForTabCountAtLeast(2, { timeout: 5000 });
        }

        await tabBar.clickTab(0);
        const activeBefore = await tabBar.getActiveTabId();

        await tabBar.clickTab(1);
        const activeAfter = await tabBar.getActiveTabId();

        expect(activeBefore).not.toBeNull();
        expect(activeAfter).not.toBeNull();
        expect(activeAfter).not.toBe(activeBefore);
    });

    it('closes a tab via close button', async () => {
        if ((await tabBar.getTabCount()) < 2) {
            await tabBar.clickNewTab();
            await tabBar.waitForTabCountAtLeast(2, { timeout: 5000 });
        }

        const beforeCount = await tabBar.getTabCount();
        const activeBefore = await tabBar.getActiveTabId();
        await tabBar.closeTab(1);

        await tabBar.waitForTabCount(beforeCount - 1, {
            timeout: 5000,
            timeoutMsg: 'Tab count did not decrease after close click',
        });

        expect(await tabBar.getTabCount()).toBe(beforeCount - 1);
        const activeAfter = await tabBar.getActiveTabId();
        expect(activeAfter).not.toBeNull();
        if (activeBefore && beforeCount > 1) {
            expect(activeAfter).not.toBe(activeBefore);
        }
    });

    it('closing the last tab keeps one default tab alive', async () => {
        while ((await tabBar.getTabCount()) > 1) {
            const beforeCount = await tabBar.getTabCount();
            await tabBar.closeTab(0);
            await tabBar.waitForTabCount(beforeCount - 1, {
                timeout: 5000,
                timeoutMsg: 'Tab count did not decrease while closing extra tabs',
            });
        }

        await tabBar.closeTab(0);
        await tabBar.waitForTabCount(1, {
            timeout: 5000,
            timeoutMsg: 'Expected one fallback tab after closing the last tab',
        });

        const titles = await tabBar.getTabTitles();
        expect(titles[0]).toBe('New Chat');
    });

    it('middle-click closes a tab', async () => {
        if ((await tabBar.getTabCount()) < 2) {
            const beforeCount = await tabBar.getTabCount();
            await tabBar.clickNewTab();
            await tabBar.waitForTabCount(beforeCount + 1, {
                timeout: 5000,
                timeoutMsg: 'Tab count did not increase before middle-click test',
            });
        }

        const beforeCount = await tabBar.getTabCount();
        await tabBar.middleClickTab(1);

        await tabBar.waitForTabCount(beforeCount - 1, {
            timeout: 5000,
            timeoutMsg: 'Tab count did not decrease after middle click',
        });

        expect(await tabBar.getTabCount()).toBe(beforeCount - 1);
        expect(await mainWindow.isLoaded()).toBe(true);
    });
});
