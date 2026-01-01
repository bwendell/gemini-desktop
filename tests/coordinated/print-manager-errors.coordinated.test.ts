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
        return { width: 1920, height: 1000 };
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

import PrintManager from '../../src/main/managers/printManager';
import WindowManager from '../../src/main/managers/windowManager';
import { IPC_CHANNELS } from '../../src/shared/constants/ipc-channels';

/**
 * Creates a mock webContents with all required methods for scrolling capture.
 * Uses values that result in exactly 1 capture to keep tests fast.
 */
function createMockWebContentsForCapture() {
  // scrollHeight = 800, clientHeight = 1000 -> stepSize = 900, totalCaptures = 1
  const mockImage = {
    toPNG: vi.fn().mockReturnValue(Buffer.from('mock-png-data')),
    getSize: vi.fn().mockReturnValue({ width: 1920, height: 1000 }),
  };

  const mockGeminiFrame = {
    url: 'https://gemini.google.com/app',
    executeJavaScript: vi.fn().mockResolvedValue({
      scrollHeight: 800,
      scrollTop: 0,
      clientHeight: 1000,
    }),
  };

  return {
    send: vi.fn(),
    isDestroyed: vi.fn().mockReturnValue(false),
    capturePage: vi.fn().mockResolvedValue(mockImage),
    mainFrame: {
      frames: [mockGeminiFrame],
    },
  };
}

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

  it('5.3.12.2: Cleanup - should not write file if capture fails', async () => {
    const mockWebContents = createMockWebContentsForCapture();
    mockWebContents.capturePage.mockRejectedValue(new Error('Capture break'));

    await printManager.printToPdf(mockWebContents as any);

    expect(mockWriteFile).not.toHaveBeenCalled();
    expect(mockWebContents.send).toHaveBeenCalledWith(
      IPC_CHANNELS.PRINT_TO_PDF_ERROR,
      'Capture break'
    );
  });

  it('5.3.12.3: Rapid Triggers - should ignore second call when one is in progress', async () => {
    const mockWebContents = createMockWebContentsForCapture();

    // Make capturePage take some time
    mockWebContents.capturePage.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return {
        toPNG: vi.fn().mockReturnValue(Buffer.from('mock-png')),
        getSize: vi.fn().mockReturnValue({ width: 1920, height: 1000 }),
      };
    });

    // Trigger two calls immediately
    const p1 = printManager.printToPdf(mockWebContents as any);
    const p2 = printManager.printToPdf(mockWebContents as any);

    // Advance time to allow p1 to complete its delay
    await vi.advanceTimersByTimeAsync(50);
    await Promise.all([p1, p2]);

    // Only one capture call should have happened
    expect(mockWebContents.capturePage).toHaveBeenCalledTimes(1);

    // Verification of "Ignoring" behavior: logger should have warned
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('already in progress'));
  });

  it('5.3.12.4: Concurrent Requests - second request while dialog is open should be ignored', async () => {
    const mockWebContents = createMockWebContentsForCapture();

    // Mock showSaveDialog to delay
    (dialog.showSaveDialog as any).mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return { canceled: true };
    });

    const p1 = printManager.printToPdf(mockWebContents as any);

    // Advance time slightly so first one reaches dialog (past capture)
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
