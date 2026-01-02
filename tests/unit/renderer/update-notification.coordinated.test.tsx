/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { ToastProvider, useToast } from '../../../src/renderer/context/ToastContext';
import {
  UpdateToastProvider,
  useUpdateToast,
} from '../../../src/renderer/context/UpdateToastContext';

// Track registered callbacks for update events
let updateAvailableCallback: ((info: { version: string }) => void) | null = null;
let updateDownloadedCallback: ((info: { version: string }) => void) | null = null;
let updateErrorCallback: ((error: string) => void) | null = null;
let downloadProgressCallback: ((progress: { percent: number }) => void) | null = null;

// Mock API object
const mockApi = {
  onUpdateAvailable: vi.fn((cb) => {
    updateAvailableCallback = cb;
    return vi.fn();
  }),
  onUpdateDownloaded: vi.fn((cb) => {
    updateDownloadedCallback = cb;
    return vi.fn();
  }),
  onUpdateError: vi.fn((cb) => {
    updateErrorCallback = cb;
    return vi.fn();
  }),
  onUpdateNotAvailable: vi.fn(() => vi.fn()),
  onDownloadProgress: vi.fn((cb) => {
    downloadProgressCallback = cb;
    return vi.fn();
  }),
  onToastShow: vi.fn(() => vi.fn()),
  installUpdate: vi.fn(),
  getAutoUpdateEnabled: vi.fn().mockResolvedValue(true),
  setAutoUpdateEnabled: vi.fn(),
  checkForUpdates: vi.fn(),
  getLastUpdateCheckTime: vi.fn().mockResolvedValue(Date.now()),
  platform: 'win32',
  isElectron: true,
};

beforeEach(() => {
  vi.clearAllMocks();

  updateAvailableCallback = null;
  updateDownloadedCallback = null;
  updateErrorCallback = null;
  downloadProgressCallback = null;

  (window as any).electronAPI = mockApi;
});

afterEach(() => {});

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <UpdateToastProvider>{children}</UpdateToastProvider>
    </ToastProvider>
  );
}

/**
 * Combined hook for testing interaction
 */
function useCombinedHooks() {
  return {
    toast: useToast(),
    update: useUpdateToast(),
  };
}

