import { browser, expect } from '@wdio/globals';

import { TabBarPage } from './pages';
import { waitForAppReady } from './helpers/workflows';
import { isMacOSSync } from './helpers/platform';

const describeMac = isMacOSSync() ? describe : describe.skip;
const wdioBrowser = browser as unknown as {
    execute: <T>(script: string | ((...args: any[]) => T), ...args: any[]) => Promise<T>;
    refresh: () => Promise<void>;
    waitUntil: <T>(
        condition: () => Promise<T> | T,
        options?: { timeout?: number; timeoutMsg?: string; interval?: number }
    ) => Promise<T>;
};

describeMac('macOS Tab Visibility', () => {
    const tabBar = new TabBarPage();

    beforeEach(async () => {
        await waitForAppReady();
        await tabBar.waitForTabBar();
    });

    it('keeps at least one visible Gemini iframe when activeTabId is invalid', async () => {
        await wdioBrowser.execute(() => {
            const api = (window as unknown as { electronAPI: { saveTabState: (payload: unknown) => void } })
                .electronAPI;

            api.saveTabState({
                tabs: [
                    { id: 'tab-a', title: 'A', url: 'https://gemini.google.com/app', createdAt: 1 },
                    { id: 'tab-b', title: 'B', url: 'https://gemini.google.com/app', createdAt: 2 },
                ],
                activeTabId: 'missing-tab',
            });
        });

        await wdioBrowser.refresh();

        await wdioBrowser.waitUntil(
            async () => {
                const visibleIframeCount = await wdioBrowser.execute(() => {
                    const iframes = Array.from(document.querySelectorAll('iframe[src*="gemini.google.com"]'));
                    return iframes.filter((iframe) => {
                        const style = window.getComputedStyle(iframe);
                        return style.display !== 'none' && style.visibility !== 'hidden';
                    }).length;
                });
                return visibleIframeCount >= 1;
            },
            {
                timeout: 10000,
                timeoutMsg: 'Expected at least one visible Gemini iframe after invalid activeTabId reload',
            }
        );

        const activeTabId = await tabBar.getActiveTabId();
        expect(activeTabId).toBeTruthy();
    });
});
