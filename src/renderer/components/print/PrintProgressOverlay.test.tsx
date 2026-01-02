/**
 * PrintProgressOverlay Component Tests
 *
 * Unit tests for the PrintProgressOverlay component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom'; // Ensure jest-dom matchers are available
import { PrintProgressOverlay } from './PrintProgressOverlay';

// Mock framer-motion to avoid animation complexity in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      // Extract data attributes and common props
      const {
        className,
        role,
        'data-testid': dataTestId,
        'aria-labelledby': ariaLabelledby,
        'aria-describedby': ariaDescribedby,
      } = props;
      return (
        <div
          className={className as string}
          role={role as string}
          data-testid={dataTestId as string}
          aria-labelledby={ariaLabelledby as string}
          aria-describedby={ariaDescribedby as string}
        >
          {children}
        </div>
      );
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

describe('PrintProgressOverlay', () => {
  const defaultProps = {
    visible: true,
    currentPage: 1,
    totalPages: 5,
    progress: 20,
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('visibility', () => {
    it('renders when visible is true', () => {
      render(<PrintProgressOverlay {...defaultProps} />);

      expect(screen.getByTestId('print-progress-overlay')).toBeInTheDocument();
      expect(screen.getByTestId('print-progress-modal')).toBeInTheDocument();
    });

    it('does not render when visible is false', () => {
      render(<PrintProgressOverlay {...defaultProps} visible={false} />);

      expect(screen.queryByTestId('print-progress-overlay')).not.toBeInTheDocument();
    });
  });

  describe('content', () => {
    it('displays the title', () => {
      render(<PrintProgressOverlay {...defaultProps} />);

      expect(screen.getByText('Generating PDF...')).toBeInTheDocument();
    });

    it('displays correct page count', () => {
      render(<PrintProgressOverlay {...defaultProps} currentPage={3} totalPages={10} />);

      expect(screen.getByText('Capturing page 3 of 10')).toBeInTheDocument();
    });

    it('displays correct progress percentage', () => {
      render(<PrintProgressOverlay {...defaultProps} progress={45} />);

      expect(screen.getByTestId('print-progress-percentage')).toHaveTextContent('45%');
    });

    it('rounds progress percentage', () => {
      render(<PrintProgressOverlay {...defaultProps} progress={33.7} />);

      expect(screen.getByTestId('print-progress-percentage')).toHaveTextContent('34%');
    });
  });

  describe('progress bar', () => {
    it('has correct aria attributes', () => {
      render(<PrintProgressOverlay {...defaultProps} progress={50} />);

      const progressBar = screen.getByTestId('print-progress-bar');
      expect(progressBar).toHaveAttribute('role', 'progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('clamps progress between 0 and 100', () => {
      const { rerender } = render(<PrintProgressOverlay {...defaultProps} progress={-10} />);

      // Get the fill element and check its width
      const fillElement = document.querySelector('.print-progress-bar-fill') as HTMLElement;
      expect(fillElement.style.width).toBe('0%');

      rerender(<PrintProgressOverlay {...defaultProps} progress={150} />);
      expect(fillElement.style.width).toBe('100%');
    });
  });

  describe('cancel button', () => {
    it('renders cancel button', () => {
      render(<PrintProgressOverlay {...defaultProps} />);

      expect(screen.getByTestId('print-progress-cancel')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('calls onCancel when clicked', () => {
      const onCancel = vi.fn();
      render(<PrintProgressOverlay {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByTestId('print-progress-cancel'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('has correct dialog role', () => {
      render(<PrintProgressOverlay {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-labelledby pointing to title', () => {
      render(<PrintProgressOverlay {...defaultProps} />);

      const modal = screen.getByTestId('print-progress-modal');
      expect(modal).toHaveAttribute('aria-labelledby', 'print-progress-title');
    });

    it('has aria-describedby pointing to description', () => {
      render(<PrintProgressOverlay {...defaultProps} />);

      const modal = screen.getByTestId('print-progress-modal');
      expect(modal).toHaveAttribute('aria-describedby', 'print-progress-description');
    });
  });
});