describe('UpdateToastContext ↔ ToastContext Integration', () => {
  describe('7.3.1 UpdateToastContext uses showToast() for notifications', () => {
    it('should show toast via ToastContext when update available', async () => {
      const { result } = renderHook(() => useCombinedHooks(), {
        wrapper: TestWrapper,
      });

      expect(result.current.toast.toasts).toHaveLength(0);

      act(() => {
        updateAvailableCallback?.({ version: '2.0.0' });
      });

      expect(result.current.toast.toasts.length).toBeGreaterThan(0);
      const toast = result.current.toast.toasts[0];
      expect(toast.type).toBe('info');
      expect(toast.message).toContain('2.0.0');
    });

    it('should show success toast when update downloaded', () => {
      const { result } = renderHook(() => useCombinedHooks(), {
        wrapper: TestWrapper,
      });

      act(() => {
        updateDownloadedCallback?.({ version: '2.0.0' });
      });

      expect(result.current.toast.toasts.length).toBeGreaterThan(0);
      const toast = result.current.toast.toasts[0];
      expect(toast.type).toBe('success');
      expect(toast.message).toContain('ready to install');
    });

    it('should show error toast when update fails', () => {
      const { result } = renderHook(() => useCombinedHooks(), {
        wrapper: TestWrapper,
      });

      act(() => {
        updateErrorCallback?.('Download failed');
      });

      expect(result.current.toast.toasts.length).toBeGreaterThan(0);
      const toast = result.current.toast.toasts[0];
      expect(toast.type).toBe('error');
      expect(toast.message).toContain('Download failed');
    });
  });

  describe('7.3.2 Update toast ID tracked for programmatic dismissal', () => {
    it('should use stable ID for update toasts', () => {
      const { result } = renderHook(() => useCombinedHooks(), {
        wrapper: TestWrapper,
      });

      act(() => {
        updateAvailableCallback?.({ version: '2.0.0' });
      });

      expect(result.current.toast.toasts[0].id).toBe('update-notification');
    });

    it('should reuse same ID when update status changes', async () => {
      const { result } = renderHook(() => useCombinedHooks(), {
        wrapper: TestWrapper,
      });

      act(() => {
        updateAvailableCallback?.({ version: '2.0.0' });
      });

      expect(result.current.toast.toasts[0].type).toBe('info');

      act(() => {
        updateDownloadedCallback?.({ version: '2.0.0' });
      });

      await waitFor(() => {
        const updateToast = result.current.toast.toasts.find((t) => t.id === 'update-notification');
        expect(updateToast?.type).toBe('success');
      });
    });
  });

  describe('7.3.3 dismissToast(updateToastId) removes update toast', () => {
    it('should remove update toast when dismissNotification called', async () => {
      const { result } = renderHook(() => useCombinedHooks(), {
        wrapper: TestWrapper,
      });

      act(() => {
        updateAvailableCallback?.({ version: '2.0.0' });
      });

      expect(result.current.toast.toasts.length).toBe(1);

      act(() => {
        result.current.update.dismissNotification();
      });

      await waitFor(() => {
        expect(result.current.toast.toasts.length).toBe(0);
      });
    });

    it('should remove update toast when handleLater called', async () => {
      const { result } = renderHook(() => useCombinedHooks(), {
        wrapper: TestWrapper,
      });

      act(() => {
        updateDownloadedCallback?.({ version: '2.0.0' });
      });

      expect(result.current.toast.toasts.length).toBe(1);

      act(() => {
        result.current.update.handleLater();
      });

      await waitFor(() => {
        expect(result.current.toast.toasts.length).toBe(0);
      });
    });
  });

  describe('7.3.4 Update status changes update existing toast', () => {
    it('should transition from available to progress to downloaded', async () => {
      const { result } = renderHook(() => useCombinedHooks(), {
        wrapper: TestWrapper,
      });

      act(() => {
        updateAvailableCallback?.({ version: '2.0.0' });
      });

      act(() => {
        downloadProgressCallback?.({ percent: 50 });
      });

      await waitFor(() => {
        const toast = result.current.toast.toasts.find((t) => t.id === 'update-notification');
        expect(toast?.type).toBe('progress');
        expect(toast?.progress).toBe(50);
      });

      act(() => {
        updateDownloadedCallback?.({ version: '2.0.0' });
      });

      await waitFor(() => {
        const toast = result.current.toast.toasts.find((t) => t.id === 'update-notification');
        expect(toast?.type).toBe('success');
      });
    });
  });

  describe('7.3.5 Provider nesting and hook compatibility', () => {
    it('should work with correct provider nesting order', () => {
      expect(() => {
        renderHook(() => useUpdateToast(), {
          wrapper: TestWrapper,
        });
      }).not.toThrow();
    });

    it('should throw error if UpdateToastProvider used outside ToastProvider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useUpdateToast(), {
          wrapper: UpdateToastProvider,
        });
      }).toThrow('useToast must be used within a ToastProvider');

      consoleError.mockRestore();
    });

    it('should expose unchanged useUpdateToast API', () => {
      const { result } = renderHook(() => useUpdateToast(), {
        wrapper: TestWrapper,
      });

      expect(result.current).toHaveProperty('visible');
      expect(result.current).toHaveProperty('hasPendingUpdate');
      expect(result.current).toHaveProperty('dismissNotification');
      expect(result.current).toHaveProperty('handleLater');
      expect(result.current).toHaveProperty('installUpdate');
    });

    it('should maintain hasPendingUpdate state after dismissal', async () => {
      const { result } = renderHook(() => useCombinedHooks(), {
        wrapper: TestWrapper,
      });

      act(() => {
        updateDownloadedCallback?.({ version: '2.0.0' });
      });

      expect(result.current.update.hasPendingUpdate).toBe(true);

      act(() => {
        result.current.update.handleLater();
      });

      await waitFor(() => {
        expect(result.current.update.hasPendingUpdate).toBe(true);
        expect(result.current.update.visible).toBe(false);
      });
    });
  });
});
