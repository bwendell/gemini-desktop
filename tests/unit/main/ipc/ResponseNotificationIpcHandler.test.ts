/**
 * Unit tests for ResponseNotificationIpcHandler.
 * Tests get/set handlers for response notification settings.
 *
 * @module ResponseNotificationIpcHandler.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResponseNotificationIpcHandler } from '../../../../src/main/managers/ipc/ResponseNotificationIpcHandler';
import type { IpcHandlerDependencies } from '../../../../src/main/managers/ipc/types';
import { createMockLogger, createMockWindowManager, createMockStore } from '../../../helpers/mocks';
import { IPC_CHANNELS } from '../../../../src/shared/constants/ipc-channels';

// Mock Electron
const { mockIpcMain } = vi.hoisted(() => {
    const mockIpcMain = {
        on: vi.fn((channel, listener) => {
            mockIpcMain._listeners.set(channel, listener);
        }),
        handle: vi.fn((channel, handler) => {
            mockIpcMain._handlers.set(channel, handler);
        }),
        _listeners: new Map<string, Function>(),
        _handlers: new Map<string, Function>(),
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

describe('ResponseNotificationIpcHandler', () => {
    let handler: ResponseNotificationIpcHandler;
    let mockDeps: IpcHandlerDependencies;
    let mockLogger: ReturnType<typeof createMockLogger>;
    let mockStore: ReturnType<typeof createMockStore>;
    let mockNotificationManager: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockIpcMain._reset();

        mockLogger = createMockLogger();
        mockStore = createMockStore({ responseNotificationsEnabled: true });
        mockNotificationManager = {
            isEnabled: vi.fn().mockReturnValue(true),
            setEnabled: vi.fn(),
            onResponseComplete: vi.fn(),
        };
        mockDeps = {
            store: mockStore,
            logger: mockLogger,
            windowManager: createMockWindowManager(),
        };

        handler = new ResponseNotificationIpcHandler({
            ...mockDeps,
            notificationManager: mockNotificationManager,
        });
    });

    describe('register', () => {
        it('registers get-enabled handler', () => {
            handler.register();

            expect(mockIpcMain.handle).toHaveBeenCalledWith(
                IPC_CHANNELS.RESPONSE_NOTIFICATIONS_GET_ENABLED,
                expect.any(Function)
            );
            expect(mockIpcMain._handlers.has(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_GET_ENABLED)).toBe(true);
        });

        it('registers set-enabled listener', () => {
            handler.register();

            expect(mockIpcMain.on).toHaveBeenCalledWith(
                IPC_CHANNELS.RESPONSE_NOTIFICATIONS_SET_ENABLED,
                expect.any(Function)
            );
            expect(mockIpcMain._listeners.has(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_SET_ENABLED)).toBe(true);
        });

        it('registers dev trigger notification listener', () => {
            handler.register();

            expect(mockIpcMain.on).toHaveBeenCalledWith(
                IPC_CHANNELS.DEV_TEST_TRIGGER_RESPONSE_NOTIFICATION,
                expect.any(Function)
            );
            expect(mockIpcMain._listeners.has(IPC_CHANNELS.DEV_TEST_TRIGGER_RESPONSE_NOTIFICATION)).toBe(true);
        });
    });

    describe('response-notifications:get-enabled handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('returns true when notifications are enabled', () => {
            mockNotificationManager.isEnabled.mockReturnValue(true);

            const getHandler = mockIpcMain._handlers.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_GET_ENABLED);
            const result = getHandler!();

            expect(result).toBe(true);
            expect(mockNotificationManager.isEnabled).toHaveBeenCalled();
        });

        it('returns false when notifications are disabled', () => {
            mockNotificationManager.isEnabled.mockReturnValue(false);

            const getHandler = mockIpcMain._handlers.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_GET_ENABLED);
            const result = getHandler!();

            expect(result).toBe(false);
        });

        it('returns true as default when NotificationManager is not available', () => {
            const handlerWithoutManager = new ResponseNotificationIpcHandler(mockDeps);
            handlerWithoutManager.register();

            const getHandler = mockIpcMain._handlers.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_GET_ENABLED);
            const result = getHandler!();

            expect(result).toBe(true);
        });

        it('returns true as fallback on error', () => {
            mockNotificationManager.isEnabled.mockImplementation(() => {
                throw new Error('Test error');
            });

            const getHandler = mockIpcMain._handlers.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_GET_ENABLED);
            const result = getHandler!();

            expect(result).toBe(true);
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('response-notifications:set-enabled handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('calls NotificationManager.setEnabled with true', () => {
            const setListener = mockIpcMain._listeners.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_SET_ENABLED);
            setListener!({}, true);

            expect(mockNotificationManager.setEnabled).toHaveBeenCalledWith(true);
        });

        it('calls NotificationManager.setEnabled with false', () => {
            const setListener = mockIpcMain._listeners.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_SET_ENABLED);
            setListener!({}, false);

            expect(mockNotificationManager.setEnabled).toHaveBeenCalledWith(false);
        });

        it('logs the change', () => {
            const setListener = mockIpcMain._listeners.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_SET_ENABLED);
            setListener!({}, true);

            expect(mockLogger.log).toHaveBeenCalledWith('Response notifications enabled');
        });

        it('rejects non-boolean values', () => {
            const setListener = mockIpcMain._listeners.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_SET_ENABLED);
            setListener!({}, 'true' as any);

            expect(mockNotificationManager.setEnabled).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith('Invalid enabled value: true');
        });

        it('handles missing NotificationManager gracefully', () => {
            const handlerWithoutManager = new ResponseNotificationIpcHandler(mockDeps);
            handlerWithoutManager.register();

            const setListener = mockIpcMain._listeners.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_SET_ENABLED);
            expect(() => setListener!({}, true)).not.toThrow();
            expect(mockLogger.warn).toHaveBeenCalledWith('NotificationManager not available');
        });

        it('logs error on exception', () => {
            mockNotificationManager.setEnabled.mockImplementation(() => {
                throw new Error('Test error');
            });

            const setListener = mockIpcMain._listeners.get(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_SET_ENABLED);
            setListener!({}, true);

            expect(mockLogger.error).toHaveBeenCalledWith('Error setting response notifications enabled:', {
                error: 'Test error',
                requestedEnabled: true,
            });
        });
    });

    describe('dev:test:trigger-response-notification handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('calls NotificationManager.onResponseComplete', () => {
            const triggerListener = mockIpcMain._listeners.get(IPC_CHANNELS.DEV_TEST_TRIGGER_RESPONSE_NOTIFICATION);
            triggerListener!();

            expect(mockNotificationManager.onResponseComplete).toHaveBeenCalled();
        });

        it('logs the trigger', () => {
            const triggerListener = mockIpcMain._listeners.get(IPC_CHANNELS.DEV_TEST_TRIGGER_RESPONSE_NOTIFICATION);
            triggerListener!();

            expect(mockLogger.log).toHaveBeenCalledWith('DEV: Manually triggering response notification');
        });

        it('handles missing NotificationManager gracefully', () => {
            const handlerWithoutManager = new ResponseNotificationIpcHandler(mockDeps);
            handlerWithoutManager.register();

            const triggerListener = mockIpcMain._listeners.get(IPC_CHANNELS.DEV_TEST_TRIGGER_RESPONSE_NOTIFICATION);
            expect(() => triggerListener!()).not.toThrow();
        });
    });
});
