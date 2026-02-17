import { randomUUID } from 'node:crypto';

import { ipcMain } from 'electron';

import SettingsStore from '../../store';
import { IPC_CHANNELS, isGeminiDomain } from '../../utils/constants';
import { GEMINI_APP_URL } from '../../../shared/constants/urls';
import type { TabState, TabsState } from '../../../shared/types/tabs';
import { getTabFrameName } from '../../../shared/types/tabs';
import { BaseIpcHandler } from './BaseIpcHandler';
import { TITLE_EXTRACTION_SCRIPT } from '../../utils/chatExtraction';

interface TabStoreRecord extends Record<string, unknown> {
    tabsState: TabsState | null;
}

const TABS_STATE_CONFIG_NAME = 'tabs-state';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function normalizeTabState(rawTab: unknown, index: number, seenIds: Set<string>): TabState | null {
    if (!isRecord(rawTab)) {
        return null;
    }

    const rawId = typeof rawTab.id === 'string' ? rawTab.id.trim() : '';
    const id = rawId || randomUUID();
    if (seenIds.has(id)) {
        return null;
    }
    seenIds.add(id);

    const rawTitle = typeof rawTab.title === 'string' ? rawTab.title.trim() : '';
    const title = rawTitle || 'New Chat';

    const createdAt =
        typeof rawTab.createdAt === 'number' && Number.isFinite(rawTab.createdAt)
            ? rawTab.createdAt
            : Date.now() + index;

    return {
        id,
        title,
        url: GEMINI_APP_URL,
        createdAt,
    };
}

function normalizeTabsState(rawState: unknown): TabsState | null {
    if (!isRecord(rawState)) {
        return null;
    }

    const rawTabs = Array.isArray(rawState.tabs) ? rawState.tabs : [];
    const seenIds = new Set<string>();
    const tabs: TabState[] = [];

    for (const [index, rawTab] of rawTabs.entries()) {
        const normalizedTab = normalizeTabState(rawTab, index, seenIds);
        if (normalizedTab) {
            tabs.push(normalizedTab);
        }
    }

    if (tabs.length === 0) {
        return null;
    }

    const rawActiveTabId = typeof rawState.activeTabId === 'string' ? rawState.activeTabId : '';
    const activeTabId = seenIds.has(rawActiveTabId) ? rawActiveTabId : tabs[0].id;

    return {
        tabs,
        activeTabId,
    };
}

function createDefaultTabsState(): TabsState {
    const tabId = randomUUID();
    return {
        tabs: [
            {
                id: tabId,
                title: 'New Chat',
                url: GEMINI_APP_URL,
                createdAt: Date.now(),
            },
        ],
        activeTabId: tabId,
    };
}

export class TabStateIpcHandler extends BaseIpcHandler {
    private readonly tabsStore: SettingsStore<TabStoreRecord>;
    private titlePollInterval: ReturnType<typeof setInterval> | null = null;
    private static readonly TITLE_POLL_INTERVAL_MS = 3000;

    constructor(...args: ConstructorParameters<typeof BaseIpcHandler>) {
        super(...args);
        this.tabsStore = new SettingsStore<TabStoreRecord>({
            configName: TABS_STATE_CONFIG_NAME,
            defaults: {
                tabsState: null,
            },
        });
    }

    register(): void {
        ipcMain.handle(IPC_CHANNELS.TABS_GET_STATE, (): TabsState | null => this._handleGetState());
        ipcMain.on(IPC_CHANNELS.TABS_SAVE_STATE, (_event, state: unknown) => {
            this._handleSaveState(state);
        });
        ipcMain.on(IPC_CHANNELS.TABS_UPDATE_TITLE, (_event, payload: unknown) => {
            this._handleUpdateTitle(payload);
        });

        this.titlePollInterval = setInterval(() => {
            void this._pollForTitleUpdate();
        }, TabStateIpcHandler.TITLE_POLL_INTERVAL_MS);
    }

    updateTabTitle(tabId: string, title: string): void {
        this._handleUpdateTitle({ tabId, title });
    }

