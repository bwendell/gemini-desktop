import { browser, expect } from '@wdio/globals';
import * as fs from 'fs';
import * as path from 'path';

import { GEMINI_APP_URL } from '../../src/shared/constants';

describe('Tab Persistence (Integration)', () => {
    let userDataPath: string;
    let tabStateFilePath: string;

    before(async () => {
        await browser.waitUntil(async () => (await browser.getWindowHandles()).length > 0, {
            timeout: 30000,
            timeoutMsg: 'No window handles found after 30s',
        });

        userDataPath = await browser.electron.execute((electron) => electron.app.getPath('userData'));
        tabStateFilePath = path.join(userDataPath, 'tabs-state.json');
    });

    beforeEach(() => {
        if (fs.existsSync(tabStateFilePath)) {
            fs.unlinkSync(tabStateFilePath);
        }
    });

    it('persists tab state to disk via saveTabState IPC', async () => {
        const payload = {
            tabs: [
                { id: 'tab-1', title: 'First', url: GEMINI_APP_URL, createdAt: 1 },
                { id: 'tab-2', title: 'Second', url: GEMINI_APP_URL, createdAt: 2 },
            ],
            activeTabId: 'tab-2',
        };

        await browser.execute((state) => {
            (
                window as unknown as { electronAPI: { saveTabState: (payload: unknown) => void } }
            ).electronAPI.saveTabState(state);
        }, payload);

        await browser.waitUntil(() => Promise.resolve(fs.existsSync(tabStateFilePath)), {
            timeout: 5000,
            timeoutMsg: 'tabs-state.json was not created after saveTabState',
        });

        const content = JSON.parse(fs.readFileSync(tabStateFilePath, 'utf-8')) as { tabsState?: unknown };
        expect(content.tabsState).toEqual(payload);
    });

    it('returns persisted tab state through getTabState IPC', async () => {
        const payload = {
            tabs: [
                { id: 'tab-a', title: 'Alpha', url: GEMINI_APP_URL, createdAt: 10 },
                { id: 'tab-b', title: 'Beta', url: GEMINI_APP_URL, createdAt: 20 },
            ],
            activeTabId: 'tab-b',
        };

        await browser.execute((state) => {
            (
                window as unknown as { electronAPI: { saveTabState: (payload: unknown) => void } }
            ).electronAPI.saveTabState(state);
        }, payload);

        const loaded = await browser.execute(async () => {
            return (
                window as unknown as { electronAPI: { getTabState: () => Promise<unknown> } }
            ).electronAPI.getTabState();
        });

        expect(loaded).toEqual(payload);
    });

    it('normalizes invalid payloads and falls back to a safe default tab state', async () => {
        await browser.execute(() => {
            (
                window as unknown as { electronAPI: { saveTabState: (payload: unknown) => void } }
            ).electronAPI.saveTabState({
                tabs: [{ id: '', title: '', url: 'https://invalid.example.com', createdAt: Number.NaN }],
                activeTabId: 'missing-id',
            });
        });

        const loaded = (await browser.execute(async () => {
            return (
                window as unknown as { electronAPI: { getTabState: () => Promise<unknown> } }
            ).electronAPI.getTabState();
        })) as {
            tabs: Array<{ id: string; title: string; url: string; createdAt: number }>;
            activeTabId: string;
        } | null;

        expect(loaded).not.toBeNull();
        expect(loaded?.tabs.length).toBe(1);
        expect(loaded?.tabs[0]?.title).toBe('New Chat');
        expect(loaded?.tabs[0]?.url).toBe(GEMINI_APP_URL);
        expect(loaded?.activeTabId).toBe(loaded?.tabs[0]?.id);
    });
});
