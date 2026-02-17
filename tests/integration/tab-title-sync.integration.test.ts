import { browser, expect } from '@wdio/globals';

type WdioBrowser = typeof browser & {
    electron: {
        execute<R, T extends unknown[]>(
            fn: (electron: typeof import('electron'), ...args: T) => R,
            ...args: T
        ): Promise<R>;
    };
    waitUntil<T>(
        condition: () => Promise<T> | T,
        options?: { timeout?: number; timeoutMsg?: string; interval?: number }
    ): Promise<T>;
    getWindowHandles(): Promise<string[]>;
    execute<T>(script: string | ((...args: any[]) => T), ...args: any[]): Promise<T>;
};

const wdioBrowser = browser as WdioBrowser;

describe('Tab Title Sync (Integration)', () => {
    before(async () => {
        await wdioBrowser.waitUntil(async () => (await wdioBrowser.getWindowHandles()).length > 0, {
            timeout: 30000,
            timeoutMsg: 'No window handles found after 30s',
        });
    });

    it('updates active tab title from conversation title after response completes', async () => {
        const testTitle = 'RSUs vs. Stock Options: Oracle Offer';
        const testMessage = `Integration title sync ${Date.now()}`;

        // Step 1: Submit quick chat – this is the production user flow.
        // Quick Chat submit triggers a new tab to be created.
        await wdioBrowser.execute((text) => {
            (
                window as unknown as { electronAPI: { submitQuickChat: (payload: string) => void } }
            ).electronAPI.submitQuickChat(text);
        }, testMessage);

        // Step 2: Wait for a second tab to appear in the DOM (user sees this).
        await wdioBrowser.waitUntil(
            async () => {
                const tabCount = await wdioBrowser.execute(
                    () => document.querySelectorAll('.tab .tab__trigger').length
                );
                return tabCount >= 2;
            },
            {
                timeout: 10000,
                timeoutMsg: 'Expected quick chat to create a new tab',
            }
        );

        // Step 3: Read the active tab id from the DOM – the user's visible state.
        const activeTabId = await wdioBrowser.execute(() => {
            const active = document.querySelector('.tab.tab--active .tab__trigger');
            const testId = active?.getAttribute('data-testid') ?? '';
            return testId.startsWith('tab-') ? testId.slice(4) : '';
        });

        expect(activeTabId).toBeTruthy();

        // Step 4: Verify the initial title the user sees is "New Chat".
        const initialTitle = await wdioBrowser.execute(() => {
            return document.querySelector('.tab.tab--active .tab__title')?.textContent?.trim() ?? '';
        });
        expect(initialTitle).toBe('New Chat');

        // Step 5: Persist tab state via the production renderer API.
        // This is what TabContext.tsx does on every state change.
        await wdioBrowser.execute((expectedActiveTabId) => {
            const tabs = Array.from(document.querySelectorAll('.tab'))
                .map((tab, index) => {
                    const trigger = tab.querySelector('.tab__trigger');
                    const testId = trigger?.getAttribute('data-testid') ?? '';
                    const id = testId.startsWith('tab-') ? testId.slice(4) : '';
                    const title = tab.querySelector('.tab__title')?.textContent?.trim() ?? 'New Chat';
                    return {
                        id,
                        title,
                        url: 'https://gemini.google.com/app',
                        createdAt: Date.now() + index,
                    };
                })
                .filter((tab) => tab.id.length > 0);

            const activeTabId = tabs.some((tab) => tab.id === expectedActiveTabId)
                ? expectedActiveTabId
                : (tabs[0]?.id ?? '');

            (
                window as unknown as { electronAPI: { saveTabState: (payload: unknown) => void } }
            ).electronAPI.saveTabState({
                tabs,
                activeTabId,
            });
        }, activeTabId);

        // Step 6: Wait for tab state to be persisted in the main process store.
        await wdioBrowser.waitUntil(
            async () => {
                const storedState = await wdioBrowser.execute(async () => {
                    return (
                        window as unknown as { electronAPI: { getTabState: () => Promise<unknown> } }
                    ).electronAPI.getTabState();
                });

                if (!storedState || typeof storedState !== 'object') {
                    return false;
                }

                const { activeTabId: storedActiveTabId } = storedState as { activeTabId?: string };
                return storedActiveTabId === activeTabId;
            },
            {
                timeout: 5000,
                timeoutMsg: 'Expected tab state to persist before triggering title update',
            }
        );

        // Step 7: Trigger a tab title update via the PRODUCTION renderer API.
        //
        // In production, this happens when:
        //   1. The 3-second title poll in TabStateIpcHandler._pollForTitleUpdate()
        //      extracts a conversation title from the Gemini iframe, OR
        //   2. The renderer calls electronAPI.updateTabTitle(tabId, title)
        //
        // Both paths send 'tabs:update-title' to ipcMain via ipcRenderer.send,
        // which calls _handleUpdateTitle() → store update → broadcasts
        // 'tabs:title-updated' back to all windows → renderer receives the
        // update via onTabTitleUpdated callback → React state update → DOM.
        //
        // Per E2E guidelines, we trigger via the renderer's production API to
        // exercise the full round-trip: renderer → IPC → main → broadcast → renderer.
        await wdioBrowser.execute(
            (tabId: string, title: string) => {
                (
                    window as unknown as {
                        electronAPI: { updateTabTitle: (tabId: string, title: string) => void };
                    }
                ).electronAPI.updateTabTitle(tabId, title);
            },
            activeTabId,
            testTitle
        );

        // Step 8: Verify the user-visible outcome – tab title in the DOM updates.
        // The production flow: ipcMain handler → store update → broadcast
        // 'tabs:title-updated' → renderer's onTabTitleUpdated callback →
        // React state update → DOM re-render.
        await wdioBrowser.waitUntil(
            async () => {
                const activeTitle = await wdioBrowser.execute(() => {
                    return document.querySelector('.tab.tab--active .tab__title')?.textContent?.trim() ?? '';
                });
                return activeTitle === testTitle;
            },
            {
                timeout: 5000,
                timeoutMsg: 'Expected active tab title to update from conversation title',
            }
        );
    });
});
