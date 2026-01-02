/**
 * Unit tests for generic Toast component.
 *
 * Tests all toast types, props, interactions, and accessibility.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Toast, ToastType, ToastAction } from './Toast';

describe('Toast', () => {
  const defaultProps = {
    id: 'test-toast-1',
    type: 'info' as ToastType,
    message: 'Test message',
    onDismiss: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering for each toast type', () => {
    it('renders success toast with correct icon', () => {
      render(<Toast {...defaultProps} type="success" />);

      const icon = document.querySelector('.toast__icon');
      expect(icon?.textContent).toBe('✅');
      expect(screen.getByTestId('toast')).toHaveClass('toast--success');
    });

    it('renders error toast with correct icon', () => {
      render(<Toast {...defaultProps} type="error" />);

      const icon = document.querySelector('.toast__icon');
      expect(icon?.textContent).toBe('❌');
      expect(screen.getByTestId('toast')).toHaveClass('toast--error');
    });

    it('renders info toast with correct icon', () => {
      render(<Toast {...defaultProps} type="info" />);

      const icon = document.querySelector('.toast__icon');
      expect(icon?.textContent).toBe('ℹ️');
      expect(screen.getByTestId('toast')).toHaveClass('toast--info');
    });

    it('renders warning toast with correct icon', () => {
      render(<Toast {...defaultProps} type="warning" />);

      const icon = document.querySelector('.toast__icon');
      expect(icon?.textContent).toBe('⚠️');
      expect(screen.getByTestId('toast')).toHaveClass('toast--warning');
    });

    it('renders progress toast with correct icon', () => {
      render(<Toast {...defaultProps} type="progress" progress={50} />);

      const icon = document.querySelector('.toast__icon');
      expect(icon?.textContent).toBe('⏳');
      expect(screen.getByTestId('toast')).toHaveClass('toast--progress');
    });

    it('uses custom icon when provided', () => {
      render(<Toast {...defaultProps} icon="🎉" />);

      const icon = document.querySelector('.toast__icon');
      expect(icon?.textContent).toBe('🎉');
    });
  });

  describe('action button callbacks', () => {
    it('calls action callback when button is clicked', () => {
      const actionCallback = vi.fn();
      const actions: ToastAction[] = [{ label: 'Click Me', onClick: actionCallback }];

      render(<Toast {...defaultProps} actions={actions} />);

      fireEvent.click(screen.getByTestId('toast-action-0'));
      expect(actionCallback).toHaveBeenCalledTimes(1);
    });

    it('renders multiple action buttons', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const actions: ToastAction[] = [
        { label: 'First', onClick: callback1, primary: true },
        { label: 'Second', onClick: callback2 },
      ];

      render(<Toast {...defaultProps} actions={actions} />);

      expect(screen.getByTestId('toast-action-0')).toHaveTextContent('First');
      expect(screen.getByTestId('toast-action-1')).toHaveTextContent('Second');
    });

    it('calls correct callback for each action button', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const actions: ToastAction[] = [
        { label: 'First', onClick: callback1 },
        { label: 'Second', onClick: callback2 },
      ];

      render(<Toast {...defaultProps} actions={actions} />);

      fireEvent.click(screen.getByTestId('toast-action-0'));
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();

      fireEvent.click(screen.getByTestId('toast-action-1'));
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('applies primary styling to primary action buttons', () => {
      const actions: ToastAction[] = [
        { label: 'Primary', onClick: vi.fn(), primary: true },
        { label: 'Secondary', onClick: vi.fn() },
      ];

      render(<Toast {...defaultProps} actions={actions} />);

      expect(screen.getByTestId('toast-action-0')).toHaveClass('toast__button--primary');
      expect(screen.getByTestId('toast-action-1')).toHaveClass('toast__button--secondary');
    });
  });

  describe('dismiss button', () => {
    it('renders dismiss button', () => {
      render(<Toast {...defaultProps} />);

      expect(screen.getByTestId('toast-dismiss')).toBeInTheDocument();
    });

    it('calls onDismiss when dismiss button is clicked', () => {
      const onDismiss = vi.fn();
      render(<Toast {...defaultProps} onDismiss={onDismiss} />);

      fireEvent.click(screen.getByTestId('toast-dismiss'));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('dismiss button has correct content', () => {
      render(<Toast {...defaultProps} />);

      expect(screen.getByTestId('toast-dismiss')).toHaveTextContent('✕');
    });
  });

  describe('accessibility', () => {
    it('has role="alert"', () => {
      render(<Toast {...defaultProps} />);

      expect(screen.getByTestId('toast')).toHaveAttribute('role', 'alert');
    });

    it('has aria-live="polite"', () => {
      render(<Toast {...defaultProps} />);

      expect(screen.getByTestId('toast')).toHaveAttribute('aria-live', 'polite');
    });

    it('dismiss button has aria-label', () => {
      render(<Toast {...defaultProps} />);

      expect(screen.getByTestId('toast-dismiss')).toHaveAttribute(
        'aria-label',
        'Dismiss notification'
      );
    });

    it('icon has aria-hidden', () => {
      render(<Toast {...defaultProps} />);

      const icon = document.querySelector('.toast__icon');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('progress bar has correct aria attributes', () => {
      render(<Toast {...defaultProps} type="progress" progress={50} />);

      const progressBar = document.querySelector('.toast__progress-container');
      expect(progressBar).toHaveAttribute('role', 'progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('progress bar', () => {
    it('renders progress bar only for progress type', () => {
      render(<Toast {...defaultProps} type="progress" progress={50} />);

      expect(document.querySelector('.toast__progress-container')).toBeInTheDocument();
    });

    it('does not render progress bar for non-progress types', () => {
      const { rerender } = render(<Toast {...defaultProps} type="success" />);
      expect(document.querySelector('.toast__progress-container')).not.toBeInTheDocument();

      rerender(<Toast {...defaultProps} type="error" />);
      expect(document.querySelector('.toast__progress-container')).not.toBeInTheDocument();

      rerender(<Toast {...defaultProps} type="info" />);
      expect(document.querySelector('.toast__progress-container')).not.toBeInTheDocument();

      rerender(<Toast {...defaultProps} type="warning" />);
      expect(document.querySelector('.toast__progress-container')).not.toBeInTheDocument();
    });

    it('does not render progress bar for progress type without progress prop', () => {
      render(<Toast {...defaultProps} type="progress" />);

      expect(document.querySelector('.toast__progress-container')).not.toBeInTheDocument();
    });

    it('renders progress bar with correct width', () => {
      render(<Toast {...defaultProps} type="progress" progress={75} />);

      const progressFill = document.querySelector('.toast__progress-bar') as HTMLElement;
      expect(progressFill.style.width).toBe('75%');
    });

    it('clamps progress between 0 and 100', () => {
      const { rerender } = render(<Toast {...defaultProps} type="progress" progress={-10} />);

      let progressFill = document.querySelector('.toast__progress-bar') as HTMLElement;
      expect(progressFill.style.width).toBe('0%');

      rerender(<Toast {...defaultProps} type="progress" progress={150} />);
      progressFill = document.querySelector('.toast__progress-bar') as HTMLElement;
      expect(progressFill.style.width).toBe('100%');
    });
  });

  describe('title and message', () => {
    it('renders title when provided', () => {
      render(<Toast {...defaultProps} title="Test Title" />);

      expect(screen.getByTestId('toast-title')).toBeInTheDocument();
      expect(screen.getByTestId('toast-title')).toHaveTextContent('Test Title');
    });

    it('does not render title when not provided', () => {
      render(<Toast {...defaultProps} />);

      expect(screen.queryByTestId('toast-title')).not.toBeInTheDocument();
    });

    it('renders message correctly', () => {
      render(<Toast {...defaultProps} message="Custom message content" />);

      expect(screen.getByTestId('toast-message')).toHaveTextContent('Custom message content');
    });

    it('renders both title and message together', () => {
      render(<Toast {...defaultProps} title="Important" message="This is important" />);

      expect(screen.getByTestId('toast-title')).toHaveTextContent('Important');
      expect(screen.getByTestId('toast-message')).toHaveTextContent('This is important');
    });
  });

  describe('data attributes', () => {
    it('has correct data-toast-id attribute', () => {
      render(<Toast {...defaultProps} id="unique-toast-id" />);

      expect(screen.getByTestId('toast')).toHaveAttribute('data-toast-id', 'unique-toast-id');
    });
  });
});
