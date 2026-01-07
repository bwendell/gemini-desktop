/**
 * Unit tests for HotkeyIpcHandler.
 *
 * Tests the hotkey IPC handlers for individual settings,
 * accelerators, and full settings.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HotkeyIpcHandler } from '../../../../src/main/managers/ipc/HotkeyIpcHandler';
import type { IpcHandlerDependencies } from '../../../../src/main/managers/ipc/types';
import { createMockLogger, createMockWindowManager, createMockStore } from '../../../helpers/mocks';
import { IPC_CHANNELS } from '../../../../src/shared/constants/ipc-channels';
import { DEFAULT_ACCELERATORS } from '../../../../src/shared/types/hotkeys';

// Mock Electron
const { mockIpcMain, mockBrowserWindow } = vi.hoisted(() => {
    const mockIpcMain = {
        on: vi.fn((channel: string, listener: (...args: unknown[]) => void) => {
            mockIpcMain._listeners.set(channel, listener);
        }),
        handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
            mockIpcMain._handlers.set(channel, handler);
        }),
        _listeners: new Map<string, (...args: unknown[]) => void>(),
        _handlers: new Map<string, (...args: unknown[]) => unknown>(),
        _reset: () => {
            mockIpcMain._listeners.clear();
            mockIpcMain._handlers.clear();
        },
    };

    const mockWebContents = {
        id: 1,
        send: vi.fn(),
    };

    const mockWindow = {
        isDestroyed: vi.fn().mockReturnValue(false),
        id: 1,
        webContents: mockWebContents,
    };

    const mockBrowserWindow = {
        getAllWindows: vi.fn().mockReturnValue([mockWindow]),
        fromWebContents: vi.fn().mockReturnValue(mockWindow),
        _mockWindow: mockWindow,
        _mockWebContents: mockWebContents,
        _reset: () => {
            mockWindow.isDestroyed.mockReturnValue(false);
            mockWindow.webContents.send.mockReset();
            mockBrowserWindow.getAllWindows.mockReturnValue([mockWindow]);
        },
    };

    return { mockIpcMain, mockBrowserWindow };
});

vi.mock('electron', () => ({
    ipcMain: mockIpcMain,
    BrowserWindow: mockBrowserWindow,
}));

describe('HotkeyIpcHandler', () => {
    let handler: HotkeyIpcHandler;
    let mockDeps: IpcHandlerDependencies;
    let mockLogger: ReturnType<typeof createMockLogger>;
    let mockStore: ReturnType<typeof createMockStore>;
    let mockHotkeyManager: {
        updateAllSettings: ReturnType<typeof vi.fn>;
        updateAllAccelerators: ReturnType<typeof vi.fn>;
        setIndividualEnabled: ReturnType<typeof vi.fn>;
        setAccelerator: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockIpcMain._reset();
        mockBrowserWindow._reset();

        mockLogger = createMockLogger();
        mockStore = createMockStore({});
        mockHotkeyManager = {
            updateAllSettings: vi.fn(),
            updateAllAccelerators: vi.fn(),
            setIndividualEnabled: vi.fn(),
            setAccelerator: vi.fn(),
        };

        mockDeps = {
            store: mockStore,
            logger: mockLogger,
            windowManager: createMockWindowManager(),
            hotkeyManager: mockHotkeyManager as any,
        };

        handler = new HotkeyIpcHandler(mockDeps);
    });

    describe('register', () => {
        it('registers hotkeys:individual:get handler', () => {
            handler.register();

            expect(mockIpcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_GET, expect.any(Function));
            expect(mockIpcMain._handlers.has(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_GET)).toBe(true);
        });

        it('registers hotkeys:individual:set listener', () => {
            handler.register();

            expect(mockIpcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_SET, expect.any(Function));
            expect(mockIpcMain._listeners.has(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_SET)).toBe(true);
        });

        it('registers hotkeys:accelerator:get handler', () => {
            handler.register();

            expect(mockIpcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.HOTKEYS_ACCELERATOR_GET, expect.any(Function));
            expect(mockIpcMain._handlers.has(IPC_CHANNELS.HOTKEYS_ACCELERATOR_GET)).toBe(true);
        });

        it('registers hotkeys:accelerator:set listener', () => {
            handler.register();

            expect(mockIpcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.HOTKEYS_ACCELERATOR_SET, expect.any(Function));
            expect(mockIpcMain._listeners.has(IPC_CHANNELS.HOTKEYS_ACCELERATOR_SET)).toBe(true);
        });

        it('registers hotkeys:full-settings:get handler', () => {
            handler.register();

            expect(mockIpcMain.handle).toHaveBeenCalledWith(
                IPC_CHANNELS.HOTKEYS_FULL_SETTINGS_GET,
                expect.any(Function)
            );
            expect(mockIpcMain._handlers.has(IPC_CHANNELS.HOTKEYS_FULL_SETTINGS_GET)).toBe(true);
        });
    });

    describe('initialize', () => {
        it('syncs settings and accelerators to hotkeyManager', () => {
            mockStore.get.mockImplementation((key: string) => {
                if (key === 'hotkeyAlwaysOnTop') return false;
                if (key === 'acceleratorAlwaysOnTop') return 'Alt+Shift+A';
                return undefined;
            });

            handler.initialize();

            expect(mockHotkeyManager.updateAllSettings).toHaveBeenCalledWith(
                expect.objectContaining({
                    alwaysOnTop: false,
                })
            );
            expect(mockHotkeyManager.updateAllAccelerators).toHaveBeenCalled();
            expect(mockLogger.log).toHaveBeenCalledWith('Hotkeys initialized from store');
        });

        it('does nothing if hotkeyManager is not available', () => {
            const handlerWithoutHotkeyManager = new HotkeyIpcHandler({
                ...mockDeps,
                hotkeyManager: null,
            });

            handlerWithoutHotkeyManager.initialize();

            expect(mockHotkeyManager.updateAllSettings).not.toHaveBeenCalled();
        });

        it('handles initialization error', () => {
            mockStore.get.mockImplementation(() => {
                throw new Error('Store read error');
            });

            handler.initialize();

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error during initializing hotkeys:',
                expect.objectContaining({
                    error: 'Store read error',
                })
            );
        });
    });

    describe('hotkeys:individual:get handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('returns all hotkey states', async () => {
            mockStore.get.mockImplementation((key: string) => {
                if (key === 'hotkeyAlwaysOnTop') return true;
                if (key === 'hotkeyBossKey') return false;
                if (key === 'hotkeyQuickChat') return true;
                if (key === 'hotkeyPrintToPdf') return false;
                return undefined;
            });

            const invokeHandler = mockIpcMain._handlers.get(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_GET);
            const result = await invokeHandler!();

            expect(result).toEqual({
                alwaysOnTop: true,
                bossKey: false,
                quickChat: true,
                printToPdf: false,
            });
        });

        it('returns defaults if not set', async () => {
            mockStore.get.mockReturnValue(undefined);

            const invokeHandler = mockIpcMain._handlers.get(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_GET);
            const result = await invokeHandler!();

            expect(result).toEqual({
                alwaysOnTop: true,
                bossKey: true,
                quickChat: true,
                printToPdf: true,
            });
        });

        it('returns fallback on error', async () => {
            mockStore.get.mockImplementation(() => {
                throw new Error('Store error');
            });

            const invokeHandler = mockIpcMain._handlers.get(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_GET);
            const result = await invokeHandler!();

            expect(result).toEqual({
                alwaysOnTop: true,
                bossKey: true,
                quickChat: true,
                printToPdf: true,
            });
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('hotkeys:individual:set handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('rejects invalid hotkey ID', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_SET);
            listener!({}, 'invalidId', true);

            expect(mockStore.set).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith('Invalid hotkey id: invalidId');
        });

        it('rejects non-boolean enabled value', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_SET);
            listener!({}, 'alwaysOnTop', 'notBoolean');

            expect(mockStore.set).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith('Invalid enabled value: notBoolean');
        });

        it('persists valid setting to store', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_SET);
            listener!({}, 'alwaysOnTop', false);

            expect(mockStore.set).toHaveBeenCalledWith('hotkeyAlwaysOnTop', false);
        });

        it('updates hotkeyManager on valid set', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_SET);
            listener!({}, 'bossKey', true);

            expect(mockHotkeyManager.setIndividualEnabled).toHaveBeenCalledWith('bossKey', true);
            expect(mockLogger.log).toHaveBeenCalledWith('Individual hotkey bossKey set to: true');
        });

        it('broadcasts change to all windows', () => {
            mockStore.get.mockReturnValue(true);

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_SET);
            listener!({}, 'quickChat', true);

            expect(mockBrowserWindow._mockWindow.webContents.send).toHaveBeenCalledWith(
                IPC_CHANNELS.HOTKEYS_INDIVIDUAL_CHANGED,
                expect.objectContaining({
                    quickChat: true,
                })
            );
        });

        it('handles error during set', () => {
            mockStore.set.mockImplementation(() => {
                throw new Error('Store write error');
            });

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_SET);
            listener!({}, 'printToPdf', false);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error setting individual hotkey:',
                expect.objectContaining({
                    error: 'Store write error',
                    id: 'printToPdf',
                    enabled: false,
                })
            );
        });
    });

    describe('hotkeys:accelerator:get handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('returns all accelerators', async () => {
            mockStore.get.mockImplementation((key: string) => {
                if (key === 'acceleratorAlwaysOnTop') return 'Alt+Shift+A';
                if (key === 'acceleratorBossKey') return 'Alt+Shift+B';
                if (key === 'acceleratorQuickChat') return 'Alt+Shift+Q';
                if (key === 'acceleratorPrintToPdf') return 'Alt+Shift+P';
                return undefined;
            });

            const invokeHandler = mockIpcMain._handlers.get(IPC_CHANNELS.HOTKEYS_ACCELERATOR_GET);
            const result = await invokeHandler!();

            expect(result).toEqual({
                alwaysOnTop: 'Alt+Shift+A',
                bossKey: 'Alt+Shift+B',
                quickChat: 'Alt+Shift+Q',
                printToPdf: 'Alt+Shift+P',
            });
        });

        it('returns defaults if not set', async () => {
            mockStore.get.mockReturnValue(undefined);

            const invokeHandler = mockIpcMain._handlers.get(IPC_CHANNELS.HOTKEYS_ACCELERATOR_GET);
            const result = await invokeHandler!();

            expect(result).toEqual(DEFAULT_ACCELERATORS);
        });

        it('returns fallback on error', async () => {
            mockStore.get.mockImplementation(() => {
                throw new Error('Store error');
            });

            const invokeHandler = mockIpcMain._handlers.get(IPC_CHANNELS.HOTKEYS_ACCELERATOR_GET);
            const result = await invokeHandler!();

            expect(result).toEqual(DEFAULT_ACCELERATORS);
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('hotkeys:accelerator:set handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('rejects invalid hotkey ID', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.HOTKEYS_ACCELERATOR_SET);
            listener!({}, 'invalidId', 'Alt+A');

            expect(mockStore.set).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith('Invalid hotkey id: invalidId');
        });

        it('rejects empty string accelerator', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.HOTKEYS_ACCELERATOR_SET);
            listener!({}, 'alwaysOnTop', '');

            expect(mockStore.set).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith('Invalid accelerator value: ');
        });

        it('rejects whitespace-only accelerator', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.HOTKEYS_ACCELERATOR_SET);
            listener!({}, 'alwaysOnTop', '   ');

            expect(mockStore.set).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith('Invalid accelerator value:    ');
        });

        it('rejects non-string accelerator', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.HOTKEYS_ACCELERATOR_SET);
            listener!({}, 'alwaysOnTop', 123);

            expect(mockStore.set).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith('Invalid accelerator value: 123');
        });

        it('persists valid accelerator to store', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.HOTKEYS_ACCELERATOR_SET);
            listener!({}, 'alwaysOnTop', 'Alt+Shift+T');

            expect(mockStore.set).toHaveBeenCalledWith('acceleratorAlwaysOnTop', 'Alt+Shift+T');
        });

        it('updates hotkeyManager on valid set', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.HOTKEYS_ACCELERATOR_SET);
            listener!({}, 'bossKey', 'Alt+Shift+H');

            expect(mockHotkeyManager.setAccelerator).toHaveBeenCalledWith('bossKey', 'Alt+Shift+H');
            expect(mockLogger.log).toHaveBeenCalledWith('Hotkey accelerator bossKey set to: Alt+Shift+H');
        });

        it('broadcasts change to all windows', () => {
            mockStore.get.mockImplementation((key: string) => {
                if (key === 'acceleratorQuickChat') return 'Alt+Space';
                return DEFAULT_ACCELERATORS.alwaysOnTop;
            });

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.HOTKEYS_ACCELERATOR_SET);
            listener!({}, 'quickChat', 'Alt+Space');

            expect(mockBrowserWindow._mockWindow.webContents.send).toHaveBeenCalledWith(
                IPC_CHANNELS.HOTKEYS_ACCELERATOR_CHANGED,
                expect.objectContaining({
                    quickChat: 'Alt+Space',
                })
            );
        });

        it('handles error during set', () => {
            mockStore.set.mockImplementation(() => {
                throw new Error('Store write error');
            });

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.HOTKEYS_ACCELERATOR_SET);
            listener!({}, 'printToPdf', 'Ctrl+P');

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error setting hotkey accelerator:',
                expect.objectContaining({
                    error: 'Store write error',
                    id: 'printToPdf',
                    accelerator: 'Ctrl+P',
                })
            );
        });
    });

    describe('hotkeys:full-settings:get handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('returns full settings with enabled and accelerators', async () => {
            mockStore.get.mockImplementation((key: string) => {
                if (key === 'hotkeyAlwaysOnTop') return true;
                if (key === 'hotkeyBossKey') return false;
                if (key === 'hotkeyQuickChat') return true;
                if (key === 'hotkeyPrintToPdf') return true;
                if (key === 'acceleratorAlwaysOnTop') return 'Alt+P';
                if (key === 'acceleratorBossKey') return 'Alt+H';
                if (key === 'acceleratorQuickChat') return 'Ctrl+Space';
                if (key === 'acceleratorPrintToPdf') return 'Ctrl+Shift+P';
                return undefined;
            });

            const invokeHandler = mockIpcMain._handlers.get(IPC_CHANNELS.HOTKEYS_FULL_SETTINGS_GET);
            const result = await invokeHandler!();

            expect(result).toEqual({
                alwaysOnTop: { enabled: true, accelerator: 'Alt+P' },
                bossKey: { enabled: false, accelerator: 'Alt+H' },
                quickChat: { enabled: true, accelerator: 'Ctrl+Space' },
                printToPdf: { enabled: true, accelerator: 'Ctrl+Shift+P' },
            });
        });

        it('returns fallback on error', async () => {
            mockStore.get.mockImplementation(() => {
                throw new Error('Store error');
            });

            const invokeHandler = mockIpcMain._handlers.get(IPC_CHANNELS.HOTKEYS_FULL_SETTINGS_GET);
            const result = await invokeHandler!();

            expect(result).toEqual({
                alwaysOnTop: { enabled: true, accelerator: DEFAULT_ACCELERATORS.alwaysOnTop },
                bossKey: { enabled: true, accelerator: DEFAULT_ACCELERATORS.bossKey },
                quickChat: { enabled: true, accelerator: DEFAULT_ACCELERATORS.quickChat },
                printToPdf: { enabled: true, accelerator: DEFAULT_ACCELERATORS.printToPdf },
            });
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('broadcast skips destroyed windows', () => {
        beforeEach(() => {
            handler.register();
        });

        it('skips destroyed windows during individual change broadcast', () => {
            mockBrowserWindow._mockWindow.isDestroyed.mockReturnValue(true);
            mockStore.get.mockReturnValue(true);

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_SET);
            listener!({}, 'alwaysOnTop', true);

            expect(mockBrowserWindow._mockWindow.webContents.send).not.toHaveBeenCalled();
        });

        it('skips destroyed windows during accelerator change broadcast', () => {
            mockBrowserWindow._mockWindow.isDestroyed.mockReturnValue(true);
            mockStore.get.mockReturnValue('Alt+T');

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.HOTKEYS_ACCELERATOR_SET);
            listener!({}, 'alwaysOnTop', 'Alt+T');

            expect(mockBrowserWindow._mockWindow.webContents.send).not.toHaveBeenCalled();
        });
    });

    describe('works without hotkeyManager', () => {
        it('individual:set works without hotkeyManager', () => {
            const handlerNoManager = new HotkeyIpcHandler({
                ...mockDeps,
                hotkeyManager: null,
            });
            handlerNoManager.register();

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_SET);
            listener!({}, 'alwaysOnTop', false);

            expect(mockStore.set).toHaveBeenCalledWith('hotkeyAlwaysOnTop', false);
            expect(mockHotkeyManager.setIndividualEnabled).not.toHaveBeenCalled();
        });

        it('accelerator:set works without hotkeyManager', () => {
            const handlerNoManager = new HotkeyIpcHandler({
                ...mockDeps,
                hotkeyManager: null,
            });
            handlerNoManager.register();

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.HOTKEYS_ACCELERATOR_SET);
            listener!({}, 'alwaysOnTop', 'Alt+Shift+T');

            expect(mockStore.set).toHaveBeenCalledWith('acceleratorAlwaysOnTop', 'Alt+Shift+T');
            expect(mockHotkeyManager.setAccelerator).not.toHaveBeenCalled();
        });
    });
});
