import { browser, expect } from '@wdio/globals';
import * as fs from 'fs';
import * as path from 'path';

import { TabBarPage } from './pages';
import { pressNativeShortcut, waitForAppReady } from './helpers/workflows';
import { focusWindow } from './helpers/windowStateActions';

describe('Tab Persistence E2E', () => {
    const tabBar = new TabBarPage();
    const wdioBrowser = browser as unknown as {
        electron: {
            execute: {
                <R>(fn: (electron: typeof import('electron')) => R): Promise<R>;
                <R, T extends unknown[]>(
                    fn: (electron: typeof import('electron'), ...args: T) => R,
                    ...args: T
                ): Promise<R>;
            };
        };
        waitUntil: <T>(
            condition: () => Promise<T> | T,
            options?: { timeout?: number; timeoutMsg?: string; interval?: number }
        ) => Promise<T>;
        execute: <T>(script: string | ((...args: any[]) => T), ...args: any[]) => Promise<T>;
        keys: (keys: string | string[]) => Promise<void>;
        $: (selector: string) => Promise<{ waitForExist: (options?: { timeout?: number }) => Promise<boolean> }>;
    };

    beforeEach(async () => {
        await waitForAppReady();
        await tabBar.waitForTabBar();
    });

    it('persists tab entries to tabs-state file after creating tabs', async () => {
        while ((await tabBar.getTabCount()) < 3) {
            await tabBar.clickNewTab();
            await tabBar.waitForTabCountAtLeast(2, { timeout: 5000 });
        }

        const userDataPath = await wdioBrowser.electron.execute((electron) => electron.app.getPath('userData'));
        const filePath = path.join(userDataPath, 'tabs-state.json');

        await wdioBrowser.waitUntil(() => Promise.resolve(fs.existsSync(filePath)), {
            timeout: 5000,
            timeoutMsg: 'tabs-state.json was not created after creating tabs',
        });

        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as {
            tabsState?: { tabs?: unknown[]; activeTabId?: string };
        };

        expect(content.tabsState?.tabs?.length).toBeGreaterThanOrEqual(3);
        expect(typeof content.tabsState?.activeTabId).toBe('string');
    });

    it('quick chat submission opens a deterministic new target tab', async () => {
        const beforeCount = await tabBar.getTabCount();

        await wdioBrowser.execute(() => {
            (
                window as unknown as { electronAPI: { submitQuickChat: (text: string) => void } }
            ).electronAPI.submitQuickChat('e2e quick chat tab routing');
        });

        await tabBar.waitForTabCount(beforeCount + 1, {
            timeout: 5000,
            timeoutMsg: 'Quick Chat did not create a new tab',
        });

        expect(await tabBar.getTabCount()).toBe(beforeCount + 1);
        expect(await tabBar.getActiveTabId()).not.toBeNull();
    });

    it('tab shortcuts still work when iframe is focused', async () => {
        const hasFocus = await focusWindow();
        if (!hasFocus) {
            console.warn('[E2E] Window focus not gained; iframe shortcut test may be unreliable in this environment.');
        }
        const iframe = await wdioBrowser.$('[data-testid="gemini-iframe"]');
        await iframe.waitForExist({ timeout: 10000 });

        await wdioBrowser.execute(() => {
            const iframeEl = document.querySelector<HTMLIFrameElement>('[data-testid="gemini-iframe"]');
            iframeEl?.focus();
        });

        const beforeCount = await tabBar.getTabCount();
        await pressNativeShortcut(['primary'], 't');

        await tabBar.waitForTabCount(beforeCount + 1, {
            timeout: 5000,
            timeoutMsg: 'CmdOrCtrl+T did not create a new tab while iframe was focused',
        });

        expect(await tabBar.getTabCount()).toBe(beforeCount + 1);
    });
});
