/**
 * Unit tests for NotificationManager.
 * Tests focus state tracking, notification display, and badge coordination.
 *
 * @module notificationManager.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { BrowserWindow } from 'electron';
import NotificationManager from '../../../../src/main/managers/notificationManager';
import { createMockStore } from '../../../helpers/mocks';

// Mock Notification class
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

// Mock Electron
vi.mock('electron', () => ({
    Notification: mockNotification,
}));

// Mock logger
vi.mock('../../../../src/main/utils/logger', () => ({
    createLogger: () => ({
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    }),
}));

describe('NotificationManager', () => {
    let notificationManager: NotificationManager;
    let mockMainWindow: BrowserWindow;
    let mockBadgeManager: any;
    let mockStore: ReturnType<typeof createMockStore>;
    let focusHandler: (() => void) | undefined;
    let blurHandler: (() => void) | undefined;

    beforeEach(() => {
        vi.clearAllMocks();
        mockNotification._reset();
        focusHandler = undefined;
        blurHandler = undefined;

        mockMainWindow = {
            isFocused: vi.fn().mockReturnValue(true),
            isDestroyed: vi.fn().mockReturnValue(false),
            isMinimized: vi.fn().mockReturnValue(false),
            show: vi.fn(),
            focus: vi.fn(),
            restore: vi.fn(),
            on: vi.fn((event: string, handler: () => void) => {
                if (event === 'focus') focusHandler = handler;
                if (event === 'blur') blurHandler = handler;
                return mockMainWindow;
            }),
        } as unknown as BrowserWindow;

        mockBadgeManager = {
            showNotificationBadge: vi.fn(),
            clearNotificationBadge: vi.fn(),
        };

        mockStore = createMockStore({ responseNotificationsEnabled: true });

        notificationManager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore as any);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // =========================================================================
    // 6.1 Focus state tracking
    // =========================================================================
    describe('isWindowFocused (Task 6.1)', () => {
        it('initializes with current window focus state (focused)', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(true);
            const manager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore as any);
            expect(manager.isWindowFocused).toBe(true);
        });

        it('initializes with current window focus state (unfocused)', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const manager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore as any);
            expect(manager.isWindowFocused).toBe(false);
        });

        it('updates to true on window focus event', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const manager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore as any);

            expect(manager.isWindowFocused).toBe(false);

            // Simulate focus event
            focusHandler?.();

            expect(manager.isWindowFocused).toBe(true);
        });

        it('updates to false on window blur event', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(true);
            const manager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore as any);

            expect(manager.isWindowFocused).toBe(true);

            // Simulate blur event
            blurHandler?.();

            expect(manager.isWindowFocused).toBe(false);
        });

        it('subscribes to focus and blur events on construction', () => {
            expect(mockMainWindow.on).toHaveBeenCalledWith('focus', expect.any(Function));
            expect(mockMainWindow.on).toHaveBeenCalledWith('blur', expect.any(Function));
        });

        it('clears notification badge when window regains focus', () => {
            // Start unfocused
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const manager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore as any);

            // Simulate focus
            focusHandler?.();

            expect(mockBadgeManager.clearNotificationBadge).toHaveBeenCalled();
        });
    });

    // =========================================================================
    // 6.2 Shows notification when unfocused
    // =========================================================================
    describe('onResponseComplete (Task 6.2)', () => {
        it('shows notification when window is unfocused and setting enabled', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const manager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore as any);

            manager.onResponseComplete();

            expect(mockNotification._instances.length).toBe(1);
            expect(mockNotification._instances[0].show).toHaveBeenCalled();
        });

        it('shows badge when window is unfocused and setting enabled', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const manager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore as any);

            manager.onResponseComplete();

            expect(mockBadgeManager.showNotificationBadge).toHaveBeenCalled();
        });

        it('does not show notification when window is focused', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(true);
            const manager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore as any);

            manager.onResponseComplete();

            expect(mockNotification._instances.length).toBe(0);
            expect(mockBadgeManager.showNotificationBadge).not.toHaveBeenCalled();
        });

        it('does not show notification when setting is disabled', () => {
            mockStore = createMockStore({ responseNotificationsEnabled: false });
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const manager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore as any);

            manager.onResponseComplete();

            expect(mockNotification._instances.length).toBe(0);
            expect(mockBadgeManager.showNotificationBadge).not.toHaveBeenCalled();
        });

        it('correctly checks focus state after blur event', () => {
            // Start focused
            mockMainWindow.isFocused = vi.fn().mockReturnValue(true);
            const manager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore as any);

            // Blur window
            blurHandler?.();

            // Now trigger response
            manager.onResponseComplete();

            expect(mockNotification._instances.length).toBe(1);
            expect(mockBadgeManager.showNotificationBadge).toHaveBeenCalled();
        });
    });

    // =========================================================================
    // 6.7 Notification click focuses window
    // =========================================================================
    describe('notification click behavior (Task 6.7)', () => {
        it('focuses window on notification click', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const manager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore as any);

            manager.onResponseComplete();

            // Get the notification instance and trigger click
            const notification = mockNotification._instances[0];
            expect(notification._listeners.has('click')).toBe(true);

            const clickHandler = notification._listeners.get('click');
            clickHandler?.();

            expect(mockMainWindow.show).toHaveBeenCalled();
            expect(mockMainWindow.focus).toHaveBeenCalled();
        });

        it('restores minimized window before focusing on notification click', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            mockMainWindow.isMinimized = vi.fn().mockReturnValue(true);
            const manager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore as any);

            manager.onResponseComplete();

            const notification = mockNotification._instances[0];
            const clickHandler = notification._listeners.get('click');
            clickHandler?.();

            expect(mockMainWindow.restore).toHaveBeenCalled();
            expect(mockMainWindow.show).toHaveBeenCalled();
            expect(mockMainWindow.focus).toHaveBeenCalled();
        });

        it('handles destroyed window gracefully on notification click', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const manager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore as any);

            manager.onResponseComplete();

            // Mark window as destroyed before click
            mockMainWindow.isDestroyed = vi.fn().mockReturnValue(true);

            const notification = mockNotification._instances[0];
            const clickHandler = notification._listeners.get('click');

            // Should not throw
            expect(() => clickHandler?.()).not.toThrow();

            // Should not attempt to focus destroyed window
            expect(mockMainWindow.show).not.toHaveBeenCalled();
            expect(mockMainWindow.focus).not.toHaveBeenCalled();
        });
    });

    // =========================================================================
    // 6.8 Respects Notification.isSupported()
    // =========================================================================
    describe('Notification.isSupported() behavior (Task 6.8)', () => {
        it('does not show notification when Notification.isSupported() returns false', () => {
            mockNotification.isSupported.mockReturnValue(false);
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const manager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore as any);

            manager.showNotification();

            expect(mockNotification._instances.length).toBe(0);
        });

        it('does not throw error when notifications are not supported', () => {
            mockNotification.isSupported.mockReturnValue(false);
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const manager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore as any);

            expect(() => manager.showNotification()).not.toThrow();
        });

        it('shows notification when Notification.isSupported() returns true', () => {
            mockNotification.isSupported.mockReturnValue(true);
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const manager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore as any);

            manager.showNotification();

            expect(mockNotification._instances.length).toBe(1);
        });
    });

    // =========================================================================
    // Additional coverage tests
    // =========================================================================
    describe('isEnabled / setEnabled', () => {
        it('returns true when setting is enabled', () => {
            mockStore = createMockStore({ responseNotificationsEnabled: true });
            const manager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore as any);

            expect(manager.isEnabled()).toBe(true);
        });

        it('returns false when setting is disabled', () => {
            mockStore = createMockStore({ responseNotificationsEnabled: false });
            const manager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore as any);

            expect(manager.isEnabled()).toBe(false);
        });

        it('defaults to true when setting is undefined', () => {
            mockStore = createMockStore({});
            const manager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore as any);

            expect(manager.isEnabled()).toBe(true);
        });

        it('setEnabled updates the store', () => {
            const manager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore as any);

            manager.setEnabled(false);

            expect(mockStore.set).toHaveBeenCalledWith('responseNotificationsEnabled', false);
        });
    });

    describe('showNotification', () => {
        it('creates notification with correct title and body', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const manager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore as any);

            manager.showNotification();

            expect(mockNotification).toHaveBeenCalledWith({
                title: 'Gemini',
                body: 'Response ready',
                silent: false,
            });
        });

        it('calls notification.show()', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const manager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore as any);

            manager.showNotification();

            expect(mockNotification._instances[0].show).toHaveBeenCalled();
        });
    });
});
