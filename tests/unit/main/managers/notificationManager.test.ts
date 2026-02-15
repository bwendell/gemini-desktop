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
    app: {
        isPackaged: false,
    },
}));

const mockLogger = vi.hoisted(() => ({
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
}));

vi.mock('../../../../src/main/utils/logger', () => ({
    createLogger: () => mockLogger,
}));

const mockGetPlatformAdapter = vi.hoisted(() => vi.fn());

vi.mock('../../../../src/main/platform/platformAdapterFactory', () => ({
    getPlatformAdapter: mockGetPlatformAdapter,
}));

describe('NotificationManager', () => {
    let notificationSpy: typeof mockNotification & {
        _instances: any[];
        isSupported: { mockReturnValue: (value: boolean) => void };
    };
    let mockMainWindow: BrowserWindow;
    let mockBadgeManager: any;
    let mockStore: ReturnType<typeof createMockStore>;
    let mockPlatformAdapter: any;
    let focusHandler: (() => void) | undefined;
    let blurHandler: (() => void) | undefined;

    beforeEach(() => {
        vi.clearAllMocks();
        (mockNotification as any)._reset();
        focusHandler = undefined;
        blurHandler = undefined;
        notificationSpy = mockNotification as any;

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

        mockPlatformAdapter = {
            id: 'test-platform',
            getNotificationSupportHint: vi.fn().mockReturnValue(undefined),
        };
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
            // NotificationManager registers focus/blur handlers in constructor
            new NotificationManager(mockMainWindow, mockBadgeManager, mockStore as any);

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

            expect(notificationSpy._instances.length).toBe(1);
            expect(notificationSpy._instances[0].show).toHaveBeenCalled();
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

            expect(notificationSpy._instances.length).toBe(0);
            expect(mockBadgeManager.showNotificationBadge).not.toHaveBeenCalled();
        });

        it('does not show notification when setting is disabled', () => {
            mockStore = createMockStore({ responseNotificationsEnabled: false });
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const manager = new NotificationManager(mockMainWindow, mockBadgeManager, mockStore as any);

            manager.onResponseComplete();

            expect(notificationSpy._instances.length).toBe(0);
            expect(mockBadgeManager.showNotificationBadge).not.toHaveBeenCalled();
        });

        it('correctly checks focus state after blur event', () => {
            // Start focused
            mockMainWindow.isFocused = vi.fn().mockReturnValue(true);
            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );

            // Blur window
            blurHandler?.();

            // Now trigger response
            manager.onResponseComplete();

            expect(notificationSpy._instances.length).toBe(1);
            expect(mockBadgeManager.showNotificationBadge).toHaveBeenCalled();
        });
    });

    // =========================================================================
    // 6.7 Notification click focuses window
    // =========================================================================
    describe('notification click behavior (Task 6.7)', () => {
        it('focuses window on notification click', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );

            manager.onResponseComplete();

            // Get the notification instance and trigger click
            const notification = notificationSpy._instances[0];
            expect(notification._listeners.has('click')).toBe(true);

            const clickHandler = notification._listeners.get('click');
            clickHandler?.();

            expect(mockMainWindow.show).toHaveBeenCalled();
            expect(mockMainWindow.focus).toHaveBeenCalled();
        });

        it('restores minimized window before focusing on notification click', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            mockMainWindow.isMinimized = vi.fn().mockReturnValue(true);
            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );

            manager.onResponseComplete();

            const notification = notificationSpy._instances[0];
            const clickHandler = notification._listeners.get('click');
            clickHandler?.();

            expect(mockMainWindow.restore).toHaveBeenCalled();
            expect(mockMainWindow.show).toHaveBeenCalled();
            expect(mockMainWindow.focus).toHaveBeenCalled();
        });

        it('handles destroyed window gracefully on notification click', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );

            manager.onResponseComplete();

            // Mark window as destroyed before click
            mockMainWindow.isDestroyed = vi.fn().mockReturnValue(true);

            const notification = notificationSpy._instances[0];
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
            notificationSpy.isSupported.mockReturnValue(false);
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );

            manager.showNotification();

            expect(notificationSpy._instances.length).toBe(0);
        });

        it('does not throw error when notifications are not supported', () => {
            notificationSpy.isSupported.mockReturnValue(false);
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );

            expect(() => manager.showNotification()).not.toThrow();
        });

        it('shows notification when Notification.isSupported() returns true', () => {
            notificationSpy.isSupported.mockReturnValue(true);
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );

            manager.showNotification();

            expect(notificationSpy._instances.length).toBe(1);
        });

        it('logs adapter hint when Notification.isSupported() is false and hint is provided', () => {
            notificationSpy.isSupported.mockReturnValue(false);
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const hint = 'On Linux, install libnotify';
            mockPlatformAdapter.getNotificationSupportHint.mockReturnValue(hint);
            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );

            manager.showNotification();

            expect(mockPlatformAdapter.getNotificationSupportHint).toHaveBeenCalled();
        });

        it('logs generic not supported message when Notification.isSupported() is false and no hint available', () => {
            notificationSpy.isSupported.mockReturnValue(false);
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            mockPlatformAdapter.getNotificationSupportHint.mockReturnValue(undefined);
            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );

            manager.showNotification();

            expect(mockPlatformAdapter.getNotificationSupportHint).toHaveBeenCalled();
        });
    });

    // =========================================================================
    // Additional coverage tests
    // =========================================================================
    describe('isEnabled / setEnabled', () => {
        it('returns true when setting is enabled', () => {
            mockStore = createMockStore({ responseNotificationsEnabled: true });
            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );

            expect(manager.isEnabled()).toBe(true);
        });

        it('returns false when setting is disabled', () => {
            mockStore = createMockStore({ responseNotificationsEnabled: false });
            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );

            expect(manager.isEnabled()).toBe(false);
        });

        it('defaults to true when setting is undefined', () => {
            mockStore = createMockStore({});
            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );

            expect(manager.isEnabled()).toBe(true);
        });

        it('setEnabled updates the store', () => {
            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );

            manager.setEnabled(false);

            expect(mockStore.set).toHaveBeenCalledWith('responseNotificationsEnabled', false);
        });
    });

    describe('showNotification', () => {
        it('creates notification with correct title and body', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );

            manager.showNotification();

            expect(mockNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Gemini Desktop',
                    body: 'Response ready',
                    silent: false,
                    icon: expect.any(String),
                })
            );
        });

        it('calls notification.show()', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );

            manager.showNotification();

            expect(notificationSpy._instances[0].show).toHaveBeenCalled();
        });
    });

    // =========================================================================
    // 11.10 Error handling paths
    // =========================================================================
    describe('error handling paths (Task 11.10)', () => {
        it('showNotification() throws → onResponseComplete() still calls showNotificationBadge()', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );

            // Make Notification constructor throw
            mockNotification.mockImplementationOnce(() => {
                throw new Error('Notification failed');
            });

            // Should not throw and should still call badge
            expect(() => manager.onResponseComplete()).not.toThrow();
            expect(mockBadgeManager.showNotificationBadge).toHaveBeenCalled();
        });

        it('showNotificationBadge() throws → error logged, no crash', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            mockBadgeManager.showNotificationBadge.mockImplementationOnce(() => {
                throw new Error('Badge failed');
            });
            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );

            // Should not throw
            expect(() => manager.onResponseComplete()).not.toThrow();
        });

        it('Notification constructor throws → method returns, no crash', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            mockNotification.mockImplementationOnce(() => {
                throw new Error('Notification constructor failed');
            });
            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );

            // Should not throw
            expect(() => manager.showNotification()).not.toThrow();
        });

        it('notification.show() throws → error logged, no crash', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );

            // Make show() throw
            mockNotification.mockImplementationOnce(function (this: any, options: any) {
                this.title = options.title;
                this.body = options.body;
                this._listeners = new Map<string, Function>();
                this.on = vi.fn((event: string, handler: Function) => {
                    this._listeners.set(event, handler);
                    return this;
                });
                this.show = vi.fn().mockImplementation(() => {
                    throw new Error('Show failed');
                });
                notificationSpy._instances.push(this);
                return this;
            });

            // Should not throw
            expect(() => manager.showNotification()).not.toThrow();
        });

        it('setEnabled() with non-boolean value is rejected gracefully', () => {
            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );

            // Should not throw and should not update store
            expect(() => manager.setEnabled('invalid' as any)).not.toThrow();
            expect(() => manager.setEnabled(123 as any)).not.toThrow();
            expect(() => manager.setEnabled(null as any)).not.toThrow();

            // Store should not have been called with invalid values
            expect(mockStore.set).not.toHaveBeenCalledWith('responseNotificationsEnabled', 'invalid');
            expect(mockStore.set).not.toHaveBeenCalledWith('responseNotificationsEnabled', 123);
            expect(mockStore.set).not.toHaveBeenCalledWith('responseNotificationsEnabled', null);
        });
    });

    // =========================================================================
    // 11.11 Rapid focus/blur event test
    // =========================================================================
    describe('rapid focus/blur events (Task 11.11)', () => {
        it('handles rapid focus/blur sequence without race conditions', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );

            // Rapid sequence: focus → blur → focus → blur (10+ times)
            for (let i = 0; i < 15; i++) {
                focusHandler?.();
                blurHandler?.();
            }

            // Final state should be blurred (last event was blur)
            expect(manager.isWindowFocused).toBe(false);
        });

        it('state remains consistent after rapid focus/blur sequence ending with focus', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );

            // Rapid sequence ending with focus
            for (let i = 0; i < 10; i++) {
                blurHandler?.();
                focusHandler?.();
            }

            // Final state should be focused (last event was focus)
            expect(manager.isWindowFocused).toBe(true);
        });

        it('no exceptions during rapid event sequence', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(true);
            // Instantiate to register handlers - handles are exercised below
            new NotificationManager(mockMainWindow, mockBadgeManager, mockStore as any, mockPlatformAdapter);

            // Rapid sequence should not throw
            expect(() => {
                for (let i = 0; i < 20; i++) {
                    if (i % 2 === 0) {
                        blurHandler?.();
                    } else {
                        focusHandler?.();
                    }
                }
            }).not.toThrow();
        });

        it('badge state correctly reflects final focus state after rapid events', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            new NotificationManager(mockMainWindow, mockBadgeManager, mockStore as any, mockPlatformAdapter);

            // Clear previous calls
            mockBadgeManager.clearNotificationBadge.mockClear();

            // Rapid sequence ending with focus
            for (let i = 0; i < 5; i++) {
                blurHandler?.();
                focusHandler?.();
            }

            // clearNotificationBadge should have been called 5 times (once per focus)
            expect(mockBadgeManager.clearNotificationBadge).toHaveBeenCalledTimes(5);
        });
    });

    // =========================================================================
    // 11.12 Null/undefined store value test
    // =========================================================================
    describe('null/undefined store value handling (Task 11.12)', () => {
        it('isEnabled() returns true when store returns null', () => {
            mockStore = createMockStore({});
            mockStore.get = vi.fn().mockReturnValue(null);
            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );

            expect(manager.isEnabled()).toBe(true);
        });

        it('isEnabled() returns true when store returns undefined', () => {
            mockStore = createMockStore({});
            mockStore.get = vi.fn().mockReturnValue(undefined);
            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );

            expect(manager.isEnabled()).toBe(true);
        });

        it('isEnabled() never returns non-boolean value', () => {
            mockStore = createMockStore({});

            // Test various non-boolean return values
            const testValues = [null, undefined, '', 0, 'true', 1];

            for (const testValue of testValues) {
                mockStore.get = vi.fn().mockReturnValue(testValue);
                const manager = new NotificationManager(
                    mockMainWindow,
                    mockBadgeManager,
                    mockStore as any,
                    mockPlatformAdapter
                );

                const result = manager.isEnabled();
                expect(typeof result).toBe('boolean');
            }
        });

        it('isEnabled() returns stored boolean value when valid', () => {
            mockStore = createMockStore({ responseNotificationsEnabled: false });
            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );

            expect(manager.isEnabled()).toBe(false);
        });
    });

    // =========================================================================
    // 11.4 Destroyed window event handling
    // =========================================================================
    describe('destroyed window event handling (Task 11.4)', () => {
        it('ignores focus event when window is destroyed', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(false);
            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );

            // Mark window as destroyed
            mockMainWindow.isDestroyed = vi.fn().mockReturnValue(true);

            // Should not throw and should not update state
            expect(() => focusHandler?.()).not.toThrow();
            expect(manager.isWindowFocused).toBe(false);
            expect(mockBadgeManager.clearNotificationBadge).not.toHaveBeenCalled();
        });

        it('ignores blur event when window is destroyed', () => {
            mockMainWindow.isFocused = vi.fn().mockReturnValue(true);
            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );

            // Mark window as destroyed
            mockMainWindow.isDestroyed = vi.fn().mockReturnValue(true);

            // Should not throw and should not update state
            expect(() => blurHandler?.()).not.toThrow();
            expect(manager.isWindowFocused).toBe(true);
        });
    });

    // =========================================================================
    // 12.1 Dispose proper listener removal
    // =========================================================================
    describe('dispose() proper listener removal (Task 12.1)', () => {
        it('removes focus/blur listeners when dispose() is called', () => {
            const mockMainWindowWithEventTracking = {
                ...mockMainWindow,
                removeListener: vi.fn().mockReturnThis(),
            } as unknown as BrowserWindow;

            // Re-capture handlers
            let storedFocusHandler: (() => void) | undefined;
            let storedBlurHandler: (() => void) | undefined;
            mockMainWindowWithEventTracking.on = vi.fn((event: string, handler: () => void) => {
                if (event === 'focus') storedFocusHandler = handler;
                if (event === 'blur') storedBlurHandler = handler;
                return mockMainWindowWithEventTracking;
            });

            const manager = new NotificationManager(
                mockMainWindowWithEventTracking,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );

            // Dispose should remove listeners with the SAME handler references
            manager.dispose();

            // Verify removeListener was called with the exact same handlers
            expect(mockMainWindowWithEventTracking.removeListener).toHaveBeenCalledWith('focus', storedFocusHandler);
            expect(mockMainWindowWithEventTracking.removeListener).toHaveBeenCalledWith('blur', storedBlurHandler);
        });

        it('stored bound handlers are consistent between on() and removeListener()', () => {
            // Track which handlers were registered and removed
            let registeredFocusHandler: (() => void) | undefined;
            let registeredBlurHandler: (() => void) | undefined;
            let removedFocusHandler: (() => void) | undefined;
            let removedBlurHandler: (() => void) | undefined;

            const trackingWindow = {
                isFocused: vi.fn().mockReturnValue(false),
                isDestroyed: vi.fn().mockReturnValue(false),
                on: vi.fn((event: string, handler: () => void) => {
                    if (event === 'focus') registeredFocusHandler = handler;
                    if (event === 'blur') registeredBlurHandler = handler;
                    return trackingWindow;
                }),
                removeListener: vi.fn((event: string, handler: () => void) => {
                    if (event === 'focus') removedFocusHandler = handler;
                    if (event === 'blur') removedBlurHandler = handler;
                    return trackingWindow;
                }),
            } as unknown as BrowserWindow;

            const manager = new NotificationManager(
                trackingWindow,
                mockBadgeManager,
                mockStore as any,
                mockPlatformAdapter
            );
            manager.dispose();

            // The key test: same reference used for registration and removal
            expect(registeredFocusHandler).toBe(removedFocusHandler);
            expect(registeredBlurHandler).toBe(removedBlurHandler);

            // Handlers should be actual functions, not undefined
            expect(typeof registeredFocusHandler).toBe('function');
            expect(typeof registeredBlurHandler).toBe('function');
        });
    });

    // =========================================================================
    // 12.7 store.set() exception handling
    // =========================================================================
    describe('store.set() exception handling (Task 12.7)', () => {
        it('handles store.set() exception gracefully in setEnabled()', () => {
            const throwingStore = {
                get: vi.fn().mockReturnValue(true),
                set: vi.fn().mockImplementation(() => {
                    throw new Error('Store write failed');
                }),
            };

            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                throwingStore as any,
                mockPlatformAdapter
            );

            // Should not throw - error is caught and logged
            expect(() => manager.setEnabled(false)).not.toThrow();
        });

        it('remains functional after store.set() failure', () => {
            let callCount = 0;
            const failOnceStore = {
                get: vi.fn().mockReturnValue(true),
                set: vi.fn().mockImplementation(() => {
                    callCount++;
                    if (callCount === 1) {
                        throw new Error('Store write failed');
                    }
                    // Second call succeeds
                }),
            };

            const manager = new NotificationManager(
                mockMainWindow,
                mockBadgeManager,
                failOnceStore as any,
                mockPlatformAdapter
            );

            // First call fails but doesn't crash
            expect(() => manager.setEnabled(false)).not.toThrow();

            // Second call succeeds
            expect(() => manager.setEnabled(true)).not.toThrow();
            expect(failOnceStore.set).toHaveBeenCalledTimes(2);
        });
    });
});
