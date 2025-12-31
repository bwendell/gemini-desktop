import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { app, dialog, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import PrintManager from '../../../../src/main/managers/printManager';
import { IPC_CHANNELS } from '../../../../src/shared/constants/ipc-channels';

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
  }),
}));

describe('PrintManager', () => {
  let printManager: PrintManager;
  let mockWindowManager: any;
  let mockWebContents: any;
  let mockMainWindow: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockWebContents = {
      printToPDF: vi.fn().mockResolvedValue(Buffer.from('pdf content')),
      send: vi.fn(),
      isDestroyed: vi.fn().mockReturnValue(false),
    };

    mockMainWindow = {
      webContents: mockWebContents,
      isDestroyed: vi.fn().mockReturnValue(false),
    };

    mockWindowManager = {
      getMainWindow: vi.fn().mockReturnValue(mockMainWindow),
    };

    // Default fs behavior
    (fs.existsSync as any).mockReturnValue(false);

    printManager = new PrintManager(mockWindowManager);
  });

  describe('printToPdf', () => {
    it('generates PDF and saves to file successfully', async () => {
      // Setup dialog interaction
      (dialog.showSaveDialog as any).mockResolvedValue({
        canceled: false,
        filePath: '/mock/downloads/test-output.pdf',
      });

      await printManager.printToPdf(mockWebContents);

      // Verify PDF generation
      expect(mockWebContents.printToPDF).toHaveBeenCalledWith({
        printBackground: true,
        pageSize: 'A4',
        landscape: false,
      });

      // Verify save dialog
      expect(dialog.showSaveDialog).toHaveBeenCalled();
      const callArgs = (dialog.showSaveDialog as any).mock.calls[0][1];
      expect(callArgs.title).toBe('Save Chat as PDF');
      // Should default to a date-based name
      expect(callArgs.defaultPath).toContain('gemini-chat-');
      expect(callArgs.defaultPath).toContain('.pdf');

      // Verify file write
      expect(fsPromises.writeFile).toHaveBeenCalledWith(
        '/mock/downloads/test-output.pdf',
        expect.any(Buffer) // Buffer from printToPDF
      );

      // Verify IPC success message
      expect(mockWebContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.PRINT_TO_PDF_SUCCESS,
        '/mock/downloads/test-output.pdf'
      );
    });

    it('uses main window if no sender provided', async () => {
      (dialog.showSaveDialog as any).mockResolvedValue({
        canceled: true,
      });

      await printManager.printToPdf();

      expect(mockWindowManager.getMainWindow).toHaveBeenCalled();
      expect(mockWebContents.printToPDF).toHaveBeenCalled();
    });

    it('does nothing if canceled by user', async () => {
      (dialog.showSaveDialog as any).mockResolvedValue({
        canceled: true,
      });

      await printManager.printToPdf(mockWebContents);

      expect(fsPromises.writeFile).not.toHaveBeenCalled();
      expect(mockWebContents.send).not.toHaveBeenCalled();
    });

    it('handles printToPDF failure', async () => {
      mockWebContents.printToPDF.mockRejectedValue(new Error('Print failed'));

      await printManager.printToPdf(mockWebContents);

      expect(fsPromises.writeFile).not.toHaveBeenCalled();
      expect(mockWebContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.PRINT_TO_PDF_ERROR,
        'Print failed'
      );
    });

    it('handles writeFile failure', async () => {
      (dialog.showSaveDialog as any).mockResolvedValue({
        canceled: false,
        filePath: '/path/file.pdf',
      });
      (fsPromises.writeFile as any).mockRejectedValue(new Error('Write failed'));

      await printManager.printToPdf(mockWebContents);

      expect(mockWebContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.PRINT_TO_PDF_ERROR,
        'Write failed'
      );
    });

    it('uses unique filename increment logic', async () => {
      // Mock existsSync to return true for base, true for -1, false for -2
      (fs.existsSync as any).mockImplementation((fPath: string) => {
        if (fPath.endsWith('gemini-chat-2025-01-01.pdf')) return true; // Pretend today is that date or regex match
        // Actually, we can't easily predict the date string unless we mock Date.
        // But we can check if printManager calls existsSync multiple times.
        if (!fPath.includes('-')) return true; // Base file exists
        if (fPath.includes('-1.pdf')) return true; // First suffix exists
        return false; // Second suffix free
      });

      // Mock Date to ensure deterministic filename
      const mockDate = new Date('2025-01-01T12:00:00Z');
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);

      (dialog.showSaveDialog as any).mockResolvedValue({ canceled: true }); // Stop early

      await printManager.printToPdf(mockWebContents);

      expect(dialog.showSaveDialog).toHaveBeenCalled();
      const callArgs = (dialog.showSaveDialog as any).mock.calls[0][1];
      const defaultPath = callArgs.defaultPath;

      // Should end with -2.pdf because base and -1 were taken
      // Expected path logic:
      // Base: gemini-chat-2025-01-01.pdf -> exists
      // Try 1: ...-1.pdf -> exists
      // Try 2: ...-2.pdf -> free

      // Wait, on windows separator is \.
      // normalize path usage?
      // verify it ends with 'gemini-chat-2025-01-01-2.pdf'
      expect(defaultPath.endsWith('gemini-chat-2025-01-01-2.pdf')).toBe(true);

      vi.useRealTimers();
    });

    it('errors if main window not found when needed', async () => {
      mockWindowManager.getMainWindow.mockReturnValue(null);
      await printManager.printToPdf();
      // Should log error and return.
      // We can't easily check logs unless we mock internal logger properly,
      // but we mocked logger factory.
      // We can verify printToPDF was NOT called.
      expect(mockWebContents.printToPDF).not.toHaveBeenCalled();
    });
  });
});
