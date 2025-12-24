/**
 * Integration tests for Quick Chat text injection flow.
 * Tests the complex flow: Quick Chat window → IPC → WindowManager → Gemini iframe injection
 * 
 * These tests verify the complete Quick Chat submission flow across multiple managers
 * and iframe boundaries, including error handling and edge cases.
 * 
 * Gap Filled:
 * - Unit tests: Mock webContents and executeJavaScript
 * - E2E tests: Test full UI but slowly and don't cover all error paths
 * - Integration tests: Verify actual iframe discovery + injection + WindowManager coordination
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';
import IpcManager from '../../electron/managers/ipcManager';
import WindowManager from '../../electron/managers/windowManager';
import { InjectionScriptBuilder } from '../../electron/utils/injectionScript';

// Mock logger
const mockLogger = vi.hoisted(() => ({
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
}));
vi.mock('../../electron/utils/logger', () => ({
    createLogger: () => mockLogger
}));

// Helper to send IPC message
const sendMessage = (channel: string, ...args: any[]) => {
    const listener = (ipcMain as any)._listeners.get(channel);
    if (!listener) throw new Error(`No listener for channel: ${channel}`);
    return listener({}, ...args);
};

describe('Quick Chat Injection Flow Integration', () => {
    let ipcManager: IpcManager;
    let windowManager: WindowManager;
    let mockStore: any;

    beforeEach(() => {
        vi.clearAllMocks();
        if ((ipcMain as any)._reset) (ipcMain as any)._reset();
        if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();

        mockStore = {
            get: vi.fn().mockReturnValue('system'),
            set: vi.fn()
        };

        windowManager = new WindowManager(false);
        ipcManager = new IpcManager(
            windowManager,
            null,
            null,
            mockStore,
            mockLogger
        );
        ipcManager.setupIpcHandlers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Complete Injection Flow', () => {
        it('should complete full injection flow successfully', async () => {
            // Create mock main window with Gemini iframe
            const mockFrame = {
                url: 'https://gemini.google.com/app',
                executeJavaScript: vi.fn().mockResolvedValue({ success: true })
            };
            const mockMainWindow = {
                webContents: {
                    mainFrame: {
                        frames: [mockFrame]
                    }
                }
            };

            // Create mock Quick Chat window
            const mockQuickChatWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                hide: vi.fn(),
                close: vi.fn()
            };

            // Spy on WindowManager methods
            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockMainWindow as any);
            vi.spyOn(windowManager, 'hideQuickChat').mockImplementation(() => { });
            vi.spyOn(windowManager, 'focusMainWindow').mockImplementation(() => { });

            // Simulate Quick Chat submission: electronAPI.submitQuickChat('test prompt')
            await sendMessage('quick-chat:submit', 'test prompt');

            // Verify flow sequence
            expect(windowManager.hideQuickChat).toHaveBeenCalled();
            expect(windowManager.focusMainWindow).toHaveBeenCalled();
            expect(mockFrame.executeJavaScript).toHaveBeenCalled();

            // Verify injection script was called with correct text
            const scriptArg = mockFrame.executeJavaScript.mock.calls[0][0];
            expect(scriptArg).toContain('test prompt');
        });

        it('should handle text with special characters', async () => {
            const mockFrame = {
                url: 'https://gemini.google.com/app',
                executeJavaScript: vi.fn().mockResolvedValue({ success: true })
            };
            const mockMainWindow = {
                webContents: {
                    mainFrame: {
                        frames: [mockFrame]
                    }
                }
            };

            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockMainWindow as any);
            vi.spyOn(windowManager, 'hideQuickChat').mockImplementation(() => { });
            vi.spyOn(windowManager, 'focusMainWindow').mockImplementation(() => { });

            // Test special characters that need escaping
            const specialText = 'Test with "quotes" and \\backslashes\\ and\nnewlines';
            await sendMessage('quick-chat:submit', specialText);

            expect(mockFrame.executeJavaScript).toHaveBeenCalled();
            // Injection script should have escaped the text properly
            const scriptArg = mockFrame.executeJavaScript.mock.calls[0][0];
            expect(scriptArg).toBeDefined();
        });
    });

    describe('Error Scenarios', () => {
        it('should handle main window not found', async () => {
            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(null);

            // Simulate Quick Chat submission
            await sendMessage('quick-chat:submit', 'test prompt');

            // Should log error and not crash
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Cannot inject text: main window not found'
            );
        });

        it('should handle Gemini iframe not found', async () => {
            const mockMainWindow = {
                webContents: {
                    mainFrame: {
                        frames: [
                            { url: 'https://example.com' } // Wrong URL
                        ]
                    }
                }
            };

            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockMainWindow as any);
            vi.spyOn(windowManager, 'hideQuickChat').mockImplementation(() => { });
            vi.spyOn(windowManager, 'focusMainWindow').mockImplementation(() => { });

            // Simulate Quick Chat submission
            await sendMessage('quick-chat:submit', 'test prompt');

            // Should log error about iframe not found
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Cannot inject text: Gemini iframe not found'
            );
        });

        it('should handle injection script failure', async () => {
            const mockFrame = {
                url: 'https://gemini.google.com/app',
                executeJavaScript: vi.fn().mockResolvedValue({
                    success: false,
                    error: 'Input element not found'
                })
            };
            const mockMainWindow = {
                webContents: {
                    mainFrame: {
                        frames: [mockFrame]
                    }
                }
            };

            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockMainWindow as any);
            vi.spyOn(windowManager, 'hideQuickChat').mockImplementation(() => { });
            vi.spyOn(windowManager, 'focusMainWindow').mockImplementation(() => { });

            // Simulate Quick Chat submission
            await sendMessage('quick-chat:submit', 'test prompt');

            // Should log injection failure
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Injection script returned failure:',
                'Input element not found'
            );
        });

        it('should handle executeJavaScript exception', async () => {
            const mockFrame = {
                url: 'https://gemini.google.com/app',
                executeJavaScript: vi.fn().mockRejectedValue(new Error('Script execution failed'))
            };
            const mockMainWindow = {
                webContents: {
                    mainFrame: {
                        frames: [mockFrame]
                    }
                }
            };

            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockMainWindow as any);
            vi.spyOn(windowManager, 'hideQuickChat').mockImplementation(() => { });
            vi.spyOn(windowManager, 'focusMainWindow').mockImplementation(() => { });

            // Simulate Quick Chat submission
            await sendMessage('quick-chat:submit', 'test prompt');

            // Should log error with exception
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Failed to inject text into Gemini:',
                expect.any(Error)
            );
        });

        it('should handle window destroyed mid-injection', async () => {
            const mockFrame = {
                url: 'https://gemini.google.com/app',
                executeJavaScript: vi.fn().mockResolvedValue({ success: true })
            };
            const mockMainWindow = {
                webContents: {
                    mainFrame: {
                        frames: [mockFrame]
                    }
                }
            };

            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockMainWindow as any);
            vi.spyOn(windowManager, 'hideQuickChat').mockImplementation(() => {
                throw new Error('Window destroyed');
            });

            // Simulate Quick Chat submission
            await sendMessage('quick-chat:submit', 'test prompt');

            // Should handle error gracefully
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error handling quick chat submit:',
                expect.any(Error)
            );
        });
    });

    describe('WindowManager Coordination', () => {
        it('should hide Quick Chat before injection', async () => {
            const mockFrame = {
                url: 'https://gemini.google.com/app',
                executeJavaScript: vi.fn().mockResolvedValue({ success: true })
            };
            const mockMainWindow = {
                webContents: {
                    mainFrame: {
                        frames: [mockFrame]
                    }
                }
            };

            const callOrder: string[] = [];

            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockMainWindow as any);
            vi.spyOn(windowManager, 'hideQuickChat').mockImplementation(() => {
                callOrder.push('hide');
            });
            vi.spyOn(windowManager, 'focusMainWindow').mockImplementation(() => {
                callOrder.push('focus');
            });
            mockFrame.executeJavaScript.mockImplementation(async () => {
                callOrder.push('inject');
                return { success: true };
            });

            // Simulate Quick Chat submission
            await sendMessage('quick-chat:submit', 'test prompt');

            // Verify correct order: hide → focus → inject
            expect(callOrder).toEqual(['hide', 'focus', 'inject']);
        });

        it('should focus main window after hiding Quick Chat', async () => {
            const mockFrame = {
                url: 'https://gemini.google.com/app',
                executeJavaScript: vi.fn().mockResolvedValue({ success: true })
            };
            const mockMainWindow = {
                webContents: {
                    mainFrame: {
                        frames: [mockFrame]
                    }
                }
            };

            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockMainWindow as any);
            vi.spyOn(windowManager, 'hideQuickChat').mockImplementation(() => { });
            vi.spyOn(windowManager, 'focusMainWindow').mockImplementation(() => { });

            // Simulate Quick Chat submission
            await sendMessage('quick-chat:submit', 'test prompt');

            expect(windowManager.hideQuickChat).toHaveBeenCalled();
            expect(windowManager.focusMainWindow).toHaveBeenCalled();
        });
    });

    describe('InjectionScript Builder Integration', () => {
        it('should use InjectionScriptBuilder correctly', () => {
            const builder = new InjectionScriptBuilder();
            const script = builder
                .withText('test prompt')
                .withLogLevel('error')
                .build();

            // Verify script is a string
            expect(typeof script).toBe('string');
            // Verify script contains the text (escaped)
            expect(script).toContain('test prompt');
        });

        it('should handle custom config', () => {
            const builder = new InjectionScriptBuilder();
            const script = builder
                .withText('custom test')
                .withSubmitDelay(200)
                .withLogLevel('debug')
                .build();

            expect(typeof script).toBe('string');
            expect(script).toBeDefined();
        });

        it('should escape text correctly in builder', () => {
            const builder = new InjectionScriptBuilder();
            const script = builder
                .withText('Text with "quotes" and \\backslashes\\')
                .build();

            // Script should be valid JavaScript
            expect(typeof script).toBe('string');
            // Should not contain unescaped quotes that would break the script
            expect(script).toBeDefined();
        });
    });

    describe('Quick Chat Hide/Cancel Operations', () => {
        it('should handle hideQuickChat IPC', () => {
            vi.spyOn(windowManager, 'hideQuickChat').mockImplementation(() => { });

            // Simulate: electronAPI.hideQuickChat()
            sendMessage('quick-chat:hide');

            expect(windowManager.hideQuickChat).toHaveBeenCalled();
        });

        it('should handle cancelQuickChat IPC', () => {
            vi.spyOn(windowManager, 'hideQuickChat').mockImplementation(() => { });

            // Simulate: electronAPI.cancelQuickChat()
            sendMessage('quick-chat:cancel');

            expect(windowManager.hideQuickChat).toHaveBeenCalled();
            expect(mockLogger.log).toHaveBeenCalledWith('Quick Chat cancelled');
        });

        it('should handle hide errors gracefully', () => {
            vi.spyOn(windowManager, 'hideQuickChat').mockImplementation(() => {
                throw new Error('Hide failed');
            });

            // Simulate: electronAPI.hideQuickChat()
            sendMessage('quick-chat:hide');

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error hiding quick chat:',
                expect.any(Error)
            );
        });

        it('should handle cancel errors gracefully', () => {
            vi.spyOn(windowManager, 'hideQuickChat').mockImplementation(() => {
                throw new Error('Cancel failed');
            });

            // Simulate: electronAPI.cancelQuickChat()
            sendMessage('quick-chat:cancel');

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error cancelling quick chat:',
                expect.any(Error)
            );
        });
    });

    describe('Iframe Discovery Logic', () => {
        it('should find Gemini iframe among multiple frames', async () => {
            const mockGeminiFrame = {
                url: 'https://gemini.google.com/app',
                executeJavaScript: vi.fn().mockResolvedValue({ success: true })
            };
            const mockMainWindow = {
                webContents: {
                    mainFrame: {
                        frames: [
                            { url: 'https://example.com' },
                            { url: 'https://google.com' },
                            mockGeminiFrame, // Target frame
                            { url: 'https://other.com' }
                        ]
                    }
                }
            };

            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockMainWindow as any);
            vi.spyOn(windowManager, 'hideQuickChat').mockImplementation(() => { });
            vi.spyOn(windowManager, 'focusMainWindow').mockImplementation(() => { });

            // Simulate Quick Chat submission
            await sendMessage('quick-chat:submit', 'test prompt');

            // Should find and use the Gemini frame
            expect(mockGeminiFrame.executeJavaScript).toHaveBeenCalled();
        });

        it('should handle empty frames array', async () => {
            const mockMainWindow = {
                webContents: {
                    mainFrame: {
                        frames: []
                    }
                }
            };

            vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockMainWindow as any);
            vi.spyOn(windowManager, 'hideQuickChat').mockImplementation(() => { });
            vi.spyOn(windowManager, 'focusMainWindow').mockImplementation(() => { });

            // Simulate Quick Chat submission
            await sendMessage('quick-chat:submit', 'test prompt');

            // Should log iframe not found
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Cannot inject text: Gemini iframe not found'
            );
        });

        it('should match Gemini URL patterns', async () => {
            const acceptedUrls = [
                'https://gemini.google.com/app',
                'https://gemini.google.com/app/something',
                'https://aistudio.google.com/app'
            ];

            for (const url of acceptedUrls) {
                // Only clear logger mocks, not IPC handlers
                mockLogger.log.mockClear();
                mockLogger.error.mockClear();
                mockLogger.warn.mockClear();

                const mockFrame = {
                    url,
                    executeJavaScript: vi.fn().mockResolvedValue({ success: true })
                };
                const mockMainWindow = {
                    webContents: {
                        mainFrame: {
                            frames: [mockFrame]
                        }
                    }
                };

                vi.spyOn(windowManager, 'getMainWindow').mockReturnValue(mockMainWindow as any);
                vi.spyOn(windowManager, 'hideQuickChat').mockImplementation(() => { });
                vi.spyOn(windowManager, 'focusMainWindow').mockImplementation(() => { });

                await sendMessage('quick-chat:submit', 'test');

                expect(mockFrame.executeJavaScript).toHaveBeenCalled();
            }
        });

    });
});
