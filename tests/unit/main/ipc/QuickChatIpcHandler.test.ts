/**
 * Unit tests for QuickChatIpcHandler.
 *
 * Tests Quick Chat IPC handlers including:
 * - quick-chat:submit, hide, cancel
 * - gemini:ready with text injection
 * - E2E mode handling
 * - Error scenarios
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuickChatIpcHandler } from '../../../../src/main/managers/ipc/QuickChatIpcHandler';
import type { IpcHandlerDependencies } from '../../../../src/main/managers/ipc/types';
import { createMockLogger, createMockWindowManager, createMockStore } from '../../../helpers/mocks';
import { IPC_CHANNELS } from '../../../../src/shared/constants/ipc-channels';
import { getTabFrameName } from '../../../../src/shared/types/tabs';

// Mock Electron
const { mockIpcMain } = vi.hoisted(() => {
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

    return { mockIpcMain };
});

vi.mock('electron', () => ({
    ipcMain: mockIpcMain,
}));

// Mock InjectionScriptBuilder
let autoSubmitArg: boolean | null = null;

vi.mock('../../../../src/main/utils/injectionScript', () => ({
    InjectionScriptBuilder: class MockInjectionScriptBuilder {
        withText() {
            return this;
        }
        withAutoSubmit(value: boolean) {
            autoSubmitArg = value;
            return this;
        }
        build() {
            return 'mocked-injection-script';
        }
    },
}));

// Note: We don't mock isGeminiDomain - it uses real implementation
// The test uses URLs like 'https://gemini.google.com/app' which match the real function

describe('QuickChatIpcHandler', () => {
    let handler: QuickChatIpcHandler;
    let mockDeps: IpcHandlerDependencies;
    let mockLogger: ReturnType<typeof createMockLogger>;
    let mockWindowManager: ReturnType<typeof createMockWindowManager>;
    let mockMainWindow: {
        webContents: {
            send: ReturnType<typeof vi.fn>;
            mainFrame: {
                frames: Array<{
                    name?: string;
                    url: string;
                    executeJavaScript: ReturnType<typeof vi.fn>;
                }>;
            };
        };
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockIpcMain._reset();
        autoSubmitArg = null;

        mockLogger = createMockLogger();
        mockWindowManager = createMockWindowManager();

        // Create mock main window with webContents
        mockMainWindow = {
            webContents: {
                send: vi.fn(),
                mainFrame: {
                    frames: [],
                },
            },
        };

        // Mock windowManager.getMainWindow to return our mock
        (mockWindowManager.getMainWindow as ReturnType<typeof vi.fn>).mockReturnValue(mockMainWindow);

        mockDeps = {
            store: createMockStore({}),
            logger: mockLogger,
            windowManager: mockWindowManager,
        } as unknown as IpcHandlerDependencies;

        handler = new QuickChatIpcHandler(mockDeps);
    });

    describe('register', () => {
        it('registers all expected IPC listeners', () => {
            handler.register();

            expect(mockIpcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.QUICK_CHAT_SUBMIT, expect.any(Function));
            expect(mockIpcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.GEMINI_READY, expect.any(Function));
            expect(mockIpcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.QUICK_CHAT_HIDE, expect.any(Function));
            expect(mockIpcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.QUICK_CHAT_CANCEL, expect.any(Function));
        });
    });

    describe('quick-chat:submit handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('hides quick chat and focuses main window (4.2.7)', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.QUICK_CHAT_SUBMIT);
            listener!({}, 'Hello Gemini!');

            expect(mockWindowManager.hideQuickChat).toHaveBeenCalled();
            expect(mockWindowManager.focusMainWindow).toHaveBeenCalled();
        });

        it('sends gemini:navigate to main window with text', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.QUICK_CHAT_SUBMIT);
            listener!({}, 'Hello Gemini!');

            expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
                IPC_CHANNELS.GEMINI_NAVIGATE,
                expect.objectContaining({
                    requestId: expect.any(String),
                    targetTabId: expect.any(String),
                    text: 'Hello Gemini!',
                })
            );
        });

        it('logs error when main window is not found (4.2.8)', () => {
            (mockWindowManager.getMainWindow as ReturnType<typeof vi.fn>).mockReturnValue(null);

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.QUICK_CHAT_SUBMIT);
            listener!({}, 'Hello Gemini!');

            expect(mockLogger.error).toHaveBeenCalledWith('Cannot navigate: main window not found');
        });

        it('logs truncated text preview', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.QUICK_CHAT_SUBMIT);
            listener!({}, 'Hello Gemini!');

            expect(mockLogger.log).toHaveBeenCalledWith(
                'Quick Chat submit received:',
                expect.stringContaining('Hello Gemini')
            );
        });
    });

    describe('quick-chat:hide handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('calls windowManager.hideQuickChat (4.2.9)', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.QUICK_CHAT_HIDE);
            listener!();

            expect(mockWindowManager.hideQuickChat).toHaveBeenCalled();
        });

        it('handles error gracefully', () => {
            (mockWindowManager.hideQuickChat as ReturnType<typeof vi.fn>).mockImplementation(() => {
                throw new Error('Hide error');
            });

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.QUICK_CHAT_HIDE);

            expect(() => listener!()).not.toThrow();
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error during hiding quick chat:',
                expect.objectContaining({ error: 'Hide error' })
            );
        });
    });

    describe('quick-chat:cancel handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('calls windowManager.hideQuickChat (4.2.10)', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.QUICK_CHAT_CANCEL);
            listener!();

            expect(mockWindowManager.hideQuickChat).toHaveBeenCalled();
        });

        it('logs cancellation', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.QUICK_CHAT_CANCEL);
            listener!();

            expect(mockLogger.log).toHaveBeenCalledWith('Quick Chat cancelled');
        });
    });

    describe('gemini:ready handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('triggers text injection (4.2.11)', async () => {
            const submitListener = mockIpcMain._listeners.get(IPC_CHANNELS.QUICK_CHAT_SUBMIT);
            submitListener!({}, 'Inject this text');

            const navigatePayload = mockMainWindow.webContents.send.mock.calls[0]?.[1] as {
                requestId: string;
                targetTabId: string;
            };

            const mockGeminiFrame = {
                name: getTabFrameName(navigatePayload.targetTabId),
                url: 'https://gemini.google.com/app',
                executeJavaScript: vi.fn().mockResolvedValue({ success: true }),
            };
            mockMainWindow.webContents.mainFrame.frames = [mockGeminiFrame];

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.GEMINI_READY);
            await listener!({}, navigatePayload);

            expect(mockGeminiFrame.executeJavaScript).toHaveBeenCalled();
            expect(mockLogger.log).toHaveBeenCalledWith('Text injected into Gemini successfully');
        });

        it('logs error when Gemini iframe not found (4.2.12)', async () => {
            const submitListener = mockIpcMain._listeners.get(IPC_CHANNELS.QUICK_CHAT_SUBMIT);
            submitListener!({}, 'Inject this text');

            const navigatePayload = mockMainWindow.webContents.send.mock.calls[0]?.[1] as {
                requestId: string;
                targetTabId: string;
            };

            mockMainWindow.webContents.mainFrame.frames = [
                { name: 'gemini-tab-some-other-id', url: 'https://gemini.google.com/app', executeJavaScript: vi.fn() },
            ];

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.GEMINI_READY);
            await listener!({}, navigatePayload);

            expect(mockLogger.error).toHaveBeenCalledWith('Cannot inject text: target tab frame not found');
        });

        it('logs error when main window not found', async () => {
            const submitListener = mockIpcMain._listeners.get(IPC_CHANNELS.QUICK_CHAT_SUBMIT);
            submitListener!({}, 'Inject this text');

            const navigatePayload = mockMainWindow.webContents.send.mock.calls[0]?.[1] as {
                requestId: string;
                targetTabId: string;
            };

            (mockWindowManager.getMainWindow as ReturnType<typeof vi.fn>).mockReturnValue(null);

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.GEMINI_READY);
            await listener!({}, navigatePayload);

            expect(mockLogger.error).toHaveBeenCalledWith('Cannot inject text: main window not found');
        });

        it('handles injection script failure (4.2.14)', async () => {
            const submitListener = mockIpcMain._listeners.get(IPC_CHANNELS.QUICK_CHAT_SUBMIT);
            submitListener!({}, 'Inject this text');

            const navigatePayload = mockMainWindow.webContents.send.mock.calls[0]?.[1] as {
                requestId: string;
                targetTabId: string;
            };

            const mockGeminiFrame = {
                name: getTabFrameName(navigatePayload.targetTabId),
                url: 'https://gemini.google.com/app',
                executeJavaScript: vi.fn().mockResolvedValue({ success: false, error: 'Editor not found' }),
            };
            mockMainWindow.webContents.mainFrame.frames = [mockGeminiFrame];

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.GEMINI_READY);
            await listener!({}, navigatePayload);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Injection script returned failure:',
                expect.objectContaining({
                    details: undefined,
                    error: 'Editor not found',
                })
            );
        });

        it('handles executeJavaScript exception', async () => {
            const submitListener = mockIpcMain._listeners.get(IPC_CHANNELS.QUICK_CHAT_SUBMIT);
            submitListener!({}, 'Inject this text');

            const navigatePayload = mockMainWindow.webContents.send.mock.calls[0]?.[1] as {
                requestId: string;
                targetTabId: string;
            };

            const mockGeminiFrame = {
                name: getTabFrameName(navigatePayload.targetTabId),
                url: 'https://gemini.google.com/app',
                executeJavaScript: vi.fn().mockRejectedValue(new Error('JS execution failed')),
            };
            mockMainWindow.webContents.mainFrame.frames = [mockGeminiFrame];

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.GEMINI_READY);
            await listener!({}, navigatePayload);

            expect(mockLogger.error).toHaveBeenCalledWith('Failed to inject text into Gemini:', expect.any(Error));
        });
    });

    describe('E2E mode handling', () => {
        beforeEach(() => {
            handler.register();
        });

        it('disables auto-submit in E2E mode (4.2.13)', async () => {
            // Mock E2E mode
            const originalArgv = process.argv;
            process.argv = [...originalArgv, '--e2e-disable-auto-submit'];

            try {
                const submitListener = mockIpcMain._listeners.get(IPC_CHANNELS.QUICK_CHAT_SUBMIT);
                submitListener!({}, 'Test text');

                const navigatePayload = mockMainWindow.webContents.send.mock.calls[0]?.[1] as {
                    requestId: string;
                    targetTabId: string;
                };

                const mockGeminiFrame = {
                    name: getTabFrameName(navigatePayload.targetTabId),
                    url: 'https://gemini.google.com/app',
                    executeJavaScript: vi.fn().mockResolvedValue({ success: true }),
                };
                mockMainWindow.webContents.mainFrame.frames = [mockGeminiFrame];

                const listener = mockIpcMain._listeners.get(IPC_CHANNELS.GEMINI_READY);
                await listener!({}, navigatePayload);

                expect(autoSubmitArg).toBe(false);
            } finally {
                process.argv = originalArgv;
            }
        });
    });
});
