/**
 * Coordinated tests for Network Status ↔ UI Component state propagation.
 *
 * Tests the flow: Browser navigator.onLine events → useNetworkStatus hook →
 * useGeminiIframe → UI state (loading, error, offline display)
 *
 * These tests verify that network status changes propagate correctly through
 * the component hierarchy and trigger appropriate UI states.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNetworkStatus } from '../../src/renderer/hooks/useNetworkStatus';
import { useGeminiIframe } from '../../src/renderer/hooks/useGeminiIframe';

// Mock logger
vi.mock('../../src/renderer/utils', () => ({
  createRendererLogger: () => ({
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

// Mock fetch for connectivity checks
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Network Status Coordination', () => {
  let originalNavigatorOnLine: boolean;
  let onlineListeners: ((event: Event) => void)[] = [];
  let offlineListeners: ((event: Event) => void)[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    onlineListeners = [];
    offlineListeners = [];

    // Store original navigator.onLine
    originalNavigatorOnLine = navigator.onLine;

    // Mock addEventListener to capture listeners
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'online') onlineListeners.push(handler as (event: Event) => void);
      if (event === 'offline') offlineListeners.push(handler as (event: Event) => void);
    });

    vi.spyOn(window, 'removeEventListener').mockImplementation((event, handler) => {
      if (event === 'online') {
        onlineListeners = onlineListeners.filter((h) => h !== handler);
      }
      if (event === 'offline') {
        offlineListeners = offlineListeners.filter((h) => h !== handler);
      }
    });

    // Default mock: online and fetch succeeds
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    mockFetch.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore original navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: originalNavigatorOnLine,
    });
  });

  describe('useNetworkStatus Hook', () => {
    it('should return initial online state based on navigator.onLine', () => {
      const { result } = renderHook(() => useNetworkStatus());
      expect(result.current).toBe(true);
    });

    it('should return false when initially offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: false,
      });

      const { result } = renderHook(() => useNetworkStatus());
      expect(result.current).toBe(false);
    });

    it('should update state when online event fires', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: false,
      });

      const { result } = renderHook(() => useNetworkStatus());
      expect(result.current).toBe(false);

      // Simulate going online
      act(() => {
        onlineListeners.forEach((listener) => listener(new Event('online')));
      });

      expect(result.current).toBe(true);
    });

    it('should update state when offline event fires', async () => {
      const { result } = renderHook(() => useNetworkStatus());
      expect(result.current).toBe(true);

      // Simulate going offline
      act(() => {
        offlineListeners.forEach((listener) => listener(new Event('offline')));
      });

      expect(result.current).toBe(false);
    });

    it('should register event listeners on mount', () => {
      renderHook(() => useNetworkStatus());

      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should cleanup event listeners on unmount', () => {
      const { unmount } = renderHook(() => useNetworkStatus());

      unmount();

      expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });

  describe('useGeminiIframe ↔ useNetworkStatus Coordination', () => {
    it('should propagate online status from useNetworkStatus to useGeminiIframe', () => {
      const { result } = renderHook(() => useGeminiIframe());

      expect(result.current.isOnline).toBe(true);
    });

    it('should propagate offline status at initialization', () => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: false,
      });

      const { result } = renderHook(() => useGeminiIframe());

      expect(result.current.isOnline).toBe(false);
    });

    it('should set error when initially offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: false,
      });

      const { result } = renderHook(() => useGeminiIframe());

      await waitFor(() => {
        expect(result.current.error).toBe('Network unavailable');
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle successful load when online', async () => {
      const { result } = renderHook(() => useGeminiIframe());

      // Simulate iframe load completion
      await act(async () => {
        await result.current.handleLoad();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set error when load called but offline', async () => {
      const { result } = renderHook(() => useGeminiIframe());

      // Simulate going offline after hook init but before load
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: false,
      });

      await act(async () => {
        await result.current.handleLoad();
      });

      expect(result.current.error).toBe('Network unavailable');
      expect(result.current.isLoading).toBe(false);
    });

    it('should set error when connectivity check fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useGeminiIframe());

      await act(async () => {
        await result.current.handleLoad();
      });

      expect(result.current.error).toBe('Unable to reach Gemini');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle iframe error event', async () => {
      const { result } = renderHook(() => useGeminiIframe());

      act(() => {
        result.current.handleError();
      });

      expect(result.current.error).toBe('Failed to load Gemini');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Rapid Network State Changes', () => {
    it('should handle rapid online/offline toggling correctly', async () => {
      const { result } = renderHook(() => useNetworkStatus());

      // Rapid toggling
      act(() => {
        offlineListeners.forEach((l) => l(new Event('offline')));
      });
      expect(result.current).toBe(false);

      act(() => {
        onlineListeners.forEach((l) => l(new Event('online')));
      });
      expect(result.current).toBe(true);

      act(() => {
        offlineListeners.forEach((l) => l(new Event('offline')));
      });
      expect(result.current).toBe(false);

      act(() => {
        onlineListeners.forEach((l) => l(new Event('online')));
      });
      expect(result.current).toBe(true);
    });
  });

  describe('Retry Mechanism', () => {
    it('should provide retry function that reloads the page', () => {
      // Mock window.location.reload
      const mockReload = vi.fn();
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...window.location, reload: mockReload },
      });

      const { result } = renderHook(() => useGeminiIframe());

      act(() => {
        result.current.retry();
      });

      expect(mockReload).toHaveBeenCalled();
    });
  });
});
