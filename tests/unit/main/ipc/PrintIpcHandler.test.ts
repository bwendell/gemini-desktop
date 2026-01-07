/**
 * Unit tests for PrintIpcHandler.
 *
 * Tests the print:trigger and print:cancel IPC handlers,
 * plus the local print-to-pdf-triggered event handler.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrintIpcHandler } from '../../../../src/main/managers/ipc/PrintIpcHandler';
import type { IpcHandlerDependencies } from '../../../../src/main/managers/ipc/types';
import { createMockLogger, createMockWindowManager, createMockStore } from '../../../helpers/mocks';
import { IPC_CHANNELS } from '../../../../src/shared/constants/ipc-channels';

// Mock Electron
const { mockIpcMain, mockBrowserWindow } = vi.hoisted(() => {
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

    const mockWebContents = {
        id: 1,
        send: vi.fn(),
    };

    const mockWindow = {
        isDestroyed: vi.fn().mockReturnValue(false),
        id: 1,
        webContents: mockWebContents,
    };

    const mockBrowserWindow = {
        getAllWindows: vi.fn().mockReturnValue([mockWindow]),
        fromWebContents: vi.fn().mockReturnValue(mockWindow),
        _mockWindow: mockWindow,
        _mockWebContents: mockWebContents,
        _reset: () => {
            mockWindow.isDestroyed.mockReturnValue(false);
            mockWindow.webContents.send.mockReset();
            mockBrowserWindow.getAllWindows.mockReturnValue([mockWindow]);
        },
    };

    return { mockIpcMain, mockBrowserWindow };
});

vi.mock('electron', () => ({
    ipcMain: mockIpcMain,
    BrowserWindow: mockBrowserWindow,
}));

describe('PrintIpcHandler', () => {
    let handler: PrintIpcHandler;
    let mockDeps: IpcHandlerDependencies;
    let mockLogger: ReturnType<typeof createMockLogger>;
    let mockWindowManager: ReturnType<typeof createMockWindowManager>;
    let mockPrintManager: {
        printToPdf: ReturnType<typeof vi.fn>;
        cancel: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockIpcMain._reset();
        mockBrowserWindow._reset();

        mockLogger = createMockLogger();
        mockWindowManager = createMockWindowManager();
        mockPrintManager = {
            printToPdf: vi.fn().mockResolvedValue(undefined),
            cancel: vi.fn(),
        };

        mockDeps = {
            store: createMockStore({}),
            logger: mockLogger,
            windowManager: mockWindowManager,
            printManager: mockPrintManager as any,
        };

        handler = new PrintIpcHandler(mockDeps);
    });

    describe('register', () => {
        it('registers print:trigger listener', () => {
            handler.register();

            expect(mockIpcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.PRINT_TO_PDF_TRIGGER, expect.any(Function));
            expect(mockIpcMain._listeners.has(IPC_CHANNELS.PRINT_TO_PDF_TRIGGER)).toBe(true);
        });

        it('registers print:cancel listener', () => {
            handler.register();

            expect(mockIpcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.PRINT_CANCEL, expect.any(Function));
            expect(mockIpcMain._listeners.has(IPC_CHANNELS.PRINT_CANCEL)).toBe(true);
        });

        it('subscribes to print-to-pdf-triggered event', () => {
            handler.register();

            expect(mockWindowManager.on).toHaveBeenCalledWith('print-to-pdf-triggered', expect.any(Function));
        });
    });

    describe('print:trigger handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('calls printManager.printToPdf with event sender', async () => {
            const mockEvent = { sender: mockBrowserWindow._mockWebContents };

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.PRINT_TO_PDF_TRIGGER);
            listener!(mockEvent);

            // Wait for async operation
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(mockPrintManager.printToPdf).toHaveBeenCalledWith(mockBrowserWindow._mockWebContents);
            expect(mockLogger.log).toHaveBeenCalledWith('Print to PDF triggered via IPC');
        });

        it('logs error when printManager is not initialized', () => {
            const handlerWithoutPrintManager = new PrintIpcHandler({
                ...mockDeps,
                printManager: null,
            });
            handlerWithoutPrintManager.register();

            const mockEvent = { sender: mockBrowserWindow._mockWebContents };
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.PRINT_TO_PDF_TRIGGER);
            listener!(mockEvent);

            expect(mockLogger.error).toHaveBeenCalledWith('PrintManager not initialized');
        });

        it('handles printToPdf error', async () => {
            const error = new Error('Print failed');
            mockPrintManager.printToPdf.mockRejectedValue(error);

            const mockEvent = { sender: mockBrowserWindow._mockWebContents };
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.PRINT_TO_PDF_TRIGGER);
            listener!(mockEvent);

            // Wait for async operation
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error during printToPdf:',
                expect.objectContaining({
                    error: 'Print failed',
                })
            );
        });
    });

    describe('print:cancel handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('calls printManager.cancel', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.PRINT_CANCEL);
            listener!();

            expect(mockPrintManager.cancel).toHaveBeenCalled();
            expect(mockLogger.log).toHaveBeenCalledWith('Print cancellation requested via IPC');
        });

        it('handles undefined printManager gracefully', () => {
            const handlerWithoutPrintManager = new PrintIpcHandler({
                ...mockDeps,
                printManager: undefined,
            });
            handlerWithoutPrintManager.register();

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.PRINT_CANCEL);

            // Should not throw
            expect(() => listener!()).not.toThrow();
        });
    });

    describe('print-to-pdf-triggered event handler (local trigger)', () => {
        let localTriggerCallback: () => void;

        beforeEach(() => {
            handler.register();
            // Capture the callback registered for print-to-pdf-triggered
            const callArgs = (mockWindowManager.on as ReturnType<typeof vi.fn>).mock.calls.find(
                (call) => call[0] === 'print-to-pdf-triggered'
            );
            localTriggerCallback = callArgs?.[1] as () => void;
        });

        it('calls printManager.printToPdf with main window webContents', async () => {
            // Set up mock to return a valid window
            const mockWindow = {
                ...mockBrowserWindow._mockWindow,
                isDestroyed: vi.fn().mockReturnValue(false),
            };
            (mockWindowManager.getMainWindow as ReturnType<typeof vi.fn>).mockReturnValue(mockWindow);

            localTriggerCallback();

            // Wait for async operation
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(mockPrintManager.printToPdf).toHaveBeenCalledWith(mockWindow.webContents);
            expect(mockLogger.log).toHaveBeenCalledWith('Print to PDF triggered via local event');
        });

        it('logs error when printManager is not initialized', () => {
            const handlerWithoutPrintManager = new PrintIpcHandler({
                ...mockDeps,
                printManager: null,
            });
            handlerWithoutPrintManager.register();

            // Find the LAST registered callback (from handlerWithoutPrintManager)
            const allCalls = (mockWindowManager.on as ReturnType<typeof vi.fn>).mock.calls.filter(
                (call) => call[0] === 'print-to-pdf-triggered'
            );
            const callback = allCalls[allCalls.length - 1]?.[1] as () => void;
            callback();

            expect(mockLogger.error).toHaveBeenCalledWith('PrintManager not initialized');
        });

        it('logs warning when main window is not found', () => {
            (mockWindowManager.getMainWindow as ReturnType<typeof vi.fn>).mockReturnValue(null);

            localTriggerCallback();

            expect(mockLogger.warn).toHaveBeenCalledWith('Cannot print: Main window not found or destroyed');
            expect(mockPrintManager.printToPdf).not.toHaveBeenCalled();
        });

        it('logs warning when main window is destroyed', () => {
            const destroyedWindow = {
                ...mockBrowserWindow._mockWindow,
                isDestroyed: vi.fn().mockReturnValue(true),
            };
            (mockWindowManager.getMainWindow as ReturnType<typeof vi.fn>).mockReturnValue(destroyedWindow as any);

            localTriggerCallback();

            expect(mockLogger.warn).toHaveBeenCalledWith('Cannot print: Main window not found or destroyed');
            expect(mockPrintManager.printToPdf).not.toHaveBeenCalled();
        });

        it('handles printToPdf error on local trigger', async () => {
            // Set up mock to return a valid window
            const mockWindow = {
                ...mockBrowserWindow._mockWindow,
                isDestroyed: vi.fn().mockReturnValue(false),
            };
            (mockWindowManager.getMainWindow as ReturnType<typeof vi.fn>).mockReturnValue(mockWindow);

            const error = new Error('Print failed locally');
            mockPrintManager.printToPdf.mockRejectedValue(error);

            localTriggerCallback();

            // Wait for async operation
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error during printToPdf (local):',
                expect.objectContaining({
                    error: 'Print failed locally',
                })
            );
        });
    });
});
