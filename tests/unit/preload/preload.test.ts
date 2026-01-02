import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import type { IpcRenderer, IpcRendererEvent } from 'electron';

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
      expect(ipcRendererMock.removeListener).toHaveBeenCalledWith(
        'theme:changed',
        expect.any(Function)
      );
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
      expect(ipcRendererMock.removeListener).toHaveBeenCalledWith(
        'print-to-pdf:success',
        expect.any(Function)
      );
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
      expect(ipcRendererMock.removeListener).toHaveBeenCalledWith(
        'print-to-pdf:error',
        expect.any(Function)
      );
    });
  });

  describe('Shell API', () => {
    it('revealInFolder should send IPC message', () => {
      const testPath = 'C:\\test\\file.pdf';
      exposedAPI.revealInFolder(testPath);
      expect(ipcRendererMock.send).toHaveBeenCalledWith('shell:show-item-in-folder', testPath);
    });
  });
});
