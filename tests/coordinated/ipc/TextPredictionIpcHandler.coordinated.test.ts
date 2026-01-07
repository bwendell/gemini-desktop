/**
 * Coordinated tests for TextPredictionIpcHandler.
 *
 * Tests startup initialization flow (4.3.23) and full enable/disable cycle (4.3.24).
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

describe('TextPredictionIpcHandler Coordinated Tests', () => {
    let mockStore: any;
    let mockLlmManager: any;

    beforeEach(() => {
        vi.clearAllMocks();
        if ((ipcMain as any)._reset) (ipcMain as any)._reset();
        if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();

        mockStore = {
            get: vi.fn((key: string) => {
                const data: Record<string, any> = {
                    textPredictionEnabled: false,
                    textPredictionGpuEnabled: false,
                };
                return data[key];
            }),
            set: vi.fn(),
            getAll: vi.fn(() => ({})),
        };

        mockLlmManager = {
            isModelDownloaded: vi.fn().mockReturnValue(true),
            isModelLoaded: vi.fn().mockReturnValue(false),
            loadModel: vi.fn().mockResolvedValue(undefined),
            unloadModel: vi.fn(),
            downloadModel: vi.fn().mockResolvedValue(undefined),
            predict: vi.fn().mockResolvedValue('completed text'),
            getStatus: vi.fn().mockReturnValue('ready'),
            getDownloadProgress: vi.fn().mockReturnValue(0),
            getErrorMessage: vi.fn().mockReturnValue(null),
            isGpuEnabled: vi.fn().mockReturnValue(false),
            setGpuEnabled: vi.fn(),
            onStatusChange: vi.fn(),
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Startup Initialization Flow (4.3.23)', () => {
        it('should load model on startup if enabled and downloaded', async () => {
            // Set store to return enabled
            mockStore.get.mockImplementation((key: string) => {
                if (key === 'textPredictionEnabled') return true;
                if (key === 'textPredictionGpuEnabled') return true;
                return undefined;
            });
            mockLlmManager.isModelDownloaded.mockReturnValue(true);

            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, mockLlmManager, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            // Call initializeTextPrediction (which delegates to handler)
            await ipcManager.initializeTextPrediction();

            expect(mockLlmManager.setGpuEnabled).toHaveBeenCalledWith(true);
            expect(mockLlmManager.loadModel).toHaveBeenCalled();
        });

        it('should skip loading if disabled', async () => {
            mockStore.get.mockImplementation((key: string) => {
                if (key === 'textPredictionEnabled') return false;
                return undefined;
            });

            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, mockLlmManager, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();
            await ipcManager.initializeTextPrediction();

            expect(mockLlmManager.loadModel).not.toHaveBeenCalled();
        });

        it('should skip loading if model not downloaded', async () => {
            mockStore.get.mockImplementation((key: string) => {
                if (key === 'textPredictionEnabled') return true;
                return undefined;
            });
            mockLlmManager.isModelDownloaded.mockReturnValue(false);

            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, mockLlmManager, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();
            await ipcManager.initializeTextPrediction();

            expect(mockLlmManager.loadModel).not.toHaveBeenCalled();
        });
    });

    describe('Full Enable/Disable Cycle (4.3.24)', () => {
        let originalCI: string | undefined;

        beforeEach(() => {
            // Save and clear CI env to ensure tests exercise the full code path
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

        it('should coordinate full enable -> disable cycle', async () => {
            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, mockLlmManager, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            // Get the set-enabled handler
            const setEnabledHandler = (ipcMain as any)._handlers.get('text-prediction:set-enabled');
            expect(setEnabledHandler).toBeDefined();

            // Enable text prediction
            await setEnabledHandler({}, true);

            expect(mockStore.set).toHaveBeenCalledWith('textPredictionEnabled', true);
            expect(mockLlmManager.loadModel).toHaveBeenCalled();

            // Reset mocks
            mockStore.set.mockClear();
            mockLlmManager.loadModel.mockClear();
            mockLlmManager.unloadModel.mockClear();

            // Disable text prediction
            await setEnabledHandler({}, false);

            expect(mockStore.set).toHaveBeenCalledWith('textPredictionEnabled', false);
            expect(mockLlmManager.unloadModel).toHaveBeenCalled();
        });

        it('should coordinate GPU toggle with model reload', async () => {
            mockLlmManager.isModelLoaded.mockReturnValue(true);

            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, mockLlmManager, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            // Get the set-gpu-enabled handler
            const setGpuEnabledHandler = (ipcMain as any)._handlers.get('text-prediction:set-gpu-enabled');
            expect(setGpuEnabledHandler).toBeDefined();

            // Toggle GPU setting while model is loaded
            await setGpuEnabledHandler({}, true);

            expect(mockStore.set).toHaveBeenCalledWith('textPredictionGpuEnabled', true);
            expect(mockLlmManager.setGpuEnabled).toHaveBeenCalledWith(true);
            expect(mockLlmManager.unloadModel).toHaveBeenCalled();
            expect(mockLlmManager.loadModel).toHaveBeenCalled();
        });

        it('should predict text when model is ready', async () => {
            mockLlmManager.predict.mockResolvedValue('Hello world!');

            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, mockLlmManager, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            // Get the predict handler
            const predictHandler = (ipcMain as any)._handlers.get('text-prediction:predict');
            expect(predictHandler).toBeDefined();

            const result = await predictHandler({}, 'Hello');

            expect(mockLlmManager.predict).toHaveBeenCalledWith('Hello');
            expect(result).toBe('Hello world!');
        });
    });
});
