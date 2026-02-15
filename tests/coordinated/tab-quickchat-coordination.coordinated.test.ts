import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockIpcMain, mockBrowserWindow, mockNativeTheme, mockShell } = vi.hoisted(() => {
    const mockIpcMain = {
        on: vi.fn((channel: string, listener: (...args: unknown[]) => void) => {
            mockIpcMain._listeners.set(channel, listener);
        }),
        handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
            mockIpcMain._handlers.set(channel, handler);
        }),
        removeAllListeners: vi.fn(),
        removeHandler: vi.fn(),
        _listeners: new Map<string, (...args: unknown[]) => unknown>(),
        _handlers: new Map<string, (...args: unknown[]) => unknown>(),
        _reset: () => {
            mockIpcMain._listeners.clear();
            mockIpcMain._handlers.clear();
        },
    };

    const mockBrowserWindow = {
        fromWebContents: vi.fn(),
        getAllWindows: vi.fn().mockReturnValue([]),
        _reset: () => {
            mockBrowserWindow.fromWebContents.mockReset();
            mockBrowserWindow.getAllWindows.mockReset();
            mockBrowserWindow.getAllWindows.mockReturnValue([]);
        },
    };

    let themeSource: 'light' | 'dark' | 'system' = 'system';
    const mockNativeTheme = {
        get themeSource() {
            return themeSource;
        },
        set themeSource(value: 'light' | 'dark' | 'system') {
            themeSource = value;
        },
        shouldUseDarkColors: false,
        _reset: () => {
            themeSource = 'system';
            mockNativeTheme.shouldUseDarkColors = false;
        },
    };

    const mockShell = {
        showItemInFolder: vi.fn(),
        _reset: () => {
            mockShell.showItemInFolder.mockReset();
        },
    };

    return { mockIpcMain, mockBrowserWindow, mockNativeTheme, mockShell };
});

vi.mock('electron', () => ({
    ipcMain: mockIpcMain,
    BrowserWindow: mockBrowserWindow,
    nativeTheme: mockNativeTheme,
    shell: mockShell,
    app: {
        isPackaged: false,
        getPath: vi.fn().mockReturnValue('/tmp'),
        on: vi.fn(),
        whenReady: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('../../src/main/store', () => ({
    default: class MockSettingsStore {
        private data: Record<string, unknown>;

        constructor(options: { defaults?: Record<string, unknown> }) {
            this.data = { ...(options.defaults ?? {}) };
        }

        get(key: string): unknown {
            return this.data[key];
        }

        set(key: string, value: unknown): void {
            this.data[key] = value;
        }
    },
}));

vi.mock('../../src/main/utils/logger');

import IpcManager from '../../src/main/managers/ipcManager';
import { IPC_CHANNELS } from '../../src/shared/constants/ipc-channels';
import { getTabFrameName } from '../../src/shared/types/tabs';
import { mockLogger } from '../../src/main/utils/__mocks__/logger';
import { createMockStore, createMockWindowManager, type MockWindowManager } from '../helpers/mocks';

function sendMessage(channel: string, ...args: unknown[]) {
    const listener = mockIpcMain._listeners.get(channel);
    if (!listener) {
        throw new Error(`No listener for channel: ${channel}`);
    }

    return listener({}, ...args);
}

describe('Tab + Quick Chat coordination', () => {
    let ipcManager: IpcManager;
    let windowManager: MockWindowManager;

    beforeEach(() => {
        vi.clearAllMocks();
        mockIpcMain._reset();
        mockBrowserWindow._reset();
        mockNativeTheme._reset();
        mockShell._reset();

        windowManager = createMockWindowManager();
        ipcManager = new IpcManager(
            windowManager as never,
            null,
            null,
            null,
            null,
            null,
            createMockStore({ theme: 'system' }) as never,
            mockLogger as never
        );
        ipcManager.setupIpcHandlers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('injects into target tab frame, not the first Gemini frame', async () => {
        const mainWindow = {
            webContents: {
                send: vi.fn(),
                mainFrame: {
                    frames: [] as Array<{ name: string; url: string; executeJavaScript: ReturnType<typeof vi.fn> }>,
                },
            },
        };

        vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mainWindow as never);
        vi.spyOn(windowManager, 'hideQuickChat').mockImplementation(() => undefined);
        vi.spyOn(windowManager, 'focusMainWindow').mockImplementation(() => undefined);

        sendMessage(IPC_CHANNELS.QUICK_CHAT_SUBMIT, 'route this text');
        const navigatePayload = mainWindow.webContents.send.mock.calls[0]?.[1] as {
            requestId: string;
            targetTabId: string;
        };

        const wrongFrame = {
            name: getTabFrameName('other-tab'),
            url: 'https://gemini.google.com/app',
            executeJavaScript: vi.fn().mockResolvedValue({ success: true }),
        };
        const targetFrame = {
            name: getTabFrameName(navigatePayload.targetTabId),
            url: 'https://gemini.google.com/app',
            executeJavaScript: vi.fn().mockResolvedValue({ success: true }),
        };
        mainWindow.webContents.mainFrame.frames = [wrongFrame, targetFrame];

        await sendMessage(IPC_CHANNELS.GEMINI_READY, {
            requestId: navigatePayload.requestId,
            targetTabId: navigatePayload.targetTabId,
        });

        expect(wrongFrame.executeJavaScript).not.toHaveBeenCalled();
        expect(targetFrame.executeJavaScript).toHaveBeenCalledTimes(1);
    });

    it('ignores out-of-order ready payload for stale request on the same tab', async () => {
        const mainWindow = {
            webContents: {
                send: vi.fn(),
                mainFrame: {
                    frames: [] as Array<{ name: string; url: string; executeJavaScript: ReturnType<typeof vi.fn> }>,
                },
            },
        };

        vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mainWindow as never);
        vi.spyOn(windowManager, 'hideQuickChat').mockImplementation(() => undefined);
        vi.spyOn(windowManager, 'focusMainWindow').mockImplementation(() => undefined);

        sendMessage(IPC_CHANNELS.QUICK_CHAT_SUBMIT, 'older');
        const firstPayload = mainWindow.webContents.send.mock.calls[0]?.[1] as {
            requestId: string;
            targetTabId: string;
        };

        sendMessage(IPC_CHANNELS.QUICK_CHAT_SUBMIT, 'newer');
        const secondPayload = mainWindow.webContents.send.mock.calls[1]?.[1] as {
            requestId: string;
            targetTabId: string;
        };

        const targetFrame = {
            name: getTabFrameName(secondPayload.targetTabId),
            url: 'https://gemini.google.com/app',
            executeJavaScript: vi.fn().mockResolvedValue({ success: true }),
        };
        mainWindow.webContents.mainFrame.frames = [targetFrame];

        await sendMessage(IPC_CHANNELS.GEMINI_READY, {
            requestId: firstPayload.requestId,
            targetTabId: secondPayload.targetTabId,
        });

        expect(mockLogger.warn).toHaveBeenCalledWith('Ignoring gemini:ready payload with mismatched targetTabId');
        expect(targetFrame.executeJavaScript).not.toHaveBeenCalled();
    });

    it('ignores stale ready payload with unknown request metadata', async () => {
        await sendMessage(IPC_CHANNELS.GEMINI_READY, {
            requestId: 'expired-request',
            targetTabId: 'tab-expired',
        });

        expect(mockLogger.warn).toHaveBeenCalledWith('Ignoring stale gemini:ready payload with unknown requestId');
    });
});
