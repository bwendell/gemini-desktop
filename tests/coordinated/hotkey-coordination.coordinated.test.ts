import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { globalShortcut, BrowserWindow } from 'electron';
import HotkeyManager from '../../src/main/managers/hotkeyManager';
import WindowManager from '../../src/main/managers/windowManager';
import IpcManager from '../../src/main/managers/ipcManager';
import { DEFAULT_ACCELERATORS } from '../../src/shared/types/hotkeys';
import {
    createMockPlatformAdapter,
    platformAdapterPresets,
    useMockPlatformAdapter,
    resetPlatformAdapterForTests,
} from '../helpers/mocks';

import type { IndividualHotkeySettings } from '../../src/main/types';

vi.mock('../../src/main/utils/logger');
import { mockLogger } from '../../src/main/utils/__mocks__/logger';

const adapterForPlatform = {
    darwin: platformAdapterPresets.mac,
    win32: platformAdapterPresets.windows,
    linux: platformAdapterPresets.linuxX11,
} as const;

const defaultWaylandStatus = {
    isWayland: false,
    desktopEnvironment: 'unknown',
    deVersion: null,
    portalAvailable: false,
    portalMethod: 'none',
} as const;

const getListener = (channel: string) => (require('electron').ipcMain as any)._listeners.get(channel);

