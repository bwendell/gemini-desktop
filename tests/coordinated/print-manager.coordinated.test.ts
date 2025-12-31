/**
 * Coordinated tests for PrintManager filename uniqueness logic.
 * Tests getUniqueFilePath() behavior with mocked file system.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { app, dialog } from 'electron';

// Hoisted mocks - must be defined before any imports that use them
const mockExistsSync = vi.hoisted(() => vi.fn());
const mockWriteFile = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

// Mock logger - must use hoisted to avoid initialization issues
const mockLogger = vi.hoisted(() => ({
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));
vi.mock('../../src/main/utils/logger', () => ({
  createLogger: () => mockLogger,
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

// Import PrintManager after mocks are set up
import PrintManager from '../../src/main/managers/printManager';

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

    mockWebContents = {
      printToPDF: vi.fn().mockResolvedValue(Buffer.from('pdf content')),
      send: vi.fn(),
      isDestroyed: vi.fn().mockReturnValue(false),
    };

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
        const mockWebContents = (mainWindow as any).webContents;

        // Mock printToPDF on the main window's webContents
        mockWebContents.printToPDF = vi.fn().mockResolvedValue(Buffer.from('pdf'));

        await printManager.printToPdf();

        // Verify the main window's webContents.printToPDF was called
        expect(mockWebContents.printToPDF).toHaveBeenCalledWith({
          printBackground: true,
          pageSize: 'A4',
          landscape: false,
        });
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
        mainWebContents.printToPDF = vi.fn().mockResolvedValue(Buffer.from('main'));

        // Create explicit webContents to pass
        const explicitWebContents = {
          printToPDF: vi.fn().mockResolvedValue(Buffer.from('explicit')),
          send: vi.fn(),
          isDestroyed: vi.fn().mockReturnValue(false),
        };

        await printManager.printToPdf(explicitWebContents as any);

        // Verify explicit webContents was used, not main window's
        expect(explicitWebContents.printToPDF).toHaveBeenCalled();
        expect(mainWebContents.printToPDF).not.toHaveBeenCalled();
      });

      it('should use getMainWindow only for dialog parent when explicit webContents provided', async () => {
        // Create main window
        const mainWindow = windowManager.createMainWindow();
        const mainWebContents = (mainWindow as any).webContents;
        mainWebContents.printToPDF = vi.fn().mockResolvedValue(Buffer.from('main'));

        // Create explicit webContents to pass
        const explicitWebContents = {
          printToPDF: vi.fn().mockResolvedValue(Buffer.from('pdf')),
          send: vi.fn(),
          isDestroyed: vi.fn().mockReturnValue(false),
        };

        const getMainWindowSpy = vi.spyOn(windowManager, 'getMainWindow');

        await printManager.printToPdf(explicitWebContents as any);

        // getMainWindow() IS called for the save dialog parent, but main window's
        // webContents should NOT be used for PDF generation when explicit webContents provided
        expect(getMainWindowSpy).toHaveBeenCalled();
        expect(explicitWebContents.printToPDF).toHaveBeenCalled();
        expect(mainWebContents.printToPDF).not.toHaveBeenCalled();
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
        const mockWebContents = {
          printToPDF: vi.fn().mockResolvedValue(Buffer.from('pdf')),
          send: vi.fn(),
          isDestroyed: vi.fn().mockReturnValue(false),
        };

        (dialog.showSaveDialog as any).mockResolvedValue({
          canceled: false,
          filePath: '/mock/output.pdf',
        });

        // Mark as destroyed AFTER PDF generation starts
        mockWebContents.printToPDF.mockImplementation(async () => {
          mockWebContents.isDestroyed.mockReturnValue(true);
          return Buffer.from('pdf');
        });

        await printManager.printToPdf(mockWebContents as any);

        // File should still be written
        expect(mockWriteFile).toHaveBeenCalled();

        // But IPC should NOT be sent because webContents is destroyed
        expect(mockWebContents.send).not.toHaveBeenCalled();
      });

      it('should not send error IPC when webContents is already destroyed', async () => {
        const mockWebContents = {
          printToPDF: vi.fn().mockRejectedValue(new Error('Test error')),
          send: vi.fn(),
          isDestroyed: vi.fn().mockReturnValue(true),
        };

        await printManager.printToPdf(mockWebContents as any);

        // Error should be logged
        expect(mockLogger.error).toHaveBeenCalled();

        // But IPC should NOT be sent because webContents is destroyed
        expect(mockWebContents.send).not.toHaveBeenCalled();
      });
    });

    // =========================================================================
    // Test: IPC Feedback
    // =========================================================================
    describe('IPC Feedback', () => {
      it('should send success IPC with file path after save', async () => {
        const mockWebContents = {
          printToPDF: vi.fn().mockResolvedValue(Buffer.from('pdf')),
          send: vi.fn(),
          isDestroyed: vi.fn().mockReturnValue(false),
        };

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

      it('should send error IPC with message on PDF generation failure', async () => {
        const mockWebContents = {
          printToPDF: vi.fn().mockRejectedValue(new Error('PDF generation failed')),
          send: vi.fn(),
          isDestroyed: vi.fn().mockReturnValue(false),
        };

        await printManager.printToPdf(mockWebContents as any);

        expect(mockWebContents.send).toHaveBeenCalledWith(
          IPC_CHANNELS.PRINT_TO_PDF_ERROR,
          'PDF generation failed'
        );
      });

      it('should send error IPC with message on file write failure', async () => {
        const mockWebContents = {
          printToPDF: vi.fn().mockResolvedValue(Buffer.from('pdf')),
          send: vi.fn(),
          isDestroyed: vi.fn().mockReturnValue(false),
        };

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
  });
});