    private _handleGetState(): TabsState | null {
        try {
            const storedState = this.tabsStore.get('tabsState');
            if (storedState === null || storedState === undefined) {
                return null;
            }

            const normalizedState = normalizeTabsState(storedState);
            if (normalizedState) {
                return normalizedState;
            }

            const fallbackState = createDefaultTabsState();
            this.tabsStore.set('tabsState', fallbackState);
            return fallbackState;
        } catch (error) {
            this.handleError('getting tab state', error);
            return createDefaultTabsState();
        }
    }

    private _handleSaveState(state: unknown): void {
        try {
            const normalizedState = normalizeTabsState(state) ?? createDefaultTabsState();
            this.tabsStore.set('tabsState', normalizedState);
        } catch (error) {
            this.handleError('saving tab state', error);
        }
    }

    private _handleUpdateTitle(payload: unknown): void {
        try {
            if (!isRecord(payload)) {
                return;
            }

            const rawTabId = typeof payload.tabId === 'string' ? payload.tabId.trim() : '';
            const rawTitle = typeof payload.title === 'string' ? payload.title.trim() : '';
            if (!rawTabId || !rawTitle) {
                return;
            }

            const storedState = this.tabsStore.get('tabsState');
            const normalizedState = normalizeTabsState(storedState);
            if (!normalizedState) {
                return;
            }

            let updated = false;
            const nextTabs = normalizedState.tabs.map((tab) => {
                if (tab.id !== rawTabId || tab.title === rawTitle) {
                    return tab;
                }
                updated = true;
                return {
                    ...tab,
                    title: rawTitle,
                };
            });

            if (!updated) {
                return;
            }

            const nextState: TabsState = {
                tabs: nextTabs,
                activeTabId: normalizedState.activeTabId,
            };

            this.tabsStore.set('tabsState', nextState);
            this.broadcastToAllWindows(IPC_CHANNELS.TABS_TITLE_UPDATED, { tabId: rawTabId, title: rawTitle });
        } catch (error) {
            this.handleError('updating tab title', error);
        }
    }

    private async _pollForTitleUpdate(): Promise<void> {
        try {
            const mainWindow = this.deps.windowManager.getMainWindow();
            if (!mainWindow || mainWindow.isDestroyed()) {
                this.logger.warn('Cannot sync tab title: main window not found or destroyed');
                return;
            }

            const storedState = this.tabsStore.get('tabsState');
            const normalizedState = normalizeTabsState(storedState);
            if (!normalizedState) {
                return;
            }

            const activeTabId = normalizedState.activeTabId;
            const targetFrameName = getTabFrameName(activeTabId);
            const frames = mainWindow.webContents.mainFrame.frames;
            const targetFrame = frames.find((frame) => frame.name === targetFrameName);

            if (!targetFrame) {
                this.logger.warn('Cannot sync tab title: active tab frame not found', {
                    activeTabId,
                    targetFrameName,
                    frameCount: frames.length,
                });
                return;
            }

            if (!isGeminiDomain(targetFrame.url)) {
                this.logger.warn('Cannot sync tab title: active tab frame is not Gemini domain', {
                    activeTabId,
                    url: targetFrame.url,
                });
                return;
            }

            const rawTitle = (await targetFrame.executeJavaScript(TITLE_EXTRACTION_SCRIPT)) as unknown;
            const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';
            if (!title) {
                this._handleUpdateTitle({ tabId: activeTabId, title: 'New Chat' });
                return;
            }

            this._handleUpdateTitle({ tabId: activeTabId, title });
        } catch (error) {
            this.handleError('syncing tab title', error);
        }
    }

    unregister(): void {
        ipcMain.removeHandler(IPC_CHANNELS.TABS_GET_STATE);
        ipcMain.removeAllListeners(IPC_CHANNELS.TABS_SAVE_STATE);
        ipcMain.removeAllListeners(IPC_CHANNELS.TABS_UPDATE_TITLE);

        if (this.titlePollInterval) {
            clearInterval(this.titlePollInterval);
            this.titlePollInterval = null;
        }
    }
}
