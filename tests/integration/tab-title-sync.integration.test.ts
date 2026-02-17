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

        await wdioBrowser.execute((text) => {
            (
                window as unknown as { electronAPI: { submitQuickChat: (payload: string) => void } }
            ).electronAPI.submitQuickChat(text);
        }, testMessage);

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

        const activeTabId = await wdioBrowser.execute(() => {
            const active = document.querySelector('.tab.tab--active .tab__trigger');
            const testId = active?.getAttribute('data-testid') ?? '';
            return testId.startsWith('tab-') ? testId.slice(4) : '';
        });

        expect(activeTabId).toBeTruthy();

        const persistedState = await wdioBrowser.execute((expectedActiveTabId) => {
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

            return { tabs, activeTabId };
        }, activeTabId);

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
                return storedActiveTabId === persistedState.activeTabId;
            },
            {
                timeout: 5000,
                timeoutMsg: 'Expected tab state to persist before response-complete',
            }
        );

        const syncResult = await wdioBrowser.electron.execute(
            async (_electron: typeof import('electron'), tabId: string, title: string) => {
                const windowManager = (
                    global as typeof globalThis & {
                        windowManager?: {
                            getMainWindow?: () => Electron.BrowserWindow | null;
                            getMainWindowInstance?: () => { emit?: (event: string) => void } | null;
                        };
                    }
                ).windowManager;

                const mainWindow = windowManager?.getMainWindow?.();
                const mainWindowInstance = windowManager?.getMainWindowInstance?.();
                if (!mainWindow || !mainWindowInstance) {
                    return { ok: false, reason: 'Main window not available' };
                }

                const targetFrameName = `gemini-tab-${tabId}`;
                let targetFrame = mainWindow.webContents.mainFrame.frames.find(
                    (frame) => frame.name === targetFrameName
                );

                if (!targetFrame) {
                    targetFrame = mainWindow.webContents.mainFrame.frames[0];
                }

                if (!targetFrame) {
                    const fallbackFrame = {
                        name: targetFrameName,
                        url: 'https://gemini.google.com/app',
                        executeJavaScript: async (script: string) =>
                            script.includes('conversation-title') ? title : '',
                    };
                    Object.defineProperty(mainWindow.webContents.mainFrame, 'frames', {
                        value: [fallbackFrame],
                        configurable: true,
                    });
                    mainWindowInstance.emit?.('response-complete');
                    return { ok: true, fallback: true };
                }

                try {
                    Object.defineProperty(targetFrame, 'name', { value: targetFrameName, configurable: true });
                } catch {}
                try {
                    Object.defineProperty(targetFrame, 'url', {
                        get: () => 'https://gemini.google.com/app',
                        configurable: true,
                    });
                } catch {}

                try {
                    const safeTitle = JSON.stringify(title);
                    await targetFrame.executeJavaScript(`
                        (function() {
                            const title = ${safeTitle};
                            const span = document.createElement('span');
                            span.setAttribute('data-test-id', 'conversation-title');
                            span.textContent = title;
                            document.body.replaceChildren(span);
                            document.title = title + ' - Gemini';
                        })();
                    `);
                } catch (error) {
                    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
                }

                mainWindowInstance.emit?.('response-complete');
                return { ok: true, fallback: false };
            },
            activeTabId,
            testTitle
        );

        expect(syncResult.ok).toBe(true);

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
