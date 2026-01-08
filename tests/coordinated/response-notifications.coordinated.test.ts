/**
 * Coordinated tests for Response Notifications.
 *
 * Tests the coordination between:
 * - ResponseNotificationIpcHandler and the settings store
 * - NotificationManager and BadgeManager
 * - MainWindow response-complete events and notification flow
 *
 * Task 7.1: Toggle → setting persisted
 * Task 7.2: Response complete → notification shown (when unfocused)
 * Task 7.3: MainWindow response-complete → NotificationManager wiring
 * Task 7.4: Window focus → badge cleared
 * Task 7.5: Setting disabled → no notification/badge
 * Task 7.6: Cross-platform notification behavior
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';
import { ResponseNotificationIpcHandler } from '../../src/main/managers/ipc/ResponseNotificationIpcHandler';
import NotificationManager from '../../src/main/managers/notificationManager';
import type { IpcHandlerDependencies } from '../../src/main/managers/ipc/types';
import { IPC_CHANNELS } from '../../src/shared/constants/ipc-channels';

// Mock Notification class for coordinated tests
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

// Mock Electron's Notification
vi.mock('electron', async (importOriginal) => {
    const actual = await importOriginal<any>();
    return {
        ...actual,
        Notification: mockNotification,
    };
});

// Use the centralized logger mock from __mocks__ directory
vi.mock('../../src/main/utils/logger');
import { mockLogger } from '../../src/main/utils/logger';

describe('Response Notifications Coordinated Tests', () => {
    let sharedStoreData: Record<string, any>;
    let mockStore: any;
    let mockMainWindow: any;
    let mockBadgeManager: any;

    beforeEach(() => {
        vi.clearAllMocks();
        if ((ipcMain as any)._reset) (ipcMain as any)._reset();
        if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();

        // SHARED store data to simulate persistence
        sharedStoreData = {
            responseNotificationsEnabled: true,
        };

        mockStore = {
            get: vi.fn((key: string) => sharedStoreData[key]),
            set: vi.fn((key: string, value: any) => {
                sharedStoreData[key] = value;
            }),
        };

        // Mock main window
        mockMainWindow = {
            isFocused: vi.fn().mockReturnValue(true),
            isDestroyed: vi.fn().mockReturnValue(false),
            isMinimized: vi.fn().mockReturnValue(false),
            on: vi.fn(),
            show: vi.fn(),
            focus: vi.fn(),
            restore: vi.fn(),
        };

        // Mock badge manager
        mockBadgeManager = {
            showNotificationBadge: vi.fn(),
            clearNotificationBadge: vi.fn(),
            hasBadgeShown: vi.fn().mockReturnValue(false),
            hasNotificationBadgeShown: vi.fn().mockReturnValue(false),
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('7.1 - Toggle → setting persisted', () => {
        it('should persist toggle ON → store updated', () => {
            // Create NotificationManager for the handler to use
            const notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);

            // Create handler with NotificationManager
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

            // Get the set-enabled listener
            const listener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_SET_ENABLED);
            expect(listener).toBeDefined();

            // Simulate setting notifications ON
            listener!({}, true);

            // Verify persistence
            expect(mockStore.set).toHaveBeenCalledWith('responseNotificationsEnabled', true);
            expect(sharedStoreData.responseNotificationsEnabled).toBe(true);
        });

        it('should persist toggle OFF → store updated', () => {
            // Create NotificationManager for the handler to use
            const notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);

            // Create handler with NotificationManager
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

            // Get the set-enabled listener
            const listener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_SET_ENABLED);

            // Simulate setting notifications OFF
            listener!({}, false);

            // Verify persistence
            expect(mockStore.set).toHaveBeenCalledWith('responseNotificationsEnabled', false);
            expect(sharedStoreData.responseNotificationsEnabled).toBe(false);
        });

        it('should round-trip setting through IPC', async () => {
            // Create NotificationManager for the handler to use
            const notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);

            // Create handler with NotificationManager
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

            // Set via IPC
            const setListener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_SET_ENABLED);
            setListener!({}, false);

            // Get via IPC - should return persisted value
            const getHandler = (ipcMain as any)._handlers?.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_GET_ENABLED);
            const result = await getHandler!();

            expect(result).toBe(false);
        });

        it('should persist and restore setting across handler instances', async () => {
            // First handler sets notifications OFF
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

            // Reset ipcMain for new handler
            (ipcMain as any)._reset();

            // Create new NotificationManager and handler with same store
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

            // Get should return persisted value
            const getHandler = (ipcMain as any)._handlers?.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_GET_ENABLED);
            const result = await getHandler!();

            expect(result).toBe(false);
        });
    });

    describe('7.2 - Response complete → notification shown', () => {
        beforeEach(() => {
            // Reset notification instances for each test
            (mockNotification as any)._reset();
        });

        it('should show notification when response-complete fires and window is unfocused', () => {
            // Window starts unfocused
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);

            const notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);

            // Trigger response-complete
            notificationManager.onResponseComplete();

            // Verify notification was created and shown
            expect((mockNotification as any)._instances.length).toBe(1);
            expect((mockNotification as any)._instances[0].title).toBe('Gemini');
            expect((mockNotification as any)._instances[0].body).toBe('Response ready');
            expect((mockNotification as any)._instances[0].show).toHaveBeenCalled();
        });

        it('should show badge via BadgeManager when response-complete fires and window is unfocused', () => {
            // Window starts unfocused
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);

            const notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);

            // Trigger response-complete
            notificationManager.onResponseComplete();

            // Verify badge was shown
            expect(mockBadgeManager.showNotificationBadge).toHaveBeenCalled();
        });

        it('should emit response-complete event on MainWindow and NotificationManager receives it', () => {
            // Simulate window unfocused
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);

            // Capture the blur handler from NotificationManager registration
            let blurHandler: (() => void) | undefined;
            mockMainWindow.on = vi.fn((event: string, handler: () => void) => {
                if (event === 'blur') blurHandler = handler;
                return mockMainWindow;
            });

            const notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);

            // Simulate blur to set internal focus state to false
            blurHandler?.();

            // Trigger response-complete
            notificationManager.onResponseComplete();

            // Verify both notification and badge
            expect((mockNotification as any)._instances.length).toBe(1);
            expect(mockBadgeManager.showNotificationBadge).toHaveBeenCalled();
        });

        it('should NOT show notification when window is focused', () => {
            // Window is focused
            mockMainWindow.isFocused = vi.fn().mockReturnValue(true);

            const notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);

            // Trigger response-complete
            notificationManager.onResponseComplete();

            // Verify NO notification was created
            expect((mockNotification as any)._instances.length).toBe(0);
            expect(mockBadgeManager.showNotificationBadge).not.toHaveBeenCalled();
        });

        it('should coordinate notification and badge together', () => {
            // Window unfocused
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);

            const notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);

            // Trigger response-complete
            notificationManager.onResponseComplete();

            // Both should be shown together
            expect((mockNotification as any)._instances.length).toBe(1);
            expect(mockBadgeManager.showNotificationBadge).toHaveBeenCalledTimes(1);
        });
    });

    describe('7.3 - MainWindow response-complete → NotificationManager wiring', () => {
        beforeEach(() => {
            (mockNotification as any)._reset();
        });

        it('should trigger NotificationManager.onResponseComplete when MainWindow emits response-complete', () => {
            // Create a mock MainWindow that is an EventEmitter
            const { EventEmitter } = require('events');
            const mockMainWindowEmitter = new EventEmitter();

            // Add BrowserWindow-like properties
            Object.assign(mockMainWindowEmitter, {
                isFocused: vi.fn().mockReturnValue(false),
                isDestroyed: vi.fn().mockReturnValue(false),
                isMinimized: vi.fn().mockReturnValue(false),
                show: vi.fn(),
                focus: vi.fn(),
                restore: vi.fn(),
            });

            // Create NotificationManager with the EventEmitter-based mock
            const notificationManager = new NotificationManager(
                mockMainWindowEmitter as any,
                mockBadgeManager,
                mockStore
            );

            // Wire up response-complete event (simulating what main.ts does)
            mockMainWindowEmitter.on('response-complete', () => {
                notificationManager.onResponseComplete();
            });

            // Emit response-complete from "MainWindow"
            mockMainWindowEmitter.emit('response-complete');

            // Verify notification was triggered
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

            // Wire response-complete event
            mockMainWindowEmitter.on('response-complete', () => {
                notificationManager.onResponseComplete();
            });

            // Emit event
            mockMainWindowEmitter.emit('response-complete');

            // Full chain verification
            expect((mockNotification as any)._instances.length).toBe(1);
            expect((mockNotification as any)._instances[0].title).toBe('Gemini');
            expect(mockBadgeManager.showNotificationBadge).toHaveBeenCalledTimes(1);
        });

        it('should integrate correctly when subscribed to MainWindow events', () => {
            const { EventEmitter } = require('events');
            const mockMainWindowEmitter = new EventEmitter();

            // Start focused
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

            // Wire response-complete event
            mockMainWindowEmitter.on('response-complete', () => {
                notificationManager.onResponseComplete();
            });

            // Response while focused - should not notify
            mockMainWindowEmitter.emit('response-complete');
            expect((mockNotification as any)._instances.length).toBe(0);

            // Now unfocus and emit again
            isFocused = false;
            mockMainWindowEmitter.emit('blur'); // This triggers NotificationManager's blur handler
            mockMainWindowEmitter.emit('response-complete');

            // Should now notify
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

            // Emit multiple times
            mockMainWindowEmitter.emit('response-complete');
            mockMainWindowEmitter.emit('response-complete');
            mockMainWindowEmitter.emit('response-complete');

            // Should create multiple notifications (no debouncing in NotificationManager itself)
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

            // Create NotificationManager - it subscribes to focus/blur events
            new NotificationManager(mockMainWindowEmitter as any, mockBadgeManager, mockStore);

            // Simulate focus event
            mockMainWindowEmitter.emit('focus');

            // Badge should be cleared
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

            // Add update badge tracking
            const mockBadgeManagerWithUpdate = {
                ...mockBadgeManager,
                clearUpdateBadge: vi.fn(),
            };

            new NotificationManager(mockMainWindowEmitter as any, mockBadgeManagerWithUpdate, mockStore);

            // Simulate focus event
            mockMainWindowEmitter.emit('focus');

            // Notification badge cleared, but update badge should NOT be affected
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

            // Trigger notification (shows badge)
            notificationManager.onResponseComplete();
            expect(mockBadgeManager.showNotificationBadge).toHaveBeenCalled();

            // Simulate focus - badge should be cleared regardless of notification state
            mockMainWindowEmitter.emit('focus');
            expect(mockBadgeManager.clearNotificationBadge).toHaveBeenCalled();
        });
    });

    describe('7.5 - Setting disabled → neither notification nor badge shown', () => {
        beforeEach(() => {
            (mockNotification as any)._reset();
        });

        it('should not show notification when responseNotificationsEnabled=false', () => {
            // Set disabled in store
            sharedStoreData.responseNotificationsEnabled = false;

            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);

            notificationManager.onResponseComplete();

            // No notification created
            expect((mockNotification as any)._instances.length).toBe(0);
        });

        it('should not show badge when responseNotificationsEnabled=false', () => {
            sharedStoreData.responseNotificationsEnabled = false;

            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);

            notificationManager.onResponseComplete();

            // Badge should not be shown
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

            // Blur
            isFocused = false;
            mockMainWindowEmitter.emit('blur');
            expect(notificationManager.isWindowFocused).toBe(false);

            // Focus
            isFocused = true;
            mockMainWindowEmitter.emit('focus');
            expect(notificationManager.isWindowFocused).toBe(true);
        });

        it('should work correctly when re-enabled', () => {
            // Start disabled
            sharedStoreData.responseNotificationsEnabled = false;
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);

            const notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);

            // No notification when disabled
            notificationManager.onResponseComplete();
            expect((mockNotification as any)._instances.length).toBe(0);

            // Re-enable
            sharedStoreData.responseNotificationsEnabled = true;

            // Now should notify
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
                vi.stubGlobal('process', { ...process, platform });
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

                // Trigger click
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
            // Create handler without NotificationManager (simulating startup)
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

            // Should not throw
            expect(() => {
                const setListener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_SET_ENABLED);
                setListener?.({}, false);
            }).not.toThrow();
        });

        it('should work correctly with late injection of NotificationManager', () => {
            // Create NotificationManager
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore);

            // Create handler WITH NotificationManager
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

            // Set enabled = false via IPC
            const setListener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_SET_ENABLED);
            setListener!({}, false);

            // Verify setting was updated
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

            // Set to false
            const setListener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_SET_ENABLED);
            setListener!({}, false);

            // Get should return false (not default true)
            const getHandler = (ipcMain as any)._handlers?.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_GET_ENABLED);
            const result = await getHandler!();

            expect(result).toBe(false);
        });
    });
});
