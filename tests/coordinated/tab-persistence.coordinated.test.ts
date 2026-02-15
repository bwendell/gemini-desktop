import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ipcMain } from 'electron';

vi.mock('../../src/main/store', () => {
    const stores = new Map<string, Record<string, unknown>>();

    return {
        default: class MockSettingsStore {
            private readonly configName: string;
            private readonly defaults: Record<string, unknown>;

            constructor(options: { configName?: string; defaults?: Record<string, unknown> }) {
                this.configName = options.configName ?? 'default';
                this.defaults = { ...(options.defaults ?? {}) };
                if (!stores.has(this.configName)) {
                    stores.set(this.configName, { ...this.defaults });
                }
            }

            get(key: string): unknown {
                const store = stores.get(this.configName) ?? { ...this.defaults };
                return store[key];
            }

            set(key: string, value: unknown): void {
                const store = stores.get(this.configName) ?? { ...this.defaults };
                store[key] = value;
                stores.set(this.configName, store);
            }

            static __reset() {
                stores.clear();
            }
        },
    };
});

vi.mock('../../src/main/utils/logger');

import SettingsStore from '../../src/main/store';
import { IPC_CHANNELS } from '../../src/shared/constants/ipc-channels';
import { GEMINI_APP_URL } from '../../src/shared/constants';
import { TabStateIpcHandler } from '../../src/main/managers/ipc/TabStateIpcHandler';
import { mockLogger } from '../../src/main/utils/__mocks__/logger';
import {
    createMockStore,
    createMockWindowManager,
    platformAdapterPresets,
    resetPlatformAdapterForTests,
    useMockPlatformAdapter,
} from '../helpers/mocks';

function invokeHandler(channel: string, ...args: unknown[]) {
    const handler = (
        ipcMain as unknown as { _handlers: Map<string, (...innerArgs: unknown[]) => unknown> }
    )._handlers.get(channel);
    if (!handler) {
        throw new Error(`No handler for channel: ${channel}`);
    }
    return handler({}, ...args);
}

function sendMessage(channel: string, ...args: unknown[]) {
    const listener = (
        ipcMain as unknown as { _listeners: Map<string, (...innerArgs: unknown[]) => unknown> }
    )._listeners.get(channel);
    if (!listener) {
        throw new Error(`No listener for channel: ${channel}`);
    }
    listener({}, ...args);
}

const adapterForPlatform = {
    darwin: platformAdapterPresets.mac,
    win32: platformAdapterPresets.windows,
    linux: platformAdapterPresets.linuxX11,
} as const;

describe.each(['darwin', 'win32', 'linux'] as const)('Tab persistence IPC roundtrip on %s', (platform) => {
    beforeEach(() => {
        vi.clearAllMocks();
        (ipcMain as unknown as { _reset?: () => void })._reset?.();
        (SettingsStore as unknown as { __reset?: () => void }).__reset?.();
        useMockPlatformAdapter(adapterForPlatform[platform]());

        new TabStateIpcHandler({
            logger: mockLogger,
            store: createMockStore() as never,
            windowManager: createMockWindowManager() as never,
            hotkeyManager: null,
            updateManager: null,
            llmManager: null,
            notificationManager: null,
            exportManager: null,
        }).register();
    });

    afterEach(() => {
        resetPlatformAdapterForTests();
    });

    it('returns null when no tab state was persisted', () => {
        const state = invokeHandler(IPC_CHANNELS.TABS_GET_STATE);
        expect(state).toBeNull();
    });

    it('saves and loads tab state through IPC handlers', () => {
        const payload = {
            tabs: [
                { id: 'tab-1', title: 'First', url: GEMINI_APP_URL, createdAt: 1 },
                { id: 'tab-2', title: 'Second', url: GEMINI_APP_URL, createdAt: 2 },
            ],
            activeTabId: 'tab-2',
        };

        sendMessage(IPC_CHANNELS.TABS_SAVE_STATE, payload);
        const loaded = invokeHandler(IPC_CHANNELS.TABS_GET_STATE);

        expect(loaded).toEqual(payload);
    });

    it('overwrites previously saved state on consecutive saves', () => {
        sendMessage(IPC_CHANNELS.TABS_SAVE_STATE, {
            tabs: [{ id: 'tab-a', title: 'A', url: GEMINI_APP_URL, createdAt: 1 }],
            activeTabId: 'tab-a',
        });

        const latest = {
            tabs: [
                { id: 'tab-a', title: 'A', url: GEMINI_APP_URL, createdAt: 1 },
                { id: 'tab-b', title: 'B', url: GEMINI_APP_URL, createdAt: 2 },
            ],
            activeTabId: 'tab-b',
        };

        sendMessage(IPC_CHANNELS.TABS_SAVE_STATE, latest);
        const loaded = invokeHandler(IPC_CHANNELS.TABS_GET_STATE);

        expect(loaded).toEqual(latest);
    });
});
