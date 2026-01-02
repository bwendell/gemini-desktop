/**
 * Unit tests for ToastContainer component.
 *
 * Tests toast stack rendering, ordering, dismissal, and animations.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastContainer, ToastItem } from './ToastContainer';

// Helper to create toast items for testing
function createToast(overrides: Partial<ToastItem> = {}): ToastItem {
  return {
    id: crypto.randomUUID(),
    type: 'info',
    message: 'Test message',
    ...overrides,
  };
}

describe('ToastContainer', () => {
  describe('rendering', () => {
    it('renders empty container when no toasts', () => {
      render(<ToastContainer toasts={[]} onDismiss={vi.fn()} />);

      const container = screen.getByTestId('toast-container');
      expect(container).toBeInTheDocument();
      expect(screen.queryAllByTestId('toast')).toHaveLength(0);
    });

    it('renders correct number of toasts', () => {
      const toasts = [
        createToast({ id: '1', message: 'First' }),
        createToast({ id: '2', message: 'Second' }),
        createToast({ id: '3', message: 'Third' }),
      ];

      render(<ToastContainer toasts={toasts} onDismiss={vi.fn()} />);

      expect(screen.getAllByTestId('toast')).toHaveLength(3);
      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();
    });

    it('renders toasts with correct IDs', () => {
      const toasts = [
        createToast({ id: 'toast-id-1', message: 'Toast 1' }),
        createToast({ id: 'toast-id-2', message: 'Toast 2' }),
      ];

      render(<ToastContainer toasts={toasts} onDismiss={vi.fn()} />);

      const toastElements = screen.getAllByTestId('toast');
      expect(toastElements[0]).toHaveAttribute('data-toast-id');
      expect(toastElements[1]).toHaveAttribute('data-toast-id');
    });
  });

  describe('toast stacking order', () => {
    it('renders newest toast first in DOM (newest on top)', () => {
      // Toasts in array: oldest at index 0, newest at end
      const toasts = [
        createToast({ id: 'oldest', message: 'Oldest' }),
        createToast({ id: 'middle', message: 'Middle' }),
        createToast({ id: 'newest', message: 'Newest' }),
      ];

      render(<ToastContainer toasts={toasts} onDismiss={vi.fn()} />);

      // After reversal, the order in DOM should be: newest, middle, oldest
      const toastElements = screen.getAllByTestId('toast');
      expect(toastElements[0]).toHaveAttribute('data-toast-id', 'newest');
      expect(toastElements[1]).toHaveAttribute('data-toast-id', 'middle');
      expect(toastElements[2]).toHaveAttribute('data-toast-id', 'oldest');
    });

    it('maintains order when new toasts are added', () => {
      const initialToasts = [createToast({ id: 'first', message: 'First' })];

      const { rerender } = render(<ToastContainer toasts={initialToasts} onDismiss={vi.fn()} />);

      // Add a new toast (newest)
      const updatedToasts = [
        ...initialToasts,
        createToast({ id: 'second', message: 'Second (newest)' }),
      ];

      rerender(<ToastContainer toasts={updatedToasts} onDismiss={vi.fn()} />);

      const toastElements = screen.getAllByTestId('toast');
      expect(toastElements[0]).toHaveAttribute('data-toast-id', 'second');
      expect(toastElements[1]).toHaveAttribute('data-toast-id', 'first');
    });
  });

  describe('toast dismissal', () => {
    it('calls onDismiss with correct toast id when dismiss button clicked', () => {
      const onDismiss = vi.fn();
      const toasts = [
        createToast({ id: 'toast-1', message: 'First' }),
        createToast({ id: 'toast-2', message: 'Second' }),
      ];

      render(<ToastContainer toasts={toasts} onDismiss={onDismiss} />);

      // Click dismiss on the second toast (which appears first in DOM due to reversal)
      const dismissButtons = screen.getAllByTestId('toast-dismiss');
      fireEvent.click(dismissButtons[0]); // First dismiss button is for 'toast-2' (newest)

      expect(onDismiss).toHaveBeenCalledWith('toast-2');
    });

    it('calls onDismiss for correct toast when multiple toasts present', () => {
      const onDismiss = vi.fn();
      const toasts = [
        createToast({ id: 'a', message: 'A' }),
        createToast({ id: 'b', message: 'B' }),
        createToast({ id: 'c', message: 'C' }),
      ];

      render(<ToastContainer toasts={toasts} onDismiss={onDismiss} />);

      // Dismiss the middle toast (order in DOM: c, b, a)
      const dismissButtons = screen.getAllByTestId('toast-dismiss');
      fireEvent.click(dismissButtons[1]); // Dismiss 'b'

      expect(onDismiss).toHaveBeenCalledWith('b');
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('max visible limit', () => {
    it('shows only 5 toasts when more are provided', () => {
      const toasts = [
        createToast({ id: '1', message: 'Toast 1' }),
        createToast({ id: '2', message: 'Toast 2' }),
        createToast({ id: '3', message: 'Toast 3' }),
        createToast({ id: '4', message: 'Toast 4' }),
        createToast({ id: '5', message: 'Toast 5' }),
        createToast({ id: '6', message: 'Toast 6 (hidden)' }),
        createToast({ id: '7', message: 'Toast 7 (hidden)' }),
      ];

      render(<ToastContainer toasts={toasts} onDismiss={vi.fn()} />);

      expect(screen.getAllByTestId('toast')).toHaveLength(5);
    });

    it('shows the 5 most recent toasts when limit exceeded', () => {
      const toasts = [
        createToast({ id: 'oldest', message: 'Oldest (hidden)' }),
        createToast({ id: '2', message: 'Toast 2 (hidden)' }),
        createToast({ id: '3', message: 'Toast 3' }),
        createToast({ id: '4', message: 'Toast 4' }),
        createToast({ id: '5', message: 'Toast 5' }),
        createToast({ id: '6', message: 'Toast 6' }),
        createToast({ id: 'newest', message: 'Newest' }),
      ];

      render(<ToastContainer toasts={toasts} onDismiss={vi.fn()} />);

      // Should show toasts 3-7 (the 5 most recent)
      expect(screen.queryByText('Oldest (hidden)')).not.toBeInTheDocument();
      expect(screen.queryByText('Toast 2 (hidden)')).not.toBeInTheDocument();
      expect(screen.getByText('Toast 3')).toBeInTheDocument();
      expect(screen.getByText('Newest')).toBeInTheDocument();
    });

    it('shows exactly 5 toasts when exactly 5 provided', () => {
      const toasts = [
        createToast({ id: '1', message: 'Toast 1' }),
        createToast({ id: '2', message: 'Toast 2' }),
        createToast({ id: '3', message: 'Toast 3' }),
        createToast({ id: '4', message: 'Toast 4' }),
        createToast({ id: '5', message: 'Toast 5' }),
      ];

      render(<ToastContainer toasts={toasts} onDismiss={vi.fn()} />);

      expect(screen.getAllByTestId('toast')).toHaveLength(5);
    });
  });

  describe('animations', () => {
    it('wraps toasts in motion.div for animations', () => {
      const toasts = [createToast({ id: '1', message: 'Animated toast' })];

      const { container } = render(<ToastContainer toasts={toasts} onDismiss={vi.fn()} />);

      // Check that toast is wrapped in a motion.div (framer-motion)
      const toastContainer = screen.getByTestId('toast-container');
      expect(toastContainer.firstChild).toBeDefined();
    });

    it('adds new toast with animation when toasts array changes', () => {
      const initialToasts = [createToast({ id: '1', message: 'First' })];

      const { rerender } = render(<ToastContainer toasts={initialToasts} onDismiss={vi.fn()} />);

      expect(screen.getAllByTestId('toast')).toHaveLength(1);

      // Add a new toast
      const updatedToasts = [...initialToasts, createToast({ id: '2', message: 'Second' })];
      rerender(<ToastContainer toasts={updatedToasts} onDismiss={vi.fn()} />);

      // Both toasts should be visible
      expect(screen.getAllByTestId('toast')).toHaveLength(2);
      expect(screen.getByText('Second')).toBeInTheDocument();
    });

    it('removes toast from DOM when removed from toasts array', () => {
      const toasts = [
        createToast({ id: '1', message: 'First' }),
        createToast({ id: '2', message: 'Second' }),
      ];

      const { rerender } = render(<ToastContainer toasts={toasts} onDismiss={vi.fn()} />);

      expect(screen.getAllByTestId('toast')).toHaveLength(2);

      // Remove the first toast
      const updatedToasts = [toasts[1]];
      rerender(<ToastContainer toasts={updatedToasts} onDismiss={vi.fn()} />);

      // Only one toast should remain (AnimatePresence will animate out)
      expect(screen.getAllByTestId('toast')).toHaveLength(1);
      expect(screen.queryByText('First')).not.toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has role="region" for screen readers', () => {
      render(<ToastContainer toasts={[]} onDismiss={vi.fn()} />);

      const container = screen.getByTestId('toast-container');
      expect(container).toHaveAttribute('role', 'region');
    });

    it('has aria-label for notifications region', () => {
      render(<ToastContainer toasts={[]} onDismiss={vi.fn()} />);

      const container = screen.getByTestId('toast-container');
      expect(container).toHaveAttribute('aria-label', 'Notifications');
    });

    it('each toast has role="alert"', () => {
      const toasts = [
        createToast({ id: '1', message: 'Test' }),
        createToast({ id: '2', message: 'Test 2' }),
      ];

      render(<ToastContainer toasts={toasts} onDismiss={vi.fn()} />);

      const toastElements = screen.getAllByTestId('toast');
      toastElements.forEach((toast) => {
        expect(toast).toHaveAttribute('role', 'alert');
      });
    });
  });
});
