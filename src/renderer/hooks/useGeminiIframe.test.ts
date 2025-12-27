import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGeminiIframe } from './useGeminiIframe';
import * as useNetworkStatusModule from './useNetworkStatus';

// Mock useNetworkStatus
vi.mock('./useNetworkStatus', () => ({
  useNetworkStatus: vi.fn(() => true),
}));

// Mock window.location.reload
const mockReload = vi.fn();
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true,
});

describe('useGeminiIframe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to online
    vi.mocked(useNetworkStatusModule.useNetworkStatus).mockReturnValue(true);
    // Mock fetch for connectivity checks - default to success
    global.fetch = vi.fn(() => Promise.resolve({} as Response));
  });

  it('initializes with loading state', () => {
    const { result } = renderHook(() => useGeminiIframe());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.isOnline).toBe(true);
  });

  it('provides network status from useNetworkStatus', () => {
    vi.mocked(useNetworkStatusModule.useNetworkStatus).mockReturnValue(false);

    const { result } = renderHook(() => useGeminiIframe());

    expect(result.current.isOnline).toBe(false);
  });

  it('handleLoad sets loading to false and clears error', async () => {
    const { result } = renderHook(() => useGeminiIframe());

    await act(async () => {
      await result.current.handleLoad();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handleError sets loading to false and sets error message', () => {
    const { result } = renderHook(() => useGeminiIframe());

    act(() => {
      result.current.handleError();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('Failed to load Gemini');
  });

  it('retry calls window.location.reload', () => {
    const { result } = renderHook(() => useGeminiIframe());

    // First set error state
    act(() => {
      result.current.handleError();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('Failed to load Gemini');

    // Then retry
    act(() => {
      result.current.retry();
    });

    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it('handleLoad after error clears error state', async () => {
    const { result } = renderHook(() => useGeminiIframe());

    // Set error
    act(() => {
      result.current.handleError();
    });

    expect(result.current.error).toBe('Failed to load Gemini');

    // Then load successfully
    await act(async () => {
      await result.current.handleLoad();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('provides stable callback references', () => {
    const { result, rerender } = renderHook(() => useGeminiIframe());

    const initialHandleLoad = result.current.handleLoad;
    const initialHandleError = result.current.handleError;
    const initialRetry = result.current.retry;

    rerender();

    expect(result.current.handleLoad).toBe(initialHandleLoad);
    expect(result.current.handleError).toBe(initialHandleError);
    expect(result.current.retry).toBe(initialRetry);
  });

  it('network status updates are reflected', () => {
    const { result, rerender } = renderHook(() => useGeminiIframe());

    expect(result.current.isOnline).toBe(true);

    // Change network status
    vi.mocked(useNetworkStatusModule.useNetworkStatus).mockReturnValue(false);
    rerender();

    expect(result.current.isOnline).toBe(false);
  });
});
