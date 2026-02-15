import { expect } from '@wdio/globals';

import { TabBarPage } from './pages';
import { pressComplexShortcut, waitForAppReady } from './helpers/workflows';
import { focusWindow } from './helpers/windowStateActions';

describe('Tab Keyboard Shortcuts E2E', () => {
    const tabBar = new TabBarPage();

    beforeEach(async () => {
        await waitForAppReady();
        await tabBar.waitForTabBar();
        const hasFocus = await focusWindow();
        if (!hasFocus) {
            console.warn('[E2E] Window focus not gained; shortcut tests may be unreliable in this environment.');
        }
    });

    it('CmdOrCtrl+T creates a new tab', async () => {
        const beforeCount = await tabBar.getTabCount();
        await pressComplexShortcut(['primary'], 't');

        await tabBar.waitForTabCount(beforeCount + 1, {
            timeout: 5000,
            timeoutMsg: 'Tab count did not increase after CmdOrCtrl+T',
        });

        expect(await tabBar.getTabCount()).toBe(beforeCount + 1);
    });

    it('CmdOrCtrl+W closes active tab when multiple tabs are open', async () => {
        if ((await tabBar.getTabCount()) < 2) {
            await tabBar.clickNewTab();
            await tabBar.waitForTabCountAtLeast(2, { timeout: 5000 });
        }

        const beforeCount = await tabBar.getTabCount();
        await pressComplexShortcut(['primary'], 'w');

        await tabBar.waitForTabCount(beforeCount - 1, {
            timeout: 5000,
            timeoutMsg: 'Tab count did not decrease after CmdOrCtrl+W',
        });

        expect(await tabBar.getTabCount()).toBe(beforeCount - 1);
    });

    it('CmdOrCtrl+Tab cycles to the next tab', async () => {
        while ((await tabBar.getTabCount()) < 3) {
            await tabBar.clickNewTab();
            await tabBar.waitForTabCountAtLeast(2, { timeout: 5000 });
        }

        await tabBar.clickTab(0);
        const activeBefore = await tabBar.getActiveTabId();

        await pressComplexShortcut(['primary'], 'Tab');
        const activeAfter = await tabBar.getActiveTabId();

        expect(activeAfter).not.toBe(activeBefore);
    });

    it('CmdOrCtrl+Shift+Tab cycles to the previous tab', async () => {
        while ((await tabBar.getTabCount()) < 3) {
            await tabBar.clickNewTab();
            await tabBar.waitForTabCountAtLeast(2, { timeout: 5000 });
        }

        await tabBar.clickTab(2);
        const activeBefore = await tabBar.getActiveTabId();

        await pressComplexShortcut(['primary', 'shift'], 'Tab');
        const activeAfter = await tabBar.getActiveTabId();

        expect(activeAfter).not.toBe(activeBefore);
    });

    it('CmdOrCtrl+number jumps to tab by position', async () => {
        while ((await tabBar.getTabCount()) < 3) {
            await tabBar.clickNewTab();
            await tabBar.waitForTabCountAtLeast(2, { timeout: 5000 });
        }

        await pressComplexShortcut(['primary'], '3');
        const thirdTab = await tabBar.getActiveTabId();

        await pressComplexShortcut(['primary'], '1');
        const firstTab = await tabBar.getActiveTabId();

        expect(thirdTab).not.toBeNull();
        expect(firstTab).not.toBeNull();
        expect(firstTab).not.toBe(thirdTab);
    });
});
