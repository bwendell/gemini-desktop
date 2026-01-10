/**
 * Unit tests for IpcManager.dispose() memory leak prevention.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import IpcManager from '../../../../src/main/managers/ipcManager';
import {
    createMockWindowManager,
    createMockStore,
    createMockUpdateManager,
    createMockPrintManager,
} from '../../../helpers/mocks';

// Mock Electron
vi.mock('electron', () => ({
    ipcMain: {
        on: vi.fn(),
        handle: vi.fn(),
        removeHandler: vi.fn(),
        removeListener: vi.fn(),
    },
    nativeTheme: {
        themeSource: 'system',
        shouldUseDarkColors: false,
    },
    BrowserWindow: {
        fromWebContents: vi.fn(),
        getAllWindows: vi.fn().mockReturnValue([]),
    },
    shell: {
        showItemInFolder: vi.fn(),
    },
}));

// Mock SettingsStore to prevent side effects during import
vi.mock('../../../../src/main/store', () => {
    return {
        default: vi.fn(),
    };
});

// Mock fs
vi.mock('fs', () => ({
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn(),
}));

// Mock logger
vi.mock('../../../../src/main/utils/logger');
import { mockLogger } from '../../../../src/main/utils/__mocks__/logger';

describe('IpcManager.dispose()', () => {
    let ipcManager: IpcManager;
    let mockWindowManager: ReturnType<typeof createMockWindowManager>;
    let mockStore: ReturnType<typeof createMockStore>;
    let mockUpdateManager: ReturnType<typeof createMockUpdateManager>;
    let mockPrintManager: ReturnType<typeof createMockPrintManager>;

    beforeEach(() => {
        vi.clearAllMocks();

        mockWindowManager = createMockWindowManager();
        mockStore = createMockStore({ theme: 'system' });
        mockUpdateManager = createMockUpdateManager();
        mockPrintManager = createMockPrintManager();

        ipcManager = new IpcManager(
            mockWindowManager,
            null,
            mockUpdateManager,
            mockPrintManager,
            null,
            null,
            mockStore as any,
            mockLogger
        );
    });

    it('should complete without errors when called', () => {
        ipcManager.setupIpcHandlers();
        expect(() => ipcManager.dispose()).not.toThrow();
    });

    it('should log when all handlers are unregistered', () => {
        ipcManager.setupIpcHandlers();
        ipcManager.dispose();
        expect(mockLogger.log).toHaveBeenCalledWith('All IPC handlers unregistered');
    });

    it('should be safe to call dispose() multiple times (idempotent)', () => {
        ipcManager.setupIpcHandlers();
        expect(() => ipcManager.dispose()).not.toThrow();
        expect(() => ipcManager.dispose()).not.toThrow();
        expect(() => ipcManager.dispose()).not.toThrow();
    });

    it('should be safe to call dispose() before setupIpcHandlers()', () => {
        // dispose() should not crash even if handlers were never registered
        expect(() => ipcManager.dispose()).not.toThrow();
    });

    it('should log errors if a handler.unregister() throws', () => {
        // Create a mock handler that throws on unregister
        const mockHandler = {
            register: vi.fn(),
            unregister: vi.fn(() => {
                throw new Error('Mock unregister error');
            }),
        };

        // Access private handlers array via any cast for testing
        const privateManager = ipcManager as any;
        privateManager.handlers.push(mockHandler);

        ipcManager.dispose();

        expect(mockLogger.error).toHaveBeenCalledWith('Error unregistering handler:', expect.any(Error));
    });
});
