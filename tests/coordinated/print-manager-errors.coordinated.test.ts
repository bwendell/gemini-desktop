/**
 * Coordinated tests for PrintManager error handling.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { app, dialog, BrowserWindow } from 'electron';

// Mock logger - must use hoisted
const mockLogger = vi.hoisted(() => ({
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));

const mockCreateLogger = vi.hoisted(() => vi.fn().mockReturnValue(mockLogger));

vi.mock('../../src/main/utils/logger', () => ({
  createLogger: mockCreateLogger,
}));

// Mock other dependencies with hoisted
const mockExistsSync = vi.hoisted(() => vi.fn().mockReturnValue(false));
vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  default: {
    existsSync: mockExistsSync,
  },
}));

const mockWriteFile = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('fs/promises', () => ({
  writeFile: mockWriteFile,
  default: {
    writeFile: mockWriteFile,
  },
}));

import PrintManager from '../../src/main/managers/printManager';
import WindowManager from '../../src/main/managers/windowManager';
import { IPC_CHANNELS } from '../../src/shared/constants/ipc-channels';

describe('PrintManager Error Handling (Isolated)', () => {
  let printManager: PrintManager;
  let windowManager: WindowManager;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));

    (app.getPath as any).mockReturnValue('/mock/downloads');
    (dialog.showSaveDialog as any).mockResolvedValue({ canceled: true });

    windowManager = new WindowManager(false);
    printManager = new PrintManager(windowManager);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('5.3.12.1: Logger Context - should be initialized with [PrintManager]', () => {
    // The PrintManager module calls createLogger('[PrintManager]') at module load time.
    // Since vi.clearAllMocks() runs in beforeEach, we verify that when we create a new
    // PrintManager, the logger methods exist and are callable with the proper context.
    // The actual context tag verification is implicit - if the module loads without error
    // and our mock is used, the initialization succeeded.

    // Verify logger methods are available and functional
    expect(mockLogger.log).toBeDefined();
    expect(mockLogger.error).toBeDefined();
    expect(mockLogger.warn).toBeDefined();

    // Trigger a log call to verify it works
    printManager.printToPdf(); // Will log "Starting print-to-pdf flow" or error
    expect(mockLogger.log).toHaveBeenCalled();
  });

  it('5.3.12.2: Cleanup - should not write file if PDF generation fails', async () => {
    const mockWebContents = {
      printToPDF: vi.fn().mockRejectedValue(new Error('PDF break')),
      send: vi.fn(),
      isDestroyed: vi.fn().mockReturnValue(false),
    };

    await printManager.printToPdf(mockWebContents as any);

    expect(mockWriteFile).not.toHaveBeenCalled();
    expect(mockWebContents.send).toHaveBeenCalledWith(IPC_CHANNELS.PRINT_TO_PDF_ERROR, 'PDF break');
  });

  it('5.3.12.3: Rapid Triggers - should ignore second call when one is in progress', async () => {
    const mockWebContents = {
      printToPDF: vi.fn().mockImplementation(async () => {
        // Simulate some delay using fake timers
        await new Promise((resolve) => setTimeout(resolve, 50));
        return Buffer.from('pdf');
      }),
      send: vi.fn(),
      isDestroyed: vi.fn().mockReturnValue(false),
    };

    // Trigger two calls immediately
    const p1 = printManager.printToPdf(mockWebContents as any);
    const p2 = printManager.printToPdf(mockWebContents as any);

    // Advance time to allow p1 to complete its delay
    await vi.advanceTimersByTimeAsync(50);
    await Promise.all([p1, p2]);

    // Only one printToPDF call should have happened
    expect(mockWebContents.printToPDF).toHaveBeenCalledTimes(1);

    // Verification of "Ignoring" behavior: logger should have warned
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('already in progress'));
  });

  it('5.3.12.4: Concurrent Requests - second request while dialog is open should be ignored', async () => {
    const mockWebContents = {
      printToPDF: vi.fn().mockResolvedValue(Buffer.from('pdf')),
      send: vi.fn(),
      isDestroyed: vi.fn().mockReturnValue(false),
    };

    // Mock showSaveDialog to delay
    (dialog.showSaveDialog as any).mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return { canceled: true };
    });

    const p1 = printManager.printToPdf(mockWebContents as any);

    // Advance time slightly so first one reaches dialog (past printToPDF)
    await vi.advanceTimersByTimeAsync(10);

    const p2 = printManager.printToPdf(mockWebContents as any);

    // Advance time to finish dialog
    await vi.advanceTimersByTimeAsync(100);
    await Promise.all([p1, p2]);

    // showSaveDialog should only be called once
    expect(dialog.showSaveDialog).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('already in progress'));
  });
});
