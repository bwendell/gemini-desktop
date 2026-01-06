import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dialog } from 'electron';
import * as fs from 'fs';
import PrintManager from '../../../../src/main/managers/printManager';
import { IPC_CHANNELS } from '../../../../src/shared/constants/ipc-channels';
import { createMockWindowManager } from '../../helpers/mocks';

// Mocks
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn().mockReturnValue('/mock/downloads'),
    },
    dialog: {
        showSaveDialog: vi.fn(),
    },
    BrowserWindow: {
        getFocusedWindow: vi.fn(),
    },
    nativeImage: {
        createFromBuffer: vi.fn(),
    },
}));

vi.mock('fs', () => ({
    existsSync: vi.fn(),
}));

vi.mock('fs/promises', () => ({
    writeFile: vi.fn(),
}));

vi.mock('../../../../src/main/utils/logger', () => ({
    createLogger: () => ({
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    }),
}));

// Mock pdfkit
vi.mock('pdfkit', () => {
    const mockDoc = {
        on: vi.fn((event, cb) => {
            if (event === 'end') {
                setTimeout(cb, 0);
            }
            return mockDoc;
        }),
        addPage: vi.fn().mockReturnValue(null),
        image: vi.fn().mockReturnValue(null),
        end: vi.fn().mockReturnValue(null),
        openImage: vi.fn().mockReturnValue({ width: 800, height: 600 }),
    };
    (mockDoc.addPage as any).mockReturnValue(mockDoc);
    (mockDoc.image as any).mockReturnValue(mockDoc);
    (mockDoc.end as any).mockReturnValue(mockDoc);

    return {
        default: vi.fn().mockImplementation(function () {
            return mockDoc;
        }),
    };
});

