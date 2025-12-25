import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNetworkStatus } from './useNetworkStatus';

describe('useNetworkStatus', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns true when navigator.onLine is true', () => {
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        const { result } = renderHook(() => useNetworkStatus());
        expect(result.current).toBe(true);
    });

    it('returns false when navigator.onLine is false', () => {
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
        const { result } = renderHook(() => useNetworkStatus());
        expect(result.current).toBe(false);
    });

    it('updates status when offline event is fired', () => {
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        const { result } = renderHook(() => useNetworkStatus());

        act(() => {
            window.dispatchEvent(new Event('offline'));
        });

        expect(result.current).toBe(false);
    });

    it('updates status when online event is fired', () => {
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
        const { result } = renderHook(() => useNetworkStatus());

        act(() => {
            window.dispatchEvent(new Event('online'));
        });

        expect(result.current).toBe(true);
    });

    it('cleans up event listeners on unmount', () => {
        const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
        const { unmount } = renderHook(() => useNetworkStatus());

        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
        expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });
});
