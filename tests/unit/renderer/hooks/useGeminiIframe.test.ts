/**
 * Unit tests for useGeminiIframe hook.
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGeminiIframe } from '../../../../src/renderer/hooks/useGeminiIframe';
import { useNetworkStatus } from '../../../../src/renderer/hooks/useNetworkStatus';

// Mock dependencies
vi.mock('../../../../src/renderer/hooks/useNetworkStatus', () => ({
  useNetworkStatus: vi.fn(),
}));

// Mock window.location.reload
const mockReload = vi.fn();
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true,
});

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useGeminiIframe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useNetworkStatus as Mock).mockReturnValue(true); // Default online
    mockFetch.mockResolvedValue({ ok: true }); // Default fetch success
  });

  it('initializes with loading state', () => {
    const { result } = renderHook(() => useGeminiIframe());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  describe('handleLoad', () => {
    it('sets success state when connectivity check passes', async () => {
      const { result } = renderHook(() => useGeminiIframe());

      await act(async () => {
        result.current.handleLoad();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('favicon.ico'),
        expect.any(Object)
      );
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('sets error state when connectivity check fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      const { result } = renderHook(() => useGeminiIframe());

      await act(async () => {
        result.current.handleLoad();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Unable to reach Gemini');
    });

    it('sets error state immediately if navigator is offline', async () => {
      // Mock navigator.onLine
      const originalOnLine = navigator.onLine;
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const { result } = renderHook(() => useGeminiIframe());

      await act(async () => {
        result.current.handleLoad();
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Network unavailable');

      // Restore navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: originalOnLine,
      });
    });
  });

  describe('handleError', () => {
    it('sets error state on iframe error', async () => {
      const { result } = renderHook(() => useGeminiIframe());

      await act(async () => {
        result.current.handleError();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to load Gemini');
    });
  });

  describe('retry', () => {
    it('reloads the page', () => {
      const { result } = renderHook(() => useGeminiIframe());

      act(() => {
        result.current.retry();
      });

      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('initial connectivity check', () => {
    it('sets error if offline on mount', async () => {
      // Mock navigator.onLine
      const originalOnLine = navigator.onLine;
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const { result } = renderHook(() => useGeminiIframe());

      // Initial effect runs on mount via queueMicrotask, so we need to wait
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.error).toBe('Network unavailable');

      // Restore navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: originalOnLine,
      });
    });
  });
});
