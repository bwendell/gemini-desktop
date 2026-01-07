/**
 * Coordinated tests for PrintIpcHandler.
 *
 * Tests the coordination between PrintIpcHandler and the print manager,
 * verifying the IPC trigger flow works correctly end-to-end.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';
import { PrintIpcHandler } from '../../../src/main/managers/ipc/PrintIpcHandler';
import type { IpcHandlerDependencies } from '../../../src/main/managers/ipc/types';
import { IPC_CHANNELS } from '../../../src/shared/constants/ipc-channels';

// Use the centralized logger mock from __mocks__ directory
vi.mock('../../../src/main/utils/logger');
import { mockLogger } from '../../../src/main/utils/__mocks__/logger';

describe('PrintIpcHandler Coordinated Tests', () => {
    let mockStore: any;
    let mockWindowManager: any;
    let mockPrintManager: any;
    let handler: PrintIpcHandler;
    let mockDeps: IpcHandlerDependencies;

    beforeEach(() => {
        vi.clearAllMocks();
        if ((ipcMain as any)._reset) (ipcMain as any)._reset();
        if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();

        mockStore = {
            get: vi.fn(),
            set: vi.fn(),
        };

        // Track event listeners
        const eventListeners: Map<string, Function[]> = new Map();

        mockWindowManager = {
            getMainWindow: vi.fn(),
            createMainWindow: vi.fn(),
            on: vi.fn((event: string, callback: Function) => {
                if (!eventListeners.has(event)) {
                    eventListeners.set(event, []);
                }
                eventListeners.get(event)!.push(callback);
            }),
            emit: vi.fn((event: string, ...args: any[]) => {
                const listeners = eventListeners.get(event) || [];
                listeners.forEach((listener) => listener(...args));
            }),
            _eventListeners: eventListeners,
        };

        mockPrintManager = {
            printToPdf: vi.fn().mockResolvedValue(undefined),
            cancel: vi.fn(),
        };

        // Create mock dependencies
        mockDeps = {
            store: mockStore,
            logger: mockLogger,
            windowManager: mockWindowManager,
            printManager: mockPrintManager,
        } as any;

        handler = new PrintIpcHandler(mockDeps);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('3.1.10 - IPC trigger invokes correct flow', () => {
        it('should invoke printToPdf when print:trigger IPC is received', async () => {
            const mockWebContents = {
                id: 1,
                send: vi.fn(),
            };

            handler.register();

            // Get the print:trigger listener
            const listener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.PRINT_TO_PDF_TRIGGER);
            expect(listener).toBeDefined();

            // Simulate IPC trigger
            listener!({ sender: mockWebContents });

            // Wait for async operation
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify printToPdf was called with the sender webContents
            expect(mockPrintManager.printToPdf).toHaveBeenCalledWith(mockWebContents);
        });

        it('should invoke cancel when print:cancel IPC is received', () => {
            handler.register();

            // Get the print:cancel listener
            const listener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.PRINT_CANCEL);
            expect(listener).toBeDefined();

            // Simulate cancel
            listener!();

            // Verify cancel was called
            expect(mockPrintManager.cancel).toHaveBeenCalled();
        });

        it('should invoke printToPdf when windowManager emits print-to-pdf-triggered', async () => {
            const mockMainWindow = {
                id: 1,
                isDestroyed: vi.fn().mockReturnValue(false),
                webContents: { id: 1, send: vi.fn() },
            };
            mockWindowManager.getMainWindow.mockReturnValue(mockMainWindow);

            handler.register();

            // Simulate local trigger via windowManager event
            mockWindowManager.emit('print-to-pdf-triggered');

            // Wait for async operation
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify printToPdf was called with main window's webContents
            expect(mockPrintManager.printToPdf).toHaveBeenCalledWith(mockMainWindow.webContents);
        });

        it('should log error when printManager.printToPdf throws', async () => {
            const mockWebContents = {
                id: 1,
                send: vi.fn(),
            };
            const printError = new Error('Print operation failed');
            mockPrintManager.printToPdf.mockRejectedValue(printError);

            handler.register();

            const listener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.PRINT_TO_PDF_TRIGGER);
            listener!({ sender: mockWebContents });

            // Wait for async operation
            await new Promise((resolve) => setTimeout(resolve, 10));

            // Verify error was logged
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error during printToPdf:',
                expect.objectContaining({
                    error: 'Print operation failed',
                })
            );
        });

        it('should not throw when printManager is null and IPC is triggered', () => {
            const handlerWithoutPrintManager = new PrintIpcHandler({
                ...mockDeps,
                printManager: null,
            } as any);
            handlerWithoutPrintManager.register();

            const listener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.PRINT_TO_PDF_TRIGGER);

            // Should not throw
            expect(() => listener!({ sender: { id: 1 } })).not.toThrow();
            expect(mockLogger.error).toHaveBeenCalledWith('PrintManager not initialized');
        });

        it('should handle local trigger with destroyed main window', () => {
            const mockDestroyedWindow = {
                id: 1,
                isDestroyed: vi.fn().mockReturnValue(true),
                webContents: { id: 1, send: vi.fn() },
            };
            mockWindowManager.getMainWindow.mockReturnValue(mockDestroyedWindow);

            handler.register();

            // Simulate local trigger
            mockWindowManager.emit('print-to-pdf-triggered');

            // Should log warning, not throw
            expect(mockLogger.warn).toHaveBeenCalledWith('Cannot print: Main window not found or destroyed');
            expect(mockPrintManager.printToPdf).not.toHaveBeenCalled();
        });
    });
});
