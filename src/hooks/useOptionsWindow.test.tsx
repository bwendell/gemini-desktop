/**
 * Unit tests for useOptionsWindow hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOptionsWindow } from './useOptionsWindow';

// Mock the Tauri API
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

describe('useOptionsWindow', () => {
    const mockInvoke = invoke as ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('openOptions', () => {
        it('should invoke create_options_window command', async () => {
            mockInvoke.mockResolvedValueOnce(undefined);

            const { result } = renderHook(() => useOptionsWindow());
            await result.current.openOptions();

            expect(mockInvoke).toHaveBeenCalledWith('create_options_window');
            expect(mockInvoke).toHaveBeenCalledTimes(1);
        });

        it('should log and re-throw errors on failure', async () => {
            const testError = new Error('Window creation failed');
            mockInvoke.mockRejectedValueOnce(testError);

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const { result } = renderHook(() => useOptionsWindow());

            await expect(result.current.openOptions()).rejects.toThrow('Window creation failed');
            expect(consoleSpy).toHaveBeenCalledWith('Failed to open options window:', testError);

            consoleSpy.mockRestore();
        });

        it('should return stable function reference', () => {
            const { result, rerender } = renderHook(() => useOptionsWindow());
            const firstOpenOptions = result.current.openOptions;

            rerender();

            expect(result.current.openOptions).toBe(firstOpenOptions);
        });
    });
});
