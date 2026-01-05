/**
 * Unit tests for OfflineOverlay component.
 * Target: 100% coverage
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OfflineOverlay } from '../../../../../src/renderer/components/common/OfflineOverlay';

describe('OfflineOverlay', () => {
  describe('rendering', () => {
    it('renders the overlay container', () => {
      render(<OfflineOverlay />);
      const overlay = screen.getByTestId('offline-overlay');
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveClass('offline-overlay');
    });

    it('renders the wifi-off icon', () => {
      render(<OfflineOverlay />);
      const icon = screen.getByTestId('offline-icon');
      expect(icon).toBeInTheDocument();
      expect(icon.tagName).toBe('svg');
    });

    it('renders the Network Unavailable heading', () => {
      render(<OfflineOverlay />);
      const heading = screen.getByRole('heading', { name: /network unavailable/i });
      expect(heading).toBeInTheDocument();
    });

    it('renders the connection message', () => {
      render(<OfflineOverlay />);
      const message = screen.getByText(/please check your internet connection/i);
      expect(message).toBeInTheDocument();
    });

    it('renders retry button when onRetry prop is provided', () => {
      const mockRetry = vi.fn();
      render(<OfflineOverlay onRetry={mockRetry} />);

      const button = screen.getByTestId('offline-retry-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Retry Connection');
    });

    it('does not render retry button when onRetry prop is not provided', () => {
      render(<OfflineOverlay />);

      const button = screen.queryByTestId('offline-retry-button');
      expect(button).not.toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('calls onRetry callback when retry button is clicked', () => {
      const mockRetry = vi.fn();
      render(<OfflineOverlay onRetry={mockRetry} />);

      const button = screen.getByTestId('offline-retry-button');
      fireEvent.click(button);

      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('calls onRetry multiple times if clicked multiple times', () => {
      const mockRetry = vi.fn();
      render(<OfflineOverlay onRetry={mockRetry} />);

      const button = screen.getByTestId('offline-retry-button');
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(mockRetry).toHaveBeenCalledTimes(3);
    });
  });

  describe('accessibility', () => {
    it('has aria-label on retry button', () => {
      const mockRetry = vi.fn();
      render(<OfflineOverlay onRetry={mockRetry} />);

      const button = screen.getByTestId('offline-retry-button');
      expect(button).toHaveAttribute('aria-label', 'Retry connection');
    });

    it('has aria-hidden on SVG icon', () => {
      render(<OfflineOverlay />);

      const icon = screen.getByTestId('offline-icon');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('structure', () => {
    it('contains offline-content wrapper', () => {
      render(<OfflineOverlay />);

      const content = document.querySelector('.offline-content');
      expect(content).toBeInTheDocument();
    });

    it('contains offline-message wrapper', () => {
      render(<OfflineOverlay />);

      const message = document.querySelector('.offline-message');
      expect(message).toBeInTheDocument();
    });

    it('icon has correct CSS class', () => {
      render(<OfflineOverlay />);

      const icon = screen.getByTestId('offline-icon');
      expect(icon).toHaveClass('offline-icon');
    });

    it('button has correct CSS class when rendered', () => {
      const mockRetry = vi.fn();
      render(<OfflineOverlay onRetry={mockRetry} />);

      const button = screen.getByTestId('offline-retry-button');
      expect(button).toHaveClass('offline-retry-button');
    });
  });
});
