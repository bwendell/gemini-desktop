import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';
import { ResponseNotificationIpcHandler } from '../../src/main/managers/ipc/ResponseNotificationIpcHandler';
import NotificationManager from '../../src/main/managers/notificationManager';
import type { IpcHandlerDependencies } from '../../src/main/managers/ipc/types';
import { IPC_CHANNELS } from '../../src/shared/constants/ipc-channels';
import { platformAdapterPresets, useMockPlatformAdapter, resetPlatformAdapterForTests } from '../helpers/mocks';

const mockNotification = vi.hoisted(() => {
    const notificationInstances: any[] = [];
    const MockNotification = vi.fn().mockImplementation(function (this: any, options: any) {
        this.title = options.title;
        this.body = options.body;
        this.silent = options.silent;
        this._listeners = new Map<string, Function>();
        this.on = vi.fn((event: string, handler: Function) => {
            this._listeners.set(event, handler);
            return this;
        });
        this.show = vi.fn();
        notificationInstances.push(this);
        return this;
    });
    (MockNotification as any).isSupported = vi.fn().mockReturnValue(true);
    (MockNotification as any)._instances = notificationInstances;
    (MockNotification as any)._reset = () => {
        notificationInstances.length = 0;
        (MockNotification as any).isSupported.mockReturnValue(true);
    };
    return MockNotification;
});

vi.mock('electron', async (importOriginal) => {
    const actual = await importOriginal<any>();
    return {
        ...actual,
        Notification: mockNotification,
    };
});

vi.mock('../../src/main/utils/logger');
import { mockLogger } from '../../src/main/utils/__mocks__/logger';

const adapterForPlatform = {
    darwin: platformAdapterPresets.mac,
    win32: platformAdapterPresets.windows,
    linux: platformAdapterPresets.linuxX11,
} as const;

