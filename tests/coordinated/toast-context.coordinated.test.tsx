/**
 * Coordinated tests for ToastContext ↔ ToastContainer coordination.
 * Verifies that the ToastContext state and ToastContainer rendering stay in sync.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act as reactAct } from '@testing-library/react';
import { ToastProvider, useToast } from '../../src/renderer/context/ToastContext';

// Mock framer-motion to avoid animation timing issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock electronAPI to prevent IPC subscription errors
vi.mock('../../src/preload/preload', () => ({}));

// Setup window.electronAPI mock
beforeEach(() => {
  (window as any).electronAPI = undefined;
});

/**
 * Test component that exposes toast context for testing
 */
function TestComponent({ onMount }: { onMount?: (api: ReturnType<typeof useToast>) => void }) {
  const api = useToast();

  if (onMount) {
    // Use effect-like behavior for initial mount
    setTimeout(() => onMount(api), 0);
  }

  // Only render the count, not the messages (to avoid duplicates with ToastContainer)
  return (
    <div>
      <div data-testid="toast-count">{api.toasts.length}</div>
    </div>
  );
}

describe('ToastContext ↔ ToastContainer Coordination', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('7.2.1 - showToast adds toast and ToastContainer receives it', () => {
    it('should add a toast to the container when showToast is called', async () => {
      let toastApi: ReturnType<typeof useToast> | null = null;

      render(
        <ToastProvider>
          <TestComponent
            onMount={(api) => {
              toastApi = api;
            }}
          />
        </ToastProvider>
      );

      // Wait for mount callback
      await reactAct(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      expect(toastApi).not.toBeNull();

      // Show a toast
      await reactAct(async () => {
        toastApi!.showToast({ type: 'success', message: 'Test toast' });
      });

      // Verify toast appears in the container
      expect(screen.getByTestId('toast-count').textContent).toBe('1');
      expect(screen.getByTestId('toast-container')).toBeTruthy();
      expect(screen.getByText('Test toast')).toBeTruthy();
    });

    it('should return a unique ID when showToast is called', async () => {
      let toastApi: ReturnType<typeof useToast> | null = null;

      render(
        <ToastProvider>
          <TestComponent
            onMount={(api) => {
              toastApi = api;
            }}
          />
        </ToastProvider>
      );

      await reactAct(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      let id1: string = '';
      let id2: string = '';

      await reactAct(async () => {
        id1 = toastApi!.showToast({ type: 'info', message: 'Toast 1' });
        id2 = toastApi!.showToast({ type: 'info', message: 'Toast 2' });
      });

      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });
  });

  describe('7.2.2 - dismissToast removes correct toast', () => {
    it('should remove only the toast with the specified ID', async () => {
      let toastApi: ReturnType<typeof useToast> | null = null;

      render(
        <ToastProvider>
          <TestComponent
            onMount={(api) => {
              toastApi = api;
            }}
          />
        </ToastProvider>
      );

      await reactAct(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      let id1: string = '';
      let id2: string = '';
      let id3: string = '';

      // Add three toasts
      await reactAct(async () => {
        id1 = toastApi!.showToast({ type: 'success', message: 'Toast 1', persistent: true });
        id2 = toastApi!.showToast({ type: 'info', message: 'Toast 2', persistent: true });
        id3 = toastApi!.showToast({ type: 'warning', message: 'Toast 3', persistent: true });
      });

      expect(screen.getByTestId('toast-count').textContent).toBe('3');

      // Dismiss the middle toast
      await reactAct(async () => {
        toastApi!.dismissToast(id2);
      });

      // Verify only Toast 2 is removed
      expect(screen.getByTestId('toast-count').textContent).toBe('2');
      expect(screen.getByText('Toast 1')).toBeTruthy();
      expect(screen.queryByText('Toast 2')).toBeNull();
      expect(screen.getByText('Toast 3')).toBeTruthy();
    });

    it('should not crash when dismissing non-existent toast ID', async () => {
      let toastApi: ReturnType<typeof useToast> | null = null;

      render(
        <ToastProvider>
          <TestComponent
            onMount={(api) => {
              toastApi = api;
            }}
          />
        </ToastProvider>
      );

      await reactAct(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      await reactAct(async () => {
        toastApi!.showToast({ type: 'success', message: 'Toast', persistent: true });
      });

      expect(screen.getByTestId('toast-count').textContent).toBe('1');

      // Dismiss a non-existent ID - should not throw
      await reactAct(async () => {
        toastApi!.dismissToast('non-existent-id');
      });

      // Original toast should still be there
      expect(screen.getByTestId('toast-count').textContent).toBe('1');
    });
  });

  describe('7.2.3 - dismissAll clears all toasts', () => {
    it('should remove all toasts when dismissAll is called', async () => {
      let toastApi: ReturnType<typeof useToast> | null = null;

      render(
        <ToastProvider>
          <TestComponent
            onMount={(api) => {
              toastApi = api;
            }}
          />
        </ToastProvider>
      );

      await reactAct(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      // Add multiple toasts
      await reactAct(async () => {
        toastApi!.showToast({ type: 'success', message: 'Toast 1', persistent: true });
        toastApi!.showToast({ type: 'error', message: 'Toast 2', persistent: true });
        toastApi!.showToast({ type: 'info', message: 'Toast 3', persistent: true });
      });

      expect(screen.getByTestId('toast-count').textContent).toBe('3');

      // Dismiss all
      await reactAct(async () => {
        toastApi!.dismissAll();
      });

      expect(screen.getByTestId('toast-count').textContent).toBe('0');
      expect(screen.queryByText('Toast 1')).toBeNull();
      expect(screen.queryByText('Toast 2')).toBeNull();
      expect(screen.queryByText('Toast 3')).toBeNull();
    });
  });

  describe('7.2.4 - max visible limit (5) - 6th toast queues', () => {
    it('should only show 5 toasts even when 6 are added', async () => {
      let toastApi: ReturnType<typeof useToast> | null = null;

      render(
        <ToastProvider>
          <TestComponent
            onMount={(api) => {
              toastApi = api;
            }}
          />
        </ToastProvider>
      );

      await reactAct(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      // Add 6 toasts
      await reactAct(async () => {
        for (let i = 1; i <= 6; i++) {
          toastApi!.showToast({
            type: 'info',
            message: `Toast ${i}`,
            persistent: true,
          });
        }
      });

      // Total toasts in state should be 6 (check via DOM since API reference is stale)
      expect(screen.getByTestId('toast-count').textContent).toBe('6');

      // But only 5 should be visible in the container
      // The container slices to show only the last 5 (newest)
      const container = screen.getByTestId('toast-container');
      const toastElements = container.querySelectorAll('[role="alert"]');
      expect(toastElements.length).toBe(5);

      // Toast 1 (oldest) should not be visible, but Toast 2-6 should be
      expect(screen.queryByText('Toast 1')).toBeNull();
      expect(screen.getByText('Toast 2')).toBeTruthy();
      expect(screen.getByText('Toast 6')).toBeTruthy();
    });
  });

  describe('7.2.5 - queued toasts appear when earlier toasts dismiss', () => {
    it('should show queued toast when visible toast is dismissed', async () => {
      let toastApi: ReturnType<typeof useToast> | null = null;

      render(
        <ToastProvider>
          <TestComponent
            onMount={(api) => {
              toastApi = api;
            }}
          />
        </ToastProvider>
      );

      await reactAct(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      const ids: string[] = [];

      // Add 6 toasts (1 will be queued)
      await reactAct(async () => {
        for (let i = 1; i <= 6; i++) {
          ids.push(
            toastApi!.showToast({
              type: 'info',
              message: `Toast ${i}`,
              persistent: true,
            })
          );
        }
      });

      // Toast 1 is queued (not visible)
      expect(screen.queryByText('Toast 1')).toBeNull();

      // Dismiss Toast 2 (one of the visible ones)
      await reactAct(async () => {
        toastApi!.dismissToast(ids[1]);
      });

      // Now Toast 1 should appear since there's room
      expect(screen.getByText('Toast 1')).toBeTruthy();
      expect(screen.queryByText('Toast 2')).toBeNull();
    });
  });

  describe('7.2.6 - auto-dismiss timers for each toast type', () => {
    it('should auto-dismiss success toast after 5000ms', async () => {
      let toastApi: ReturnType<typeof useToast> | null = null;

      render(
        <ToastProvider>
          <TestComponent
            onMount={(api) => {
              toastApi = api;
            }}
          />
        </ToastProvider>
      );

      await reactAct(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      await reactAct(async () => {
        toastApi!.showToast({ type: 'success', message: 'Success toast' });
      });

      expect(screen.getByText('Success toast')).toBeTruthy();

      // Advance time just before auto-dismiss
      await reactAct(async () => {
        await vi.advanceTimersByTimeAsync(4999);
      });
      expect(screen.getByText('Success toast')).toBeTruthy();

      // Advance past auto-dismiss threshold
      await reactAct(async () => {
        await vi.advanceTimersByTimeAsync(2);
      });
      expect(screen.queryByText('Success toast')).toBeNull();
    });

    it('should auto-dismiss info toast after 5000ms', async () => {
      let toastApi: ReturnType<typeof useToast> | null = null;

      render(
        <ToastProvider>
          <TestComponent
            onMount={(api) => {
              toastApi = api;
            }}
          />
        </ToastProvider>
      );

      await reactAct(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      await reactAct(async () => {
        toastApi!.showToast({ type: 'info', message: 'Info toast' });
      });

      expect(screen.getByText('Info toast')).toBeTruthy();

      await reactAct(async () => {
        await vi.advanceTimersByTimeAsync(5001);
      });
      expect(screen.queryByText('Info toast')).toBeNull();
    });

    it('should auto-dismiss warning toast after 7000ms', async () => {
      let toastApi: ReturnType<typeof useToast> | null = null;

      render(
        <ToastProvider>
          <TestComponent
            onMount={(api) => {
              toastApi = api;
            }}
          />
        </ToastProvider>
      );

      await reactAct(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      await reactAct(async () => {
        toastApi!.showToast({ type: 'warning', message: 'Warning toast' });
      });

      expect(screen.getByText('Warning toast')).toBeTruthy();

      // Still visible after 5000ms
      await reactAct(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(screen.getByText('Warning toast')).toBeTruthy();

      // Gone after 7000ms
      await reactAct(async () => {
        await vi.advanceTimersByTimeAsync(2001);
      });
      expect(screen.queryByText('Warning toast')).toBeNull();
    });

    it('should auto-dismiss error toast after 10000ms', async () => {
      let toastApi: ReturnType<typeof useToast> | null = null;

      render(
        <ToastProvider>
          <TestComponent
            onMount={(api) => {
              toastApi = api;
            }}
          />
        </ToastProvider>
      );

      await reactAct(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      await reactAct(async () => {
        toastApi!.showToast({ type: 'error', message: 'Error toast' });
      });

      expect(screen.getByText('Error toast')).toBeTruthy();

      // Still visible after 7000ms
      await reactAct(async () => {
        await vi.advanceTimersByTimeAsync(7000);
      });
      expect(screen.getByText('Error toast')).toBeTruthy();

      // Gone after 10000ms
      await reactAct(async () => {
        await vi.advanceTimersByTimeAsync(3001);
      });
      expect(screen.queryByText('Error toast')).toBeNull();
    });

    it('should NOT auto-dismiss progress toast', async () => {
      let toastApi: ReturnType<typeof useToast> | null = null;

      render(
        <ToastProvider>
          <TestComponent
            onMount={(api) => {
              toastApi = api;
            }}
          />
        </ToastProvider>
      );

      await reactAct(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      await reactAct(async () => {
        toastApi!.showToast({ type: 'progress', message: 'Progress toast', progress: 50 });
      });

      expect(screen.getByText('Progress toast')).toBeTruthy();

      // Wait longer than any auto-dismiss duration
      await reactAct(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });

      // Should still be visible
      expect(screen.getByText('Progress toast')).toBeTruthy();
    });
  });

  describe('7.2.7 - persistent: true never auto-dismisses', () => {
    it('should not auto-dismiss a persistent success toast', async () => {
      let toastApi: ReturnType<typeof useToast> | null = null;

      render(
        <ToastProvider>
          <TestComponent
            onMount={(api) => {
              toastApi = api;
            }}
          />
        </ToastProvider>
      );

      await reactAct(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      await reactAct(async () => {
        toastApi!.showToast({
          type: 'success',
          message: 'Persistent success',
          persistent: true,
        });
      });

      expect(screen.getByText('Persistent success')).toBeTruthy();

      // Wait well beyond normal auto-dismiss
      await reactAct(async () => {
        await vi.advanceTimersByTimeAsync(60000);
      });

      // Should still be visible
      expect(screen.getByText('Persistent success')).toBeTruthy();
    });

    it('should not auto-dismiss a persistent error toast', async () => {
      let toastApi: ReturnType<typeof useToast> | null = null;

      render(
        <ToastProvider>
          <TestComponent
            onMount={(api) => {
              toastApi = api;
            }}
          />
        </ToastProvider>
      );

      await reactAct(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      await reactAct(async () => {
        toastApi!.showToast({
          type: 'error',
          message: 'Persistent error',
          persistent: true,
        });
      });

      expect(screen.getByText('Persistent error')).toBeTruthy();

      // Wait well beyond normal error auto-dismiss (10s)
      await reactAct(async () => {
        await vi.advanceTimersByTimeAsync(60000);
      });

      // Should still be visible
      expect(screen.getByText('Persistent error')).toBeTruthy();
    });

    it('should allow manual dismissal of persistent toasts', async () => {
      let toastApi: ReturnType<typeof useToast> | null = null;

      render(
        <ToastProvider>
          <TestComponent
            onMount={(api) => {
              toastApi = api;
            }}
          />
        </ToastProvider>
      );

      await reactAct(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      let id: string = '';
      await reactAct(async () => {
        id = toastApi!.showToast({
          type: 'info',
          message: 'Persistent info',
          persistent: true,
        });
      });

      expect(screen.getByText('Persistent info')).toBeTruthy();

      // Manually dismiss
      await reactAct(async () => {
        toastApi!.dismissToast(id);
      });

      expect(screen.queryByText('Persistent info')).toBeNull();
    });
  });
});
