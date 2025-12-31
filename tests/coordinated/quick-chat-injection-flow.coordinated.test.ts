/**
 * Integration tests for Quick Chat text injection flow (Option A Architecture).
 * Tests the new IPC flow: Quick Chat window → IPC → Renderer navigates iframe → Ready signal → Injection
 *
 * Architecture (Option A - preserves React shell):
 * 1. Quick Chat submits text via quick-chat:submit IPC
 * 2. Main process sends gemini:navigate to renderer (React app)
 * 3. React app reloads iframe, signals gemini:ready when loaded
 * 4. Main process receives gemini:ready, injects text into iframe
 *
 * Gap Filled:
 * - Unit tests: Mock webContents and executeJavaScript
 * - E2E tests: Test full UI but slowly and don't cover all error paths
 * - Integration tests: Verify actual iframe discovery + injection + WindowManager coordination
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';
import IpcManager from '../../src/main/managers/ipcManager';
import WindowManager from '../../src/main/managers/windowManager';

// Mock logger
const mockLogger = vi.hoisted(() => ({
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));
vi.mock('../../src/main/utils/logger', () => ({
  createLogger: () => mockLogger,
}));

// Helper to send IPC message
const sendMessage = (channel: string, ...args: any[]) => {
  const listener = (ipcMain as any)._listeners.get(channel);
  if (!listener) throw new Error(`No listener for channel: ${channel}`);
  return listener({}, ...args);
};

describe('Quick Chat Injection Flow Integration (Option A)', () => {
  let ipcManager: IpcManager;
  let windowManager: WindowManager;
  let mockStore: any;

  beforeEach(() => {
    vi.clearAllMocks();
    if ((ipcMain as any)._reset) (ipcMain as any)._reset();
    if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();

    mockStore = {
      get: vi.fn().mockReturnValue('system'),
      set: vi.fn(),
    };

    windowManager = new WindowManager(false);
    ipcManager = new IpcManager(windowManager, null, null, null, mockStore, mockLogger);
    ipcManager.setupIpcHandlers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Step 1: Quick Chat Submit sends gemini:navigate', () => {
    it('should send gemini:navigate to renderer on quick-chat:submit', async () => {
      const mockMainWindow = {
        webContents: {
          send: vi.fn(),
          mainFrame: { frames: [] },
        },
      };

      vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockMainWindow as any);
      vi.spyOn(windowManager, 'hideQuickChat').mockImplementation(() => {});
      vi.spyOn(windowManager, 'focusMainWindow').mockImplementation(() => {});

      await sendMessage('quick-chat:submit', 'test prompt');

      // Verify Quick Chat window is hidden and main window focused
      expect(windowManager.hideQuickChat).toHaveBeenCalled();
      expect(windowManager.focusMainWindow).toHaveBeenCalled();

      // Verify gemini:navigate is sent to renderer with URL and text
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('gemini:navigate', {
        url: 'https://gemini.google.com/app',
        text: 'test prompt',
      });
    });

    it('should handle main window not found', async () => {
      vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(null);
      vi.spyOn(windowManager, 'hideQuickChat').mockImplementation(() => {});
      vi.spyOn(windowManager, 'focusMainWindow').mockImplementation(() => {});

      await sendMessage('quick-chat:submit', 'test prompt');

      expect(mockLogger.error).toHaveBeenCalledWith('Cannot navigate: main window not found');
    });

    it('should handle special characters in text', async () => {
      const mockMainWindow = {
        webContents: {
          send: vi.fn(),
          mainFrame: { frames: [] },
        },
      };

      vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockMainWindow as any);
      vi.spyOn(windowManager, 'hideQuickChat').mockImplementation(() => {});
      vi.spyOn(windowManager, 'focusMainWindow').mockImplementation(() => {});

      const specialText = 'Test with "quotes" and \\backslashes\\ and\nnewlines';
      await sendMessage('quick-chat:submit', specialText);

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('gemini:navigate', {
        url: 'https://gemini.google.com/app',
        text: specialText,
      });
    });
  });

  describe('Step 2: gemini:ready triggers injection', () => {
    it('should inject text into Gemini iframe on gemini:ready', async () => {
      const mockFrame = {
        url: 'https://gemini.google.com/app',
        executeJavaScript: vi.fn().mockResolvedValue({ success: true }),
      };
      const mockMainWindow = {
        webContents: {
          mainFrame: {
            frames: [mockFrame],
          },
        },
      };

      vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockMainWindow as any);

      await sendMessage('gemini:ready', 'test prompt');

      expect(mockFrame.executeJavaScript).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith('Text injected into Gemini successfully');
    });

    it('should handle Gemini iframe not found', async () => {
      const mockMainWindow = {
        webContents: {
          mainFrame: {
            frames: [{ url: 'https://example.com' }], // Wrong URL
          },
        },
      };

      vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockMainWindow as any);

      await sendMessage('gemini:ready', 'test prompt');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Cannot inject text: Gemini iframe not found in child frames'
      );
    });

    it('should handle injection script failure', async () => {
      const mockFrame = {
        url: 'https://gemini.google.com/app',
        executeJavaScript: vi.fn().mockResolvedValue({
          success: false,
          error: 'Input element not found',
        }),
      };
      const mockMainWindow = {
        webContents: {
          mainFrame: { frames: [mockFrame] },
        },
      };

      vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockMainWindow as any);

      await sendMessage('gemini:ready', 'test prompt');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Injection script returned failure:',
        'Input element not found'
      );
    });

    it('should handle executeJavaScript exception', async () => {
      const mockFrame = {
        url: 'https://gemini.google.com/app',
        executeJavaScript: vi.fn().mockRejectedValue(new Error('Script execution failed')),
      };
      const mockMainWindow = {
        webContents: {
          mainFrame: { frames: [mockFrame] },
        },
      };

      vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockMainWindow as any);

      await sendMessage('gemini:ready', 'test prompt');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to inject text into Gemini:',
        expect.any(Error)
      );
    });
  });

  describe('Complete Flow: Submit → Navigate → Ready → Inject', () => {
    it('should complete full injection flow successfully', async () => {
      const mockFrame = {
        url: 'https://gemini.google.com/app',
        executeJavaScript: vi.fn().mockResolvedValue({ success: true }),
      };
      const mockMainWindow = {
        webContents: {
          send: vi.fn(),
          mainFrame: { frames: [mockFrame] },
        },
      };

      vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockMainWindow as any);
      vi.spyOn(windowManager, 'hideQuickChat').mockImplementation(() => {});
      vi.spyOn(windowManager, 'focusMainWindow').mockImplementation(() => {});

      // Step 1: Quick Chat submits
      await sendMessage('quick-chat:submit', 'Hello Gemini');

      expect(windowManager.hideQuickChat).toHaveBeenCalled();
      expect(windowManager.focusMainWindow).toHaveBeenCalled();
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('gemini:navigate', {
        url: 'https://gemini.google.com/app',
        text: 'Hello Gemini',
      });

      // Step 2: React app signals ready (simulating renderer response)
      await sendMessage('gemini:ready', 'Hello Gemini');

      expect(mockFrame.executeJavaScript).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith('Text injected into Gemini successfully');
    });
  });

  describe('Iframe URL Detection', () => {
    it('should find Gemini iframe among multiple frames', async () => {
      const mockGeminiFrame = {
        url: 'https://gemini.google.com/app',
        executeJavaScript: vi.fn().mockResolvedValue({ success: true }),
      };
      const mockMainWindow = {
        webContents: {
          mainFrame: {
            frames: [
              { url: 'https://example.com' },
              { url: 'https://google.com' },
              mockGeminiFrame, // Target frame
              { url: 'https://other.com' },
            ],
          },
        },
      };

      vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockMainWindow as any);

      await sendMessage('gemini:ready', 'test prompt');

      expect(mockGeminiFrame.executeJavaScript).toHaveBeenCalled();
    });

    it('should handle empty frames array', async () => {
      const mockMainWindow = {
        webContents: {
          mainFrame: { frames: [] },
        },
      };

      vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockMainWindow as any);

      await sendMessage('gemini:ready', 'test prompt');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Cannot inject text: Gemini iframe not found in child frames'
      );
    });

    it('should match various Gemini URL patterns', async () => {
      const acceptedUrls = [
        'https://gemini.google.com/app',
        'https://gemini.google.com/app/something',
        'https://aistudio.google.com/app',
      ];

      for (const url of acceptedUrls) {
        mockLogger.log.mockClear();
        mockLogger.error.mockClear();

        const mockFrame = {
          url,
          executeJavaScript: vi.fn().mockResolvedValue({ success: true }),
        };
        const mockMainWindow = {
          webContents: {
            mainFrame: { frames: [mockFrame] },
          },
        };

        vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockMainWindow as any);

        await sendMessage('gemini:ready', 'test');

        expect(mockFrame.executeJavaScript).toHaveBeenCalled();
      }
    });

    it('should handle frame URL access error gracefully', async () => {
      const mockGeminiFrame = {
        url: 'https://gemini.google.com/app',
        executeJavaScript: vi.fn().mockResolvedValue({ success: true }),
      };
      const mockMainWindow = {
        webContents: {
          mainFrame: {
            frames: [
              {
                get url() {
                  throw new Error('URL access failed');
                },
              },
              mockGeminiFrame, // Should still find this one
            ],
          },
        },
      };

      vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockMainWindow as any);

      await sendMessage('gemini:ready', 'test prompt');

      // Should skip the frame with error and find the Gemini frame
      expect(mockGeminiFrame.executeJavaScript).toHaveBeenCalled();
    });
  });

  describe('Quick Chat Cancel/Hide', () => {
    it('should handle quick-chat:hide', () => {
      vi.spyOn(windowManager, 'hideQuickChat').mockImplementation(() => {});

      sendMessage('quick-chat:hide');

      expect(windowManager.hideQuickChat).toHaveBeenCalled();
    });

    it('should handle quick-chat:cancel', () => {
      vi.spyOn(windowManager, 'hideQuickChat').mockImplementation(() => {});

      sendMessage('quick-chat:cancel');

      expect(windowManager.hideQuickChat).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith('Quick Chat cancelled');
    });
  });
});
