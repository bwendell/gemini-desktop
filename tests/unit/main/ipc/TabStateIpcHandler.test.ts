import { describe, it, expect, vi, beforeEach } from 'vitest';

import { TabStateIpcHandler } from '../../../../src/main/managers/ipc/TabStateIpcHandler';
import type { IpcHandlerDependencies } from '../../../../src/main/managers/ipc/types';
import { IPC_CHANNELS } from '../../../../src/shared/constants/ipc-channels';
import { GEMINI_APP_URL } from '../../../../src/shared/constants';
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

vi.mock('electron', () => ({
    ipcMain: mockIpcMain,
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

    beforeEach(() => {
        vi.clearAllMocks();
        mockIpcMain._reset();

        const deps = {
            store: createMockStore({}),
            logger: createMockLogger(),
            windowManager: createMockWindowManager(),
        } as unknown as IpcHandlerDependencies;

        handler = new TabStateIpcHandler(deps);
    });

    it('registers tab state IPC channels', () => {
        handler.register();

        expect(mockIpcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.TABS_GET_STATE, expect.any(Function));
        expect(mockIpcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.TABS_SAVE_STATE, expect.any(Function));
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
});
