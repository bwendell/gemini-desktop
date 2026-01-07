/**
 * Unit tests for TextPredictionIpcHandler.
 *
 * Tests text prediction IPC handlers including:
 * - get/set enabled with model loading
 * - get/set GPU enabled with model reload
 * - get-status and predict operations
 * - CI environment handling
 * - Status and download progress broadcasting
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TextPredictionIpcHandler } from '../../../../src/main/managers/ipc/TextPredictionIpcHandler';
import type { IpcHandlerDependencies } from '../../../../src/main/managers/ipc/types';
import { createMockLogger, createMockWindowManager, createMockStore } from '../../../helpers/mocks';
import { IPC_CHANNELS } from '../../../../src/shared/constants/ipc-channels';

// Mock Electron
const { mockIpcMain, mockBrowserWindow } = vi.hoisted(() => {
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

    const mockWebContents = { send: vi.fn() };
    const mockWindow = {
        id: 1,
        isDestroyed: vi.fn().mockReturnValue(false),
        webContents: mockWebContents,
    };
    const mockBrowserWindow = {
        getAllWindows: vi.fn().mockReturnValue([mockWindow]),
        _mockWindow: mockWindow,
        _mockWebContents: mockWebContents,
        _reset: () => {
            mockWindow.isDestroyed.mockReturnValue(false);
            mockWebContents.send.mockReset();
            mockBrowserWindow.getAllWindows.mockReturnValue([mockWindow]);
        },
    };

    return { mockIpcMain, mockBrowserWindow };
});

vi.mock('electron', () => ({
    ipcMain: mockIpcMain,
    BrowserWindow: mockBrowserWindow,
}));

describe('TextPredictionIpcHandler', () => {
    let handler: TextPredictionIpcHandler;
    let mockDeps: IpcHandlerDependencies;
    let mockLogger: ReturnType<typeof createMockLogger>;
    let mockStore: ReturnType<typeof createMockStore>;
    let mockLlmManager: {
        isModelDownloaded: ReturnType<typeof vi.fn>;
        isModelLoaded: ReturnType<typeof vi.fn>;
        loadModel: ReturnType<typeof vi.fn>;
        unloadModel: ReturnType<typeof vi.fn>;
        downloadModel: ReturnType<typeof vi.fn>;
        predict: ReturnType<typeof vi.fn>;
        getStatus: ReturnType<typeof vi.fn>;
        getDownloadProgress: ReturnType<typeof vi.fn>;
        getErrorMessage: ReturnType<typeof vi.fn>;
        isGpuEnabled: ReturnType<typeof vi.fn>;
        setGpuEnabled: ReturnType<typeof vi.fn>;
        onStatusChange: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockIpcMain._reset();
        mockBrowserWindow._reset();

        mockLogger = createMockLogger();
        mockStore = createMockStore({
            textPredictionEnabled: false,
            textPredictionGpuEnabled: false,
        });

        mockLlmManager = {
            isModelDownloaded: vi.fn().mockReturnValue(true),
            isModelLoaded: vi.fn().mockReturnValue(false),
            loadModel: vi.fn().mockResolvedValue(undefined),
            unloadModel: vi.fn(),
            downloadModel: vi.fn().mockResolvedValue(undefined),
            predict: vi.fn().mockResolvedValue('predicted text'),
            getStatus: vi.fn().mockReturnValue('ready'),
            getDownloadProgress: vi.fn().mockReturnValue(0),
            getErrorMessage: vi.fn().mockReturnValue(null),
            isGpuEnabled: vi.fn().mockReturnValue(false),
            setGpuEnabled: vi.fn(),
            onStatusChange: vi.fn(),
        };

        mockDeps = {
            store: mockStore,
            logger: mockLogger,
            windowManager: createMockWindowManager(),
            llmManager: mockLlmManager as any,
        };

        handler = new TextPredictionIpcHandler(mockDeps);
    });

    describe('register', () => {
        it('registers all expected IPC handlers', () => {
            handler.register();

            expect(mockIpcMain.handle).toHaveBeenCalledWith(
                IPC_CHANNELS.TEXT_PREDICTION_GET_ENABLED,
                expect.any(Function)
            );
            expect(mockIpcMain.handle).toHaveBeenCalledWith(
                IPC_CHANNELS.TEXT_PREDICTION_SET_ENABLED,
                expect.any(Function)
            );
            expect(mockIpcMain.handle).toHaveBeenCalledWith(
                IPC_CHANNELS.TEXT_PREDICTION_GET_GPU_ENABLED,
                expect.any(Function)
            );
            expect(mockIpcMain.handle).toHaveBeenCalledWith(
                IPC_CHANNELS.TEXT_PREDICTION_SET_GPU_ENABLED,
                expect.any(Function)
            );
            expect(mockIpcMain.handle).toHaveBeenCalledWith(
                IPC_CHANNELS.TEXT_PREDICTION_GET_STATUS,
                expect.any(Function)
            );
            expect(mockIpcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.TEXT_PREDICTION_PREDICT, expect.any(Function));
        });

        it('subscribes to llmManager status changes (4.3.11)', () => {
            handler.register();

            expect(mockLlmManager.onStatusChange).toHaveBeenCalledWith(expect.any(Function));
        });
    });

    describe('text-prediction:get-enabled handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('returns stored enabled value (4.3.12)', async () => {
            mockStore.get.mockReturnValue(true);

            const handlerFn = mockIpcMain._handlers.get(IPC_CHANNELS.TEXT_PREDICTION_GET_ENABLED);
            const result = await handlerFn!();

            expect(mockStore.get).toHaveBeenCalledWith('textPredictionEnabled');
            expect(result).toBe(true);
        });

        it('returns false when store returns undefined', async () => {
            mockStore.get.mockReturnValue(undefined);

            const handlerFn = mockIpcMain._handlers.get(IPC_CHANNELS.TEXT_PREDICTION_GET_ENABLED);
            const result = await handlerFn!();

            expect(result).toBe(false);
        });
    });

    describe('text-prediction:set-enabled handler', () => {
        let originalCI: string | undefined;

        beforeEach(() => {
            // Save and clear CI env to ensure tests exercise the full code path
            originalCI = process.env.CI;
            delete process.env.CI;
            handler.register();
        });

        afterEach(() => {
            // Restore CI env
            if (originalCI === undefined) {
                delete process.env.CI;
            } else {
                process.env.CI = originalCI;
            }
        });

        it('validates boolean input (4.3.13)', async () => {
            const handlerFn = mockIpcMain._handlers.get(IPC_CHANNELS.TEXT_PREDICTION_SET_ENABLED);
            await handlerFn!({}, 'not-a-boolean' as any);

            expect(mockLogger.warn).toHaveBeenCalledWith('Invalid textPredictionEnabled value: not-a-boolean');
            expect(mockStore.set).not.toHaveBeenCalled();
        });

        it('downloads model if not downloaded when enabling (4.3.14)', async () => {
            mockLlmManager.isModelDownloaded.mockReturnValue(false);

            const handlerFn = mockIpcMain._handlers.get(IPC_CHANNELS.TEXT_PREDICTION_SET_ENABLED);
            await handlerFn!({}, true);

            expect(mockStore.set).toHaveBeenCalledWith('textPredictionEnabled', true);
            expect(mockLlmManager.downloadModel).toHaveBeenCalled();
        });

        it('loads model if not loaded when enabling (4.3.15)', async () => {
            mockLlmManager.isModelDownloaded.mockReturnValue(true);
            mockLlmManager.isModelLoaded.mockReturnValue(false);

            const handlerFn = mockIpcMain._handlers.get(IPC_CHANNELS.TEXT_PREDICTION_SET_ENABLED);
            await handlerFn!({}, true);

            expect(mockLlmManager.loadModel).toHaveBeenCalled();
        });

        it('unloads model when disabling (4.3.16)', async () => {
            const handlerFn = mockIpcMain._handlers.get(IPC_CHANNELS.TEXT_PREDICTION_SET_ENABLED);
            await handlerFn!({}, false);

            expect(mockStore.set).toHaveBeenCalledWith('textPredictionEnabled', false);
            expect(mockLlmManager.unloadModel).toHaveBeenCalled();
        });

        it('skips native operations in CI environment (4.3.17)', async () => {
            const originalCI = process.env.CI;
            process.env.CI = 'true';

            try {
                const handlerFn = mockIpcMain._handlers.get(IPC_CHANNELS.TEXT_PREDICTION_SET_ENABLED);
                await handlerFn!({}, true);

                expect(mockLogger.log).toHaveBeenCalledWith(
                    'CI environment detected - skipping native module operations'
                );
                expect(mockLlmManager.downloadModel).not.toHaveBeenCalled();
                expect(mockLlmManager.loadModel).not.toHaveBeenCalled();
            } finally {
                if (originalCI === undefined) {
                    delete process.env.CI;
                } else {
                    process.env.CI = originalCI;
                }
            }
        });

        it('handles null llmManager gracefully', async () => {
            const handlerWithoutLlm = new TextPredictionIpcHandler({
                ...mockDeps,
                llmManager: null,
            });
            handlerWithoutLlm.register();

            const handlerFn = mockIpcMain._handlers.get(IPC_CHANNELS.TEXT_PREDICTION_SET_ENABLED);

            // Should not throw
            await expect(handlerFn!({}, true)).resolves.not.toThrow();
            expect(mockStore.set).toHaveBeenCalledWith('textPredictionEnabled', true);
        });
    });

    describe('text-prediction:set-gpu-enabled handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('reloads model if loaded when GPU setting changes (4.3.18)', async () => {
            mockLlmManager.isModelLoaded.mockReturnValue(true);

            const handlerFn = mockIpcMain._handlers.get(IPC_CHANNELS.TEXT_PREDICTION_SET_GPU_ENABLED);
            await handlerFn!({}, true);

            expect(mockStore.set).toHaveBeenCalledWith('textPredictionGpuEnabled', true);
            expect(mockLlmManager.setGpuEnabled).toHaveBeenCalledWith(true);
            expect(mockLlmManager.unloadModel).toHaveBeenCalled();
            expect(mockLlmManager.loadModel).toHaveBeenCalled();
        });

        it('does not reload if model not loaded', async () => {
            mockLlmManager.isModelLoaded.mockReturnValue(false);

            const handlerFn = mockIpcMain._handlers.get(IPC_CHANNELS.TEXT_PREDICTION_SET_GPU_ENABLED);
            await handlerFn!({}, true);

            expect(mockLlmManager.setGpuEnabled).toHaveBeenCalledWith(true);
            expect(mockLlmManager.unloadModel).not.toHaveBeenCalled();
            expect(mockLlmManager.loadModel).not.toHaveBeenCalled();
        });

        it('validates boolean input', async () => {
            const handlerFn = mockIpcMain._handlers.get(IPC_CHANNELS.TEXT_PREDICTION_SET_GPU_ENABLED);
            await handlerFn!({}, 'invalid' as any);

            expect(mockLogger.warn).toHaveBeenCalledWith('Invalid textPredictionGpuEnabled value: invalid');
        });
    });

    describe('text-prediction:predict handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('returns null with null llmManager (4.3.19)', async () => {
            const handlerWithoutLlm = new TextPredictionIpcHandler({
                ...mockDeps,
                llmManager: null,
            });
            handlerWithoutLlm.register();

            const handlerFn = mockIpcMain._handlers.get(IPC_CHANNELS.TEXT_PREDICTION_PREDICT);
            const result = await handlerFn!({}, 'test input');

            expect(result).toBe(null);
            expect(mockLogger.warn).toHaveBeenCalledWith('LlmManager not available for prediction');
        });

        it('returns null with non-string input (4.3.20)', async () => {
            const handlerFn = mockIpcMain._handlers.get(IPC_CHANNELS.TEXT_PREDICTION_PREDICT);
            const result = await handlerFn!({}, 123 as any);

            expect(result).toBe(null);
            expect(mockLogger.warn).toHaveBeenCalledWith('Invalid partialText value: number');
        });

        it('calls llmManager.predict with valid input', async () => {
            mockLlmManager.predict.mockResolvedValue('completed text');

            const handlerFn = mockIpcMain._handlers.get(IPC_CHANNELS.TEXT_PREDICTION_PREDICT);
            const result = await handlerFn!({}, 'partial text');

            expect(mockLlmManager.predict).toHaveBeenCalledWith('partial text');
            expect(result).toBe('completed text');
        });
    });

    describe('status change broadcasting (4.3.21)', () => {
        it('broadcasts status to all windows on status change', () => {
            handler.register();

            // Get the status change callback
            const statusChangeCallback = mockLlmManager.onStatusChange.mock.calls[0][0];

            // Trigger status change
            statusChangeCallback();

            expect(mockBrowserWindow._mockWebContents.send).toHaveBeenCalledWith(
                IPC_CHANNELS.TEXT_PREDICTION_STATUS_CHANGED,
                expect.objectContaining({
                    enabled: expect.any(Boolean),
                    gpuEnabled: expect.any(Boolean),
                    status: expect.any(String),
                })
            );
        });
    });

    describe('download progress broadcasting (4.3.22)', () => {
        let originalCI: string | undefined;

        beforeEach(() => {
            // Save and clear CI env to ensure download code path is exercised
            originalCI = process.env.CI;
            delete process.env.CI;
        });

        afterEach(() => {
            // Restore CI env
            if (originalCI === undefined) {
                delete process.env.CI;
            } else {
                process.env.CI = originalCI;
            }
        });

        it('broadcasts download progress to all windows', async () => {
            handler.register();

            // Mock downloadModel to call the progress callback
            mockLlmManager.isModelDownloaded.mockReturnValue(false);
            mockLlmManager.downloadModel.mockImplementation(async (callback) => {
                callback(50);
                callback(100);
            });

            const handlerFn = mockIpcMain._handlers.get(IPC_CHANNELS.TEXT_PREDICTION_SET_ENABLED);
            await handlerFn!({}, true);

            expect(mockBrowserWindow._mockWebContents.send).toHaveBeenCalledWith(
                IPC_CHANNELS.TEXT_PREDICTION_DOWNLOAD_PROGRESS,
                50
            );
            expect(mockBrowserWindow._mockWebContents.send).toHaveBeenCalledWith(
                IPC_CHANNELS.TEXT_PREDICTION_DOWNLOAD_PROGRESS,
                100
            );
        });
    });

    describe('initializeOnStartup', () => {
        it('skips initialization without llmManager', async () => {
            const handlerWithoutLlm = new TextPredictionIpcHandler({
                ...mockDeps,
                llmManager: null,
            });

            await handlerWithoutLlm.initializeOnStartup();

            expect(mockLogger.log).toHaveBeenCalledWith('Text prediction initialization skipped - no LlmManager');
        });

        it('skips auto-load if not enabled', async () => {
            mockStore.get.mockImplementation((key) => {
                if (key === 'textPredictionEnabled') return false;
                return undefined;
            });

            await handler.initializeOnStartup();

            expect(mockLogger.log).toHaveBeenCalledWith('Text prediction disabled, skipping model load');
            expect(mockLlmManager.loadModel).not.toHaveBeenCalled();
        });

        it('skips auto-load if model not downloaded', async () => {
            mockStore.get.mockImplementation((key) => {
                if (key === 'textPredictionEnabled') return true;
                return undefined;
            });
            mockLlmManager.isModelDownloaded.mockReturnValue(false);

            await handler.initializeOnStartup();

            expect(mockLogger.log).toHaveBeenCalledWith(
                'Text prediction enabled but model not downloaded, skipping auto-load'
            );
            expect(mockLlmManager.loadModel).not.toHaveBeenCalled();
        });

        it('loads model on startup if enabled and downloaded', async () => {
            mockStore.get.mockImplementation((key) => {
                if (key === 'textPredictionEnabled') return true;
                if (key === 'textPredictionGpuEnabled') return true;
                return undefined;
            });
            mockLlmManager.isModelDownloaded.mockReturnValue(true);

            await handler.initializeOnStartup();

            expect(mockLlmManager.setGpuEnabled).toHaveBeenCalledWith(true);
            expect(mockLlmManager.loadModel).toHaveBeenCalled();
        });
    });

    describe('text-prediction:get-status handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('returns full status object', async () => {
            mockStore.get.mockImplementation((key) => {
                if (key === 'textPredictionEnabled') return true;
                if (key === 'textPredictionGpuEnabled') return false;
                return undefined;
            });
            mockLlmManager.getStatus.mockReturnValue('ready');
            mockLlmManager.getDownloadProgress.mockReturnValue(100);

            const handlerFn = mockIpcMain._handlers.get(IPC_CHANNELS.TEXT_PREDICTION_GET_STATUS);
            const result = await handlerFn!();

            expect(result).toEqual({
                enabled: true,
                gpuEnabled: false,
                status: 'ready',
                downloadProgress: 100,
                errorMessage: undefined,
            });
        });
    });
});
