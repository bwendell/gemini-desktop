/**
 * Unit tests for UpdateToast component.
 *
 * Tests all rendering states, button interactions, and accessibility.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UpdateToast } from './UpdateToast';
import type { UpdateToastProps, UpdateInfo } from './UpdateToast';

describe('UpdateToast', () => {
  const mockUpdateInfo: UpdateInfo = {
    version: '1.2.3',
    releaseName: 'New Release',
  };

  const defaultProps: UpdateToastProps = {
    type: 'available',
    updateInfo: mockUpdateInfo,
    visible: true,
    onDismiss: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering states', () => {
    it('renders update available toast', () => {
      render(<UpdateToast {...defaultProps} type="available" />);

      expect(screen.getByTestId('update-toast')).toBeInTheDocument();
      expect(screen.getByTestId('update-toast-title')).toHaveTextContent('Update Available');
      expect(screen.getByTestId('update-toast-message')).toHaveTextContent(
        'Version 1.2.3 is downloading...'
      );
    });

    it('renders update downloaded toast', () => {
      render(<UpdateToast {...defaultProps} type="downloaded" />);

      expect(screen.getByTestId('update-toast-title')).toHaveTextContent('Update Ready');
      expect(screen.getByTestId('update-toast-message')).toHaveTextContent(
        'Version 1.2.3 is ready to install.'
      );
    });

    it('renders update error toast', () => {
      render(<UpdateToast {...defaultProps} type="error" errorMessage="Download failed" />);

      expect(screen.getByTestId('update-toast-title')).toHaveTextContent('Update Error');
      expect(screen.getByTestId('update-toast-message')).toHaveTextContent('Download failed');
    });

    it('renders default error message when no errorMessage provided', () => {
      render(<UpdateToast {...defaultProps} type="error" />);

      expect(screen.getByTestId('update-toast-message')).toHaveTextContent(
        'An error occurred while updating.'
      );
    });

    it('does not render when visible is false', () => {
      render(<UpdateToast {...defaultProps} visible={false} />);

      expect(screen.queryByTestId('update-toast')).not.toBeInTheDocument();
    });

    it('applies correct CSS class for available type', () => {
      render(<UpdateToast {...defaultProps} type="available" />);

      expect(screen.getByTestId('update-toast')).toHaveClass('update-toast--available');
    });

    it('applies correct CSS class for downloaded type', () => {
      render(<UpdateToast {...defaultProps} type="downloaded" />);

      expect(screen.getByTestId('update-toast')).toHaveClass('update-toast--downloaded');
    });

    it('applies correct CSS class for error type', () => {
      render(<UpdateToast {...defaultProps} type="error" />);

      expect(screen.getByTestId('update-toast')).toHaveClass('update-toast--error');
    });
  });

  describe('button actions', () => {
    it('shows dismiss button for available type', () => {
      render(<UpdateToast {...defaultProps} type="available" />);

      const dismissButton = screen.getByTestId('update-toast-dismiss');
      expect(dismissButton).toBeInTheDocument();
    });

    it('calls onDismiss when dismiss button is clicked', () => {
      const onDismiss = vi.fn();
      render(<UpdateToast {...defaultProps} type="available" onDismiss={onDismiss} />);

      fireEvent.click(screen.getByTestId('update-toast-dismiss'));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('shows Restart Now and Later buttons for downloaded type', () => {
      const onInstall = vi.fn();
      const onLater = vi.fn();
      render(
        <UpdateToast {...defaultProps} type="downloaded" onInstall={onInstall} onLater={onLater} />
      );

      expect(screen.getByTestId('update-toast-restart')).toBeInTheDocument();
      expect(screen.getByTestId('update-toast-later')).toBeInTheDocument();
    });

    it('calls onInstall when Restart Now is clicked', () => {
      const onInstall = vi.fn();
      render(<UpdateToast {...defaultProps} type="downloaded" onInstall={onInstall} />);

      fireEvent.click(screen.getByTestId('update-toast-restart'));
      expect(onInstall).toHaveBeenCalledTimes(1);
    });

    it('calls onLater when Later is clicked', () => {
      const onLater = vi.fn();
      render(<UpdateToast {...defaultProps} type="downloaded" onLater={onLater} />);

      fireEvent.click(screen.getByTestId('update-toast-later'));
      expect(onLater).toHaveBeenCalledTimes(1);
    });

    it('shows dismiss button for error type', () => {
      render(<UpdateToast {...defaultProps} type="error" />);

      expect(screen.getByTestId('update-toast-dismiss')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has role="alert"', () => {
      render(<UpdateToast {...defaultProps} />);

      expect(screen.getByTestId('update-toast')).toHaveAttribute('role', 'alert');
    });

    it('has aria-live="polite"', () => {
      render(<UpdateToast {...defaultProps} />);

      expect(screen.getByTestId('update-toast')).toHaveAttribute('aria-live', 'polite');
    });

    it('dismiss button has aria-label', () => {
      render(<UpdateToast {...defaultProps} type="available" />);

      expect(screen.getByTestId('update-toast-dismiss')).toHaveAttribute(
        'aria-label',
        'Dismiss notification'
      );
    });

    it('icon has aria-hidden', () => {
      render(<UpdateToast {...defaultProps} />);

      const icon = document.querySelector('.update-toast__icon');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('icons', () => {
    it('shows download icon for available type', () => {
      render(<UpdateToast {...defaultProps} type="available" />);

      const icon = document.querySelector('.update-toast__icon');
      expect(icon?.textContent).toBe('⬇️');
    });

    it('shows checkmark icon for downloaded type', () => {
      render(<UpdateToast {...defaultProps} type="downloaded" />);

      const icon = document.querySelector('.update-toast__icon');
      expect(icon?.textContent).toBe('✅');
    });

    it('shows warning icon for error type', () => {
      render(<UpdateToast {...defaultProps} type="error" />);

      const icon = document.querySelector('.update-toast__icon');
      expect(icon?.textContent).toBe('⚠️');
    });
  });
});
