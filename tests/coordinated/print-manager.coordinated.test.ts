/**
 * Coordinated tests for PrintManager filename uniqueness logic.
 * Tests getUniqueFilePath() behavior with mocked file system.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { app, dialog, BrowserWindow } from 'electron';

// Hoisted mocks - must be defined before any imports that use them
const mockExistsSync = vi.hoisted(() => vi.fn());
const mockWriteFile = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

// Mock logger - must use hoisted to avoid initialization issues
const mockLogger = vi.hoisted(() => ({
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));

const mockCreateLogger = vi.hoisted(() => vi.fn().mockReturnValue(mockLogger));

vi.mock('../../src/main/utils/logger', () => ({
  createLogger: mockCreateLogger,
}));

// Mock fs with hoisted function
vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: vi.fn().mockReturnValue('{}'),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  default: {
    existsSync: mockExistsSync,
    readFileSync: vi.fn().mockReturnValue('{}'),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  },
}));

// Mock fs/promises with hoisted function
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
        if (this._callbacks['data']) {
          this._callbacks['data'](Buffer.from('mock-pdf-content'));
        }
        if (this._callbacks['end']) {
          this._callbacks['end']();
        }
      }
    },
  };
});

// Import PrintManager after mocks are set up
import PrintManager from '../../src/main/managers/printManager';

/**
 * Creates a mock webContents with all required methods for scrolling capture.
 * Default values result in a single capture to keep tests fast.
 */
function createMockWebContentsForCapture(
  options: {
    scrollHeight?: number;
    clientHeight?: number;
  } = {}
) {
  // Use values that result in exactly 1 capture: ceil(scrollHeight / (clientHeight * 0.9)) = 1
  // With scrollHeight = 800 and clientHeight = 1000, stepSize = 900, totalCaptures = 1
  const { scrollHeight = 800, clientHeight = 1000 } = options;

  const mockImage = {
    toPNG: vi.fn().mockReturnValue(Buffer.from('mock-png-data')),
    getSize: vi.fn().mockReturnValue({ width: 1920, height: clientHeight }),
  };

  const mockGeminiFrame = {
    url: 'https://gemini.google.com/app',
    executeJavaScript: vi.fn().mockResolvedValue({
      scrollHeight,
      scrollTop: 0,
      clientHeight,
    }),
  };

  return {
    send: vi.fn(),
    getURL: vi.fn().mockReturnValue('file:///mock/app.html'),
    isDestroyed: vi.fn().mockReturnValue(false),
    capturePage: vi.fn().mockResolvedValue(mockImage),
    mainFrame: {
      frames: [mockGeminiFrame],
    },
  };
}

