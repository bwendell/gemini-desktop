/**
 * Unit tests for useWindowControls hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Window } from '@tauri-apps/api/window';
import { useWindowControls } from './useWindowControls';

// Mock the Window API
const mockWindow = {
    minimize: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    close: vi.fn(),
    isMaximized: vi.fn(),
};

vi.mock('@tauri-apps/api/window', () => ({
    Window: {
        getCurrent: vi.fn(() => mockWindow),
    },
}));

describe('useWindowControls', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockWindow.minimize.mockResolvedValue(undefined);
        mockWindow.maximize.mockResolvedValue(undefined);
        mockWindow.unmaximize.mockResolvedValue(undefined);
        mockWindow.close.mockResolvedValue(undefined);
        mockWindow.isMaximized.mockResolvedValue(false);
    });

    describe('minimize', () => {
        it('calls appWindow.minimize()', async () => {
            const { result } = renderHook(() => useWindowControls());

            await act(async () => {
                await result.current.minimize();
            });

            expect(mockWindow.minimize).toHaveBeenCalledTimes(1);
        });

        it('logs error when minimize fails', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const error = new Error('Minimize failed');
            mockWindow.minimize.mockRejectedValue(error);

            const { result } = renderHook(() => useWindowControls());

            await act(async () => {
                await result.current.minimize();
            });

            expect(consoleSpy).toHaveBeenCalledWith('Failed to minimize window:', error);
            consoleSpy.mockRestore();
        });
    });

    describe('maximize', () => {
        it('calls maximize when window is not maximized', async () => {
            mockWindow.isMaximized.mockResolvedValue(false);

            const { result } = renderHook(() => useWindowControls());

            await act(async () => {
                await result.current.maximize();
            });

            expect(mockWindow.isMaximized).toHaveBeenCalledTimes(1);
            expect(mockWindow.maximize).toHaveBeenCalledTimes(1);
            expect(mockWindow.unmaximize).not.toHaveBeenCalled();
        });

        it('calls unmaximize when window is maximized', async () => {
            mockWindow.isMaximized.mockResolvedValue(true);

            const { result } = renderHook(() => useWindowControls());

            await act(async () => {
                await result.current.maximize();
            });

            expect(mockWindow.isMaximized).toHaveBeenCalledTimes(1);
            expect(mockWindow.unmaximize).toHaveBeenCalledTimes(1);
            expect(mockWindow.maximize).not.toHaveBeenCalled();
        });

        it('logs error when maximize/restore fails', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const error = new Error('Maximize failed');
            mockWindow.isMaximized.mockRejectedValue(error);

            const { result } = renderHook(() => useWindowControls());

            await act(async () => {
                await result.current.maximize();
            });

            expect(consoleSpy).toHaveBeenCalledWith('Failed to maximize/restore window:', error);
            consoleSpy.mockRestore();
        });
    });

    describe('close', () => {
        it('calls appWindow.close()', async () => {
            const { result } = renderHook(() => useWindowControls());

            await act(async () => {
                await result.current.close();
            });

            expect(mockWindow.close).toHaveBeenCalledTimes(1);
        });

        it('logs error when close fails', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const error = new Error('Close failed');
            mockWindow.close.mockRejectedValue(error);

            const { result } = renderHook(() => useWindowControls());

            await act(async () => {
                await result.current.close();
            });

            expect(consoleSpy).toHaveBeenCalledWith('Failed to close window:', error);
            consoleSpy.mockRestore();
        });
    });
});
