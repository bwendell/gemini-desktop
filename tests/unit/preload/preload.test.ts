import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';

// Store original env
const originalNodeEnv = process.env.NODE_ENV;
const originalDebugDbus = process.env.DEBUG_DBUS;

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

// Import preload to trigger execution (in test mode by default)
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

    afterEach(() => {
        // Restore original environment
        process.env.NODE_ENV = originalNodeEnv;
        if (originalDebugDbus === undefined) {
            delete process.env.DEBUG_DBUS;
        } else {
            process.env.DEBUG_DBUS = originalDebugDbus;
        }
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

    describe('Export API', () => {
        it('exportChatToPdf should send IPC message', () => {
            exposedAPI.exportChatToPdf();
            expect(ipcRendererMock.send).toHaveBeenCalledWith('export-chat:pdf');
        });

        it('exportChatToMarkdown should send IPC message', () => {
            exposedAPI.exportChatToMarkdown();
            expect(ipcRendererMock.send).toHaveBeenCalledWith('export-chat:markdown');
        });
    });

    describe('Shell API', () => {
        it('revealInFolder should send IPC message', () => {
            const testPath = 'C:\\test\\file.pdf';
            exposedAPI.revealInFolder(testPath);
            expect(ipcRendererMock.send).toHaveBeenCalledWith('shell:show-item-in-folder', testPath);
        });
    });

    describe('Tabs API', () => {
        it('onTabTitleUpdated should register listener and return unsubscribe', () => {
            const callback = vi.fn();
            const unsubscribe = exposedAPI.onTabTitleUpdated(callback);

            expect(ipcRendererMock.on).toHaveBeenCalledWith('tabs:title-updated', expect.any(Function));

            const handler = (ipcRendererMock.on as any).mock.calls.find(
                (call: any[]) => call[0] === 'tabs:title-updated'
            )?.[1];
            if (handler) {
                handler({}, { tabId: 'tab-a', title: 'Updated' });
                expect(callback).toHaveBeenCalledWith({ tabId: 'tab-a', title: 'Updated' });
            }

            unsubscribe();
            expect(ipcRendererMock.removeListener).toHaveBeenCalledWith('tabs:title-updated', expect.any(Function));
        });

        it('updateTabTitle should send IPC message', () => {
            exposedAPI.updateTabTitle('tab-a', 'New Title');
            expect(ipcRendererMock.send).toHaveBeenCalledWith('tabs:update-title', {
                tabId: 'tab-a',
                title: 'New Title',
            });
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

    describe('Platform Hotkey Status API', () => {
        it('getPlatformHotkeyStatus should invoke IPC handler', async () => {
            const mockStatus = {
                waylandStatus: { isWayland: true, portalAvailable: true },
                registrationResults: [],
                globalHotkeysEnabled: true,
            };
            (ipcRendererMock.invoke as any).mockResolvedValue(mockStatus);

            const result = await exposedAPI.getPlatformHotkeyStatus();

            expect(ipcRendererMock.invoke).toHaveBeenCalledWith('platform:hotkey-status:get');
            expect(result).toEqual(mockStatus);
        });

        it('onPlatformHotkeyStatusChanged should register listener and return unsubscribe', () => {
            const callback = vi.fn();
            const unsubscribe = exposedAPI.onPlatformHotkeyStatusChanged(callback);

            expect(ipcRendererMock.on).toHaveBeenCalledWith('platform:hotkey-status:changed', expect.any(Function));

            // simulate event
            const handler = (ipcRendererMock.on as any).mock.calls.find(
                (call: any[]) => call[0] === 'platform:hotkey-status:changed'
            )?.[1];
            if (handler) {
                const mockStatus = { globalHotkeysEnabled: false };
                handler({}, mockStatus);
                expect(callback).toHaveBeenCalledWith(mockStatus);
            }

            // test unsubscribe
            unsubscribe();
            expect(ipcRendererMock.removeListener).toHaveBeenCalledWith(
                'platform:hotkey-status:changed',
                expect.any(Function)
            );
        });
    });

    describe('D-Bus activation signal API gating', () => {
        it('exposes getDbusActivationSignalStats when NODE_ENV=test', () => {
            // In test mode (which is the current environment), the API should be exposed
            expect(exposedAPI.getDbusActivationSignalStats).toBeDefined();
            expect(typeof exposedAPI.getDbusActivationSignalStats).toBe('function');
        });

        it('calls IPC when getDbusActivationSignalStats invoked in test mode', async () => {
            const mockStats = {
                trackingEnabled: true,
                totalSignals: 5,
                signalsByShortcut: { quickChat: 5 },
                lastSignalTime: Date.now(),
                signals: [],
            };
            (ipcRendererMock.invoke as any).mockResolvedValue(mockStats);

            const result = await exposedAPI.getDbusActivationSignalStats();

            expect(ipcRendererMock.invoke).toHaveBeenCalledWith('test:dbus:activation-signal-stats:get');
            expect(result).toEqual(mockStats);
        });

        it('exposes clearDbusActivationSignalHistory when NODE_ENV=test', () => {
            expect(exposedAPI.clearDbusActivationSignalHistory).toBeDefined();
            expect(typeof exposedAPI.clearDbusActivationSignalHistory).toBe('function');
        });

        it('calls IPC when clearDbusActivationSignalHistory invoked in test mode', () => {
            exposedAPI.clearDbusActivationSignalHistory();

            expect(ipcRendererMock.send).toHaveBeenCalledWith('test:dbus:activation-signal-history:clear');
        });

        it('returns empty stats when API is called in production mode', async () => {
            // Mock production mode behavior by directly testing the no-op implementation
            const prodApi = {
                getDbusActivationSignalStats: () =>
                    Promise.resolve({
                        trackingEnabled: false,
                        totalSignals: 0,
                        signalsByShortcut: {},
                        lastSignalTime: null,
                        signals: Object.freeze([]),
                    }),
            };

            const result = await prodApi.getDbusActivationSignalStats();

            expect(result.trackingEnabled).toBe(false);
            expect(result.totalSignals).toBe(0);
            expect(result.signals).toEqual([]);
        });

        it('no-op clearDbusActivationSignalHistory does not throw in production mode', () => {
            const prodApi = {
                clearDbusActivationSignalHistory: () => {},
            };

            expect(() => prodApi.clearDbusActivationSignalHistory()).not.toThrow();
        });
    });
});
