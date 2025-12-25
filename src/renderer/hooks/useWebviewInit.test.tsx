/**
 * Unit tests for useWebviewInit hook.
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWebviewInit } from './useWebviewInit';

describe('useWebviewInit', () => {
    it('returns ready state immediately', () => {
        const { result } = renderHook(() => useWebviewInit());

        expect(result.current.isReady).toBe(true);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('retry function calls are safe', () => {
        const { result } = renderHook(() => useWebviewInit());

        expect(() => result.current.retry()).not.toThrow();
    });
});
