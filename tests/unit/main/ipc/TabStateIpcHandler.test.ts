import { describe, it, expect, vi, beforeEach } from 'vitest';

import { TabStateIpcHandler } from '../../../../src/main/managers/ipc/TabStateIpcHandler';
import type { IpcHandlerDependencies } from '../../../../src/main/managers/ipc/types';
import { IPC_CHANNELS } from '../../../../src/shared/constants/ipc-channels';
import { GEMINI_APP_URL } from '../../../../src/shared/constants';
import { getTabFrameName } from '../../../../src/shared/types/tabs';
import { createMockLogger, createMockStore, createMockWindowManager } from '../../../helpers/mocks';

const { mockIpcMain } = vi.hoisted(() => {
    const mockIpcMain = {
        on: vi.fn((channel: string, listener: (...args: unknown[]) => void) => {
            mockIpcMain._listeners.set(channel, listener);
        }),
        handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
            mockIpcMain._handlers.set(channel, handler);
        }),
        removeAllListeners: vi.fn(),
        removeHandler: vi.fn(),
        _listeners: new Map<string, (...args: unknown[]) => void>(),
        _handlers: new Map<string, (...args: unknown[]) => unknown>(),
        _reset: () => {
            mockIpcMain._listeners.clear();
            mockIpcMain._handlers.clear();
        },
    };

    return { mockIpcMain };
});

const { mockBrowserWindow } = vi.hoisted(() => {
    const mockBrowserWindow = {
        getAllWindows: vi.fn().mockReturnValue([]),
    };
    return { mockBrowserWindow };
});

vi.mock('electron', () => ({
    ipcMain: mockIpcMain,
    BrowserWindow: mockBrowserWindow,
}));

vi.mock('../../../../src/main/store', () => ({
    default: class MockSettingsStore {
        private data: { tabsState: unknown };

        constructor(options: { defaults: { tabsState: unknown } }) {
            this.data = { ...options.defaults };
        }

        get(key: 'tabsState'): unknown {
            return this.data[key];
        }

        set(key: 'tabsState', value: unknown): void {
            this.data[key] = value;
        }
    },
}));

