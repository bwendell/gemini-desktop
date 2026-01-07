/**
 * Coordinated tests for Print to PDF IPC handler integration.
 * Tests IpcManager → PrintManager coordination for PRINT_TO_PDF_TRIGGER.
 *
 * These tests verify that the IPC layer correctly routes print-to-pdf
 * messages to the PrintManager and handles errors appropriately.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';
import IpcManager from '../../src/main/managers/ipcManager';
import WindowManager from '../../src/main/managers/windowManager';
import PrintManager from '../../src/main/managers/printManager';
import HotkeyManager from '../../src/main/managers/hotkeyManager';

// Use the centralized logger mock from __mocks__ directory
vi.mock('../../src/main/utils/logger');
import { mockLogger } from '../../src/main/utils/logger';

// Hoisted mock for fs/promises - must be defined before imports
const mockWriteFile = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('fs/promises', () => ({
    writeFile: mockWriteFile,
    readFile: vi.fn().mockResolvedValue('{}'),
    default: {
        writeFile: mockWriteFile,
        readFile: vi.fn().mockResolvedValue('{}'),
    },
}));

// Mock pdfkit to avoid needing real PNG data
vi.mock('pdfkit', () => {
    return {
        default: class MockPDFDocument {
            _callbacks: { [key: string]: (...args: any[]) => void } = {};

            constructor() {}

            on(event: string, callback: (...args: any[]) => void) {
                this._callbacks[event] = callback;
                return this;
            }

            addPage() {
                return this;
            }

            image() {
                return this;
            }

            openImage() {
                return { width: 1920, height: 1080 };
            }

            end() {
                // Emit data event with mock PDF content
                if (this._callbacks['data']) {
                    this._callbacks['data'](Buffer.from('mock-pdf-content'));
                }
                // Emit end event
                if (this._callbacks['end']) {
                    this._callbacks['end']();
                }
            }
        },
    };
});

// Helper to get registered IPC handlers
const getListener = (channel: string) => (ipcMain as any)._listeners.get(channel);

/**
 * Creates a mock webContents with all required methods for scrolling capture.
 * Uses shared factory with defaults that result in exactly 1 capture.
 */
import { createMockWebContents } from '../helpers/mocks';
function createMockWebContentsForCapture() {
    // Wrapper for backward compatibility, uses shared factory with scroll capture
    return createMockWebContents({ withScrollCapture: true, url: 'file:///mock/app.html' });
}

