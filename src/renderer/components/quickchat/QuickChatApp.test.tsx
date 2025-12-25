/**
 * Unit tests for QuickChatApp component.
 *
 * Tests the Spotlight-like Quick Chat input including:
 * - Rendering and focus behavior
 * - Input handling
 * - Submit functionality
 * - Keyboard shortcuts (Enter, Escape)
 *
 * @module QuickChatApp.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuickChatApp from './QuickChatApp';

describe('QuickChatApp', () => {
  // Mock electronAPI
  const mockSubmitQuickChat = vi.fn();
  const mockCancelQuickChat = vi.fn();
  const mockHideQuickChat = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.electronAPI = {
      submitQuickChat: mockSubmitQuickChat,
      cancelQuickChat: mockCancelQuickChat,
      hideQuickChat: mockHideQuickChat,
      minimizeWindow: vi.fn(),
      maximizeWindow: vi.fn(),
      closeWindow: vi.fn(),
      isMaximized: vi.fn().mockResolvedValue(false),
      openOptions: vi.fn(),
      openGoogleSignIn: vi.fn().mockResolvedValue(undefined),
      getTheme: vi.fn().mockResolvedValue({ preference: 'system', effectiveTheme: 'dark' }),
      setTheme: vi.fn(),
      onThemeChanged: vi.fn().mockReturnValue(() => {}),
      onQuickChatExecute: vi.fn().mockReturnValue(() => {}),
      platform: 'win32',
      isElectron: true,
    };
  });

  describe('Rendering', () => {
    it('renders the container', () => {
      render(<QuickChatApp />);
      expect(screen.getByTestId('quick-chat-container')).toBeInTheDocument();
    });

    it('renders the input field', () => {
      render(<QuickChatApp />);
      const input = screen.getByTestId('quick-chat-input');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', 'Ask Gemini...');
    });

    it('renders the submit button', () => {
      render(<QuickChatApp />);
      expect(screen.getByTestId('quick-chat-submit')).toBeInTheDocument();
    });

    it('auto-focuses the input on mount', () => {
      render(<QuickChatApp />);
      const input = screen.getByTestId('quick-chat-input');
      expect(document.activeElement).toBe(input);
    });
  });

  describe('Input Handling', () => {
    it('updates value when typing', () => {
      render(<QuickChatApp />);

      const input = screen.getByTestId('quick-chat-input');
      fireEvent.change(input, { target: { value: 'Hello Gemini' } });

      expect(input).toHaveValue('Hello Gemini');
    });

    it('enables submit button when input has text', () => {
      render(<QuickChatApp />);

      const submit = screen.getByTestId('quick-chat-submit');
      expect(submit).toBeDisabled();

      fireEvent.change(screen.getByTestId('quick-chat-input'), { target: { value: 'test' } });
      expect(submit).not.toBeDisabled();
    });

    it('disables submit button when input is empty', () => {
      render(<QuickChatApp />);
      const submit = screen.getByTestId('quick-chat-submit');
      expect(submit).toBeDisabled();
    });

    it('disables submit button when input is only whitespace', () => {
      render(<QuickChatApp />);

      fireEvent.change(screen.getByTestId('quick-chat-input'), { target: { value: '   ' } });
      expect(screen.getByTestId('quick-chat-submit')).toBeDisabled();
    });
  });

  describe('Submit Functionality', () => {
    it('calls submitQuickChat when clicking submit button', () => {
      render(<QuickChatApp />);

      fireEvent.change(screen.getByTestId('quick-chat-input'), {
        target: { value: 'Test prompt' },
      });
      fireEvent.click(screen.getByTestId('quick-chat-submit'));

      expect(mockSubmitQuickChat).toHaveBeenCalledWith('Test prompt');
    });

    it('clears input after submit', () => {
      render(<QuickChatApp />);

      const input = screen.getByTestId('quick-chat-input');
      fireEvent.change(input, { target: { value: 'Test prompt' } });
      fireEvent.click(screen.getByTestId('quick-chat-submit'));

      expect(input).toHaveValue('');
    });

    it('does not call submitQuickChat when input is empty', () => {
      render(<QuickChatApp />);

      fireEvent.click(screen.getByTestId('quick-chat-submit'));

      expect(mockSubmitQuickChat).not.toHaveBeenCalled();
    });

    it('trims whitespace from input before submit', () => {
      render(<QuickChatApp />);

      fireEvent.change(screen.getByTestId('quick-chat-input'), {
        target: { value: '  Test prompt  ' },
      });
      fireEvent.click(screen.getByTestId('quick-chat-submit'));

      expect(mockSubmitQuickChat).toHaveBeenCalledWith('Test prompt');
    });
  });

  describe('Edge Cases', () => {
    it('does not submit on Enter when input is empty', () => {
      render(<QuickChatApp />);
      const input = screen.getByTestId('quick-chat-input');
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(mockSubmitQuickChat).not.toHaveBeenCalled();
    });

    it('ignores other keys', () => {
      render(<QuickChatApp />);
      const input = screen.getByTestId('quick-chat-input');
      fireEvent.keyDown(input, { key: 'a' });
      expect(mockSubmitQuickChat).not.toHaveBeenCalled();
      expect(mockCancelQuickChat).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('submits on Enter key', () => {
      render(<QuickChatApp />);

      const input = screen.getByTestId('quick-chat-input');
      fireEvent.change(input, { target: { value: 'Enter test' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockSubmitQuickChat).toHaveBeenCalledWith('Enter test');
    });

    it('calls cancelQuickChat on Escape key', () => {
      render(<QuickChatApp />);

      const input = screen.getByTestId('quick-chat-input');
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(mockCancelQuickChat).toHaveBeenCalled();
    });

    it('does not submit on Shift+Enter', () => {
      render(<QuickChatApp />);

      const input = screen.getByTestId('quick-chat-input');
      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

      expect(mockSubmitQuickChat).not.toHaveBeenCalled();
    });
  });

  describe('Without ElectronAPI', () => {
    it('handles missing electronAPI gracefully', () => {
      window.electronAPI = undefined;

      render(<QuickChatApp />);

      // Should render without crashing
      expect(screen.getByTestId('quick-chat-container')).toBeInTheDocument();
    });

    it('does not throw when submitting without electronAPI', () => {
      window.electronAPI = undefined;

      render(<QuickChatApp />);

      const input = screen.getByTestId('quick-chat-input');
      fireEvent.change(input, { target: { value: 'Test' } });

      // Should not throw
      expect(() => {
        fireEvent.click(screen.getByTestId('quick-chat-submit'));
      }).not.toThrow();
    });
  });
});
