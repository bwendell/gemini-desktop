/**
 * Coordinated tests for HotkeyIpcHandler.
 *
 * Tests the coordination between HotkeyIpcHandler and the HotkeyManager,
 * verifying settings persistence and broadcast to all windows.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';
import { HotkeyIpcHandler } from '../../../src/main/managers/ipc/HotkeyIpcHandler';
import type { IpcHandlerDependencies } from '../../../src/main/managers/ipc/types';
import { IPC_CHANNELS } from '../../../src/shared/constants/ipc-channels';
import { DEFAULT_ACCELERATORS } from '../../../src/shared/types/hotkeys';

// Use the centralized logger mock from __mocks__ directory
vi.mock('../../../src/main/utils/logger');
import { mockLogger } from '../../../src/main/utils/__mocks__/logger';

describe('HotkeyIpcHandler Coordinated Tests', () => {
    let mockStore: any;
    let mockWindowManager: any;
    let mockHotkeyManager: any;
    let handler: HotkeyIpcHandler;
    let mockDeps: IpcHandlerDependencies;
    let storeData: Record<string, unknown>;

    beforeEach(() => {
        vi.clearAllMocks();
        if ((ipcMain as any)._reset) (ipcMain as any)._reset();
        if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();

        // Simulate real store with in-memory data
        storeData = {};
        mockStore = {
            get: vi.fn((key: string) => storeData[key]),
            set: vi.fn((key: string, value: unknown) => {
                storeData[key] = value;
            }),
        };

        mockWindowManager = {
            getMainWindow: vi.fn(),
            createMainWindow: vi.fn(),
            on: vi.fn(),
        };

        mockHotkeyManager = {
            updateAllSettings: vi.fn(),
            updateAllAccelerators: vi.fn(),
            setIndividualEnabled: vi.fn(),
            setAccelerator: vi.fn(),
        };

        mockDeps = {
            store: mockStore,
            logger: mockLogger,
            windowManager: mockWindowManager,
            hotkeyManager: mockHotkeyManager,
        } as any;

        handler = new HotkeyIpcHandler(mockDeps);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('3.2.16 - Settings persist to store', () => {
        it('should persist individual hotkey setting to store', () => {
            handler.register();

            // Get the individual:set listener
            const listener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_SET);
            expect(listener).toBeDefined();

            // Set alwaysOnTop to false
            listener!({}, 'alwaysOnTop', false);

            // Verify persisted to store
            expect(storeData['hotkeyAlwaysOnTop']).toBe(false);
        });

        it('should persist accelerator setting to store', () => {
            handler.register();

            // Get the accelerator:set listener
            const listener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.HOTKEYS_ACCELERATOR_SET);
            expect(listener).toBeDefined();

            // Set a new accelerator
            listener!({}, 'bossKey', 'Alt+Shift+B');

            // Verify persisted to store
            expect(storeData['acceleratorBossKey']).toBe('Alt+Shift+B');
        });

        it('should read persisted settings on get', async () => {
            // Pre-populate store
            storeData['hotkeyAlwaysOnTop'] = false;
            storeData['hotkeyBossKey'] = true;
            storeData['hotkeyQuickChat'] = false;
            storeData['hotkeyPrintToPdf'] = true;

            handler.register();

            // Get the handler
            const invokeHandler = (ipcMain as any)._handlers?.get(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_GET);
            expect(invokeHandler).toBeDefined();

            const result = await invokeHandler!();

            expect(result).toEqual({
                alwaysOnTop: false,
                bossKey: true,
                quickChat: false,
                printToPdf: true,
            });
        });

        it('should read persisted accelerators on get', async () => {
            // Pre-populate store
            storeData['acceleratorAlwaysOnTop'] = 'Ctrl+T';
            storeData['acceleratorBossKey'] = 'Ctrl+H';

            handler.register();

            const invokeHandler = (ipcMain as any)._handlers?.get(IPC_CHANNELS.HOTKEYS_ACCELERATOR_GET);
            expect(invokeHandler).toBeDefined();

            const result = await invokeHandler!();

            expect(result).toEqual({
                alwaysOnTop: 'Ctrl+T',
                bossKey: 'Ctrl+H',
                quickChat: DEFAULT_ACCELERATORS.quickChat,
                printToPdf: DEFAULT_ACCELERATORS.printToPdf,
            });
        });

        it('should update hotkeyManager when setting is changed', () => {
            handler.register();

            const listener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_SET);
            listener!({}, 'quickChat', false);

            expect(mockHotkeyManager.setIndividualEnabled).toHaveBeenCalledWith('quickChat', false);
        });

        it('should update hotkeyManager when accelerator is changed', () => {
            handler.register();

            const listener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.HOTKEYS_ACCELERATOR_SET);
            listener!({}, 'printToPdf', 'Ctrl+Shift+P');

            expect(mockHotkeyManager.setAccelerator).toHaveBeenCalledWith('printToPdf', 'Ctrl+Shift+P');
        });
    });

    describe('3.2.17 - Changes broadcast to all windows', () => {
        it('should broadcast individual setting change to all windows', () => {
            const mockWindow1 = {
                id: 1,
                isDestroyed: vi.fn().mockReturnValue(false),
                webContents: { send: vi.fn() },
            };
            const mockWindow2 = {
                id: 2,
                isDestroyed: vi.fn().mockReturnValue(false),
                webContents: { send: vi.fn() },
            };
            (BrowserWindow.getAllWindows as any).mockReturnValue([mockWindow1, mockWindow2]);

            handler.register();

            const listener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_SET);
            listener!({}, 'alwaysOnTop', true);

            // Both windows should receive the broadcast
            expect(mockWindow1.webContents.send).toHaveBeenCalledWith(
                IPC_CHANNELS.HOTKEYS_INDIVIDUAL_CHANGED,
                expect.objectContaining({
                    alwaysOnTop: true,
                })
            );
            expect(mockWindow2.webContents.send).toHaveBeenCalledWith(
                IPC_CHANNELS.HOTKEYS_INDIVIDUAL_CHANGED,
                expect.objectContaining({
                    alwaysOnTop: true,
                })
            );
        });

        it('should broadcast accelerator change to all windows', () => {
            const mockWindow1 = {
                id: 1,
                isDestroyed: vi.fn().mockReturnValue(false),
                webContents: { send: vi.fn() },
            };
            const mockWindow2 = {
                id: 2,
                isDestroyed: vi.fn().mockReturnValue(false),
                webContents: { send: vi.fn() },
            };
            (BrowserWindow.getAllWindows as any).mockReturnValue([mockWindow1, mockWindow2]);

            storeData['acceleratorBossKey'] = 'Alt+H';

            handler.register();

            const listener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.HOTKEYS_ACCELERATOR_SET);
            listener!({}, 'bossKey', 'Alt+H');

            // Both windows should receive the broadcast
            expect(mockWindow1.webContents.send).toHaveBeenCalledWith(
                IPC_CHANNELS.HOTKEYS_ACCELERATOR_CHANGED,
                expect.objectContaining({
                    bossKey: 'Alt+H',
                })
            );
            expect(mockWindow2.webContents.send).toHaveBeenCalledWith(
                IPC_CHANNELS.HOTKEYS_ACCELERATOR_CHANGED,
                expect.objectContaining({
                    bossKey: 'Alt+H',
                })
            );
        });

        it('should skip destroyed windows during broadcast', () => {
            const mockActiveWindow = {
                id: 1,
                isDestroyed: vi.fn().mockReturnValue(false),
                webContents: { send: vi.fn() },
            };
            const mockDestroyedWindow = {
                id: 2,
                isDestroyed: vi.fn().mockReturnValue(true),
                webContents: { send: vi.fn() },
            };
            (BrowserWindow.getAllWindows as any).mockReturnValue([mockActiveWindow, mockDestroyedWindow]);

            handler.register();

            const listener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_SET);
            listener!({}, 'bossKey', false);

            // Only active window should receive the broadcast
            expect(mockActiveWindow.webContents.send).toHaveBeenCalled();
            expect(mockDestroyedWindow.webContents.send).not.toHaveBeenCalled();
        });
    });

    describe('Initialize flow', () => {
        it('should sync stored settings to hotkeyManager on initialize', () => {
            // Pre-populate store
            storeData['hotkeyAlwaysOnTop'] = false;
            storeData['hotkeyBossKey'] = true;
            storeData['hotkeyQuickChat'] = false;
            storeData['hotkeyPrintToPdf'] = true;
            storeData['acceleratorAlwaysOnTop'] = 'Alt+P';
            storeData['acceleratorBossKey'] = 'Alt+H';

            handler.initialize();

            expect(mockHotkeyManager.updateAllSettings).toHaveBeenCalledWith({
                alwaysOnTop: false,
                bossKey: true,
                quickChat: false,
                printToPdf: true,
            });

            expect(mockHotkeyManager.updateAllAccelerators).toHaveBeenCalledWith(
                expect.objectContaining({
                    alwaysOnTop: 'Alt+P',
                    bossKey: 'Alt+H',
                })
            );
        });

        it('should not throw if hotkeyManager is null', () => {
            const handlerWithoutManager = new HotkeyIpcHandler({
                ...mockDeps,
                hotkeyManager: null,
            } as any);

            expect(() => handlerWithoutManager.initialize()).not.toThrow();
        });
    });

    describe('Full settings integration', () => {
        it('should return combined settings from full-settings:get', async () => {
            storeData['hotkeyAlwaysOnTop'] = true;
            storeData['hotkeyBossKey'] = false;
            storeData['hotkeyQuickChat'] = true;
            storeData['hotkeyPrintToPdf'] = false;
            storeData['acceleratorAlwaysOnTop'] = 'Alt+T';
            storeData['acceleratorBossKey'] = 'Alt+B';
            storeData['acceleratorQuickChat'] = 'Ctrl+Space';
            storeData['acceleratorPrintToPdf'] = 'Ctrl+P';

            handler.register();

            const invokeHandler = (ipcMain as any)._handlers?.get(IPC_CHANNELS.HOTKEYS_FULL_SETTINGS_GET);
            const result = await invokeHandler!();

            expect(result).toEqual({
                alwaysOnTop: { enabled: true, accelerator: 'Alt+T' },
                bossKey: { enabled: false, accelerator: 'Alt+B' },
                quickChat: { enabled: true, accelerator: 'Ctrl+Space' },
                printToPdf: { enabled: false, accelerator: 'Ctrl+P' },
            });
        });
    });
});
