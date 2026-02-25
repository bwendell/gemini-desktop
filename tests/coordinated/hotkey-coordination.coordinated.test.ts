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
            hotkeyPeekAndHide: true,
            hotkeyQuickChat: true,
            hotkeyVoiceChat: true,
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
                peekAndHide: mockStore.get('hotkeyPeekAndHide') ?? true,
                quickChat: mockStore.get('hotkeyQuickChat') ?? true,
                voiceChat: mockStore.get('hotkeyVoiceChat') ?? true,
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
                        peekAndHide: true,
                        quickChat: true,
                    })
                );
                expect(mockWin2.webContents.send).toHaveBeenCalledWith(
                    'hotkeys:individual:changed',
                    expect.objectContaining({
                        alwaysOnTop: false,
                        peekAndHide: true,
                        quickChat: true,
                    })
                );
            });

            it('should re-enable hotkey and register it', () => {
                hotkeyManager.setIndividualEnabled('peekAndHide', false);
                hotkeyManager.registerShortcuts();

                vi.clearAllMocks();

                const handler = getListener('hotkeys:individual:set');
                handler({}, 'peekAndHide', true);

                expect(hotkeyManager.isIndividualEnabled('peekAndHide')).toBe(true);

                expect(globalShortcut.register).toHaveBeenCalledWith(
                    DEFAULT_ACCELERATORS.peekAndHide,
                    expect.any(Function)
                );

                expect(mockStore.set).toHaveBeenCalledWith('hotkeyPeekAndHide', true);
            });
        });

        describe('App restart simulation', () => {
            it('should load settings from store and register only enabled hotkeys', () => {
                mockStore._data.hotkeyAlwaysOnTop = false;
                mockStore._data.hotkeyPeekAndHide = true;
                mockStore._data.hotkeyQuickChat = true;
                mockStore._data.hotkeyVoiceChat = true;
                mockStore.get.mockImplementation((key: string) => mockStore._data[key]);

                const restartedHotkeyManager = new HotkeyManager(windowManager, {
                    alwaysOnTop: mockStore.get('hotkeyAlwaysOnTop') ?? true,
                    peekAndHide: mockStore.get('hotkeyPeekAndHide') ?? true,
                    quickChat: mockStore.get('hotkeyQuickChat') ?? true,
                    voiceChat: mockStore.get('hotkeyVoiceChat') ?? true,
                });

                vi.clearAllMocks();

                restartedHotkeyManager.registerShortcuts();

                const registerCalls = (globalShortcut.register as any).mock.calls;
                const registeredAccelerators = registerCalls.map((call: any) => call[0]);

                expect(registeredAccelerators).toContain(DEFAULT_ACCELERATORS.peekAndHide);

                expect(registeredAccelerators).toContain(DEFAULT_ACCELERATORS.quickChat);

                expect(registeredAccelerators).toContain(DEFAULT_ACCELERATORS.voiceChat);

                expect(registeredAccelerators).not.toContain(DEFAULT_ACCELERATORS.alwaysOnTop);

                expect(restartedHotkeyManager.isIndividualEnabled('alwaysOnTop')).toBe(false);
                expect(restartedHotkeyManager.isIndividualEnabled('peekAndHide')).toBe(true);
                expect(restartedHotkeyManager.isIndividualEnabled('quickChat')).toBe(true);
                expect(restartedHotkeyManager.isIndividualEnabled('voiceChat')).toBe(true);

                restartedHotkeyManager.unregisterAll();
            });

            it('should handle all hotkeys disabled on restart', () => {
                mockStore._data.hotkeyAlwaysOnTop = false;
                mockStore._data.hotkeyPeekAndHide = false;
                mockStore._data.hotkeyQuickChat = false;
                mockStore._data.hotkeyVoiceChat = false;
                mockStore.get.mockImplementation((key: string) => mockStore._data[key]);

                const restartedHotkeyManager = new HotkeyManager(windowManager, {
                    alwaysOnTop: false,
                    peekAndHide: false,
                    quickChat: false,
                    voiceChat: false,
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

                handler({}, 'peekAndHide', false);
                handler({}, 'peekAndHide', true);
                handler({}, 'peekAndHide', false);
                handler({}, 'peekAndHide', true);
                handler({}, 'peekAndHide', false);
                handler({}, 'peekAndHide', true);

                expect(hotkeyManager.isIndividualEnabled('peekAndHide')).toBe(true);

                const setCallsForPeekAndHide = (mockStore.set as any).mock.calls.filter(
                    (call: any) => call[0] === 'hotkeyPeekAndHide'
                );
                expect(setCallsForPeekAndHide.length).toBe(6);

                expect(setCallsForPeekAndHide[5][1]).toBe(true);

                const registerCalls = (globalShortcut.register as any).mock.calls;
                const peekAndHideRegisters = registerCalls.filter(
                    (call: any) => call[0] === DEFAULT_ACCELERATORS.peekAndHide
                );
                expect(peekAndHideRegisters.length).toBe(3);
            });

            it('should handle toggling all hotkeys rapidly', () => {
                hotkeyManager.registerShortcuts();
                vi.clearAllMocks();

                const handler = getListener('hotkeys:individual:set');

                ['alwaysOnTop', 'peekAndHide', 'quickChat', 'voiceChat'].forEach((hotkeyId) => {
                    handler({}, hotkeyId, false);
                    handler({}, hotkeyId, true);
                    handler({}, hotkeyId, false);
                });

                expect(hotkeyManager.isIndividualEnabled('alwaysOnTop')).toBe(false);
                expect(hotkeyManager.isIndividualEnabled('peekAndHide')).toBe(false);
                expect(hotkeyManager.isIndividualEnabled('quickChat')).toBe(false);

                expect(mockStore.set).toHaveBeenCalledWith('hotkeyAlwaysOnTop', false);
                expect(mockStore.set).toHaveBeenCalledWith('hotkeyPeekAndHide', false);
                expect(mockStore.set).toHaveBeenCalledWith('hotkeyQuickChat', false);
            });
        });

        describe('Peek & Hide Toggle Coordination', () => {
            it('should toggle: hide main window when visible', () => {
                const win = windowManager.createMainWindow();
                // Window starts visible by default in the mock
                expect(win.isVisible()).toBe(true);

                windowManager.toggleMainWindowVisibility();

                expect(win.isVisible()).toBe(false);
            });

            it('should toggle: restore main window when hidden', () => {
                const win = windowManager.createMainWindow();
                win.hide();
                expect(win.isVisible()).toBe(false);

                windowManager.toggleMainWindowVisibility();

                expect(win.isVisible()).toBe(true);
            });

            it('should complete a full toggle cycle: visible → hidden → visible', () => {
                const win = windowManager.createMainWindow();
                expect(win.isVisible()).toBe(true);

                // First press: visible → hidden
                windowManager.toggleMainWindowVisibility();
                expect(win.isVisible()).toBe(false);

                // Second press: hidden → visible
                windowManager.toggleMainWindowVisibility();
                expect(win.isVisible()).toBe(true);
            });

            it('should not affect quick chat window state when toggling main window', () => {
                const mainWin = windowManager.createMainWindow();
                const quickChatWin = windowManager.createQuickChatWindow();

                // Both visible initially
                expect(mainWin.isVisible()).toBe(true);
                expect(quickChatWin.isVisible()).toBe(true);

                // Toggle main window only
                windowManager.toggleMainWindowVisibility();

                // Main window should be hidden
                expect(mainWin.isVisible()).toBe(false);
                // Quick chat window is unaffected
                expect(quickChatWin.isVisible()).toBe(true);
            });

            it('should create main window when it does not exist (destroyed edge case)', () => {
                // No window created yet
                expect(windowManager.getMainWindow()).toBeNull();

                windowManager.toggleMainWindowVisibility();

                // A new window should have been created
                expect(windowManager.getMainWindow()).not.toBeNull();
            });
        });
    });
});
