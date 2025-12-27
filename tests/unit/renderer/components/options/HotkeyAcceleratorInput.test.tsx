/**
 * Unit tests for HotkeyAcceleratorInput component.
 *
 * Tests the hotkey accelerator input component with recording mode,
 * keycap display, and reset functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HotkeyAcceleratorInput } from '../../../../../src/renderer/components/options/HotkeyAcceleratorInput';
import type { HotkeyId } from '../../../../../src/renderer/context/IndividualHotkeysContext';

// ============================================================================
// Test Helpers
// ============================================================================

const mockOnChange = vi.fn();

const defaultProps = {
  hotkeyId: 'alwaysOnTop' as HotkeyId,
  currentAccelerator: 'CommandOrControl+Alt+T',
  disabled: false,
  onAcceleratorChange: mockOnChange,
  defaultAccelerator: 'CommandOrControl+Alt+T',
};

// ============================================================================
// Test Suite
// ============================================================================

describe('HotkeyAcceleratorInput', () => {
  let originalElectronAPI: typeof window.electronAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    originalElectronAPI = window.electronAPI;
    window.electronAPI = {
      ...window.electronAPI,
      platform: 'win32' as NodeJS.Platform,
    } as typeof window.electronAPI;
  });

  afterEach(() => {
    window.electronAPI = originalElectronAPI;
  });

  describe('rendering', () => {
    it('should render with default accelerator', () => {
      render(<HotkeyAcceleratorInput {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /keyboard shortcut/i })).toBeInTheDocument();
    });

    it('should display individual keycaps for each key part', () => {
      const { container } = render(<HotkeyAcceleratorInput {...defaultProps} />);
      
      const keycaps = container.querySelectorAll('kbd.keycap');
      expect(keycaps.length).toBeGreaterThan(0);
    });

    it('should show reset button when accelerator differs from default', () => {
      render(<HotkeyAcceleratorInput {...defaultProps} currentAccelerator="CommandOrControl+Shift+Q" />);
      
      expect(screen.getByLabelText('Reset to default')).toBeInTheDocument();
    });

    it('should not show reset button when using default accelerator', () => {
      render(<HotkeyAcceleratorInput {...defaultProps} />);
      
      expect(screen.queryByLabelText('Reset to default')).not.toBeInTheDocument();
    });

    it('should apply disabled styling when disabled', () => {
      render(<HotkeyAcceleratorInput {...defaultProps} disabled />);
      
      const container = screen.getByRole('button', { name: /keyboard shortcut/i }).closest('.hotkey-accelerator-input');
      expect(container).toHaveClass('disabled');
    });
  });

  describe('keycap display', () => {
    it('should display Windows-style modifiers on Windows', () => {
      window.electronAPI = {
        ...window.electronAPI,
        platform: 'win32' as NodeJS.Platform,
      } as typeof window.electronAPI;

      render(<HotkeyAcceleratorInput {...defaultProps} />);
      
      expect(screen.getByText('Ctrl')).toBeInTheDocument();
      expect(screen.getByText('Alt')).toBeInTheDocument();
    });

    it('should display Mac-style symbols on macOS', () => {
      window.electronAPI = {
        ...window.electronAPI,
        platform: 'darwin' as NodeJS.Platform,
      } as typeof window.electronAPI;

      render(<HotkeyAcceleratorInput {...defaultProps} />);
      
      // Should display symbols instead of text
      const keycapContainer = screen.getByRole('button', { name: /keyboard shortcut/i });
      expect(keycapContainer.textContent).toMatch(/[⌘⌃⌥⇧]/);
    });

    it('should display separators between keys', () => {
      const { container } = render(<HotkeyAcceleratorInput {...defaultProps} />);
      
      const separators = container.querySelectorAll('.key-separator');
      expect(separators.length).toBeGreaterThan(0);
    });
  });

  describe('recording mode', () => {
    it('should enter recording mode on click', async () => {
      render(<HotkeyAcceleratorInput {...defaultProps} />);
      
      const input = screen.getByRole('button', { name: /keyboard shortcut/i });
      fireEvent.click(input);
      
      await waitFor(() => {
        expect(screen.getByText('Press keys...')).toBeInTheDocument();
      });
    });

    it('should capture key combination and update accelerator', async () => {
      render(<HotkeyAcceleratorInput {...defaultProps} />);
      
      const input = screen.getByRole('button', { name: /keyboard shortcut/i });
      fireEvent.click(input);
      
      await waitFor(() => {
        expect(screen.getByText('Press keys...')).toBeInTheDocument();
      });
      
      // Simulate Ctrl+Shift+F
      fireEvent.keyDown(input, {
        key: 'F',
        code: 'KeyF',
        ctrlKey: true,
        shiftKey: true,
      });
      
      expect(mockOnChange).toHaveBeenCalledWith('alwaysOnTop', 'CommandOrControl+Shift+F');
    });

    it('should cancel recording on Escape key', async () => {
      render(<HotkeyAcceleratorInput {...defaultProps} />);
      
      const input = screen.getByRole('button', { name: /keyboard shortcut/i });
      fireEvent.click(input);
      
      await waitFor(() => {
        expect(screen.getByText('Press keys...')).toBeInTheDocument();
      });
      
      fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });
      
      await waitFor(() => {
        expect(screen.queryByText('Press keys...')).not.toBeInTheDocument();
      });
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should cancel recording on blur', async () => {
      render(<HotkeyAcceleratorInput {...defaultProps} />);
      
      const input = screen.getByRole('button', { name: /keyboard shortcut/i });
      fireEvent.click(input);
      
      await waitFor(() => {
        expect(screen.getByText('Press keys...')).toBeInTheDocument();
      });
      
      fireEvent.blur(input);
      
      await waitFor(() => {
        expect(screen.queryByText('Press keys...')).not.toBeInTheDocument();
      });
    });

    it('should not enter recording mode when disabled', () => {
      render(<HotkeyAcceleratorInput {...defaultProps} disabled />);
      
      const input = screen.getByRole('button', { name: /keyboard shortcut/i });
      fireEvent.click(input);
      
      expect(screen.queryByText('Press keys...')).not.toBeInTheDocument();
    });

    it('should require at least one modifier key', async () => {
      render(<HotkeyAcceleratorInput {...defaultProps} />);
      
      const input = screen.getByRole('button', { name: /keyboard shortcut/i });
      fireEvent.click(input);
      
      await waitFor(() => {
        expect(screen.getByText('Press keys...')).toBeInTheDocument();
      });
      
      // Press key without modifier
      fireEvent.keyDown(input, { key: 'A', code: 'KeyA' });
      
      // Should still be in recording mode
      expect(screen.getByText('Press keys...')).toBeInTheDocument();
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('reset functionality', () => {
    it('should call onAcceleratorChange with default value on reset', () => {
      render(<HotkeyAcceleratorInput {...defaultProps} currentAccelerator="CommandOrControl+Shift+Q" />);
      
      const resetButton = screen.getByLabelText('Reset to default');
      fireEvent.click(resetButton);
      
      expect(mockOnChange).toHaveBeenCalledWith('alwaysOnTop', defaultProps.defaultAccelerator);
    });

    it('should not reset when disabled', () => {
      render(
        <HotkeyAcceleratorInput 
          {...defaultProps} 
          currentAccelerator="CommandOrControl+Shift+Q"
          disabled 
        />
      );
      
      const resetButton = screen.getByLabelText('Reset to default');
      fireEvent.click(resetButton);
      
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA label for shortcut display', () => {
      render(<HotkeyAcceleratorInput {...defaultProps} />);
      
      const input = screen.getByRole('button', { name: /keyboard shortcut:.*click to change/i });
      expect(input).toBeInTheDocument();
    });

    it('should have proper ARIA disabled state', () => {
      render(<HotkeyAcceleratorInput {...defaultProps} disabled />);
      
      const input = screen.getByRole('button', { name: /keyboard shortcut/i });
      expect(input).toHaveAttribute('aria-disabled', 'true');
    });

    it('should have proper tabindex when enabled', () => {
      render(<HotkeyAcceleratorInput {...defaultProps} />);
      
      const input = screen.getByRole('button', { name: /keyboard shortcut/i });
      expect(input).toHaveAttribute('tabindex', '0');
    });

    it('should have negative tabindex when disabled', () => {
      render(<HotkeyAcceleratorInput {...defaultProps} disabled />);
      
      const input = screen.getByRole('button', { name: /keyboard shortcut/i });
      expect(input).toHaveAttribute('tabindex', '-1');
    });
  });

  describe('keyboard event conversion', () => {
    it('should handle letter keys correctly', async () => {
      render(<HotkeyAcceleratorInput {...defaultProps} />);
      
      const input = screen.getByRole('button', { name: /keyboard shortcut/i });
      fireEvent.click(input);
      
      await waitFor(() => {
        expect(screen.getByText('Press keys...')).toBeInTheDocument();
      });
      
      fireEvent.keyDown(input, { key: 'k', code: 'KeyK', ctrlKey: true });
      
      expect(mockOnChange).toHaveBeenCalledWith('alwaysOnTop', 'CommandOrControl+K');
    });

    it('should handle function keys correctly', async () => {
      render(<HotkeyAcceleratorInput {...defaultProps} />);
      
      const input = screen.getByRole('button', { name: /keyboard shortcut/i });
      fireEvent.click(input);
      
      await waitFor(() => {
        expect(screen.getByText('Press keys...')).toBeInTheDocument();
      });
      
      fireEvent.keyDown(input, { key: 'F5', code: 'F5', ctrlKey: true });
      
      expect(mockOnChange).toHaveBeenCalledWith('alwaysOnTop', 'CommandOrControl+F5');
    });

    it('should handle multiple modifiers correctly', async () => {
      render(<HotkeyAcceleratorInput {...defaultProps} />);
      
      const input = screen.getByRole('button', { name: /keyboard shortcut/i });
      fireEvent.click(input);
      
      await waitFor(() => {
        expect(screen.getByText('Press keys...')).toBeInTheDocument();
      });
      
      fireEvent.keyDown(input, {
        key: 'P',
        code: 'KeyP',
        ctrlKey: true,
        altKey: true,
        shiftKey: true,
      });
      
      expect(mockOnChange).toHaveBeenCalledWith('alwaysOnTop', 'CommandOrControl+Alt+Shift+P');
    });
  });

  describe('visual feedback', () => {
    it('should apply recording class to container during recording', async () => {
      render(<HotkeyAcceleratorInput {...defaultProps} />);
      
      const input = screen.getByRole('button', { name: /keyboard shortcut/i });
      
      fireEvent.click(input);
      
      await waitFor(() => {
        expect(input).toHaveClass('recording');
      });
    });
  });
});
