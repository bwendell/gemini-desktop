/**
 * Unit tests for AppIpcHandler.
 *
 * Tests the open-options and open-google-signin IPC handlers.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppIpcHandler } from '../../../../src/main/managers/ipc/AppIpcHandler';
import type { IpcHandlerDependencies } from '../../../../src/main/managers/ipc/types';
import { createMockLogger, createMockWindowManager, createMockStore } from '../../../helpers/mocks';

// Mock Electron
const { mockIpcMain } = vi.hoisted(() => {
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

    return { mockIpcMain };
});

vi.mock('electron', () => ({
    ipcMain: mockIpcMain,
}));

describe('AppIpcHandler', () => {
    let handler: AppIpcHandler;
    let mockDeps: IpcHandlerDependencies;
    let mockLogger: ReturnType<typeof createMockLogger>;
    let mockWindowManager: ReturnType<typeof createMockWindowManager>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockIpcMain._reset();

        mockLogger = createMockLogger();
        mockWindowManager = createMockWindowManager();
        mockDeps = {
            store: createMockStore({}),
            logger: mockLogger,
            windowManager: mockWindowManager,
        };

        handler = new AppIpcHandler(mockDeps);
    });

    describe('register', () => {
        it('registers open-options listener', () => {
            handler.register();

            expect(mockIpcMain.on).toHaveBeenCalledWith('open-options-window', expect.any(Function));
            expect(mockIpcMain._listeners.has('open-options-window')).toBe(true);
        });

        it('registers open-google-signin handler', () => {
            handler.register();

            expect(mockIpcMain.handle).toHaveBeenCalledWith('open-google-signin', expect.any(Function));
            expect(mockIpcMain._handlers.has('open-google-signin')).toBe(true);
        });
    });

    describe('open-options handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('calls windowManager.createOptionsWindow without tab (3.3.4)', () => {
            const listener = mockIpcMain._listeners.get('open-options-window');

            listener!({});

            expect(mockWindowManager.createOptionsWindow).toHaveBeenCalledWith(undefined);
        });

        it('calls windowManager.createOptionsWindow with settings tab (3.3.5)', () => {
            const listener = mockIpcMain._listeners.get('open-options-window');

            listener!({}, 'settings');

            expect(mockWindowManager.createOptionsWindow).toHaveBeenCalledWith('settings');
        });

        it('calls windowManager.createOptionsWindow with about tab', () => {
            const listener = mockIpcMain._listeners.get('open-options-window');

            listener!({}, 'about');

            expect(mockWindowManager.createOptionsWindow).toHaveBeenCalledWith('about');
        });

        it('logs error when createOptionsWindow throws (3.3.8)', () => {
            const listener = mockIpcMain._listeners.get('open-options-window');
            const error = new Error('Failed to create window');
            mockWindowManager.createOptionsWindow.mockImplementation(() => {
                throw error;
            });

            listener!({});

            expect(mockLogger.error).toHaveBeenCalledWith('Error opening options window:', error);
        });
    });

    describe('open-google-signin handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('calls windowManager.createAuthWindow with Google accounts URL (3.3.6)', async () => {
            const ipcHandler = mockIpcMain._handlers.get('open-google-signin');

            // Create a mock auth window with an EventEmitter-like interface
            const mockAuthWindow = {
                on: vi.fn((event: string, callback: () => void) => {
                    // Immediately trigger the 'closed' event for testing
                    if (event === 'closed') {
                        setTimeout(() => callback(), 0);
                    }
                }),
            };
            mockWindowManager.createAuthWindow.mockReturnValue(mockAuthWindow);

            await ipcHandler!({});

            expect(mockWindowManager.createAuthWindow).toHaveBeenCalledWith('https://accounts.google.com');
        });

        it('resolves when auth window is closed (3.3.7)', async () => {
            const ipcHandler = mockIpcMain._handlers.get('open-google-signin');

            let closeCallback: (() => void) | null = null;
            const mockAuthWindow = {
                on: vi.fn((event: string, callback: () => void) => {
                    if (event === 'closed') {
                        closeCallback = callback;
                    }
                }),
            };
            mockWindowManager.createAuthWindow.mockReturnValue(mockAuthWindow);

            const resultPromise = ipcHandler!({});

            // Verify the promise is pending
            expect(closeCallback).not.toBeNull();

            // Simulate window close
            closeCallback!();

            // Promise should now resolve
            await expect(resultPromise).resolves.toBeUndefined();
        });

        it('logs error and rethrows when createAuthWindow throws', async () => {
            const ipcHandler = mockIpcMain._handlers.get('open-google-signin');
            const error = new Error('Failed to create auth window');
            mockWindowManager.createAuthWindow.mockImplementation(() => {
                throw error;
            });

            await expect(ipcHandler!({})).rejects.toThrow('Failed to create auth window');
            expect(mockLogger.error).toHaveBeenCalledWith('Error opening Google sign-in:', error);
        });
    });
});
