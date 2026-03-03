import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrintIpcHandler } from '../../../../src/main/managers/ipc/PrintIpcHandler';
import type { IpcHandlerDependencies } from '../../../../src/main/managers/ipc/types';
import {
    createMockLogger,
    createMockStore,
    createMockWindowManager,
    createMockExportManager,
} from '../../../helpers/mocks';
import { IPC_CHANNELS } from '../../../../src/shared/constants/ipc-channels';

const { mockIpcMain } = vi.hoisted(() => {
    const mockIpcMain = {
        on: vi.fn((channel: string, listener: (...args: unknown[]) => void) => {
            mockIpcMain._listeners.set(channel, listener);
        }),
        removeAllListeners: vi.fn((channel: string) => {
            mockIpcMain._listeners.delete(channel);
        }),
        _listeners: new Map<string, (...args: unknown[]) => void>(),
        _reset: () => {
            mockIpcMain._listeners.clear();
        },
    };

    return { mockIpcMain };
});

vi.mock('electron', () => ({
    ipcMain: mockIpcMain,
}));

describe('PrintIpcHandler', () => {
    let handler: PrintIpcHandler;
    let mockDeps: IpcHandlerDependencies;
    let mockLogger: ReturnType<typeof createMockLogger>;
    let mockExportManager: ReturnType<typeof createMockExportManager>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockIpcMain._reset();

        mockLogger = createMockLogger();
        mockExportManager = createMockExportManager();
        mockDeps = {
            store: createMockStore({}),
            logger: mockLogger,
            windowManager: createMockWindowManager(),
            exportManager: mockExportManager,
        } as unknown as IpcHandlerDependencies;

        handler = new PrintIpcHandler(mockDeps);
    });

    it('registers print:trigger listener', () => {
        handler.register();
        expect(mockIpcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.PRINT_TRIGGER, expect.any(Function));
        expect(mockIpcMain._listeners.has(IPC_CHANNELS.PRINT_TRIGGER)).toBe(true);
    });

    it('registers print:cancel listener', () => {
        handler.register();
        expect(mockIpcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.PRINT_CANCEL, expect.any(Function));
        expect(mockIpcMain._listeners.has(IPC_CHANNELS.PRINT_CANCEL)).toBe(true);
    });

    it('logs error when export manager is missing', () => {
        const handlerWithoutManager = new PrintIpcHandler({
            ...mockDeps,
            exportManager: null,
        });
        handlerWithoutManager.register();

        const listener = mockIpcMain._listeners.get(IPC_CHANNELS.PRINT_TRIGGER);
        listener!({ sender: {} } as unknown as { sender: unknown });

        expect(mockLogger.error).toHaveBeenCalledWith('ExportManager not initialized');
    });

    it('calls exportManager.exportToPdf on trigger', async () => {
        handler.register();
        const listener = mockIpcMain._listeners.get(IPC_CHANNELS.PRINT_TRIGGER);
        const sender = {} as unknown;

        listener!({ sender } as unknown as { sender: unknown });
        await Promise.resolve();

        expect(mockExportManager.exportToPdf).toHaveBeenCalledWith(sender);
    });

    it('logs error when exportToPdf rejects', async () => {
        const error = new Error('Export failed');
        mockExportManager.exportToPdf.mockRejectedValue(error);
        handler.register();

        const listener = mockIpcMain._listeners.get(IPC_CHANNELS.PRINT_TRIGGER);
        listener!({ sender: {} } as unknown as { sender: unknown });
        await Promise.resolve();

        expect(mockLogger.error).toHaveBeenCalledWith('Error during exportToPdf:', {
            error: 'Export failed',
            stack: expect.any(String),
        });
    });

    it('logs a warning when print cancel is requested', () => {
        handler.register();
        const listener = mockIpcMain._listeners.get(IPC_CHANNELS.PRINT_CANCEL);
        listener!({} as unknown as { sender?: unknown });

        expect(mockLogger.warn).toHaveBeenCalledWith('Print cancel requested but no cancel flow is available');
    });

    it('unregisters listeners', () => {
        handler.register();
        handler.unregister();

        expect(mockIpcMain.removeAllListeners).toHaveBeenCalledWith(IPC_CHANNELS.PRINT_TRIGGER);
        expect(mockIpcMain.removeAllListeners).toHaveBeenCalledWith(IPC_CHANNELS.PRINT_CANCEL);
    });
});
