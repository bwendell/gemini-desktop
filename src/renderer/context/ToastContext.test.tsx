/**
 * Unit tests for ToastContext.
 *
 * Tests the ToastProvider and useToast hook functionality including:
 * - showToast() adds toast and returns ID
 * - dismissToast() removes correct toast
 * - dismissAll() clears all toasts
 * - Auto-dismiss after duration (mock timers)
 * - Persistent toast does not auto-dismiss
 * - useToast() throws outside provider
 * - Helper functions (showSuccess, etc.) set correct type
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ToastProvider, useToast } from './ToastContext';
import React from 'react';

/**
 * Test wrapper for hook tests
 */
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

describe('ToastContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ToastProvider', () => {
    it('renders children correctly', () => {
      render(
        <ToastProvider>
          <div data-testid="child">Child content</div>
        </ToastProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('renders ToastContainer for displaying toasts', () => {
      render(
        <ToastProvider>
          <div>Child</div>
        </ToastProvider>
      );

      // ToastContainer should be present (empty initially)
      expect(screen.getByTestId('toast-container')).toBeInTheDocument();
    });
  });

  describe('showToast', () => {
    it('adds toast to array and returns ID', () => {
      const { result } = renderHook(() => useToast(), { wrapper: TestWrapper });

      let toastId: string;
      act(() => {
        toastId = result.current.showToast({
          type: 'info',
          message: 'Test message',
        });
      });

      expect(toastId!).toBeDefined();
      expect(typeof toastId!).toBe('string');
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].id).toBe(toastId!);
      expect(result.current.toasts[0].message).toBe('Test message');
      expect(result.current.toasts[0].type).toBe('info');
    });

    it('uses provided ID if specified', () => {
      const { result } = renderHook(() => useToast(), { wrapper: TestWrapper });

      let toastId: string;
      act(() => {
        toastId = result.current.showToast({
          id: 'custom-id-123',
          type: 'success',
          message: 'Custom ID toast',
        });
      });

      expect(toastId!).toBe('custom-id-123');
      expect(result.current.toasts[0].id).toBe('custom-id-123');
    });

    it('renders toast in the DOM when shown', () => {
      render(
        <ToastProvider>
          <div />
        </ToastProvider>
      );

      // We need a way to trigger showToast in a functional way for DOM tests
      // Using a small helper component for this
      const Trigger = () => {
        const { showToast } = useToast();
        return (
          <button
            onClick={() =>
              showToast({
                type: 'info',
                title: 'Test Title',
                message: 'Test message content',
              })
            }
          >
            Show
          </button>
        );
      };

      render(
        <ToastProvider>
          <Trigger />
        </ToastProvider>
      );

      act(() => {
        screen.getByText('Show').click();
      });

      expect(screen.getByTestId('toast')).toBeInTheDocument();
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test message content')).toBeInTheDocument();
    });
  });

  describe('dismissToast', () => {
    it('removes correct toast by ID', () => {
      const { result } = renderHook(() => useToast(), { wrapper: TestWrapper });

      let id1: string, id2: string, id3: string;
      act(() => {
        id1 = result.current.showToast({
          type: 'info',
          message: 'Toast 1',
          persistent: true,
        });
        id2 = result.current.showToast({
          type: 'success',
          message: 'Toast 2',
          persistent: true,
        });
        id3 = result.current.showToast({
          type: 'warning',
          message: 'Toast 3',
          persistent: true,
        });
      });

      expect(result.current.toasts).toHaveLength(3);

      act(() => {
        result.current.dismissToast(id2!);
      });

      expect(result.current.toasts).toHaveLength(2);
      expect(result.current.toasts.find((t) => t.id === id1!)).toBeDefined();
      expect(result.current.toasts.find((t) => t.id === id2!)).toBeUndefined();
      expect(result.current.toasts.find((t) => t.id === id3!)).toBeDefined();
    });
  });

  describe('dismissAll', () => {
    it('clears all toasts', () => {
      const { result } = renderHook(() => useToast(), { wrapper: TestWrapper });

      act(() => {
        result.current.showToast({ type: 'info', message: 'Toast 1', persistent: true });
        result.current.showToast({ type: 'success', message: 'Toast 2', persistent: true });
        result.current.showToast({ type: 'warning', message: 'Toast 3', persistent: true });
      });

      expect(result.current.toasts).toHaveLength(3);

      act(() => {
        result.current.dismissAll();
      });

      expect(result.current.toasts).toHaveLength(0);
    });
  });

  describe('auto-dismiss', () => {
    it('auto-dismisses success toast after 5000ms', () => {
      const { result } = renderHook(() => useToast(), { wrapper: TestWrapper });

      act(() => {
        result.current.showToast({ type: 'success', message: 'Success toast' });
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(4999);
      });
      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current.toasts).toHaveLength(0);
    });

    it('auto-dismisses warning toast after 7000ms', () => {
      const { result } = renderHook(() => useToast(), { wrapper: TestWrapper });

      act(() => {
        result.current.showToast({ type: 'warning', message: 'Warning toast' });
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(7000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('auto-dismisses error toast after 10000ms', () => {
      const { result } = renderHook(() => useToast(), { wrapper: TestWrapper });

      act(() => {
        result.current.showToast({ type: 'error', message: 'Error toast' });
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('respects custom duration', () => {
      const { result } = renderHook(() => useToast(), { wrapper: TestWrapper });

      act(() => {
        result.current.showToast({
          type: 'info',
          message: 'Custom',
          duration: 2000,
        });
      });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });
  });

  describe('persistent toast', () => {
    it('does not auto-dismiss when persistent is true', () => {
      const { result } = renderHook(() => useToast(), { wrapper: TestWrapper });

      act(() => {
        result.current.showToast({
          type: 'info',
          message: 'Persistent',
          persistent: true,
        });
      });

      act(() => {
        vi.advanceTimersByTime(60000);
      });

      expect(result.current.toasts).toHaveLength(1);
    });

    it('does not auto-dismiss progress type by default', () => {
      const { result } = renderHook(() => useToast(), { wrapper: TestWrapper });

      act(() => {
        result.current.showToast({
          type: 'progress',
          message: 'Loading',
          progress: 50,
        });
      });

      act(() => {
        vi.advanceTimersByTime(60000);
      });

      expect(result.current.toasts).toHaveLength(1);
    });
  });

  describe('useToast hook', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test as throwing in a hook causes one
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useToast());
      }).toThrow('useToast must be used within a ToastProvider');

      consoleSpy.mockRestore();
    });

    it('returns context value when used inside provider', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: TestWrapper,
      });

      expect(result.current.showToast).toBeDefined();
      expect(result.current.toasts).toBeDefined();
    });
  });

  describe('helper functions', () => {
    it('showSuccess sets correct type', () => {
      const { result } = renderHook(() => useToast(), { wrapper: TestWrapper });

      act(() => {
        result.current.showSuccess('Success');
      });

      expect(result.current.toasts[0].type).toBe('success');
    });

    it('showError sets correct type', () => {
      const { result } = renderHook(() => useToast(), { wrapper: TestWrapper });

      act(() => {
        result.current.showError('Error');
      });

      expect(result.current.toasts[0].type).toBe('error');
    });

    it('showInfo sets correct type', () => {
      const { result } = renderHook(() => useToast(), { wrapper: TestWrapper });

      act(() => {
        result.current.showInfo('Info');
      });

      expect(result.current.toasts[0].type).toBe('info');
    });

    it('showWarning sets correct type', () => {
      const { result } = renderHook(() => useToast(), { wrapper: TestWrapper });

      act(() => {
        result.current.showWarning('Warning');
      });

      expect(result.current.toasts[0].type).toBe('warning');
    });

    it('helper functions accept additional options', () => {
      const { result } = renderHook(() => useToast(), { wrapper: TestWrapper });

      act(() => {
        result.current.showSuccess('Msg', { title: 'Title' });
      });

      expect(result.current.toasts[0].title).toBe('Title');
    });
  });
});