describe('PrintManager', () => {
    let printManager: PrintManager;
    let mockWindowManager: any;
    let mockWebContents: any;
    let mockMainWindow: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockWebContents = {
            printToPDF: vi.fn(),
            capturePage: vi.fn().mockResolvedValue({
                toPNG: () => Buffer.from('png-data'),
                getSize: () => ({ width: 800, height: 600 }),
            }),
            getURL: vi.fn().mockReturnValue('https://gemini.google.com/app'),
            send: vi.fn((channel, ...args) => {
                console.log('[DEBUG] webContents.send:', channel, args);
            }),
            isDestroyed: vi.fn().mockReturnValue(false),
            mainFrame: {
                url: 'https://gemini.google.com/app',
                executeJavaScript: vi.fn(),
                frames: [],
            },
        };

        // Default scroll info
        mockWebContents.mainFrame.executeJavaScript.mockImplementation(async () => ({
            scrollHeight: 1000,
            scrollTop: 0,
            clientHeight: 500,
        }));

        mockMainWindow = {
            webContents: mockWebContents,
            isDestroyed: vi.fn().mockReturnValue(false),
        };

        mockWindowManager = createMockWindowManager({
            getMainWindow: vi.fn().mockReturnValue(mockMainWindow),
        });

        (fs.existsSync as any).mockReturnValue(false);

        printManager = new PrintManager(mockWindowManager);
    });

    describe('printToPdf', () => {
        it('captures pages, generates PDF and saves to file successfully', async () => {
            (dialog.showSaveDialog as any).mockResolvedValue({
                canceled: false,
                filePath: '/mock/downloads/test-output.pdf',
            });

            const originalConcat = Buffer.concat;
            Buffer.concat = vi.fn().mockReturnValue(Buffer.from('pdf content'));

            await printManager.printToPdf(mockWebContents);

            expect(mockWebContents.capturePage).toHaveBeenCalled();
            expect(mockWebContents.send).toHaveBeenCalledWith(IPC_CHANNELS.PRINT_PROGRESS_START, expect.any(Object));
            expect(mockWebContents.send).toHaveBeenCalledWith(
                IPC_CHANNELS.PRINT_TO_PDF_SUCCESS,
                '/mock/downloads/test-output.pdf'
            );

            Buffer.concat = originalConcat;
        });

        it('stops execution if cancelled during capture loop', async () => {
            (dialog.showSaveDialog as any).mockResolvedValue({
                canceled: false,
                filePath: '/path.pdf',
            });

            // Mock capturePage to trigger cancellation
            mockWebContents.capturePage.mockImplementation(async () => {
                printManager.cancel();
                return {
                    toPNG: () => Buffer.from('png'),
                    getSize: () => ({ width: 800, height: 600 }),
                };
            });

            await printManager.printToPdf(mockWebContents);

            // Should not show save dialog if cancelled during capture
            expect(dialog.showSaveDialog).not.toHaveBeenCalled();
            expect(mockWebContents.send).toHaveBeenCalledWith(
                IPC_CHANNELS.PRINT_PROGRESS_END,
                expect.objectContaining({ cancelled: true })
            );
        });

        it('handles capture errors gracefully', async () => {
            mockWebContents.capturePage.mockRejectedValue(new Error('Hardware failure'));

            await printManager.printToPdf(mockWebContents);

            expect(mockWebContents.send).toHaveBeenCalledWith(
                IPC_CHANNELS.PRINT_TO_PDF_ERROR,
                expect.stringContaining('Hardware failure')
            );
        });

        it('uses main window as default if no sender provided', async () => {
            (dialog.showSaveDialog as any).mockResolvedValue({ canceled: true });
            await printManager.printToPdf();
            expect(mockWindowManager.getMainWindow).toHaveBeenCalled();
        });
    });

    describe('getIframeScrollInfo', () => {
        it('returns null if Gemini frame is not found', async () => {
            mockWebContents.getURL.mockReturnValue('https://other.site');
            mockWebContents.mainFrame.frames = [{ url: 'https://other.site' }];

            const result = await (printManager as any).getIframeScrollInfo(mockWebContents);
            expect(result).toBeNull();
        });

        it('detects Gemini in main frame and returns scroll info', async () => {
            const mockScrollInfo = { scrollHeight: 2000, scrollTop: 100, clientHeight: 800 };
            mockWebContents.getURL.mockReturnValue('https://gemini.google.com/app');
            mockWebContents.mainFrame.url = 'https://gemini.google.com/app';
            mockWebContents.mainFrame.executeJavaScript.mockResolvedValue(mockScrollInfo);

            const result = await (printManager as any).getIframeScrollInfo(mockWebContents);

            expect(result).toEqual(mockScrollInfo);
            expect(mockWebContents.mainFrame.executeJavaScript).toHaveBeenCalled();
        });

        it('detects Gemini in subframe if not in main frame', async () => {
            const mockScrollInfo = { scrollHeight: 123, scrollTop: 0, clientHeight: 100 };
            const mockSubFrame = {
                url: 'https://gemini.google.com/app',
                executeJavaScript: vi.fn().mockResolvedValue(mockScrollInfo),
            };

            mockWebContents.getURL.mockReturnValue('https://other.site');
            mockWebContents.mainFrame.frames = [mockSubFrame];

            const result = await (printManager as any).getIframeScrollInfo(mockWebContents);
            expect(result).toEqual(mockScrollInfo);
            expect(mockSubFrame.executeJavaScript).toHaveBeenCalled();
        });

        it('returns null when executeJavaScript fails', async () => {
            mockWebContents.getURL.mockReturnValue('https://gemini.google.com/app');
            mockWebContents.mainFrame.executeJavaScript.mockRejectedValue(new Error('JS execution failed'));

            const result = await (printManager as any).getIframeScrollInfo(mockWebContents);
            expect(result).toBeNull();
        });
    });

    describe('getUniqueFilePath', () => {
        it('appends counter until file is unique', () => {
            (fs.existsSync as any).mockImplementation((p: string) => {
                if (p.endsWith('file.pdf')) return true;
                if (p.endsWith('file-1.pdf')) return true;
                return false;
            });

            const result = (printManager as any).getUniqueFilePath('/mock/file.pdf');
            // Normalize both paths to use forward slashes for cross-platform comparison
            const normalizedResult = result.replace(/\\/g, '/');
            expect(normalizedResult).toBe('/mock/file-2.pdf');
        });
    });
});
