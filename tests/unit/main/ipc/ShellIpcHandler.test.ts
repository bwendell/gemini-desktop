/**
 * Unit tests for ShellIpcHandler.
 *
 * Tests the shell:show-item-in-folder IPC handler.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ipcMain, shell } from 'electron';
import { ShellIpcHandler } from '../../../../src/main/managers/ipc/ShellIpcHandler';
import type { IpcHandlerDependencies } from '../../../../src/main/managers/ipc/types';
import { createMockLogger, createMockWindowManager, createMockStore } from '../../../helpers/mocks';

// Mock Electron
const { mockIpcMain, mockShell } = vi.hoisted(() => {
    const mockIpcMain = {
        on: vi.fn((channel, listener) => {
            mockIpcMain._listeners.set(channel, listener);
        }),
        handle: vi.fn((channel, handler) => {
            mockIpcMain._handlers.set(channel, handler);
        }),
        _listeners: new Map<string, Function>(),
        _handlers: new Map<string, Function>(),
        _reset: () => {
            mockIpcMain._listeners.clear();
            mockIpcMain._handlers.clear();
        },
    };

    const mockShell = {
        showItemInFolder: vi.fn(),
        _reset: () => {
            mockShell.showItemInFolder.mockReset();
        },
    };

    return { mockIpcMain, mockShell };
});

vi.mock('electron', () => ({
    ipcMain: mockIpcMain,
    shell: mockShell,
}));

describe('ShellIpcHandler', () => {
    let handler: ShellIpcHandler;
    let mockDeps: IpcHandlerDependencies;
    let mockLogger: ReturnType<typeof createMockLogger>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockIpcMain._reset();
        mockShell._reset();

        mockLogger = createMockLogger();
        mockDeps = {
            store: createMockStore({}),
            logger: mockLogger,
            windowManager: createMockWindowManager(),
        };

        handler = new ShellIpcHandler(mockDeps);
    });

    describe('register', () => {
        it('registers shell:show-item-in-folder listener', () => {
            handler.register();

            expect(mockIpcMain.on).toHaveBeenCalledWith('shell:show-item-in-folder', expect.any(Function));
            expect(mockIpcMain._listeners.has('shell:show-item-in-folder')).toBe(true);
        });
    });

    describe('shell:show-item-in-folder handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('calls shell.showItemInFolder with valid file path', () => {
            const listener = mockIpcMain._listeners.get('shell:show-item-in-folder');
            const filePath = 'C:\\Users\\test\\file.txt';

            listener!({}, filePath);

            expect(mockShell.showItemInFolder).toHaveBeenCalledWith(filePath);
            expect(mockLogger.log).toHaveBeenCalledWith('Revealing file in folder:', filePath);
        });

        it('rejects empty string path with warning', () => {
            const listener = mockIpcMain._listeners.get('shell:show-item-in-folder');

            listener!({}, '');

            expect(mockShell.showItemInFolder).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith('Invalid file path for reveal in folder:', '');
        });

        it('rejects whitespace-only path with warning', () => {
            const listener = mockIpcMain._listeners.get('shell:show-item-in-folder');

            listener!({}, '   ');

            expect(mockShell.showItemInFolder).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith('Invalid file path for reveal in folder:', '   ');
        });

        it('rejects non-string path with warning', () => {
            const listener = mockIpcMain._listeners.get('shell:show-item-in-folder');

            listener!({}, null as any);

            expect(mockShell.showItemInFolder).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith('Invalid file path for reveal in folder:', null);
        });

        it('rejects undefined path with warning', () => {
            const listener = mockIpcMain._listeners.get('shell:show-item-in-folder');

            listener!({}, undefined as any);

            expect(mockShell.showItemInFolder).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith('Invalid file path for reveal in folder:', undefined);
        });

        it('rejects number path with warning', () => {
            const listener = mockIpcMain._listeners.get('shell:show-item-in-folder');

            listener!({}, 12345 as any);

            expect(mockShell.showItemInFolder).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith('Invalid file path for reveal in folder:', 12345);
        });

        it('logs error when shell.showItemInFolder throws', () => {
            const listener = mockIpcMain._listeners.get('shell:show-item-in-folder');
            const filePath = 'C:\\Users\\test\\file.txt';
            const error = new Error('File not found');
            mockShell.showItemInFolder.mockImplementation(() => {
                throw error;
            });

            listener!({}, filePath);

            expect(mockLogger.error).toHaveBeenCalledWith('Error revealing file in folder:', {
                error: 'File not found',
                filePath,
            });
        });
    });
});