describe('PrintManager Filename Uniqueness', () => {
  let printManager: PrintManager;
  let mockWindowManager: any;
  let mockWebContents: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Fully reset mockExistsSync (clears implementations AND return values)
    mockExistsSync.mockReset();

    // Reset app.getPath to default
    (app.getPath as any).mockReturnValue('/mock/downloads');

    // Default mockExistsSync to return false
    mockExistsSync.mockReturnValue(false);

    mockWebContents = createMockWebContentsForCapture();

    mockWindowManager = {
      getMainWindow: vi.fn().mockReturnValue({
        webContents: mockWebContents,
      }),
    };

    printManager = new PrintManager(mockWindowManager);

    // Cancel save dialog by default (we're testing what gets passed to it)
    (dialog.showSaveDialog as any).mockResolvedValue({ canceled: true });

    // Use fake timers for deterministic filenames
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Helper to get the defaultPath passed to showSaveDialog
   */
  const getDefaultPath = (): string => {
    const calls = (dialog.showSaveDialog as any).mock.calls;
    if (calls.length === 0) return '';
    return calls[0][1].defaultPath;
  };

  describe('No Collision', () => {
    it('returns original path when file does not exist', async () => {
      // Mock existsSync to always return false
      mockExistsSync.mockReturnValue(false);

      await printManager.printToPdf(mockWebContents);

      const defaultPath = getDefaultPath();
      // Should be exactly gemini-chat-2025-01-15.pdf (no counter suffix like -1, -2, etc.)
      expect(defaultPath).toMatch(/gemini-chat-2025-01-15\.pdf$/);
    });
  });

  describe('Single Collision', () => {
    it('appends -1 when base file exists', async () => {
      // Mock: base file exists, -1 does not
      mockExistsSync.mockImplementation((filePath: string) => {
        if (filePath.endsWith('gemini-chat-2025-01-15.pdf')) return true;
        return false;
      });

      await printManager.printToPdf(mockWebContents);

      const defaultPath = getDefaultPath();
      expect(defaultPath).toContain('gemini-chat-2025-01-15-1.pdf');
    });
  });

  describe('Multiple Collisions', () => {
    it('appends -3 when base, -1, and -2 all exist', async () => {
      // Mock: first 3 variations exist, -3 is free
      mockExistsSync.mockImplementation((filePath: string) => {
        if (filePath.endsWith('gemini-chat-2025-01-15.pdf')) return true;
        if (filePath.endsWith('gemini-chat-2025-01-15-1.pdf')) return true;
        if (filePath.endsWith('gemini-chat-2025-01-15-2.pdf')) return true;
        return false;
      });

      await printManager.printToPdf(mockWebContents);

      const defaultPath = getDefaultPath();
      expect(defaultPath).toContain('gemini-chat-2025-01-15-3.pdf');
    });

    it('handles many collisions correctly', async () => {
      // Mock: files 0-9 exist, -10 is free
      mockExistsSync.mockImplementation((filePath: string) => {
        if (filePath.endsWith('gemini-chat-2025-01-15.pdf')) return true;
        for (let i = 1; i <= 9; i++) {
          if (filePath.endsWith(`gemini-chat-2025-01-15-${i}.pdf`)) return true;
        }
        return false;
      });

      await printManager.printToPdf(mockWebContents);

      const defaultPath = getDefaultPath();
      expect(defaultPath).toContain('gemini-chat-2025-01-15-10.pdf');
    });
  });

  describe('Extension Preservation', () => {
    it('preserves .pdf extension at the end (not file.pdf-1)', async () => {
      // Mock: base file exists
      mockExistsSync.mockImplementation((filePath: string) => {
        if (filePath.endsWith('gemini-chat-2025-01-15.pdf')) return true;
        return false;
      });

      await printManager.printToPdf(mockWebContents);

      const defaultPath = getDefaultPath();
      // Should end with -1.pdf, NOT .pdf-1
      expect(defaultPath).toMatch(/-1\.pdf$/);
      expect(defaultPath).not.toMatch(/\.pdf-1$/);
    });

    it('has correct format: name-counter.ext', async () => {
      // Mock: base and -1 exist
      mockExistsSync.mockImplementation((filePath: string) => {
        if (filePath.endsWith('gemini-chat-2025-01-15.pdf')) return true;
        if (filePath.endsWith('gemini-chat-2025-01-15-1.pdf')) return true;
        return false;
      });

      await printManager.printToPdf(mockWebContents);

      const defaultPath = getDefaultPath();
      // Verify format: should be "name-2.pdf" not "name.pdf-2" or "name-2-pdf"
      expect(defaultPath).toContain('gemini-chat-2025-01-15-2.pdf');
      expect(defaultPath).not.toContain('.pdf-2');
      expect(defaultPath).not.toContain('.pdf.pdf');
    });
  });

  describe('Special Characters', () => {
    it('handles paths with spaces correctly', async () => {
      // Change downloads folder to one with spaces
      (app.getPath as any).mockReturnValue('/mock/my documents/downloads');
      mockExistsSync.mockReturnValue(false);

      await printManager.printToPdf(mockWebContents);

      const defaultPath = getDefaultPath();
      expect(defaultPath).toContain('my documents');
      expect(defaultPath).toContain('gemini-chat-2025-01-15.pdf');
    });

    it('handles paths with spaces when collision occurs', async () => {
      (app.getPath as any).mockReturnValue('/mock/my documents/downloads');

      // Use a counter-based pattern: base exists, -1 doesn't
      let callCount = 0;
      mockExistsSync.mockImplementation(() => {
        callCount++;
        // First call (base path) returns true, second call (-1 path) returns false
        return callCount === 1;
      });

      await printManager.printToPdf(mockWebContents);

      const defaultPath = getDefaultPath();
      expect(defaultPath).toContain('my documents');
      expect(defaultPath).toContain('gemini-chat-2025-01-15-1.pdf');
    });

    it('handles Windows-style paths', async () => {
      // Windows downloads folder
      (app.getPath as any).mockReturnValue('C:\\Users\\Test User\\Downloads');

      // Use a counter-based pattern: base exists, -1 doesn't
      let callCount = 0;
      mockExistsSync.mockImplementation(() => {
        callCount++;
        return callCount === 1;
      });

      await printManager.printToPdf(mockWebContents);

      const defaultPath = getDefaultPath();
      // Path module should handle this correctly
      expect(defaultPath).toContain('gemini-chat-2025-01-15-1.pdf');
    });
  });

  describe('Cross-platform path handling', () => {
    it.each(['darwin', 'win32', 'linux'] as const)(
      'generates unique filename on %s',
      async (platform) => {
        vi.stubGlobal('process', { ...process, platform });

        // Ensure default downloads folder
        (app.getPath as any).mockReturnValue('/mock/downloads');

        // Use counter-based pattern: base exists, -1 doesn't
        let callCount = 0;
        mockExistsSync.mockImplementation(() => {
          callCount++;
          return callCount === 1;
        });

        await printManager.printToPdf(mockWebContents);

        const defaultPath = getDefaultPath();
        expect(defaultPath).toContain('gemini-chat-2025-01-15-1.pdf');

        vi.unstubAllGlobals();
      }
    );
  });
});