describe('HotkeyManager ↔ SettingsStore ↔ IpcManager Integration', () => {
    let hotkeyManager: HotkeyManager;
    let windowManager: WindowManager;
    let ipcManager: IpcManager;
    let mockStore: any;
    let mockUpdateManager: any;

    beforeEach(() => {
        vi.clearAllMocks();
        const { ipcMain, BrowserWindow: BW, globalShortcut: gs } = require('electron');
        if ((ipcMain as any)._reset) (ipcMain as any)._reset();
        if ((BW as any)._reset) (BW as any)._reset();
        if ((gs as any)._reset) (gs as any)._reset();

        const storeData: Record<string, any> = {
            theme: 'system',
            alwaysOnTop: false,
            hotkeyAlwaysOnTop: true,
            hotkeyBossKey: true,
            hotkeyQuickChat: true,
            hotkeyPrintToPdf: true,
            autoUpdateEnabled: true,
        };
        mockStore = {
            get: vi.fn((key: string) => storeData[key]),
            set: vi.fn((key: string, value: any) => {
                storeData[key] = value;
            }),
            _data: storeData,
        };

        mockUpdateManager = {
            isEnabled: vi.fn().mockReturnValue(true),
            setEnabled: vi.fn(),
            checkForUpdates: vi.fn(),
            quitAndInstall: vi.fn(),
            devShowBadge: vi.fn(),
            devClearBadge: vi.fn(),
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
        beforeEach(() => {
            const adapter =
                platform === 'linux'
                    ? createMockPlatformAdapter({
                          id: 'linux-x11',
                          getHotkeyRegistrationPlan: vi.fn().mockReturnValue({
                              mode: 'native',
                              waylandStatus: defaultWaylandStatus,
                          }),
                          getWaylandStatus: vi.fn().mockReturnValue(defaultWaylandStatus),
                          supportsBadges: vi.fn().mockReturnValue(false),
                      })
                    : adapterForPlatform[platform]();

            useMockPlatformAdapter(adapter);

            windowManager = new WindowManager(false);

            const initialSettings: IndividualHotkeySettings = {
                alwaysOnTop: mockStore.get('hotkeyAlwaysOnTop') ?? true,
                bossKey: mockStore.get('hotkeyBossKey') ?? true,
                quickChat: mockStore.get('hotkeyQuickChat') ?? true,
                printToPdf: mockStore.get('hotkeyPrintToPdf') ?? true,
            };
            hotkeyManager = new HotkeyManager(windowManager, initialSettings);

            ipcManager = new IpcManager(
                windowManager,
                hotkeyManager,
                mockUpdateManager,
                null,
                null,
                null,
                mockStore,
                mockLogger
            );
            ipcManager.setupIpcHandlers();
        });

        afterEach(() => {
            resetPlatformAdapterForTests();
            hotkeyManager.unregisterAll();
        });

        describe('User disables hotkey via IPC', () => {
            it('should unregister hotkey, persist to store, and broadcast to renderers', () => {
                hotkeyManager.registerShortcuts();
                const initialRegisterCalls = (globalShortcut.register as any).mock.calls.length;
                expect(initialRegisterCalls).toBeGreaterThan(0);

                const mockWin1 = { isDestroyed: () => false, webContents: { send: vi.fn() } };
                const mockWin2 = { isDestroyed: () => false, webContents: { send: vi.fn() } };
                (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin1, mockWin2]);

                const handler = getListener('hotkeys:individual:set');
                expect(handler).toBeDefined();

                handler({}, 'alwaysOnTop', false);

                expect(hotkeyManager.isIndividualEnabled('alwaysOnTop')).toBe(false);
                expect(mockStore.set).toHaveBeenCalledWith('hotkeyAlwaysOnTop', false);
                expect(mockWin1.webContents.send).toHaveBeenCalledWith(
                    'hotkeys:individual:changed',
                    expect.objectContaining({
                        alwaysOnTop: false,
                        bossKey: true,
                        quickChat: true,
                    })
                );
                expect(mockWin2.webContents.send).toHaveBeenCalledWith(
                    'hotkeys:individual:changed',
                    expect.objectContaining({
                        alwaysOnTop: false,
                        bossKey: true,
                        quickChat: true,
                    })
                );
            });

            it('should re-enable hotkey and register it', () => {
                hotkeyManager.setIndividualEnabled('bossKey', false);
                hotkeyManager.registerShortcuts();

                vi.clearAllMocks();

                const handler = getListener('hotkeys:individual:set');
                handler({}, 'bossKey', true);

                expect(hotkeyManager.isIndividualEnabled('bossKey')).toBe(true);

                expect(globalShortcut.register).toHaveBeenCalledWith(
                    DEFAULT_ACCELERATORS.bossKey,
                    expect.any(Function)
                );

                expect(mockStore.set).toHaveBeenCalledWith('hotkeyBossKey', true);
            });
        });

        describe('App restart simulation', () => {
            it('should load settings from store and register only enabled hotkeys', () => {
                mockStore._data.hotkeyAlwaysOnTop = false;
                mockStore._data.hotkeyBossKey = true;
                mockStore._data.hotkeyQuickChat = true;
                mockStore.get.mockImplementation((key: string) => mockStore._data[key]);

                const restartedHotkeyManager = new HotkeyManager(windowManager, {
                    alwaysOnTop: mockStore.get('hotkeyAlwaysOnTop') ?? true,
                    bossKey: mockStore.get('hotkeyBossKey') ?? true,
                    quickChat: mockStore.get('hotkeyQuickChat') ?? true,
                });

                vi.clearAllMocks();

                restartedHotkeyManager.registerShortcuts();

                const registerCalls = (globalShortcut.register as any).mock.calls;
                const registeredAccelerators = registerCalls.map((call: any) => call[0]);

                expect(registeredAccelerators).toContain(DEFAULT_ACCELERATORS.bossKey);

                expect(registeredAccelerators).toContain(DEFAULT_ACCELERATORS.quickChat);

                expect(registeredAccelerators).not.toContain(DEFAULT_ACCELERATORS.alwaysOnTop);

                expect(restartedHotkeyManager.isIndividualEnabled('alwaysOnTop')).toBe(false);
                expect(restartedHotkeyManager.isIndividualEnabled('bossKey')).toBe(true);
                expect(restartedHotkeyManager.isIndividualEnabled('quickChat')).toBe(true);

                restartedHotkeyManager.unregisterAll();
            });

            it('should handle all hotkeys disabled on restart', () => {
                mockStore._data.hotkeyAlwaysOnTop = false;
                mockStore._data.hotkeyBossKey = false;
                mockStore._data.hotkeyQuickChat = false;
                mockStore.get.mockImplementation((key: string) => mockStore._data[key]);

                const restartedHotkeyManager = new HotkeyManager(windowManager, {
                    alwaysOnTop: false,
                    bossKey: false,
                    quickChat: false,
                });

                vi.clearAllMocks();

                restartedHotkeyManager.registerShortcuts();

                expect(globalShortcut.register).not.toHaveBeenCalled();

                restartedHotkeyManager.unregisterAll();
            });
        });

        describe('Rapid toggling without duplicates', () => {
            it('should handle rapid enable/disable without duplicate registrations', () => {
                hotkeyManager.registerShortcuts();
                vi.clearAllMocks();

                const handler = getListener('hotkeys:individual:set');

                handler({}, 'bossKey', false);
                handler({}, 'bossKey', true);
                handler({}, 'bossKey', false);
                handler({}, 'bossKey', true);
                handler({}, 'bossKey', false);
                handler({}, 'bossKey', true);

                expect(hotkeyManager.isIndividualEnabled('bossKey')).toBe(true);

                const setCallsForBossKey = (mockStore.set as any).mock.calls.filter(
                    (call: any) => call[0] === 'hotkeyBossKey'
                );
                expect(setCallsForBossKey.length).toBe(6);

                expect(setCallsForBossKey[5][1]).toBe(true);

                const registerCalls = (globalShortcut.register as any).mock.calls;
                const bossKeyRegisters = registerCalls.filter((call: any) => call[0] === DEFAULT_ACCELERATORS.bossKey);
                expect(bossKeyRegisters.length).toBe(3);
            });

            it('should handle toggling all hotkeys rapidly', () => {
                hotkeyManager.registerShortcuts();
                vi.clearAllMocks();

                const handler = getListener('hotkeys:individual:set');

                ['alwaysOnTop', 'bossKey', 'quickChat'].forEach((hotkeyId) => {
                    handler({}, hotkeyId, false);
                    handler({}, hotkeyId, true);
                    handler({}, hotkeyId, false);
                });

                expect(hotkeyManager.isIndividualEnabled('alwaysOnTop')).toBe(false);
                expect(hotkeyManager.isIndividualEnabled('bossKey')).toBe(false);
                expect(hotkeyManager.isIndividualEnabled('quickChat')).toBe(false);

                expect(mockStore.set).toHaveBeenCalledWith('hotkeyAlwaysOnTop', false);
                expect(mockStore.set).toHaveBeenCalledWith('hotkeyBossKey', false);
                expect(mockStore.set).toHaveBeenCalledWith('hotkeyQuickChat', false);
            });
        });
    });
});
