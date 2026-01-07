/**
 * Coordinated tests for QuickChatIpcHandler.
 *
 * Tests the full submit flow orchestration (4.2.15).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';
import IpcManager from '../../../src/main/managers/ipcManager';
import WindowManager from '../../../src/main/managers/windowManager';

// Use the centralized logger mock
vi.mock('../../../src/main/utils/logger');
import { mockLogger } from '../../../src/main/utils/logger';

// Mock electron-updater
vi.mock('electron-updater', () => ({
    autoUpdater: {
        on: vi.fn(),
        checkForUpdates: vi.fn().mockResolvedValue(undefined),
        quitAndInstall: vi.fn(),
        autoDownload: true,
        autoInstallOnAppQuit: true,
    },
}));

// Mock InjectionScriptBuilder
vi.mock('../../../src/main/utils/injectionScript', () => ({
    InjectionScriptBuilder: class MockInjectionScriptBuilder {
        withText() {
            return this;
        }
        withAutoSubmit() {
            return this;
        }
        build() {
            return 'mocked-injection-script';
        }
    },
}));

describe('QuickChatIpcHandler Coordinated Tests', () => {
    let mockStore: any;

    beforeEach(() => {
        vi.clearAllMocks();
        if ((ipcMain as any)._reset) (ipcMain as any)._reset();
        if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();

        mockStore = {
            get: vi.fn(),
            set: vi.fn(),
            getAll: vi.fn(() => ({})),
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Full Submit Flow Orchestration (4.2.15)', () => {
        it('should coordinate submit -> navigate -> ready -> inject flow', async () => {
            const windowManager = new WindowManager(false);

            // Create mock main window with webContents
            const mockGeminiFrame = {
                url: 'https://gemini.google.com/app',
                executeJavaScript: vi.fn().mockResolvedValue({ success: true }),
            };
            const mockMainWindow = {
                isDestroyed: () => false,
                webContents: {
                    send: vi.fn(),
                    mainFrame: {
                        frames: [mockGeminiFrame],
                    },
                },
                show: vi.fn(),
                focus: vi.fn(),
            };
            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockMainWindow as any);
            vi.spyOn(windowManager, 'hideQuickChat').mockImplementation(() => {});
            vi.spyOn(windowManager, 'focusMainWindow').mockImplementation(() => {});

            // Initialize IpcManager
            const ipcManager = new IpcManager(windowManager, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            // Step 1: Submit quick chat text
            const submitListener = (ipcMain as any)._listeners.get('quick-chat:submit');
            expect(submitListener).toBeDefined();

            submitListener({}, 'Hello Gemini from Quick Chat');

            // Verify Quick Chat was hidden and main window focused
            expect(windowManager.hideQuickChat).toHaveBeenCalled();
            expect(windowManager.focusMainWindow).toHaveBeenCalled();

            // Verify navigate was sent to renderer
            expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
                'gemini:navigate',
                expect.objectContaining({
                    text: 'Hello Gemini from Quick Chat',
                })
            );

            // Step 2: Simulate gemini:ready signal (renderer signals iframe loaded)
            const readyListener = (ipcMain as any)._listeners.get('gemini:ready');
            expect(readyListener).toBeDefined();

            await readyListener({}, 'Hello Gemini from Quick Chat');

            // Verify injection was executed
            expect(mockGeminiFrame.executeJavaScript).toHaveBeenCalled();
        });

        it('should handle hide and cancel operations', () => {
            const windowManager = new WindowManager(false);
            vi.spyOn(windowManager, 'hideQuickChat').mockImplementation(() => {});

            const ipcManager = new IpcManager(windowManager, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            // Test hide
            const hideListener = (ipcMain as any)._listeners.get('quick-chat:hide');
            hideListener();
            expect(windowManager.hideQuickChat).toHaveBeenCalled();

            // Reset mock
            (windowManager.hideQuickChat as ReturnType<typeof vi.fn>).mockClear();

            // Test cancel
            const cancelListener = (ipcMain as any)._listeners.get('quick-chat:cancel');
            cancelListener();
            expect(windowManager.hideQuickChat).toHaveBeenCalled();
        });

        it('should gracefully handle missing main window in injection', async () => {
            const windowManager = new WindowManager(false);
            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(null);
            vi.spyOn(windowManager, 'hideQuickChat').mockImplementation(() => {});
            vi.spyOn(windowManager, 'focusMainWindow').mockImplementation(() => {});

            const ipcManager = new IpcManager(windowManager, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            // Trigger gemini:ready - should handle missing window
            const readyListener = (ipcMain as any)._listeners.get('gemini:ready');
            await readyListener({}, 'Test text');

            expect(mockLogger.error).toHaveBeenCalledWith('Cannot inject text: main window not found');
        });
    });
});