/**
 * ============================================================================
 * 5.3.1.2: PrintManager ↔ WindowManager WebContents Retrieval Tests
 * ============================================================================
 *
 * These tests verify the integration between PrintManager and WindowManager
 * for webContents retrieval scenarios. Uses REAL WindowManager instance.
 */

import WindowManager from '../../src/main/managers/windowManager';
import { IPC_CHANNELS } from '../../src/shared/constants/ipc-channels';

describe('PrintManager ↔ WindowManager Integration', () => {
  let printManager: PrintManager;
  let windowManager: WindowManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReset();
    mockExistsSync.mockReturnValue(false);
    mockWriteFile.mockReset();
    mockWriteFile.mockResolvedValue(undefined);
    (app.getPath as any).mockReturnValue('/mock/downloads');
    (dialog.showSaveDialog as any).mockResolvedValue({ canceled: true });
    (dialog.showSaveDialog as any).mockClear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
    beforeEach(() => {
      vi.stubGlobal('process', { ...process, platform });

      // Create REAL WindowManager
      windowManager = new WindowManager(false);

      // Create REAL PrintManager with real WindowManager
      printManager = new PrintManager(windowManager);
    });

    // =========================================================================
    // Test: Default to Main Window
    // =========================================================================
    describe('Default to Main Window', () => {
      it('should call WindowManager.getMainWindow() when no webContents provided', async () => {
        // Spy on getMainWindow
        const getMainWindowSpy = vi.spyOn(windowManager, 'getMainWindow');

        // Create main window to have something to return
        windowManager.createMainWindow();

        await printManager.printToPdf();

        expect(getMainWindowSpy).toHaveBeenCalled();
      });

      it('should use main window webContents for PDF generation', async () => {
        // Create main window and get reference to its webContents
        const mainWindow = windowManager.createMainWindow();
        const wc = (mainWindow as any).webContents;

        await printManager.printToPdf();

        // Verify the main window's webContents.capturePage was called
        expect(wc.capturePage).toHaveBeenCalled();
      });
    });

    // =========================================================================
    // Test: Explicit WebContents
    // =========================================================================
    describe('Explicit WebContents', () => {
      it('should use provided webContents instead of querying WindowManager', async () => {
        // Create main window but we'll provide different webContents
        const mainWindow = windowManager.createMainWindow();
        const mainWebContents = (mainWindow as any).webContents;

        // Create explicit webContents to pass
        const explicitWebContents = createMockWebContentsForCapture();

        await printManager.printToPdf(explicitWebContents as any);

        // Verify explicit webContents was used, not main window's
        expect(explicitWebContents.capturePage).toHaveBeenCalled();
        expect(mainWebContents.capturePage).not.toHaveBeenCalled();
      });

      it('should use getMainWindow only for dialog parent when explicit webContents provided', async () => {
        // Create main window
        const mainWindow = windowManager.createMainWindow();
        const mainWebContents = (mainWindow as any).webContents;

        // Create explicit webContents to pass
        const explicitWebContents = createMockWebContentsForCapture();

        const getMainWindowSpy = vi.spyOn(windowManager, 'getMainWindow');

        await printManager.printToPdf(explicitWebContents as any);

        // getMainWindow() IS called for the save dialog parent, but main window's
        // webContents should NOT be used for PDF generation when explicit webContents provided
        expect(getMainWindowSpy).toHaveBeenCalled();
        expect(explicitWebContents.capturePage).toHaveBeenCalled();
        expect(mainWebContents.capturePage).not.toHaveBeenCalled();
      });
    });

    // =========================================================================
    // Test: Missing Main Window
    // =========================================================================
    describe('Missing Main Window', () => {
      it('should log error and return gracefully when main window is null', async () => {
        // Don't create main window - getMainWindow() will return null

        await printManager.printToPdf();

        // Verify error was logged
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Main window not found')
        );

        // Verify no save dialog was shown
        expect(dialog.showSaveDialog).not.toHaveBeenCalled();
      });

      it('should not crash when main window is missing', async () => {
        // This should complete without throwing
        await expect(printManager.printToPdf()).resolves.toBeUndefined();
      });
    });

    // =========================================================================
    // Test: Destroyed WebContents
    // =========================================================================
    describe('Destroyed WebContents', () => {
      it('should not send success IPC when webContents is destroyed after PDF generation', async () => {
        const { IPC_CHANNELS } = await import('../../src/shared/constants/ipc-channels');
        const mockWebContents = createMockWebContentsForCapture();

        (dialog.showSaveDialog as any).mockResolvedValue({
          canceled: false,
          filePath: '/mock/output.pdf',
        });

        // Mark as destroyed AFTER capture starts
        mockWebContents.capturePage.mockImplementation(async () => {
          mockWebContents.isDestroyed.mockReturnValue(true);
          return {
            toPNG: vi.fn().mockReturnValue(Buffer.from('mock-png')),
            getSize: vi.fn().mockReturnValue({ width: 1920, height: 1080 }),
          };
        });

        await printManager.printToPdf(mockWebContents as any);

        // File should still be written
        expect(mockWriteFile).toHaveBeenCalled();

        // But success/error IPC should NOT be sent because webContents is destroyed
        expect(mockWebContents.send).not.toHaveBeenCalledWith(
          IPC_CHANNELS.PRINT_TO_PDF_SUCCESS,
          expect.anything()
        );
      });

      it('should not send error IPC when webContents is already destroyed', async () => {
        const { IPC_CHANNELS } = await import('../../src/shared/constants/ipc-channels');
        const mockWebContents = createMockWebContentsForCapture();
        mockWebContents.isDestroyed.mockReturnValue(true);
        mockWebContents.capturePage.mockRejectedValue(new Error('Test error'));

        await printManager.printToPdf(mockWebContents as any);

        // Error should be logged
        expect(mockLogger.error).toHaveBeenCalled();

        // But error IPC should NOT be sent because webContents is destroyed
        expect(mockWebContents.send).not.toHaveBeenCalledWith(
          IPC_CHANNELS.PRINT_TO_PDF_ERROR,
          expect.anything()
        );
      });
    });

    // =========================================================================
    // Test: IPC Feedback
    // =========================================================================
    describe('IPC Feedback', () => {
      it('should send success IPC with file path after save', async () => {
        const mockWebContents = createMockWebContentsForCapture();

        const savedPath = '/test/saved-file.pdf';
        (dialog.showSaveDialog as any).mockResolvedValue({
          canceled: false,
          filePath: savedPath,
        });

        await printManager.printToPdf(mockWebContents as any);

        expect(mockWebContents.send).toHaveBeenCalledWith(
          IPC_CHANNELS.PRINT_TO_PDF_SUCCESS,
          savedPath
        );
      });

      it('should send error IPC with message on capture failure', async () => {
        const mockWebContents = createMockWebContentsForCapture();
        mockWebContents.capturePage.mockRejectedValue(new Error('Capture failed'));

        await printManager.printToPdf(mockWebContents as any);

        expect(mockWebContents.send).toHaveBeenCalledWith(
          IPC_CHANNELS.PRINT_TO_PDF_ERROR,
          'Capture failed'
        );
      });

      it('should send error IPC with message on file write failure', async () => {
        const mockWebContents = createMockWebContentsForCapture();

        (dialog.showSaveDialog as any).mockResolvedValue({
          canceled: false,
          filePath: '/test/file.pdf',
        });
        mockWriteFile.mockRejectedValue(new Error('Disk full'));

        await printManager.printToPdf(mockWebContents as any);

        expect(mockWebContents.send).toHaveBeenCalledWith(
          IPC_CHANNELS.PRINT_TO_PDF_ERROR,
          'Disk full'
        );
      });
    });

    // =========================================================================
    // Test: Downloads Path (5.3.1.3)
    // =========================================================================
    describe('Downloads Path', () => {
      it('should use app.getPath("downloads") for default location', async () => {
        windowManager.createMainWindow();

        await printManager.printToPdf();

        expect(app.getPath).toHaveBeenCalledWith('downloads');
      });
    });

    // =========================================================================
    // Test: Save Dialog Integration (5.3.10)
    // =========================================================================
    describe('Save Dialog Integration', () => {
      it('5.3.10.1: should call showSaveDialog with correct options', async () => {
        windowManager.createMainWindow();
        const savedPath = '/mock/downloads/gemini-chat-2025-01-15.pdf';

        // Mock success save
        (dialog.showSaveDialog as any).mockResolvedValue({
          canceled: false,
          filePath: savedPath,
        });

        await printManager.printToPdf();

        expect(dialog.showSaveDialog).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            title: 'Save Chat as PDF',
            defaultPath: expect.stringContaining('gemini-chat-2025-01-15.pdf'),
            filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
          })
        );
      });

      it('5.3.10.2A: should use Main Window as dialog parent when available', async () => {
        const mainWindow = windowManager.createMainWindow();
        (dialog.showSaveDialog as any).mockResolvedValue({ canceled: true });

        await printManager.printToPdf();

        // The first argument to showSaveDialog is the parent window
        expect(dialog.showSaveDialog).toHaveBeenCalledWith(mainWindow, expect.anything());
      });

      it('5.3.10.2B: should use Focused Window as dialog parent when Main Window is missing', async () => {
        // Ensure getMainWindow returns null
        vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(null as any);

        // Mock a focused window
        const mockFocusedWindow = { id: 999 };
        vi.spyOn(BrowserWindow, 'getFocusedWindow').mockReturnValue(mockFocusedWindow as any);

        (dialog.showSaveDialog as any).mockResolvedValue({ canceled: true });

        // We need to provide webContents because printToPdf returns early if no main window and no sender
        const mockWebContents = createMockWebContentsForCapture();

        await printManager.printToPdf(mockWebContents as any);

        expect(dialog.showSaveDialog).toHaveBeenCalledWith(mockFocusedWindow, expect.anything());
      });

      it('5.3.10.3: should abort gracefully when user cancels dialog', async () => {
        const { IPC_CHANNELS } = await import('../../src/shared/constants/ipc-channels');
        const mockWebContents = createMockWebContentsForCapture();

        (dialog.showSaveDialog as any).mockResolvedValue({ canceled: true });

        await printManager.printToPdf(mockWebContents as any);

        // Verify file was NOT written
        expect(mockWriteFile).not.toHaveBeenCalled();

        // Verify no success/error IPC sent (progress IPC is OK)
        expect(mockWebContents.send).not.toHaveBeenCalledWith(
          IPC_CHANNELS.PRINT_TO_PDF_SUCCESS,
          expect.anything()
        );
        expect(mockWebContents.send).not.toHaveBeenCalledWith(
          IPC_CHANNELS.PRINT_TO_PDF_ERROR,
          expect.anything()
        );
      });

      it('5.3.10.4: should abort gracefully when filePath is empty', async () => {
        const { IPC_CHANNELS } = await import('../../src/shared/constants/ipc-channels');
        const mockWebContents = createMockWebContentsForCapture();

        (dialog.showSaveDialog as any).mockResolvedValue({ canceled: false, filePath: '' });

        await printManager.printToPdf(mockWebContents as any);

        // Verify file was NOT written
        expect(mockWriteFile).not.toHaveBeenCalled();

        // Verify no success/error IPC sent (progress IPC is OK)
        expect(mockWebContents.send).not.toHaveBeenCalledWith(
          IPC_CHANNELS.PRINT_TO_PDF_SUCCESS,
          expect.anything()
        );
        expect(mockWebContents.send).not.toHaveBeenCalledWith(
          IPC_CHANNELS.PRINT_TO_PDF_ERROR,
          expect.anything()
        );
      });
    });

    // =========================================================================
    // Test: Scrolling Capture Workflow (formerly PDF Generation Options)
    // =========================================================================
    describe('Scrolling Capture Workflow', () => {
      it('5.3.11.1: should use capturePage for viewport capture', async () => {
        const mockWebContents = createMockWebContentsForCapture();

        await printManager.printToPdf(mockWebContents as any);

        // Verify capturePage was called (used by captureViewport)
        expect(mockWebContents.capturePage).toHaveBeenCalled();
      });

      it('5.3.11.2: should write PDF to file on successful capture', async () => {
        const mockWebContents = createMockWebContentsForCapture();

        const savedPath = '/mock/downloads/output.pdf';
        (dialog.showSaveDialog as any).mockResolvedValue({
          canceled: false,
          filePath: savedPath,
        });

        await printManager.printToPdf(mockWebContents as any);

        // Verify fs.writeFile was called with a buffer (the stitched PDF)
        expect(mockWriteFile).toHaveBeenCalledWith(savedPath, expect.any(Buffer));
      });

      it('5.3.11.3: should send success IPC after saving', async () => {
        const mockWebContents = createMockWebContentsForCapture();

        const savedPath = '/mock/downloads/large.pdf';
        (dialog.showSaveDialog as any).mockResolvedValue({
          canceled: false,
          filePath: savedPath,
        });

        await printManager.printToPdf(mockWebContents as any);

        // Verify IPC success message was sent
        expect(mockWebContents.send).toHaveBeenCalledWith(
          IPC_CHANNELS.PRINT_TO_PDF_SUCCESS,
          savedPath
        );
      });
      // =========================================================================
      // Test: Progress Reporting
      // =========================================================================
      describe('Progress Reporting', () => {
        it('should send structured object for PRINT_PROGRESS_START', async () => {
          const mockWebContents = createMockWebContentsForCapture({
            scrollHeight: 2000,
            clientHeight: 1000,
          });
          // totalCaptures = ceil(2000 / (1000 * 0.9)) = ceil(2000 / 900) = 3

          await printManager.printToPdf(mockWebContents as any);

          expect(mockWebContents.send).toHaveBeenCalledWith(
            IPC_CHANNELS.PRINT_PROGRESS_START,
            expect.objectContaining({ totalPages: 3 })
          );
        });

        it('should send structured object for PRINT_PROGRESS_UPDATE', async () => {
          const mockWebContents = createMockWebContentsForCapture({
            scrollHeight: 2000,
            clientHeight: 1000,
          });

          await printManager.printToPdf(mockWebContents as any);

          // Should have 3 progress updates
          expect(mockWebContents.send).toHaveBeenCalledWith(
            IPC_CHANNELS.PRINT_PROGRESS_UPDATE,
            expect.objectContaining({
              currentPage: 1,
              totalPages: 3,
              progress: expect.any(Number),
            })
          );
          expect(mockWebContents.send).toHaveBeenCalledWith(
            IPC_CHANNELS.PRINT_PROGRESS_UPDATE,
            expect.objectContaining({
              currentPage: 2,
              totalPages: 3,
              progress: expect.any(Number),
            })
          );
          expect(mockWebContents.send).toHaveBeenCalledWith(
            IPC_CHANNELS.PRINT_PROGRESS_UPDATE,
            expect.objectContaining({
              currentPage: 3,
              totalPages: 3,
              progress: 100,
            })
          );
        });

        it('should send structured object for PRINT_PROGRESS_END', async () => {
          const mockWebContents = createMockWebContentsForCapture();
          (dialog.showSaveDialog as any).mockResolvedValue({
            canceled: false,
            filePath: '/mock/test.pdf',
          });

          await printManager.printToPdf(mockWebContents as any);

          expect(mockWebContents.send).toHaveBeenCalledWith(
            IPC_CHANNELS.PRINT_PROGRESS_END,
            expect.objectContaining({
              cancelled: false,
              success: true,
            })
          );
        });

        it('should report cancelled=true in PRINT_PROGRESS_END when cancelled', async () => {
          const mockWebContents = createMockWebContentsForCapture({
            scrollHeight: 3000, // Multiple pages to allow mid-capture cancel
            clientHeight: 1000,
          });

          // Cancel mid-capture
          mockWebContents.capturePage.mockImplementationOnce(async () => {
            printManager.cancel();
            return {
              toPNG: vi.fn().mockReturnValue(Buffer.from('png')),
              getSize: vi.fn().mockReturnValue({ width: 1920, height: 1080 }),
            };
          });

          await printManager.printToPdf(mockWebContents as any);

          expect(mockWebContents.send).toHaveBeenCalledWith(
            IPC_CHANNELS.PRINT_PROGRESS_END,
            expect.objectContaining({
              cancelled: true,
              success: false,
            })
          );
        });
      });
    });
  });
});

