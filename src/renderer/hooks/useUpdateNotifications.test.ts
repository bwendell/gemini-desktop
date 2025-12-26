/**
 * Unit tests for useUpdateNotifications hook.
 *
 * Tests IPC event subscriptions, state management, and actions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUpdateNotifications } from './useUpdateNotifications';
import { mockElectronAPI } from '../../../tests/unit/renderer/test/setup';

describe('useUpdateNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initial state', () => {
    it('returns correct initial state', () => {
      const { result } = renderHook(() => useUpdateNotifications());

      expect(result.current.type).toBeNull();
      expect(result.current.updateInfo).toBeNull();
      expect(result.current.errorMessage).toBeNull();
      expect(result.current.visible).toBe(false);
      expect(result.current.hasPendingUpdate).toBe(false);
    });

    it('provides action functions', () => {
      const { result } = renderHook(() => useUpdateNotifications());

      expect(typeof result.current.dismissNotification).toBe('function');
      expect(typeof result.current.handleLater).toBe('function');
      expect(typeof result.current.installUpdate).toBe('function');
    });
  });

  describe('IPC event subscriptions', () => {
    it('subscribes to onUpdateAvailable on mount', () => {
      renderHook(() => useUpdateNotifications());

      expect(mockElectronAPI.onUpdateAvailable).toHaveBeenCalledTimes(1);
    });

    it('subscribes to onUpdateDownloaded on mount', () => {
      renderHook(() => useUpdateNotifications());

      expect(mockElectronAPI.onUpdateDownloaded).toHaveBeenCalledTimes(1);
    });

    it('subscribes to onUpdateError on mount', () => {
      renderHook(() => useUpdateNotifications());

      expect(mockElectronAPI.onUpdateError).toHaveBeenCalledTimes(1);
    });

    it('subscribes to onUpdateNotAvailable on mount', () => {
      renderHook(() => useUpdateNotifications());

      expect(mockElectronAPI.onUpdateNotAvailable).toHaveBeenCalledTimes(1);
    });

    it('subscribes to onDownloadProgress on mount', () => {
      renderHook(() => useUpdateNotifications());

      expect(mockElectronAPI.onDownloadProgress).toHaveBeenCalledTimes(1);
    });

    it('calls cleanup functions on unmount', () => {
      const cleanupAvailable = vi.fn();
      const cleanupDownloaded = vi.fn();
      const cleanupError = vi.fn();
      const cleanupNotAvailable = vi.fn();
      const cleanupProgress = vi.fn();

      mockElectronAPI.onUpdateAvailable.mockReturnValue(cleanupAvailable);
      mockElectronAPI.onUpdateDownloaded.mockReturnValue(cleanupDownloaded);
      mockElectronAPI.onUpdateError.mockReturnValue(cleanupError);
      mockElectronAPI.onUpdateNotAvailable.mockReturnValue(cleanupNotAvailable);
      mockElectronAPI.onDownloadProgress.mockReturnValue(cleanupProgress);

      const { unmount } = renderHook(() => useUpdateNotifications());
      unmount();

      expect(cleanupAvailable).toHaveBeenCalledTimes(1);
      expect(cleanupDownloaded).toHaveBeenCalledTimes(1);
      expect(cleanupError).toHaveBeenCalledTimes(1);
      expect(cleanupNotAvailable).toHaveBeenCalledTimes(1);
      expect(cleanupProgress).toHaveBeenCalledTimes(1);
    });
  });

  describe('update available event', () => {
    it('sets notification state when update is available', async () => {
      let capturedCallback: ((info: { version: string }) => void) | undefined;
      mockElectronAPI.onUpdateAvailable.mockImplementation((cb) => {
        capturedCallback = cb;
        return () => {};
      });

      const { result } = renderHook(() => useUpdateNotifications());

      // Simulate IPC event
      act(() => {
        capturedCallback?.({ version: '2.0.0' });
      });

      await waitFor(() => {
        expect(result.current.type).toBe('available');
        expect(result.current.updateInfo?.version).toBe('2.0.0');
        expect(result.current.visible).toBe(true);
        expect(result.current.hasPendingUpdate).toBe(false);
      });
    });
  });

  describe('update downloaded event', () => {
    it('sets notification state with pending flag when downloaded', async () => {
      let capturedCallback: ((info: { version: string }) => void) | undefined;
      mockElectronAPI.onUpdateDownloaded.mockImplementation((cb) => {
        capturedCallback = cb;
        return () => {};
      });

      const { result } = renderHook(() => useUpdateNotifications());

      act(() => {
        capturedCallback?.({ version: '2.0.0' });
      });

      await waitFor(() => {
        expect(result.current.type).toBe('downloaded');
        expect(result.current.visible).toBe(true);
        expect(result.current.hasPendingUpdate).toBe(true);
      });
    });
  });

  describe('update error event', () => {
    it('sets error notification state', async () => {
      let capturedCallback: ((error: string) => void) | undefined;
      mockElectronAPI.onUpdateError.mockImplementation((cb) => {
        capturedCallback = cb;
        return () => {};
      });

      const { result } = renderHook(() => useUpdateNotifications());

      act(() => {
        capturedCallback?.('Network error');
      });

      await waitFor(() => {
        expect(result.current.type).toBe('error');
        expect(result.current.errorMessage).toBe('Network error');
        expect(result.current.visible).toBe(true);
        expect(result.current.hasPendingUpdate).toBe(false);
      });
    });
  });

  describe('update not available event', () => {
    it('sets notification state when no update is available', async () => {
      let capturedCallback: ((info: { version: string }) => void) | undefined;
      mockElectronAPI.onUpdateNotAvailable.mockImplementation((cb) => {
        capturedCallback = cb;
        return () => {};
      });

      const { result } = renderHook(() => useUpdateNotifications());

      // Simulate IPC event
      act(() => {
        capturedCallback?.({ version: '1.0.0' });
      });

      await waitFor(() => {
        expect(result.current.type).toBe('not-available');
        expect(result.current.updateInfo?.version).toBe('1.0.0');
        expect(result.current.visible).toBe(true);
        expect(result.current.hasPendingUpdate).toBe(false);
      });
    });
  });

  describe('download progress event', () => {
    it('sets progress state when download is in progress', async () => {
      let capturedCallback: ((progress: { percent: number }) => void) | undefined;
      mockElectronAPI.onDownloadProgress.mockImplementation((cb) => {
        capturedCallback = cb;
        return () => {};
      });

      const { result } = renderHook(() => useUpdateNotifications());

      // Simulate IPC event
      act(() => {
        capturedCallback?.({ percent: 45 });
      });

      await waitFor(() => {
        expect(result.current.type).toBe('progress');
        expect(result.current.downloadProgress).toBe(45);
        expect(result.current.visible).toBe(true);
        expect(result.current.hasPendingUpdate).toBe(false);
      });
    });

    it('handles progress updates from 0 to 100', async () => {
      let capturedCallback: ((progress: { percent: number }) => void) | undefined;
      mockElectronAPI.onDownloadProgress.mockImplementation((cb) => {
        capturedCallback = cb;
        return () => {};
      });

      const { result } = renderHook(() => useUpdateNotifications());

      // Test different progress values
      act(() => {
        capturedCallback?.({ percent: 0 });
      });
      await waitFor(() => expect(result.current.downloadProgress).toBe(0));

      act(() => {
        capturedCallback?.({ percent: 50 });
      });
      await waitFor(() => expect(result.current.downloadProgress).toBe(50));

      act(() => {
        capturedCallback?.({ percent: 99 });
      });
      await waitFor(() => expect(result.current.downloadProgress).toBe(99));

      act(() => {
        capturedCallback?.({ percent: 100 });
      });
      await waitFor(() => expect(result.current.downloadProgress).toBe(100));
    });
  });

  describe('actions', () => {
    it('dismissNotification hides toast', async () => {
      let capturedCallback: ((info: { version: string }) => void) | undefined;
      mockElectronAPI.onUpdateAvailable.mockImplementation((cb) => {
        capturedCallback = cb;
        return () => {};
      });

      const { result } = renderHook(() => useUpdateNotifications());

      // Show toast
      act(() => {
        capturedCallback?.({ version: '2.0.0' });
      });

      await waitFor(() => {
        expect(result.current.visible).toBe(true);
      });

      // Dismiss
      act(() => {
        result.current.dismissNotification();
      });

      expect(result.current.visible).toBe(false);
    });

    it('handleLater hides toast but keeps pending flag', async () => {
      let capturedCallback: ((info: { version: string }) => void) | undefined;
      mockElectronAPI.onUpdateDownloaded.mockImplementation((cb) => {
        capturedCallback = cb;
        return () => {};
      });

      const { result } = renderHook(() => useUpdateNotifications());

      // Show toast
      act(() => {
        capturedCallback?.({ version: '2.0.0' });
      });

      await waitFor(() => {
        expect(result.current.hasPendingUpdate).toBe(true);
      });

      // Click Later
      act(() => {
        result.current.handleLater();
      });

      expect(result.current.visible).toBe(false);
      expect(result.current.hasPendingUpdate).toBe(true);
    });

    it('installUpdate calls electronAPI and clears pending state', async () => {
      let capturedCallback: ((info: { version: string }) => void) | undefined;
      mockElectronAPI.onUpdateDownloaded.mockImplementation((cb) => {
        capturedCallback = cb;
        return () => {};
      });

      const { result } = renderHook(() => useUpdateNotifications());

      // Show toast
      act(() => {
        capturedCallback?.({ version: '2.0.0' });
      });

      await waitFor(() => {
        expect(result.current.hasPendingUpdate).toBe(true);
      });

      // Install
      act(() => {
        result.current.installUpdate();
      });

      expect(mockElectronAPI.installUpdate).toHaveBeenCalledTimes(1);
      expect(result.current.visible).toBe(false);
      expect(result.current.hasPendingUpdate).toBe(false);
    });
  });

  describe('graceful fallback', () => {
    it('handles missing electronAPI gracefully', () => {
      const originalAPI = window.electronAPI;
      // @ts-expect-error - Testing undefined case
      window.electronAPI = undefined;

      const { result } = renderHook(() => useUpdateNotifications());

      // Should not throw and return initial state
      expect(result.current.type).toBeNull();
      expect(result.current.visible).toBe(false);

      window.electronAPI = originalAPI;
    });
  });
});
