/**
 * Unit tests for WindowControls component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WindowControls } from './WindowControls';
import { setMockPlatform } from '../../../../tests/unit/renderer/test/setup';

// Mock dependencies
const mockMinimize = vi.fn();
const mockMaximize = vi.fn();
const mockClose = vi.fn();

vi.mock('../../hooks/useWindowControls', () => ({
  useWindowControls: () => ({
    minimize: mockMinimize,
    maximize: mockMaximize,
    close: mockClose,
  }),
}));

describe('WindowControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockPlatform('win32');
  });

  describe('platform behavior', () => {
    it('renders controls on Windows', () => {
      setMockPlatform('win32');
      render(<WindowControls />);

      expect(screen.getByRole('button', { name: /minimize/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /maximize/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    it('renders controls on Linux', () => {
      setMockPlatform('linux');
      render(<WindowControls />);

      expect(screen.getByRole('button', { name: /minimize/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /maximize/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    it('returns null on macOS', () => {
      setMockPlatform('darwin');
      const { container } = render(<WindowControls />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('button interactions', () => {
    it('clicking minimize button calls minimize handler', () => {
      render(<WindowControls />);
      const minimizeBtn = screen.getByRole('button', { name: /minimize/i });

      fireEvent.click(minimizeBtn);

      expect(mockMinimize).toHaveBeenCalledTimes(1);
    });

    it('clicking maximize button calls maximize handler', () => {
      render(<WindowControls />);
      const maximizeBtn = screen.getByRole('button', { name: /maximize/i });

      fireEvent.click(maximizeBtn);

      expect(mockMaximize).toHaveBeenCalledTimes(1);
    });

    it('clicking close button calls close handler', () => {
      render(<WindowControls />);
      const closeBtn = screen.getByRole('button', { name: /close/i });

      fireEvent.click(closeBtn);

      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('minimize button has correct aria-label', () => {
      render(<WindowControls />);
      const btn = screen.getByRole('button', { name: 'Minimize window' });

      expect(btn).toBeInTheDocument();
    });

    it('maximize button has correct aria-label', () => {
      render(<WindowControls />);
      const btn = screen.getByRole('button', { name: 'Maximize window' });

      expect(btn).toBeInTheDocument();
    });

    it('close button has correct aria-label', () => {
      render(<WindowControls />);
      const btn = screen.getByRole('button', { name: 'Close window' });

      expect(btn).toBeInTheDocument();
    });

    it('buttons have title attributes for tooltips', () => {
      render(<WindowControls />);

      expect(screen.getByTitle('Minimize')).toBeInTheDocument();
      expect(screen.getByTitle('Maximize')).toBeInTheDocument();
      expect(screen.getByTitle('Close')).toBeInTheDocument();
    });
  });

  describe('CSS classes', () => {
    it('has correct CSS classes for styling', () => {
      render(<WindowControls />);

      const minimizeBtn = screen.getByRole('button', { name: /minimize/i });
      const maximizeBtn = screen.getByRole('button', { name: /maximize/i });
      const closeBtn = screen.getByRole('button', { name: /close/i });

      expect(minimizeBtn).toHaveClass('window-control-button', 'minimize');
      expect(maximizeBtn).toHaveClass('window-control-button', 'maximize');
      expect(closeBtn).toHaveClass('window-control-button', 'close');
    });
  });
});