/**
 * ============================================================================
 * Task 7.7: Full Conversation Print Coordination Tests
 * ============================================================================
 *
 * These tests verify the scrolling screenshot capture flow coordination:
 * - 7.7.1: Scroll position save/restore (reinterpreted from window sizing)
 * - 7.7.2: Multi-frame coordination (main frame vs subframe detection)
 * - 7.7.3: CSS injection is superseded by Task 8 (Scrolling Screenshot Capture)
 */

describe('Full Conversation Print Coordination (Task 7.7)', () => {
  let printManager: PrintManager;
  let mockWindowManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReset();
    mockExistsSync.mockReturnValue(false);
    mockWriteFile.mockReset();
    mockWriteFile.mockResolvedValue(undefined);
    (app.getPath as any).mockReturnValue('/mock/downloads');
    (dialog.showSaveDialog as any).mockResolvedValue({ canceled: true });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));

    mockWindowManager = {
      getMainWindow: vi.fn().mockReturnValue(null),
    };
    printManager = new PrintManager(mockWindowManager);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ===========================================================================
  // 7.7.1: Scroll Position Save/Restore
  // ===========================================================================
  describe('7.7.1: Scroll Position Save/Restore', () => {
    /**
     * Creates a mock webContents that tracks scroll positions.
     * Returns scrolls array that captures all scrollTo calls.
     */
    function createMockWebContentsWithScrollTracking(
      initialScrollTop: number,
      scrollHeight: number = 2000,
      clientHeight: number = 600
    ) {
      const scrollPositions: number[] = [];

      const mockGeminiFrame = {
        url: 'https://gemini.google.com/app',
        executeJavaScript: vi.fn().mockImplementation(async (script: string) => {
          // Check if this is a scroll operation (scrollTop = X)
          const scrollMatch = script.match(/scrollTop\s*=\s*(\d+)/);
          if (scrollMatch) {
            scrollPositions.push(parseInt(scrollMatch[1], 10));
            return true;
          }
          // Otherwise return scroll info
          return {
            scrollHeight,
            scrollTop: initialScrollTop,
            clientHeight,
          };
        }),
      };

      const mockImage = {
        toPNG: vi.fn().mockReturnValue(Buffer.from('mock-png')),
        getSize: vi.fn().mockReturnValue({ width: 1920, height: clientHeight }),
      };

      return {
        webContents: {
          send: vi.fn(),
          getURL: vi.fn().mockReturnValue('file:///mock/app.html'),
          isDestroyed: vi.fn().mockReturnValue(false),
          capturePage: vi.fn().mockResolvedValue(mockImage),
          mainFrame: {
            frames: [mockGeminiFrame],
          },
        },
        scrollPositions,
        mockGeminiFrame,
      };
    }

    it('should restore scroll position after successful capture', async () => {
      const { webContents, scrollPositions } = createMockWebContentsWithScrollTracking(500);
      (dialog.showSaveDialog as any).mockResolvedValue({ canceled: true });

      await printManager.printToPdf(webContents as any);

      // Last scroll should restore to original position (500)
      expect(scrollPositions[scrollPositions.length - 1]).toBe(500);
    });

    it('should restore scroll position after capture failure', async () => {
      const { webContents, scrollPositions } = createMockWebContentsWithScrollTracking(750);

      // Make capturePage fail after first scroll
      let captureCount = 0;
      webContents.capturePage.mockImplementation(async () => {
        captureCount++;
        if (captureCount === 2) {
          throw new Error('Capture failed');
        }
        return {
          toPNG: vi.fn().mockReturnValue(Buffer.from('mock-png')),
          getSize: vi.fn().mockReturnValue({ width: 1920, height: 600 }),
        };
      });

      await printManager.printToPdf(webContents as any);

      // Should still restore to original position (750) despite error
      expect(scrollPositions[scrollPositions.length - 1]).toBe(750);
    });

    it('should restore scroll position after cancellation', async () => {
      const { webContents, scrollPositions } = createMockWebContentsWithScrollTracking(
        350, // Initial scroll position
        3000, // Large scroll height for multiple captures
        1000
      );

      // Cancel after first capture
      let captureCount = 0;
      webContents.capturePage.mockImplementation(async () => {
        captureCount++;
        if (captureCount === 1) {
          printManager.cancel();
        }
        return {
          toPNG: vi.fn().mockReturnValue(Buffer.from('mock-png')),
          getSize: vi.fn().mockReturnValue({ width: 1920, height: 1000 }),
        };
      });

      await printManager.printToPdf(webContents as any);

      // Should still restore to original position (350) despite cancellation
      expect(scrollPositions[scrollPositions.length - 1]).toBe(350);
    });
  });

  // ===========================================================================
  // 7.7.2: Multi-Frame Coordination
  // ===========================================================================
  describe('7.7.2: Multi-Frame Coordination', () => {
    /**
     * Creates mock webContents for testing frame detection.
     */
    function createFrameDetectionWebContents(config: {
      mainFrameUrl: string;
      subframes?: Array<{ url: string; executeJavaScript: ReturnType<typeof vi.fn> }>;
      mainFrameExecuteJS?: ReturnType<typeof vi.fn>;
    }) {
      const mockImage = {
        toPNG: vi.fn().mockReturnValue(Buffer.from('mock-png')),
        getSize: vi.fn().mockReturnValue({ width: 1920, height: 600 }),
      };

      const defaultExecuteJS = vi.fn().mockResolvedValue({
        scrollHeight: 800,
        scrollTop: 0,
        clientHeight: 1000,
      });

      return {
        send: vi.fn(),
        getURL: vi.fn().mockReturnValue(config.mainFrameUrl),
        isDestroyed: vi.fn().mockReturnValue(false),
        capturePage: vi.fn().mockResolvedValue(mockImage),
        mainFrame: {
          executeJavaScript: config.mainFrameExecuteJS ?? defaultExecuteJS,
          frames: config.subframes ?? [],
        },
      };
    }

    it('should use main frame when Gemini is loaded directly', async () => {
      const mainFrameExecuteJS = vi.fn().mockResolvedValue({
        scrollHeight: 800,
        scrollTop: 0,
        clientHeight: 1000,
      });

      const webContents = createFrameDetectionWebContents({
        mainFrameUrl: 'https://gemini.google.com/app/12345',
        mainFrameExecuteJS,
        subframes: [],
      });

      await printManager.printToPdf(webContents as any);

      // Main frame's executeJavaScript should be called
      expect(mainFrameExecuteJS).toHaveBeenCalled();
    });

    it('should use subframe when Gemini is embedded in iframe', async () => {
      const mainFrameExecuteJS = vi.fn();
      const subframeExecuteJS = vi.fn().mockResolvedValue({
        scrollHeight: 800,
        scrollTop: 0,
        clientHeight: 1000,
      });

      const webContents = createFrameDetectionWebContents({
        mainFrameUrl: 'file:///C:/app/index.html',
        mainFrameExecuteJS,
        subframes: [
          {
            url: 'https://gemini.google.com/app',
            executeJavaScript: subframeExecuteJS,
          },
        ],
      });

      await printManager.printToPdf(webContents as any);

      // Subframe's executeJavaScript should be called, not main frame's
      expect(subframeExecuteJS).toHaveBeenCalled();
      expect(mainFrameExecuteJS).not.toHaveBeenCalled();
    });

    it('should return null and capture single viewport when Gemini frame not found', async () => {
      const mainFrameExecuteJS = vi.fn();

      const webContents = createFrameDetectionWebContents({
        mainFrameUrl: 'file:///C:/app/index.html',
        mainFrameExecuteJS,
        subframes: [
          {
            url: 'https://other-site.com',
            executeJavaScript: vi.fn(),
          },
        ],
      });

      await printManager.printToPdf(webContents as any);

      // Should still call capturePage as fallback (single viewport)
      expect(webContents.capturePage).toHaveBeenCalled();

      // Logger should warn about frame not found
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Gemini frame not found')
      );
    });

    it('should handle gracefully when webContents is destroyed mid-print', async () => {
      const subframeExecuteJS = vi.fn().mockResolvedValue({
        scrollHeight: 2000,
        scrollTop: 0,
        clientHeight: 600,
      });

      const webContents = createFrameDetectionWebContents({
        mainFrameUrl: 'file:///C:/app/index.html',
        subframes: [
          {
            url: 'https://gemini.google.com/app',
            executeJavaScript: subframeExecuteJS,
          },
        ],
      });

      // Mark as destroyed after first capture
      let captureCount = 0;
      webContents.capturePage.mockImplementation(async () => {
        captureCount++;
        if (captureCount >= 1) {
          webContents.isDestroyed.mockReturnValue(true);
        }
        return {
          toPNG: vi.fn().mockReturnValue(Buffer.from('mock-png')),
          getSize: vi.fn().mockReturnValue({ width: 1920, height: 600 }),
        };
      });

      // Should not crash
      await expect(printManager.printToPdf(webContents as any)).resolves.toBeUndefined();

      // PRINT_PROGRESS_END should NOT be sent when webContents is destroyed
      const progressEndCalls = webContents.send.mock.calls.filter(
        (call: any[]) => call[0] === IPC_CHANNELS.PRINT_PROGRESS_END
      );
      expect(progressEndCalls.length).toBe(0);
    });
  });

  // ===========================================================================
  // 7.7.3: CSS Injection Lifecycle - SUPERSEDED
  // ===========================================================================
  // Task 7.7.3 (CSS Injection) is superseded by Task 8.
  // The scrolling screenshot capture approach does not use CSS injection.
  // No tests needed for CSS injection as it was never implemented.
});