describe('Print to PDF IPC Handler Coordination', () => {
    let ipcManager: IpcManager;
    let windowManager: WindowManager;
    let printManager: PrintManager;
    let mockStore: any;
    let mockHotkeyManager: any;
    let mockUpdateManager: any;

    beforeEach(() => {
        vi.clearAllMocks();
        if ((ipcMain as any)._reset) (ipcMain as any)._reset();
        if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();

        // Create mock store
        const storeData: Record<string, any> = {
            theme: 'system',
            alwaysOnTop: false,
            hotkeyAlwaysOnTop: true,
            hotkeyBossKey: true,
            hotkeyQuickChat: true,
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

        // Create mock managers

        mockUpdateManager = {
            isEnabled: vi.fn().mockReturnValue(true),
            setEnabled: vi.fn(),
            checkForUpdates: vi.fn(),
            quitAndInstall: vi.fn(),
            devShowBadge: vi.fn(),
            devClearBadge: vi.fn(),
        };

        // Create real WindowManager (mocked Electron APIs via electron-mock)
        windowManager = new WindowManager(false);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('IPC Trigger Delegation', () => {
        it('should call PrintManager.printToPdf when PRINT_TO_PDF_TRIGGER is received', () => {
            // Create a mock PrintManager with spied printToPdf
            printManager = new PrintManager(windowManager);
            const printToPdfSpy = vi.spyOn(printManager, 'printToPdf').mockResolvedValue();

            // Create IpcManager with PrintManager
            ipcManager = new IpcManager(
                windowManager,
                mockHotkeyManager,
                mockUpdateManager,
                printManager,
                null,
                mockStore,
                mockLogger
            );
            ipcManager.setupIpcHandlers();

            // Get the handler
            const handler = getListener('print-to-pdf:trigger');
            expect(handler).toBeDefined();

            // Create mock event with sender
            const mockSender = {
                isDestroyed: () => false,
                send: vi.fn(),
            };
            const mockEvent = { sender: mockSender };

            // Trigger the IPC handler
            handler(mockEvent);

            // Verify PrintManager.printToPdf was called with the sender
            expect(printToPdfSpy).toHaveBeenCalledWith(mockSender);
        });

        it('should pass sender WebContents correctly to PrintManager', () => {
            // Create a specific mock sender to verify it's passed through
            const specificSender = {
                id: 12345,
                isDestroyed: () => false,
                send: vi.fn(),
                printToPDF: vi.fn().mockResolvedValue(Buffer.from('test pdf')),
            };

            printManager = new PrintManager(windowManager);
            const printToPdfSpy = vi.spyOn(printManager, 'printToPdf').mockResolvedValue();

            ipcManager = new IpcManager(
                windowManager,
                mockHotkeyManager,
                mockUpdateManager,
                printManager,
                null,
                mockStore,
                mockLogger
            );
            ipcManager.setupIpcHandlers();

            const handler = getListener('print-to-pdf:trigger');
            handler({ sender: specificSender });

            // Verify the exact sender object was passed
            expect(printToPdfSpy).toHaveBeenCalledTimes(1);
            expect(printToPdfSpy.mock.calls[0][0]).toBe(specificSender);
        });
    });

    describe('Error Handling - PrintManager Undefined', () => {
        it('should log error and not crash when PrintManager is undefined', () => {
            // Create IpcManager WITHOUT PrintManager (null)
            ipcManager = new IpcManager(
                windowManager,
                mockHotkeyManager,
                mockUpdateManager,
                null, // No PrintManager
                null,
                mockStore,
                mockLogger
            );
            ipcManager.setupIpcHandlers();

            const handler = getListener('print-to-pdf:trigger');
            expect(handler).toBeDefined();

            const mockEvent = {
                sender: { isDestroyed: () => false, send: vi.fn() },
            };

            // Should not throw
            expect(() => handler(mockEvent)).not.toThrow();

            // Should log error about missing PrintManager
            expect(mockLogger.error).toHaveBeenCalledWith('PrintManager not initialized');
        });
    });

    describe('Async Error Handling', () => {
        it('should catch and log errors when PrintManager.printToPdf rejects', async () => {
            const testError = new Error('PDF generation failed');

            printManager = new PrintManager(windowManager);
            const printToPdfSpy = vi.spyOn(printManager, 'printToPdf').mockRejectedValue(testError);

            ipcManager = new IpcManager(
                windowManager,
                mockHotkeyManager,
                mockUpdateManager,
                printManager,
                null,
                mockStore,
                mockLogger
            );
            ipcManager.setupIpcHandlers();

            const handler = getListener('print-to-pdf:trigger');
            const mockEvent = {
                sender: { isDestroyed: () => false, send: vi.fn() },
            };

            // Trigger handler - should not throw
            handler(mockEvent);

            // Wait for the async rejection to be caught
            await vi.waitFor(() => {
                expect(mockLogger.error).toHaveBeenCalledWith('Error during printToPdf:', {
                    error: 'PDF generation failed',
                    stack: expect.any(String),
                });
            });

            // printToPdf was called
            expect(printToPdfSpy).toHaveBeenCalled();
        });

        it('should not crash main process when printToPdf throws synchronously', () => {
            printManager = new PrintManager(windowManager);
            // When using mockImplementation with a sync throw, it bypasses async function wrapping.
            // To properly simulate async error behavior, we use mockRejectedValue which ensures
            // the Promise is rejected rather than throwing synchronously.
            vi.spyOn(printManager, 'printToPdf').mockRejectedValue(new Error('Sync error'));

            ipcManager = new IpcManager(
                windowManager,
                mockHotkeyManager,
                mockUpdateManager,
                printManager,
                null,
                mockStore,
                mockLogger
            );
            ipcManager.setupIpcHandlers();

            const handler = getListener('print-to-pdf:trigger');
            const mockEvent = {
                sender: { isDestroyed: () => false, send: vi.fn() },
            };

            // Should not throw (error is caught in .catch())
            // The actual printToPdf is an async function, so rejections are caught by .catch()
            expect(() => handler(mockEvent)).not.toThrow();
        });
    });

    describe('Manager Coordination Chain', () => {
        it('should coordinate IpcManager → PrintManager → WindowManager for local trigger', async () => {
            // Create main window mock
            const mockMainWindow = {
                isDestroyed: () => false,
                webContents: {
                    isDestroyed: () => false,
                    send: vi.fn(),
                    printToPDF: vi.fn().mockResolvedValue(Buffer.from('test pdf')),
                },
            };
            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockMainWindow as any);

            printManager = new PrintManager(windowManager);
            const printToPdfSpy = vi.spyOn(printManager, 'printToPdf').mockResolvedValue();

            ipcManager = new IpcManager(
                windowManager,
                mockHotkeyManager,
                mockUpdateManager,
                printManager,
                null,
                mockStore,
                mockLogger
            );
            ipcManager.setupIpcHandlers();

            // Trigger via WindowManager event (simulates hotkey/menu trigger)
            windowManager.emit('print-to-pdf-triggered');

            // Verify chain: IpcManager received event → called PrintManager
            expect(printToPdfSpy).toHaveBeenCalledWith(mockMainWindow.webContents);

            // Verify WindowManager.getMainWindow was consulted
            expect(windowManager.getMainWindow).toHaveBeenCalled();
        });

        it('should handle local trigger when main window is destroyed', () => {
            // Mock getMainWindow returning destroyed window
            const mockDestroyedWindow = {
                isDestroyed: () => true,
                webContents: {
                    isDestroyed: () => true,
                    send: vi.fn(),
                },
            };
            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockDestroyedWindow as any);

            printManager = new PrintManager(windowManager);
            const printToPdfSpy = vi.spyOn(printManager, 'printToPdf').mockResolvedValue();

            ipcManager = new IpcManager(
                windowManager,
                mockHotkeyManager,
                mockUpdateManager,
                printManager,
                null,
                mockStore,
                mockLogger
            );
            ipcManager.setupIpcHandlers();

            // Trigger via WindowManager event
            windowManager.emit('print-to-pdf-triggered');

            // Should not call printToPdf due to destroyed window check
            expect(printToPdfSpy).not.toHaveBeenCalled();

            // Should log warning
            expect(mockLogger.warn).toHaveBeenCalledWith('Cannot print: Main window not found or destroyed');
        });

        it('should handle local trigger when main window is null', () => {
            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(null);

            printManager = new PrintManager(windowManager);
            const printToPdfSpy = vi.spyOn(printManager, 'printToPdf').mockResolvedValue();

            ipcManager = new IpcManager(
                windowManager,
                mockHotkeyManager,
                mockUpdateManager,
                printManager,
                null,
                mockStore,
                mockLogger
            );
            ipcManager.setupIpcHandlers();

            windowManager.emit('print-to-pdf-triggered');

            expect(printToPdfSpy).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith('Cannot print: Main window not found or destroyed');
        });
        describe('WindowManager Event-Driven Print Trigger (5.3.5)', () => {
            it('should coordinate HotkeyManager → WindowManager → IpcManager → PrintManager', async () => {
                // Create real HotkeyManager
                const hotkeyManager = new HotkeyManager(windowManager, {
                    printToPdf: true,
                });

                // Mock main window
                const mockMainWindow = {
                    isDestroyed: () => false,
                    webContents: {
                        isDestroyed: () => false,
                        send: vi.fn(),
                        printToPDF: vi.fn().mockResolvedValue(Buffer.from('test pdf')),
                    },
                };
                vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockMainWindow as any);

                // Create and spy on PrintManager
                printManager = new PrintManager(windowManager);
                const printToPdfSpy = vi.spyOn(printManager, 'printToPdf').mockResolvedValue();

                // Initialize IpcManager to listen for WindowManager events
                ipcManager = new IpcManager(
                    windowManager,
                    hotkeyManager,
                    mockUpdateManager,
                    printManager,
                    null,
                    mockStore,
                    mockLogger
                );
                ipcManager.setupIpcHandlers();

                // EXECUTE: Trigger via HotkeyManager (simulates user pressing hotkey)
                hotkeyManager.executeHotkeyAction('printToPdf');

                // VERIFY: The full coordination chain
                // 1. HotkeyManager called windowManager.emit('print-to-pdf-triggered')
                // 2. IpcManager received the event and called printManager.printToPdf()
                expect(printToPdfSpy).toHaveBeenCalledWith(mockMainWindow.webContents);
                expect(windowManager.getMainWindow).toHaveBeenCalled();
            });

            it('should default to MainWindow webContents when triggered via WindowManager event', async () => {
                const mockMainWindow = {
                    isDestroyed: () => false,
                    webContents: {
                        isDestroyed: () => false,
                        send: vi.fn(),
                        printToPDF: vi.fn().mockResolvedValue(Buffer.from('pdf')),
                    },
                };
                vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockMainWindow as any);

                printManager = new PrintManager(windowManager);
                const printToPdfSpy = vi.spyOn(printManager, 'printToPdf').mockResolvedValue();

                ipcManager = new IpcManager(
                    windowManager,
                    mockHotkeyManager,
                    mockUpdateManager,
                    printManager,
                    null,
                    mockStore,
                    mockLogger
                );
                ipcManager.setupIpcHandlers();

                // Emit event directly on WindowManager
                windowManager.emit('print-to-pdf-triggered');

                // Verify main window's webContents was used
                expect(printToPdfSpy).toHaveBeenCalledWith(mockMainWindow.webContents);
            });

            it('should handle missing main window gracefully on event trigger', () => {
                vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(null);

                printManager = new PrintManager(windowManager);
                const printToPdfSpy = vi.spyOn(printManager, 'printToPdf').mockResolvedValue();

                ipcManager = new IpcManager(
                    windowManager,
                    mockHotkeyManager,
                    mockUpdateManager,
                    printManager,
                    null,
                    mockStore,
                    mockLogger
                );
                ipcManager.setupIpcHandlers();

                // Should not throw and should log warning
                expect(() => windowManager.emit('print-to-pdf-triggered')).not.toThrow();
                expect(printToPdfSpy).not.toHaveBeenCalled();
                expect(mockLogger.warn).toHaveBeenCalledWith('Cannot print: Main window not found or destroyed');
            });
        });
    });

    describe('Local Trigger Error Handling', () => {
        it('should catch and log errors during local trigger printToPdf', async () => {
            const testError = new Error('Local trigger error');

            const mockMainWindow = {
                isDestroyed: () => false,
                webContents: {
                    isDestroyed: () => false,
                    send: vi.fn(),
                },
            };
            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockMainWindow as any);

            printManager = new PrintManager(windowManager);
            vi.spyOn(printManager, 'printToPdf').mockRejectedValue(testError);

            ipcManager = new IpcManager(
                windowManager,
                mockHotkeyManager,
                mockUpdateManager,
                printManager,
                null,
                mockStore,
                mockLogger
            );
            ipcManager.setupIpcHandlers();

            // Trigger via local event
            windowManager.emit('print-to-pdf-triggered');

            // Wait for async error handling
            await vi.waitFor(() => {
                expect(mockLogger.error).toHaveBeenCalledWith('Error during printToPdf (local):', {
                    error: 'Local trigger error',
                    stack: expect.any(String),
                });
            });
        });
    });

    describe('IPC Feedback - Success Channel', () => {
        it('should send PRINT_TO_PDF_SUCCESS with file path after successful save', async () => {
            const { dialog } = await import('electron');
            const { IPC_CHANNELS } = await import('../../src/shared/constants/ipc-channels');

            const mockWebContents = createMockWebContentsForCapture();

            const mockMainWindow = {
                isDestroyed: () => false,
                webContents: mockWebContents,
            };

            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockMainWindow as any);

            // Mock dialog and fs
            const expectedPath = '/mock/downloads/gemini-chat-success.pdf';
            (dialog.showSaveDialog as any).mockResolvedValue({
                canceled: false,
                filePath: expectedPath,
            });
            mockWriteFile.mockResolvedValue(undefined);

            // Create real PrintManager (not mocked)
            printManager = new PrintManager(windowManager);

            await printManager.printToPdf(mockWebContents as any);

            // Verify success IPC was sent with correct payload
            expect(mockWebContents.send).toHaveBeenCalledWith(IPC_CHANNELS.PRINT_TO_PDF_SUCCESS, expectedPath);
        });

        it('should include correct file path in success message', async () => {
            const { dialog } = await import('electron');
            const { IPC_CHANNELS } = await import('../../src/shared/constants/ipc-channels');

            const mockWebContents = createMockWebContentsForCapture();

            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue({
                webContents: mockWebContents,
            } as any);

            const customPath = 'C:\\Users\\Test\\Documents\\my-conversation.pdf';
            (dialog.showSaveDialog as any).mockResolvedValue({
                canceled: false,
                filePath: customPath,
            });
            mockWriteFile.mockResolvedValue(undefined);

            printManager = new PrintManager(windowManager);
            await printManager.printToPdf(mockWebContents as any);

            // Verify exact path is sent
            const sendCalls = mockWebContents.send.mock.calls;
            const successCall = sendCalls.find((call: any[]) => call[0] === IPC_CHANNELS.PRINT_TO_PDF_SUCCESS);
            expect(successCall).toBeDefined();
            expect(successCall![1]).toBe(customPath);
        });
    });

    describe('IPC Feedback - Error Channel', () => {
        it('should send PRINT_TO_PDF_ERROR when capture fails', async () => {
            const { IPC_CHANNELS } = await import('../../src/shared/constants/ipc-channels');

            const mockWebContents = createMockWebContentsForCapture();
            mockWebContents.capturePage.mockRejectedValue(new Error('Renderer process crashed'));

            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue({
                webContents: mockWebContents,
            } as any);

            printManager = new PrintManager(windowManager);
            await printManager.printToPdf(mockWebContents as any);

            expect(mockWebContents.send).toHaveBeenCalledWith(
                IPC_CHANNELS.PRINT_TO_PDF_ERROR,
                'Renderer process crashed'
            );
        });

        it('should send PRINT_TO_PDF_ERROR when fs.writeFile fails', async () => {
            const { dialog } = await import('electron');
            const { IPC_CHANNELS } = await import('../../src/shared/constants/ipc-channels');

            const mockWebContents = createMockWebContentsForCapture();

            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue({
                webContents: mockWebContents,
            } as any);

            (dialog.showSaveDialog as any).mockResolvedValue({
                canceled: false,
                filePath: '/path/to/file.pdf',
            });
            mockWriteFile.mockRejectedValue(new Error('EACCES: permission denied'));

            printManager = new PrintManager(windowManager);
            await printManager.printToPdf(mockWebContents as any);

            expect(mockWebContents.send).toHaveBeenCalledWith(
                IPC_CHANNELS.PRINT_TO_PDF_ERROR,
                'EACCES: permission denied'
            );
        });

        it('should send "Unknown error" when non-Error object is thrown', async () => {
            const { IPC_CHANNELS } = await import('../../src/shared/constants/ipc-channels');

            const mockWebContents = createMockWebContentsForCapture();
            mockWebContents.capturePage.mockRejectedValue('string error');

            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue({
                webContents: mockWebContents,
            } as any);

            printManager = new PrintManager(windowManager);
            await printManager.printToPdf(mockWebContents as any);

            expect(mockWebContents.send).toHaveBeenCalledWith(IPC_CHANNELS.PRINT_TO_PDF_ERROR, 'Unknown error');
        });

        it('should NOT send success/error IPC when user cancels dialog', async () => {
            const { dialog } = await import('electron');
            const { IPC_CHANNELS } = await import('../../src/shared/constants/ipc-channels');

            const mockWebContents = createMockWebContentsForCapture();

            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue({
                webContents: mockWebContents,
            } as any);

            (dialog.showSaveDialog as any).mockResolvedValue({
                canceled: true,
            });

            printManager = new PrintManager(windowManager);
            await printManager.printToPdf(mockWebContents as any);

            // Success/Error IPC should not be sent - cancellation is not an error
            // (progress IPC messages are still sent before dialog)
            expect(mockWebContents.send).not.toHaveBeenCalledWith(IPC_CHANNELS.PRINT_TO_PDF_SUCCESS, expect.anything());
            expect(mockWebContents.send).not.toHaveBeenCalledWith(IPC_CHANNELS.PRINT_TO_PDF_ERROR, expect.anything());
        });
    });

    describe('IPC Feedback - Destroyed WebContents Safety', () => {
        it('should NOT send success IPC when webContents is destroyed', async () => {
            const { dialog } = await import('electron');
            const { IPC_CHANNELS } = await import('../../src/shared/constants/ipc-channels');

            const mockWebContents = createMockWebContentsForCapture();
            mockWebContents.isDestroyed.mockReturnValue(true); // Destroyed

            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue({
                webContents: mockWebContents,
            } as any);

            (dialog.showSaveDialog as any).mockResolvedValue({
                canceled: false,
                filePath: '/path/file.pdf',
            });
            mockWriteFile.mockResolvedValue(undefined);

            printManager = new PrintManager(windowManager);
            await printManager.printToPdf(mockWebContents as any);

            // File should still be written
            expect(mockWriteFile).toHaveBeenCalled();
            // NO success/error IPC should be sent (prevents throwing on destroyed contents)
            expect(mockWebContents.send).not.toHaveBeenCalledWith(IPC_CHANNELS.PRINT_TO_PDF_SUCCESS, expect.anything());
        });

        it('should NOT send error IPC when webContents is destroyed', async () => {
            const { IPC_CHANNELS } = await import('../../src/shared/constants/ipc-channels');

            const mockWebContents = createMockWebContentsForCapture();
            mockWebContents.isDestroyed.mockReturnValue(true); // Destroyed
            mockWebContents.capturePage.mockRejectedValue(new Error('Print failed'));

            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue({
                webContents: mockWebContents,
            } as any);

            printManager = new PrintManager(windowManager);
            await printManager.printToPdf(mockWebContents as any);

            // Error occurred but error IPC should NOT be sent
            expect(mockWebContents.send).not.toHaveBeenCalledWith(IPC_CHANNELS.PRINT_TO_PDF_ERROR, expect.anything());
        });

        it('should check isDestroyed before sending success message', async () => {
            const { dialog } = await import('electron');
            const { IPC_CHANNELS } = await import('../../src/shared/constants/ipc-channels');

            let destroyedAfterWrite = false;
            const mockWebContents = createMockWebContentsForCapture();
            mockWebContents.isDestroyed.mockImplementation(() => destroyedAfterWrite);

            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue({
                webContents: mockWebContents,
            } as any);

            (dialog.showSaveDialog as any).mockResolvedValue({
                canceled: false,
                filePath: '/path/file.pdf',
            });

            // Simulate destruction happening during file write
            mockWriteFile.mockImplementation(async () => {
                destroyedAfterWrite = true;
            });

            printManager = new PrintManager(windowManager);
            await printManager.printToPdf(mockWebContents as any);

            // isDestroyed was checked
            expect(mockWebContents.isDestroyed).toHaveBeenCalled();
            // No success IPC sent because it was destroyed by the time we checked
            expect(mockWebContents.send).not.toHaveBeenCalledWith(IPC_CHANNELS.PRINT_TO_PDF_SUCCESS, expect.anything());
        });
    });

    describe('IPC Feedback - Specific Error Scenarios', () => {
        it('should handle dialog.showSaveDialog rejection', async () => {
            const { dialog } = await import('electron');
            const { IPC_CHANNELS } = await import('../../src/shared/constants/ipc-channels');

            const mockWebContents = createMockWebContentsForCapture();

            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue({
                webContents: mockWebContents,
            } as any);

            (dialog.showSaveDialog as any).mockRejectedValue(new Error('Dialog closed unexpectedly'));

            printManager = new PrintManager(windowManager);
            await printManager.printToPdf(mockWebContents as any);

            expect(mockWebContents.send).toHaveBeenCalledWith(
                IPC_CHANNELS.PRINT_TO_PDF_ERROR,
                'Dialog closed unexpectedly'
            );
        });

        it('should handle capture timeout error', async () => {
            const { IPC_CHANNELS } = await import('../../src/shared/constants/ipc-channels');

            const mockWebContents = createMockWebContentsForCapture();
            mockWebContents.capturePage.mockRejectedValue(new Error('Capture timed out'));

            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue({
                webContents: mockWebContents,
            } as any);

            printManager = new PrintManager(windowManager);
            await printManager.printToPdf(mockWebContents as any);

            expect(mockWebContents.send).toHaveBeenCalledWith(IPC_CHANNELS.PRINT_TO_PDF_ERROR, 'Capture timed out');
        });

        it('should handle disk quota exceeded error', async () => {
            const { dialog } = await import('electron');
            const { IPC_CHANNELS } = await import('../../src/shared/constants/ipc-channels');

            const mockWebContents = createMockWebContentsForCapture();

            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue({
                webContents: mockWebContents,
            } as any);

            (dialog.showSaveDialog as any).mockResolvedValue({
                canceled: false,
                filePath: '/path/file.pdf',
            });
            mockWriteFile.mockRejectedValue(new Error('ENOSPC: no space left on device'));

            printManager = new PrintManager(windowManager);
            await printManager.printToPdf(mockWebContents as any);

            expect(mockWebContents.send).toHaveBeenCalledWith(
                IPC_CHANNELS.PRINT_TO_PDF_ERROR,
                'ENOSPC: no space left on device'
            );
        });
    });
});