describe('TabStateIpcHandler', () => {
    let handler: TabStateIpcHandler;
    let mockWindowManager: ReturnType<typeof createMockWindowManager>;
    let responseCompleteHandler: (() => void) | null;

    beforeEach(() => {
        vi.clearAllMocks();
        mockIpcMain._reset();
        responseCompleteHandler = null;

        mockWindowManager = createMockWindowManager({
            on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
                if (event === 'response-complete') {
                    responseCompleteHandler = listener as () => Promise<void>;
                }
            }),
        });

        const deps = {
            store: createMockStore({}),
            logger: createMockLogger(),
            windowManager: mockWindowManager,
        } as unknown as IpcHandlerDependencies;

        handler = new TabStateIpcHandler(deps);
    });

    it('registers tab state IPC channels', () => {
        handler.register();

        expect(mockIpcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.TABS_GET_STATE, expect.any(Function));
        expect(mockIpcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.TABS_SAVE_STATE, expect.any(Function));
        expect(mockIpcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.TABS_UPDATE_TITLE, expect.any(Function));
    });

    it('saves and returns normalized tab state', () => {
        handler.register();

        const saveListener = mockIpcMain._listeners.get(IPC_CHANNELS.TABS_SAVE_STATE);
        const getHandler = mockIpcMain._handlers.get(IPC_CHANNELS.TABS_GET_STATE) as () => {
            tabs: Array<{ id: string; title: string; url: string; createdAt: number }>;
            activeTabId: string;
        };

        saveListener?.(
            {},
            {
                tabs: [
                    {
                        id: 'tab-1',
                        title: 'My Tab',
                        url: 'https://example.com/not-gemini',
                        createdAt: 100,
                    },
                ],
                activeTabId: 'tab-1',
            }
        );

        const state = getHandler();

        expect(state.tabs).toHaveLength(1);
        expect(state.tabs[0]).toEqual({
            id: 'tab-1',
            title: 'My Tab',
            url: GEMINI_APP_URL,
            createdAt: 100,
        });
        expect(state.activeTabId).toBe('tab-1');
    });

    it('falls back to a default tab when saved state is invalid', () => {
        handler.register();

        const saveListener = mockIpcMain._listeners.get(IPC_CHANNELS.TABS_SAVE_STATE);
        const getHandler = mockIpcMain._handlers.get(IPC_CHANNELS.TABS_GET_STATE) as () => {
            tabs: Array<{ id: string; title: string; url: string; createdAt: number }>;
            activeTabId: string;
        };

        saveListener?.({}, { tabs: [], activeTabId: '' });

        const state = getHandler();

        expect(state.tabs).toHaveLength(1);
        expect(state.tabs[0]?.title).toBe('New Chat');
        expect(state.tabs[0]?.url).toBe(GEMINI_APP_URL);
        expect(state.activeTabId).toBe(state.tabs[0]?.id);
    });

    it('updates stored tab title when update payload is valid', () => {
        handler.register();

        const saveListener = mockIpcMain._listeners.get(IPC_CHANNELS.TABS_SAVE_STATE);
        const updateListener = mockIpcMain._listeners.get(IPC_CHANNELS.TABS_UPDATE_TITLE);
        const getHandler = mockIpcMain._handlers.get(IPC_CHANNELS.TABS_GET_STATE) as () => {
            tabs: Array<{ id: string; title: string; url: string; createdAt: number }>;
            activeTabId: string;
        };

        saveListener?.(
            {},
            {
                tabs: [
                    {
                        id: 'tab-1',
                        title: 'My Tab',
                        url: 'https://example.com/not-gemini',
                        createdAt: 100,
                    },
                ],
                activeTabId: 'tab-1',
            }
        );

        updateListener?.({}, { tabId: 'tab-1', title: 'Updated Title' });

        const state = getHandler();
        expect(state.tabs[0]?.title).toBe('Updated Title');
        expect(mockBrowserWindow.getAllWindows).toHaveBeenCalled();
    });

    it('updates active tab title when response completes', async () => {
        const tabId = 'tab-active';
        const mainWindowInstance = {
            on: vi.fn((event: string, listener: () => void) => {
                if (event === 'response-complete') {
                    responseCompleteHandler = listener;
                }
            }),
            off: vi.fn(),
        };

        (mockWindowManager as unknown as { getMainWindowInstance?: () => unknown }).getMainWindowInstance = vi
            .fn()
            .mockReturnValue(mainWindowInstance);

        handler.register();

        const saveListener = mockIpcMain._listeners.get(IPC_CHANNELS.TABS_SAVE_STATE);
        const getHandler = mockIpcMain._handlers.get(IPC_CHANNELS.TABS_GET_STATE) as () => {
            tabs: Array<{ id: string; title: string; url: string; createdAt: number }>;
            activeTabId: string;
        };

        saveListener?.(
            {},
            {
                tabs: [
                    {
                        id: tabId,
                        title: 'New Chat',
                        url: GEMINI_APP_URL,
                        createdAt: 100,
                    },
                ],
                activeTabId: tabId,
            }
        );

        const targetFrame = {
            name: getTabFrameName(tabId),
            url: GEMINI_APP_URL,
            executeJavaScript: vi.fn().mockResolvedValue('RSUs vs. Stock Options: Oracle Offer'),
        };

        const mockMainWindow = {
            isDestroyed: vi.fn().mockReturnValue(false),
            webContents: {
                mainFrame: {
                    frames: [targetFrame],
                },
            },
        };

        vi.spyOn(mockWindowManager, 'getMainWindow').mockReturnValue(mockMainWindow as never);

        await responseCompleteHandler?.();

        expect(targetFrame.executeJavaScript).toHaveBeenCalledTimes(1);
        const state = getHandler();
        expect(state.tabs[0]?.title).toBe('RSUs vs. Stock Options: Oracle Offer');
        expect(mockBrowserWindow.getAllWindows).toHaveBeenCalled();
    });
});
