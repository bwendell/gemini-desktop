/**
 * Unit tests for BaseIpcHandler abstract class.
 *
 * Tests the protected helper methods by using a concrete test implementation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserWindow, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { BaseIpcHandler } from '../../../../src/main/managers/ipc/BaseIpcHandler';
import type { IpcHandlerDependencies } from '../../../../src/main/managers/ipc/types';
import { createMockLogger, createMockWindowManager, createMockStore } from '../../../helpers/mocks';

// Mock Electron
const { mockBrowserWindow } = vi.hoisted(() => {
    const mockBrowserWindow = {
        fromWebContents: vi.fn(),
        getAllWindows: vi.fn().mockReturnValue([]),
        _reset: () => {
            mockBrowserWindow.fromWebContents.mockReset();
            mockBrowserWindow.getAllWindows.mockReset();
            mockBrowserWindow.getAllWindows.mockReturnValue([]);
        },
    };
    return { mockBrowserWindow };
});

vi.mock('electron', () => ({
    BrowserWindow: mockBrowserWindow,
}));

// Concrete test implementation of BaseIpcHandler
class TestIpcHandler extends BaseIpcHandler {
    register(): void {
        // No-op for testing
    }

    // Expose protected methods for testing
    public testGetWindowFromEvent(event: IpcMainEvent | IpcMainInvokeEvent): BrowserWindow | null {
        return this.getWindowFromEvent(event);
    }

    public testBroadcastToAllWindows(channel: string, data?: unknown): void {
        this.broadcastToAllWindows(channel, data);
    }

    public testHandleError(operation: string, error: unknown, context?: Record<string, unknown>): void {
        this.handleError(operation, error, context);
    }
}

describe('BaseIpcHandler', () => {
    let handler: TestIpcHandler;
    let mockDeps: IpcHandlerDependencies;
    let mockLogger: ReturnType<typeof createMockLogger>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockBrowserWindow._reset();

        mockLogger = createMockLogger();
        mockDeps = {
            store: createMockStore({}),
            logger: mockLogger,
            windowManager: createMockWindowManager(),
        };

        handler = new TestIpcHandler(mockDeps);
    });

    describe('constructor', () => {
        it('stores dependencies', () => {
            expect((handler as any).deps).toBe(mockDeps);
        });

        it('stores logger reference', () => {
            expect((handler as any).logger).toBe(mockLogger);
        });
    });

    describe('getWindowFromEvent', () => {
        it('returns the window from webContents', () => {
            const mockWindow = {
                id: 1,
                isDestroyed: vi.fn().mockReturnValue(false),
            };
            const mockEvent = { sender: {} } as IpcMainEvent;
            mockBrowserWindow.fromWebContents.mockReturnValue(mockWindow);

            const result = handler.testGetWindowFromEvent(mockEvent);

            expect(result).toBe(mockWindow);
            expect(mockBrowserWindow.fromWebContents).toHaveBeenCalledWith(mockEvent.sender);
        });

        it('returns null when window is not found', () => {
            const mockEvent = { sender: {} } as IpcMainEvent;
            mockBrowserWindow.fromWebContents.mockReturnValue(null);

            const result = handler.testGetWindowFromEvent(mockEvent);

            expect(result).toBeNull();
        });

        it('returns null for destroyed window', () => {
            const mockWindow = {
                id: 1,
                isDestroyed: vi.fn().mockReturnValue(true),
            };
            const mockEvent = { sender: {} } as IpcMainEvent;
            mockBrowserWindow.fromWebContents.mockReturnValue(mockWindow);

            const result = handler.testGetWindowFromEvent(mockEvent);

            expect(result).toBeNull();
        });

        it('returns null and logs error when fromWebContents throws', () => {
            const mockEvent = { sender: {} } as IpcMainEvent;
            mockBrowserWindow.fromWebContents.mockImplementation(() => {
                throw new Error('WebContents error');
            });

            const result = handler.testGetWindowFromEvent(mockEvent);

            expect(result).toBeNull();
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to get window from event:', expect.any(Error));
        });
    });

    describe('broadcastToAllWindows', () => {
        it('sends message to all windows', () => {
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
            mockBrowserWindow.getAllWindows.mockReturnValue([mockWindow1, mockWindow2]);

            handler.testBroadcastToAllWindows('test-channel', { data: 'test' });

            expect(mockWindow1.webContents.send).toHaveBeenCalledWith('test-channel', { data: 'test' });
            expect(mockWindow2.webContents.send).toHaveBeenCalledWith('test-channel', { data: 'test' });
        });

        it('skips destroyed windows', () => {
            const mockWindow1 = {
                id: 1,
                isDestroyed: vi.fn().mockReturnValue(true),
                webContents: { send: vi.fn() },
            };
            const mockWindow2 = {
                id: 2,
                isDestroyed: vi.fn().mockReturnValue(false),
                webContents: { send: vi.fn() },
            };
            mockBrowserWindow.getAllWindows.mockReturnValue([mockWindow1, mockWindow2]);

            handler.testBroadcastToAllWindows('test-channel', { data: 'test' });

            expect(mockWindow1.webContents.send).not.toHaveBeenCalled();
            expect(mockWindow2.webContents.send).toHaveBeenCalledWith('test-channel', { data: 'test' });
        });

        it('logs error but continues for other windows when send throws', () => {
            const mockWindow1 = {
                id: 1,
                isDestroyed: vi.fn().mockReturnValue(false),
                webContents: {
                    send: vi.fn().mockImplementation(() => {
                        throw new Error('Send failed');
                    }),
                },
            };
            const mockWindow2 = {
                id: 2,
                isDestroyed: vi.fn().mockReturnValue(false),
                webContents: { send: vi.fn() },
            };
            mockBrowserWindow.getAllWindows.mockReturnValue([mockWindow1, mockWindow2]);

            handler.testBroadcastToAllWindows('test-channel', { data: 'test' });

            expect(mockLogger.error).toHaveBeenCalledWith('Error broadcasting to window:', {
                error: 'Send failed',
                windowId: 1,
                channel: 'test-channel',
            });
            expect(mockWindow2.webContents.send).toHaveBeenCalledWith('test-channel', { data: 'test' });
        });

        it('handles empty windows array', () => {
            mockBrowserWindow.getAllWindows.mockReturnValue([]);

            // Should not throw
            expect(() => handler.testBroadcastToAllWindows('test-channel')).not.toThrow();
        });

        it('handles undefined data', () => {
            const mockWindow = {
                id: 1,
                isDestroyed: vi.fn().mockReturnValue(false),
                webContents: { send: vi.fn() },
            };
            mockBrowserWindow.getAllWindows.mockReturnValue([mockWindow]);

            handler.testBroadcastToAllWindows('test-channel');

            expect(mockWindow.webContents.send).toHaveBeenCalledWith('test-channel', undefined);
        });
    });

    describe('handleError', () => {
        it('logs error with operation name and message', () => {
            const error = new Error('Something went wrong');

            handler.testHandleError('fetching data', error);

            expect(mockLogger.error).toHaveBeenCalledWith('Error during fetching data:', {
                error: 'Something went wrong',
                stack: expect.any(String),
            });
        });

        it('logs error with additional context', () => {
            const error = new Error('Database error');

            handler.testHandleError('saving record', error, { userId: 123, action: 'update' });

            expect(mockLogger.error).toHaveBeenCalledWith('Error during saving record:', {
                error: 'Database error',
                stack: expect.any(String),
                userId: 123,
                action: 'update',
            });
        });

        it('handles string errors', () => {
            handler.testHandleError('processing', 'simple string error');

            expect(mockLogger.error).toHaveBeenCalledWith('Error during processing:', {
                error: 'simple string error',
                stack: undefined,
            });
        });

        it('handles non-Error objects', () => {
            handler.testHandleError('validating', { code: 'INVALID' });

            expect(mockLogger.error).toHaveBeenCalledWith('Error during validating:', {
                error: '[object Object]',
                stack: undefined,
            });
        });

        it('handles null error', () => {
            handler.testHandleError('checking', null);

            expect(mockLogger.error).toHaveBeenCalledWith('Error during checking:', {
                error: 'null',
                stack: undefined,
            });
        });
    });

    describe('register', () => {
        it('is abstract and must be implemented', () => {
            // Verify that our test implementation has the register method
            expect(typeof handler.register).toBe('function');
        });
    });

    describe('initialize', () => {
        it('is optional and not defined in base class', () => {
            // initialize is optional, so it may or may not exist
            // Our test implementation doesn't define it
            expect(handler.initialize).toBeUndefined();
        });
    });
});
