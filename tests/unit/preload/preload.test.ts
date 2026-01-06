import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// Mock electron
const { ipcRendererMock, contextBridgeMock } = vi.hoisted(() => {
    return {
        ipcRendererMock: {
            send: vi.fn(),
            invoke: vi.fn(),
            on: vi.fn(),
            removeListener: vi.fn(),
        },
        contextBridgeMock: {
            exposeInMainWorld: vi.fn(),
        },
    };
});

vi.mock('electron', () => ({
    ipcRenderer: ipcRendererMock,
    contextBridge: contextBridgeMock,
}));

// Import preload to trigger execution
import '../../../src/preload/preload';

describe('Preload Script', () => {
    let exposedAPI: any;

    beforeAll(() => {
        // Get the API object exposed to the main world
        // We assume the import has already triggered the call
        if (contextBridgeMock.exposeInMainWorld.mock.calls.length > 0) {
            exposedAPI = contextBridgeMock.exposeInMainWorld.mock.calls[0][1];
        }
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should expose electronAPI to the main world', () => {
        expect(exposedAPI).toBeDefined();
        // We can't check toHaveBeenCalledWith here because beforeEach clears mocks
        // But existence of exposedAPI proves it was called
    });

    describe('Window Controls', () => {
        it('minimizeWindow should send IPC message', () => {
            exposedAPI.minimizeWindow();
            expect(ipcRendererMock.send).toHaveBeenCalledWith('window-minimize');
        });

        it('maximizeWindow should send IPC message', () => {
            exposedAPI.maximizeWindow();
            expect(ipcRendererMock.send).toHaveBeenCalledWith('window-maximize');
        });

        it('closeWindow should send IPC message', () => {
            exposedAPI.closeWindow();
            expect(ipcRendererMock.send).toHaveBeenCalledWith('window-close');
        });

        it('isMaximized should invoke IPC handler', async () => {
            (ipcRendererMock.invoke as any).mockResolvedValue(true);
            const result = await exposedAPI.isMaximized();
            expect(ipcRendererMock.invoke).toHaveBeenCalledWith('window-is-maximized');
            expect(result).toBe(true);
        });
    });

    describe('Theme API', () => {
        it('setTheme should send IPC message', () => {
            exposedAPI.setTheme('dark');
            expect(ipcRendererMock.send).toHaveBeenCalledWith('theme:set', 'dark');
        });

        it('onThemeChanged should register listener and return unsubscribe', () => {
            const callback = vi.fn();
            const unsubscribe = exposedAPI.onThemeChanged(callback);

            expect(ipcRendererMock.on).toHaveBeenCalledWith('theme:changed', expect.any(Function));

            // simulate event
            const handler = (ipcRendererMock.on as any).mock.calls[0][1];
            handler({}, { theme: 'dark' });
            expect(callback).toHaveBeenCalledWith({ theme: 'dark' });

            // test unsubscribe
            unsubscribe();
            expect(ipcRendererMock.removeListener).toHaveBeenCalledWith('theme:changed', expect.any(Function));
        });
    });

    describe('Auto-Update API', () => {
        it('checkForUpdates should send IPC message', () => {
            exposedAPI.checkForUpdates();
            expect(ipcRendererMock.send).toHaveBeenCalledWith('auto-update:check');
        });
    });

    describe('Print to PDF API', () => {
        it('printToPdf should send IPC message', () => {
            exposedAPI.printToPdf();
            expect(ipcRendererMock.send).toHaveBeenCalledWith('print-to-pdf:trigger');
        });

        it('onPrintToPdfSuccess should register listener and return unsubscribe', () => {
            const callback = vi.fn();
            const unsubscribe = exposedAPI.onPrintToPdfSuccess(callback);

            expect(ipcRendererMock.on).toHaveBeenCalledWith('print-to-pdf:success', expect.any(Function));

            // simulate event
            const handler = (ipcRendererMock.on as any).mock.calls[0][1];
            handler({}, '/path/to/file.pdf');
            expect(callback).toHaveBeenCalledWith('/path/to/file.pdf');

            // test unsubscribe
            unsubscribe();
            expect(ipcRendererMock.removeListener).toHaveBeenCalledWith('print-to-pdf:success', expect.any(Function));
        });

        it('onPrintToPdfError should register listener and return unsubscribe', () => {
            const callback = vi.fn();
            const unsubscribe = exposedAPI.onPrintToPdfError(callback);

            expect(ipcRendererMock.on).toHaveBeenCalledWith('print-to-pdf:error', expect.any(Function));

            // simulate event
            const handler = (ipcRendererMock.on as any).mock.calls[0][1];
            handler({}, 'Error saving PDF');
            expect(callback).toHaveBeenCalledWith('Error saving PDF');

            // test unsubscribe
            unsubscribe();
            expect(ipcRendererMock.removeListener).toHaveBeenCalledWith('print-to-pdf:error', expect.any(Function));
        });
    });

    describe('Shell API', () => {
        it('revealInFolder should send IPC message', () => {
            const testPath = 'C:\\test\\file.pdf';
            exposedAPI.revealInFolder(testPath);
            expect(ipcRendererMock.send).toHaveBeenCalledWith('shell:show-item-in-folder', testPath);
        });
    });

    // Task 7.7: Text Prediction preload tests
    describe('Text Prediction API', () => {
        it('getTextPredictionEnabled should invoke IPC handler', async () => {
            (ipcRendererMock.invoke as any).mockResolvedValue(true);
            const result = await exposedAPI.getTextPredictionEnabled();
            expect(ipcRendererMock.invoke).toHaveBeenCalledWith('text-prediction:get-enabled');
            expect(result).toBe(true);
        });

        it('setTextPredictionEnabled should invoke IPC handler', async () => {
            await exposedAPI.setTextPredictionEnabled(true);
            expect(ipcRendererMock.invoke).toHaveBeenCalledWith('text-prediction:set-enabled', true);
        });

        it('getTextPredictionGpuEnabled should invoke IPC handler', async () => {
            (ipcRendererMock.invoke as any).mockResolvedValue(false);
            const result = await exposedAPI.getTextPredictionGpuEnabled();
            expect(ipcRendererMock.invoke).toHaveBeenCalledWith('text-prediction:get-gpu-enabled');
            expect(result).toBe(false);
        });

        it('setTextPredictionGpuEnabled should invoke IPC handler', async () => {
            await exposedAPI.setTextPredictionGpuEnabled(true);
            expect(ipcRendererMock.invoke).toHaveBeenCalledWith('text-prediction:set-gpu-enabled', true);
        });

        it('getTextPredictionStatus should invoke IPC handler', async () => {
            const mockStatus = {
                enabled: true,
                gpuEnabled: false,
                status: 'ready',
                downloadProgress: 100,
            };
            (ipcRendererMock.invoke as any).mockResolvedValue(mockStatus);

            const result = await exposedAPI.getTextPredictionStatus();

            expect(ipcRendererMock.invoke).toHaveBeenCalledWith('text-prediction:get-status');
            expect(result).toEqual(mockStatus);
        });

        it('predictText should invoke IPC handler with partial text', async () => {
            (ipcRendererMock.invoke as any).mockResolvedValue('predicted completion');

            const result = await exposedAPI.predictText('Hello ');

            expect(ipcRendererMock.invoke).toHaveBeenCalledWith('text-prediction:predict', 'Hello ');
            expect(result).toBe('predicted completion');
        });

        it('onTextPredictionStatusChanged should register listener and return unsubscribe', () => {
            const callback = vi.fn();
            const unsubscribe = exposedAPI.onTextPredictionStatusChanged(callback);

            expect(ipcRendererMock.on).toHaveBeenCalledWith('text-prediction:status-changed', expect.any(Function));

            // simulate event
            const handler = (ipcRendererMock.on as any).mock.calls.find(
                (call: any[]) => call[0] === 'text-prediction:status-changed'
            )?.[1];
            if (handler) {
                const mockSettings = { enabled: true, gpuEnabled: false, status: 'ready' };
                handler({}, mockSettings);
                expect(callback).toHaveBeenCalledWith(mockSettings);
            }

            // test unsubscribe
            unsubscribe();
            expect(ipcRendererMock.removeListener).toHaveBeenCalledWith(
                'text-prediction:status-changed',
                expect.any(Function)
            );
        });

        it('onTextPredictionDownloadProgress should register listener and return unsubscribe', () => {
            const callback = vi.fn();
            const unsubscribe = exposedAPI.onTextPredictionDownloadProgress(callback);

            expect(ipcRendererMock.on).toHaveBeenCalledWith('text-prediction:download-progress', expect.any(Function));

            // simulate event
            const handler = (ipcRendererMock.on as any).mock.calls.find(
                (call: any[]) => call[0] === 'text-prediction:download-progress'
            )?.[1];
            if (handler) {
                handler({}, 75);
                expect(callback).toHaveBeenCalledWith(75);
            }

            // test unsubscribe
            unsubscribe();
            expect(ipcRendererMock.removeListener).toHaveBeenCalledWith(
                'text-prediction:download-progress',
                expect.any(Function)
            );
        });
    });
});
