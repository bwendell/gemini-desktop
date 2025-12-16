/**
 * Unit tests for useOptionsWindow hook.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOptionsWindow } from './useOptionsWindow';

describe('useOptionsWindow', () => {
    describe('openOptions', () => {
        it('should log warning about not being implemented', async () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

            const { result } = renderHook(() => useOptionsWindow());
            await result.current.openOptions();

            expect(consoleSpy).toHaveBeenCalledWith('Options window not yet implemented in Electron');

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
