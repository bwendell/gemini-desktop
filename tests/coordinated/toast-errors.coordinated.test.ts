/**
 * Coordinated tests for Toast Error Handling.
 * Verifies that the toast system handles edge cases and errors gracefully.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, render, screen } from '@testing-library/react';
import React from 'react';

import { ToastProvider, useToast } from '../../src/renderer/context/ToastContext';
import { showToast as mainProcessShowToast } from '../../src/main/utils/toast';
import type { BrowserWindow } from 'electron';
import type { ToastPayload } from '../../src/shared/types/toast';

// Mock electron
vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: vi.fn(),
  },
  app: {
    isPackaged: false,
  },
}));

describe('Toast Error Handling Coordination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('useToast() outside ToastProvider', () => {
    it('7.4.1 - should throw descriptive error when used outside ToastProvider', () => {
      // Suppress console.error for expected error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useToast());
      }).toThrow('useToast must be used within a ToastProvider');

      consoleSpy.mockRestore();
    });

    it('should include helpful message about wrapping with ToastProvider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        renderHook(() => useToast());
      } catch (error) {
        expect((error as Error).message).toContain('<ToastProvider>');
      }

      consoleSpy.mockRestore();
    });
  });

  describe('Invalid toast type handling', () => {
    it('7.4.2 - should handle invalid toast type gracefully', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      // TypeScript would catch this but runtime might receive invalid types
      // Test that it doesn't crash
      expect(() => {
        act(() => {
          // Force an invalid type through any
          result.current.showToast({
            type: 'invalid-type' as any,
            message: 'Test message',
          });
        });
      }).not.toThrow();

      // Toast should still be added despite invalid type
      expect(result.current.toasts).toHaveLength(1);
    });

    it('should handle missing message gracefully', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      expect(() => {
        act(() => {
          result.current.showToast({
            type: 'info',
            message: '', // Empty message
          });
        });
      }).not.toThrow();

      expect(result.current.toasts).toHaveLength(1);
    });
  });

  describe('Duplicate toast IDs', () => {
    it('7.4.3 - should handle duplicate toast IDs by updating the existing toast', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      act(() => {
        result.current.showToast({
          id: 'duplicate-id',
          type: 'info',
          message: 'First toast',
        });
        result.current.showToast({
          id: 'duplicate-id',
          type: 'success',
          message: 'Second toast with same ID',
        });
      });

      // Duplicate IDs should update the existing toast, not add a new one
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].id).toBe('duplicate-id');
      expect(result.current.toasts[0].type).toBe('success');
      expect(result.current.toasts[0].message).toBe('Second toast with same ID');
    });

    it('should dismiss toast by ID when dismissToast called', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      act(() => {
        result.current.showToast({
          id: 'duplicate-id',
          type: 'info',
          message: 'First toast',
        });
        result.current.showToast({
          id: 'duplicate-id',
          type: 'success',
          message: 'Second toast with same ID',
        });
      });

      // With deduplication, only 1 toast exists
      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        result.current.dismissToast('duplicate-id');
      });

      // Toast should be removed
      expect(result.current.toasts).toHaveLength(0);
    });
  });

  describe('Destroyed webContents handling', () => {
    it('7.4.4 - should not crash when sending toast to destroyed window', () => {
      const mockSend = vi.fn();
      const destroyedWindow = {
        isDestroyed: vi.fn().mockReturnValue(true),
        webContents: {
          send: mockSend,
        },
      } as unknown as BrowserWindow;

      const payload: ToastPayload = {
        type: 'error',
        message: 'Error toast',
      };

      expect(() => {
        mainProcessShowToast(destroyedWindow, payload);
      }).not.toThrow();

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should not crash when window is null', () => {
      const payload: ToastPayload = {
        type: 'info',
        message: 'Info toast',
      };

      expect(() => {
        mainProcessShowToast(null as any, payload);
      }).not.toThrow();
    });

    it('should not crash when window is undefined', () => {
      const payload: ToastPayload = {
        type: 'warning',
        message: 'Warning toast',
      };

      expect(() => {
        mainProcessShowToast(undefined as any, payload);
      }).not.toThrow();
    });
  });

  describe('Rapid toast creation', () => {
    it('7.4.5 - should handle rapid toast creation without race conditions', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      const toastIds: string[] = [];

      // Create 10 toasts in rapid succession
      act(() => {
        for (let i = 0; i < 10; i++) {
          const id = result.current.showToast({
            type: 'info',
            message: `Rapid toast ${i}`,
            persistent: true, // Prevent auto-dismiss during test
          });
          toastIds.push(id);
        }
      });

      // All 10 toasts should be present
      expect(result.current.toasts).toHaveLength(10);

      // Each toast should have a unique ID
      const uniqueIds = new Set(result.current.toasts.map((t) => t.id));
      expect(uniqueIds.size).toBe(10);
    });

    it('should maintain correct order with rapid creation', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      act(() => {
        result.current.showToast({ type: 'info', message: 'First', persistent: true });
        result.current.showToast({ type: 'info', message: 'Second', persistent: true });
        result.current.showToast({ type: 'info', message: 'Third', persistent: true });
      });

      expect(result.current.toasts[0].message).toBe('First');
      expect(result.current.toasts[1].message).toBe('Second');
      expect(result.current.toasts[2].message).toBe('Third');
    });

    it('should handle concurrent creation and dismissal', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      let firstToastId: string;

      act(() => {
        firstToastId = result.current.showToast({
          type: 'info',
          message: 'First toast',
          persistent: true,
        });
        result.current.showToast({
          type: 'info',
          message: 'Second toast',
          persistent: true,
        });
      });

      expect(result.current.toasts).toHaveLength(2);

      // Dismiss first toast while adding third
      act(() => {
        result.current.dismissToast(firstToastId);
        result.current.showToast({
          type: 'success',
          message: 'Third toast',
          persistent: true,
        });
      });

      expect(result.current.toasts).toHaveLength(2);
      expect(result.current.toasts.find((t) => t.id === firstToastId)).toBeUndefined();
      expect(result.current.toasts[0].message).toBe('Second toast');
      expect(result.current.toasts[1].message).toBe('Third toast');
    });

    it('should handle rapid dismissAll calls', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      act(() => {
        result.current.showToast({ type: 'info', message: 'Toast 1', persistent: true });
        result.current.showToast({ type: 'info', message: 'Toast 2', persistent: true });
        result.current.showToast({ type: 'info', message: 'Toast 3', persistent: true });
      });

      expect(result.current.toasts).toHaveLength(3);

      // Call dismissAll multiple times rapidly
      act(() => {
        result.current.dismissAll();
        result.current.dismissAll();
        result.current.dismissAll();
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should correctly schedule auto-dismiss for rapid toasts', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      act(() => {
        result.current.showToast({ type: 'success', message: 'Success 1' }); // 5000ms
        result.current.showToast({ type: 'success', message: 'Success 2' }); // 5000ms
        result.current.showToast({ type: 'error', message: 'Error 1' }); // 10000ms
      });

      expect(result.current.toasts).toHaveLength(3);

      // Advance timer to dismiss success toasts
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Success toasts should be dismissed, error should remain
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].message).toBe('Error 1');

      // Advance timer to dismiss error toast
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });
  });
});