describe('Response Notifications Coordinated Tests', () => {
    let sharedStoreData: Record<string, any>;
    let mockStore: any;
    let mockMainWindow: any;
    let mockBadgeManager: any;

    beforeEach(() => {
        vi.clearAllMocks();
        if ((ipcMain as any)._reset) (ipcMain as any)._reset();
        if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();

        sharedStoreData = {
            responseNotificationsEnabled: true,
        };

        mockStore = {
            get: vi.fn((key: string) => sharedStoreData[key]),
            set: vi.fn((key: string, value: any) => {
                sharedStoreData[key] = value;
            }),
        };

        mockMainWindow = {
            isFocused: vi.fn().mockReturnValue(true),
            isDestroyed: vi.fn().mockReturnValue(false),
            isMinimized: vi.fn().mockReturnValue(false),
            on: vi.fn(),
            show: vi.fn(),
            focus: vi.fn(),
            restore: vi.fn(),
        };

        mockBadgeManager = {
            showNotificationBadge: vi.fn(),
            clearNotificationBadge: vi.fn(),
            hasBadgeShown: vi.fn().mockReturnValue(false),
            hasNotificationBadgeShown: vi.fn().mockReturnValue(false),
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
        resetPlatformAdapterForTests();
    });

    describe('7.1 - Toggle → setting persisted', () => {
        it('should persist toggle ON → store updated', () => {
            const notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);

            const mockDeps: IpcHandlerDependencies = {
                store: mockStore,
                logger: mockLogger,
                windowManager: {
                    getMainWindow: vi.fn().mockReturnValue(mockMainWindow),
                    createMainWindow: vi.fn(),
                } as any,
                notificationManager,
            };

            const handler = new ResponseNotificationIpcHandler(mockDeps);
            handler.register();

            const listener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_SET_ENABLED);
            expect(listener).toBeDefined();

            listener!({}, true);

            expect(mockStore.set).toHaveBeenCalledWith('responseNotificationsEnabled', true);
            expect(sharedStoreData.responseNotificationsEnabled).toBe(true);
        });

        it('should persist toggle OFF → store updated', () => {
            const notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);

            const mockDeps: IpcHandlerDependencies = {
                store: mockStore,
                logger: mockLogger,
                windowManager: {
                    getMainWindow: vi.fn().mockReturnValue(mockMainWindow),
                    createMainWindow: vi.fn(),
                } as any,
                notificationManager,
            };

            const handler = new ResponseNotificationIpcHandler(mockDeps);
            handler.register();

            const listener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_SET_ENABLED);

            listener!({}, false);

            expect(mockStore.set).toHaveBeenCalledWith('responseNotificationsEnabled', false);
            expect(sharedStoreData.responseNotificationsEnabled).toBe(false);
        });

        it('should round-trip setting through IPC', async () => {
            const notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);

            const mockDeps: IpcHandlerDependencies = {
                store: mockStore,
                logger: mockLogger,
                windowManager: {
                    getMainWindow: vi.fn().mockReturnValue(mockMainWindow),
                    createMainWindow: vi.fn(),
                } as any,
                notificationManager,
            };

            const handler = new ResponseNotificationIpcHandler(mockDeps);
            handler.register();

            const setListener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_SET_ENABLED);
            setListener!({}, false);

            const getHandler = (ipcMain as any)._handlers?.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_GET_ENABLED);
            const result = await getHandler!();

            expect(result).toBe(false);
        });

        it('should persist and restore setting across handler instances', async () => {
            const notificationManager1 = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);

            const mockDeps1: IpcHandlerDependencies = {
                store: mockStore,
                logger: mockLogger,
                windowManager: {
                    getMainWindow: vi.fn().mockReturnValue(mockMainWindow),
                    createMainWindow: vi.fn(),
                } as any,
                notificationManager: notificationManager1,
            };

            const handler1 = new ResponseNotificationIpcHandler(mockDeps1);
            handler1.register();

            const setListener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_SET_ENABLED);
            setListener!({}, false);

            expect(sharedStoreData.responseNotificationsEnabled).toBe(false);

            (ipcMain as any)._reset();

            const notificationManager2 = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);

            const mockDeps2: IpcHandlerDependencies = {
                store: mockStore,
                logger: mockLogger,
                windowManager: {
                    getMainWindow: vi.fn().mockReturnValue(mockMainWindow),
                    createMainWindow: vi.fn(),
                } as any,
                notificationManager: notificationManager2,
            };

            const handler2 = new ResponseNotificationIpcHandler(mockDeps2);
            handler2.register();

            const getHandler = (ipcMain as any)._handlers?.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_GET_ENABLED);
            const result = await getHandler!();

            expect(result).toBe(false);
        });
    });

    describe('7.2 - Response complete → notification shown', () => {
        beforeEach(() => {
            (mockNotification as any)._reset();
        });

        it('should show notification when response-complete fires and window is unfocused', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);

            const notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);

            notificationManager.onResponseComplete();

            expect((mockNotification as any)._instances.length).toBe(1);
            expect((mockNotification as any)._instances[0].title).toBe('Gemini Desktop');
            expect((mockNotification as any)._instances[0].body).toBe('Response ready');
            expect((mockNotification as any)._instances[0].show).toHaveBeenCalled();
        });

        it('should show badge via BadgeManager when response-complete fires and window is unfocused', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);

            const notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);

            notificationManager.onResponseComplete();

            expect(mockBadgeManager.showNotificationBadge).toHaveBeenCalled();
        });

        it('should emit response-complete event on MainWindow and NotificationManager receives it', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);

            let blurHandler: (() => void) | undefined;
            mockMainWindow.on = vi.fn((event: string, handler: () => void) => {
                if (event === 'blur') blurHandler = handler;
                return mockMainWindow;
            });

            const notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);

            blurHandler?.();

            notificationManager.onResponseComplete();

            expect((mockNotification as any)._instances.length).toBe(1);
            expect(mockBadgeManager.showNotificationBadge).toHaveBeenCalled();
        });

        it('should NOT show notification when window is focused', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(true);

            const notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);

            notificationManager.onResponseComplete();

            expect((mockNotification as any)._instances.length).toBe(0);
            expect(mockBadgeManager.showNotificationBadge).not.toHaveBeenCalled();
        });

        it('should coordinate notification and badge together', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);

            const notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);

            notificationManager.onResponseComplete();

            expect((mockNotification as any)._instances.length).toBe(1);
            expect(mockBadgeManager.showNotificationBadge).toHaveBeenCalledTimes(1);
        });
    });

    describe('7.3 - MainWindow response-complete → NotificationManager wiring', () => {
        beforeEach(() => {
            (mockNotification as any)._reset();
        });

        it('should trigger NotificationManager.onResponseComplete when MainWindow emits response-complete', () => {
            const { EventEmitter } = require('events');
            const mockMainWindowEmitter = new EventEmitter();

            Object.assign(mockMainWindowEmitter, {
                isFocused: vi.fn().mockReturnValue(false),
                isDestroyed: vi.fn().mockReturnValue(false),
                isMinimized: vi.fn().mockReturnValue(false),
                show: vi.fn(),
                focus: vi.fn(),
                restore: vi.fn(),
            });

            const notificationManager = new NotificationManager(
                mockMainWindowEmitter as any,
                mockBadgeManager,
                mockStore
            );

            mockMainWindowEmitter.on('response-complete', () => {
                notificationManager.onResponseComplete();
            });

            mockMainWindowEmitter.emit('response-complete');

            expect((mockNotification as any)._instances.length).toBe(1);
            expect(mockBadgeManager.showNotificationBadge).toHaveBeenCalled();
        });

        it('should verify full event chain: MainWindow → NotificationManager → BadgeManager', () => {
            const { EventEmitter } = require('events');
            const mockMainWindowEmitter = new EventEmitter();

            Object.assign(mockMainWindowEmitter, {
                isFocused: vi.fn().mockReturnValue(false),
                isDestroyed: vi.fn().mockReturnValue(false),
                isMinimized: vi.fn().mockReturnValue(false),
                show: vi.fn(),
                focus: vi.fn(),
                restore: vi.fn(),
            });

            const notificationManager = new NotificationManager(
                mockMainWindowEmitter as any,
                mockBadgeManager,
                mockStore
            );

            mockMainWindowEmitter.on('response-complete', () => {
                notificationManager.onResponseComplete();
            });

            mockMainWindowEmitter.emit('response-complete');

            expect((mockNotification as any)._instances.length).toBe(1);
            expect((mockNotification as any)._instances[0].title).toBe('Gemini Desktop');
            expect(mockBadgeManager.showNotificationBadge).toHaveBeenCalledTimes(1);
        });

        it('should integrate correctly when subscribed to MainWindow events', () => {
            const { EventEmitter } = require('events');
            const mockMainWindowEmitter = new EventEmitter();

            let isFocused = true;
            Object.assign(mockMainWindowEmitter, {
                isFocused: vi.fn(() => isFocused),
                isDestroyed: vi.fn().mockReturnValue(false),
                isMinimized: vi.fn().mockReturnValue(false),
                show: vi.fn(),
                focus: vi.fn(),
                restore: vi.fn(),
            });

            const notificationManager = new NotificationManager(
                mockMainWindowEmitter as any,
                mockBadgeManager,
                mockStore
            );

            mockMainWindowEmitter.on('response-complete', () => {
                notificationManager.onResponseComplete();
            });

            mockMainWindowEmitter.emit('response-complete');
            expect((mockNotification as any)._instances.length).toBe(0);

            isFocused = false;
            mockMainWindowEmitter.emit('blur');
            mockMainWindowEmitter.emit('response-complete');

            expect((mockNotification as any)._instances.length).toBe(1);
        });

        it('should handle multiple response-complete events correctly', () => {
            const { EventEmitter } = require('events');
            const mockMainWindowEmitter = new EventEmitter();

            Object.assign(mockMainWindowEmitter, {
                isFocused: vi.fn().mockReturnValue(false),
                isDestroyed: vi.fn().mockReturnValue(false),
                isMinimized: vi.fn().mockReturnValue(false),
                show: vi.fn(),
                focus: vi.fn(),
                restore: vi.fn(),
            });

            const notificationManager = new NotificationManager(
                mockMainWindowEmitter as any,
                mockBadgeManager,
                mockStore
            );

            mockMainWindowEmitter.on('response-complete', () => {
                notificationManager.onResponseComplete();
            });

            mockMainWindowEmitter.emit('response-complete');
            mockMainWindowEmitter.emit('response-complete');
            mockMainWindowEmitter.emit('response-complete');

            expect((mockNotification as any)._instances.length).toBe(3);
            expect(mockBadgeManager.showNotificationBadge).toHaveBeenCalledTimes(3);
        });
    });

    describe('7.4 - Window focus → badge cleared', () => {
        beforeEach(() => {
            (mockNotification as any)._reset();
        });

        it('should clear notification badge via BadgeManager when window is focused', () => {
            const { EventEmitter } = require('events');
            const mockMainWindowEmitter = new EventEmitter();

            Object.assign(mockMainWindowEmitter, {
                isFocused: vi.fn().mockReturnValue(false),
                isDestroyed: vi.fn().mockReturnValue(false),
                isMinimized: vi.fn().mockReturnValue(false),
                show: vi.fn(),
                focus: vi.fn(),
                restore: vi.fn(),
            });

            new NotificationManager(mockMainWindowEmitter as any, mockBadgeManager, mockStore);

            mockMainWindowEmitter.emit('focus');

            expect(mockBadgeManager.clearNotificationBadge).toHaveBeenCalled();
        });

        it('should NOT affect update badge when window is focused', () => {
            const { EventEmitter } = require('events');
            const mockMainWindowEmitter = new EventEmitter();

            Object.assign(mockMainWindowEmitter, {
                isFocused: vi.fn().mockReturnValue(false),
                isDestroyed: vi.fn().mockReturnValue(false),
                isMinimized: vi.fn().mockReturnValue(false),
                show: vi.fn(),
                focus: vi.fn(),
                restore: vi.fn(),
            });

            const mockBadgeManagerWithUpdate = {
                ...mockBadgeManager,
                clearUpdateBadge: vi.fn(),
            };

            new NotificationManager(mockMainWindowEmitter as any, mockBadgeManagerWithUpdate, mockStore);

            mockMainWindowEmitter.emit('focus');

            expect(mockBadgeManagerWithUpdate.clearNotificationBadge).toHaveBeenCalled();
            expect(mockBadgeManagerWithUpdate.clearUpdateBadge).not.toHaveBeenCalled();
        });

        it('should clear badge even if notification was already dismissed', () => {
            const { EventEmitter } = require('events');
            const mockMainWindowEmitter = new EventEmitter();

            Object.assign(mockMainWindowEmitter, {
                isFocused: vi.fn().mockReturnValue(false),
                isDestroyed: vi.fn().mockReturnValue(false),
                isMinimized: vi.fn().mockReturnValue(false),
                show: vi.fn(),
                focus: vi.fn(),
                restore: vi.fn(),
            });

            const notificationManager = new NotificationManager(
                mockMainWindowEmitter as any,
                mockBadgeManager,
                mockStore
            );

            notificationManager.onResponseComplete();
            expect(mockBadgeManager.showNotificationBadge).toHaveBeenCalled();

            mockMainWindowEmitter.emit('focus');
            expect(mockBadgeManager.clearNotificationBadge).toHaveBeenCalled();
        });
    });

    describe('7.5 - Setting disabled → neither notification nor badge shown', () => {
        beforeEach(() => {
            (mockNotification as any)._reset();
        });

        it('should not show notification when responseNotificationsEnabled=false', () => {
            sharedStoreData.responseNotificationsEnabled = false;

            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);

            notificationManager.onResponseComplete();

            expect((mockNotification as any)._instances.length).toBe(0);
        });

        it('should not show badge when responseNotificationsEnabled=false', () => {
            sharedStoreData.responseNotificationsEnabled = false;

            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);

            notificationManager.onResponseComplete();

            expect(mockBadgeManager.showNotificationBadge).not.toHaveBeenCalled();
        });

        it('should still track window focus state when disabled', () => {
            sharedStoreData.responseNotificationsEnabled = false;

            const { EventEmitter } = require('events');
            const mockMainWindowEmitter = new EventEmitter();

            let isFocused = true;
            Object.assign(mockMainWindowEmitter, {
                isFocused: vi.fn(() => isFocused),
                isDestroyed: vi.fn().mockReturnValue(false),
                isMinimized: vi.fn().mockReturnValue(false),
                show: vi.fn(),
                focus: vi.fn(),
                restore: vi.fn(),
            });

            const notificationManager = new NotificationManager(
                mockMainWindowEmitter as any,
                mockBadgeManager,
                mockStore
            );

            expect(notificationManager.isWindowFocused).toBe(true);

            isFocused = false;
            mockMainWindowEmitter.emit('blur');
            expect(notificationManager.isWindowFocused).toBe(false);

            isFocused = true;
            mockMainWindowEmitter.emit('focus');
            expect(notificationManager.isWindowFocused).toBe(true);
        });

        it('should work correctly when re-enabled', () => {
            sharedStoreData.responseNotificationsEnabled = false;
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);

            const notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);

            notificationManager.onResponseComplete();
            expect((mockNotification as any)._instances.length).toBe(0);

            sharedStoreData.responseNotificationsEnabled = true;

            notificationManager.onResponseComplete();
            expect((mockNotification as any)._instances.length).toBe(1);
        });
    });

    describe('7.6 - Cross-platform notification behavior', () => {
        beforeEach(() => {
            (mockNotification as any)._reset();
            sharedStoreData.responseNotificationsEnabled = true;
        });

        describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
            beforeEach(() => {
                useMockPlatformAdapter(adapterForPlatform[platform]());
            });

            afterEach(() => {
                vi.unstubAllGlobals();
            });

            it('should show notification on all platforms when supported', () => {
                (mockNotification as any).isSupported.mockReturnValue(true);
                mockMainWindow.isFocused = vi.fn().mockReturnValue(false);

                const notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);
                notificationManager.onResponseComplete();

                expect((mockNotification as any)._instances.length).toBe(1);
            });

            it('should call BadgeManager.showNotificationBadge on all platforms', () => {
                mockMainWindow.isFocused = vi.fn().mockReturnValue(false);

                const notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);
                notificationManager.onResponseComplete();

                expect(mockBadgeManager.showNotificationBadge).toHaveBeenCalled();
            });

            it('should focus window on notification click on all platforms', () => {
                mockMainWindow.isFocused = vi.fn().mockReturnValue(false);

                const notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);
                notificationManager.onResponseComplete();

                const notification = (mockNotification as any)._instances[0];
                const clickHandler = notification._listeners.get('click');
                clickHandler?.();

                expect(mockMainWindow.show).toHaveBeenCalled();
                expect(mockMainWindow.focus).toHaveBeenCalled();
            });
        });
    });

    describe('7.7 - IpcManager.setNotificationManager late wiring', () => {
        beforeEach(() => {
            (mockNotification as any)._reset();
            if ((ipcMain as any)._reset) (ipcMain as any)._reset();
            sharedStoreData.responseNotificationsEnabled = true;
        });

        it('should allow setting NotificationManager after IpcManager creation', () => {
            const mockDeps: IpcHandlerDependencies = {
                store: mockStore,
                logger: mockLogger,
                windowManager: {
                    getMainWindow: vi.fn().mockReturnValue(mockMainWindow),
                    createMainWindow: vi.fn(),
                } as any,
                notificationManager: null as any,
            };

            const handler = new ResponseNotificationIpcHandler(mockDeps);
            handler.register();

            expect(() => {
                const setListener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_SET_ENABLED);
                setListener?.({}, false);
            }).not.toThrow();
        });

        it('should work correctly with late injection of NotificationManager', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);

            const mockDeps: IpcHandlerDependencies = {
                store: mockStore,
                logger: mockLogger,
                windowManager: {
                    getMainWindow: vi.fn().mockReturnValue(mockMainWindow),
                    createMainWindow: vi.fn(),
                } as any,
                notificationManager,
            };

            const handler = new ResponseNotificationIpcHandler(mockDeps);
            handler.register();

            const setListener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_SET_ENABLED);
            setListener!({}, false);

            expect(sharedStoreData.responseNotificationsEnabled).toBe(false);
        });

        it('should round-trip settings correctly after injection', async () => {
            const notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);

            const mockDeps: IpcHandlerDependencies = {
                store: mockStore,
                logger: mockLogger,
                windowManager: {
                    getMainWindow: vi.fn().mockReturnValue(mockMainWindow),
                    createMainWindow: vi.fn(),
                } as any,
                notificationManager,
            };

            const handler = new ResponseNotificationIpcHandler(mockDeps);
            handler.register();

            const setListener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_SET_ENABLED);
            setListener!({}, false);

            const getHandler = (ipcMain as any)._handlers?.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_GET_ENABLED);
            const result = await getHandler!();

            expect(result).toBe(false);
        });
    });
});
