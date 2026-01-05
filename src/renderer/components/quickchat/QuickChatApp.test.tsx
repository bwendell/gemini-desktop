/**
 * Unit tests for QuickChatApp component.
 *
 * Tests the Spotlight-like Quick Chat input including:
 * - Rendering and focus behavior
 * - Input handling
 * - Submit functionality
 * - Keyboard shortcuts (Enter, Escape, Tab)
 * - Text prediction ghost text (tasks 7.10-7.11)
 *
 * @module QuickChatApp.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QuickChatApp from './QuickChatApp';

describe('QuickChatApp', () => {
  // Mock electronAPI
  const mockSubmitQuickChat = vi.fn();
  const mockCancelQuickChat = vi.fn();
  const mockHideQuickChat = vi.fn();
  const mockGetTextPredictionStatus = vi.fn();
  const mockPredictText = vi.fn();
  const mockOnTextPredictionStatusChanged = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Default text prediction mock - disabled
    mockGetTextPredictionStatus.mockResolvedValue({
      enabled: false,
      gpuEnabled: false,
      status: 'not-downloaded',
    });
    mockPredictText.mockResolvedValue(null);
    mockOnTextPredictionStatusChanged.mockReturnValue(() => {});

    window.electronAPI = {
      submitQuickChat: mockSubmitQuickChat,
      cancelQuickChat: mockCancelQuickChat,
      hideQuickChat: mockHideQuickChat,
      getTextPredictionStatus: mockGetTextPredictionStatus,
      predictText: mockPredictText,
      onTextPredictionStatusChanged: mockOnTextPredictionStatusChanged,
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

  afterEach(() => {
    vi.useRealTimers();
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

    it('calls cancelQuickChat on Escape key when no prediction is showing', () => {
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

  // Task 7.10: QuickChatApp displays ghost text when prediction available
  describe('Text Prediction - Ghost Text', () => {
    beforeEach(() => {
      // Enable text prediction for these tests
      mockGetTextPredictionStatus.mockResolvedValue({
        enabled: true,
        gpuEnabled: false,
        status: 'ready',
      });
    });

    it('does not show ghost text when prediction disabled', async () => {
      mockGetTextPredictionStatus.mockResolvedValue({
        enabled: false,
        gpuEnabled: false,
        status: 'not-downloaded',
      });

      render(<QuickChatApp />);

      const input = screen.getByTestId('quick-chat-input');
      fireEvent.change(input, { target: { value: 'Hello ' } });

      // Wait for debounce
      await vi.advanceTimersByTimeAsync(350);

      // Ghost text should not appear because prediction is disabled
      expect(screen.queryByTestId('quick-chat-ghost-text')).not.toBeInTheDocument();
      expect(mockPredictText).not.toHaveBeenCalled();
    });

    it('does not show ghost text when model not ready', async () => {
      mockGetTextPredictionStatus.mockResolvedValue({
        enabled: true,
        gpuEnabled: false,
        status: 'downloading',
      });

      render(<QuickChatApp />);

      const input = screen.getByTestId('quick-chat-input');
      fireEvent.change(input, { target: { value: 'Hello ' } });

      // Wait for debounce
      await vi.advanceTimersByTimeAsync(350);

      // Ghost text should not appear because model is not ready
      expect(screen.queryByTestId('quick-chat-ghost-text')).not.toBeInTheDocument();
      expect(mockPredictText).not.toHaveBeenCalled();
    });

    it('shows ghost text when prediction is available', async () => {
      mockPredictText.mockResolvedValue('world!');

      render(<QuickChatApp />);

      // Wait for status to load
      await vi.advanceTimersByTimeAsync(100);

      const input = screen.getByTestId('quick-chat-input');
      fireEvent.change(input, { target: { value: 'Hello ' } });

      // Wait for debounce (300ms)
      await vi.advanceTimersByTimeAsync(350);

      await waitFor(() => {
        expect(screen.getByTestId('quick-chat-ghost-text')).toBeInTheDocument();
      });
    });

    it('ghost text contains the prediction', async () => {
      mockPredictText.mockResolvedValue('world!');

      render(<QuickChatApp />);

      await vi.advanceTimersByTimeAsync(100);

      const input = screen.getByTestId('quick-chat-input');
      fireEvent.change(input, { target: { value: 'Hello ' } });

      await vi.advanceTimersByTimeAsync(350);

      await waitFor(() => {
        const ghostText = screen.getByTestId('quick-chat-ghost-text');
        expect(ghostText).toHaveTextContent('world!');
      });
    });

    it('clears ghost text when typing continues', async () => {
      mockPredictText.mockResolvedValue('world!');

      render(<QuickChatApp />);

      await vi.advanceTimersByTimeAsync(100);

      const input = screen.getByTestId('quick-chat-input');
      fireEvent.change(input, { target: { value: 'Hello ' } });

      await vi.advanceTimersByTimeAsync(350);

      // Ghost text should appear
      await waitFor(() => {
        expect(screen.getByTestId('quick-chat-ghost-text')).toBeInTheDocument();
      });

      // Continue typing - should clear ghost text
      fireEvent.change(input, { target: { value: 'Hello world' } });

      expect(screen.queryByTestId('quick-chat-ghost-text')).not.toBeInTheDocument();
    });

    it('clears ghost text on blur', async () => {
      mockPredictText.mockResolvedValue('world!');

      render(<QuickChatApp />);

      await vi.advanceTimersByTimeAsync(100);

      const input = screen.getByTestId('quick-chat-input');
      fireEvent.change(input, { target: { value: 'Hello ' } });

      await vi.advanceTimersByTimeAsync(350);

      await waitFor(() => {
        expect(screen.getByTestId('quick-chat-ghost-text')).toBeInTheDocument();
      });

      // Blur the input
      fireEvent.blur(input);

      expect(screen.queryByTestId('quick-chat-ghost-text')).not.toBeInTheDocument();
    });

    it('requests prediction after debounce delay', async () => {
      mockPredictText.mockResolvedValue('world!');

      render(<QuickChatApp />);

      await vi.advanceTimersByTimeAsync(100);

      const input = screen.getByTestId('quick-chat-input');
      fireEvent.change(input, { target: { value: 'Hello ' } });

      // Should not have called predictText yet
      expect(mockPredictText).not.toHaveBeenCalled();

      // Wait for debounce
      await vi.advanceTimersByTimeAsync(350);

      expect(mockPredictText).toHaveBeenCalledWith('Hello ');
    });
  });

  // Task 7.11: QuickChatApp accepts prediction on Tab key
  describe('Text Prediction - Tab Key Acceptance', () => {
    beforeEach(() => {
      mockGetTextPredictionStatus.mockResolvedValue({
        enabled: true,
        gpuEnabled: false,
        status: 'ready',
      });
    });

    it('accepts prediction on Tab key press', async () => {
      mockPredictText.mockResolvedValue('world!');

      render(<QuickChatApp />);

      await vi.advanceTimersByTimeAsync(100);

      const input = screen.getByTestId('quick-chat-input');
      fireEvent.change(input, { target: { value: 'Hello ' } });

      await vi.advanceTimersByTimeAsync(350);

      await waitFor(() => {
        expect(screen.getByTestId('quick-chat-ghost-text')).toBeInTheDocument();
      });

      // Press Tab to accept prediction
      fireEvent.keyDown(input, { key: 'Tab' });

      // Input should now contain the original text + prediction
      expect(input).toHaveValue('Hello world!');
    });

    it('dismisses prediction on Escape key instead of canceling', async () => {
      mockPredictText.mockResolvedValue('world!');

      render(<QuickChatApp />);

      await vi.advanceTimersByTimeAsync(100);

      const input = screen.getByTestId('quick-chat-input');
      fireEvent.change(input, { target: { value: 'Hello ' } });

      await vi.advanceTimersByTimeAsync(350);

      await waitFor(() => {
        expect(screen.getByTestId('quick-chat-ghost-text')).toBeInTheDocument();
      });

      // Press Escape to dismiss prediction (not cancel Quick Chat)
      fireEvent.keyDown(input, { key: 'Escape' });

      // Ghost text should be dismissed
      expect(screen.queryByTestId('quick-chat-ghost-text')).not.toBeInTheDocument();

      // cancelQuickChat should NOT have been called (prediction was showing)
      expect(mockCancelQuickChat).not.toHaveBeenCalled();

      // Input should remain unchanged
      expect(input).toHaveValue('Hello ');
    });

    it('clears ghost text after accepting prediction', async () => {
      mockPredictText.mockResolvedValue('world!');

      render(<QuickChatApp />);

      await vi.advanceTimersByTimeAsync(100);

      const input = screen.getByTestId('quick-chat-input');
      fireEvent.change(input, { target: { value: 'Hello ' } });

      await vi.advanceTimersByTimeAsync(350);

      await waitFor(() => {
        expect(screen.getByTestId('quick-chat-ghost-text')).toBeInTheDocument();
      });

      fireEvent.keyDown(input, { key: 'Tab' });

      // Ghost text should be cleared after acceptance
      expect(screen.queryByTestId('quick-chat-ghost-text')).not.toBeInTheDocument();
    });

    it('Tab does nothing when no prediction available', async () => {
      mockPredictText.mockResolvedValue(null);

      render(<QuickChatApp />);

      const input = screen.getByTestId('quick-chat-input');
      fireEvent.change(input, { target: { value: 'Hello ' } });

      // Without prediction, Tab should not modify input
      const originalValue = 'Hello ';
      fireEvent.keyDown(input, { key: 'Tab' });

      // Value should remain unchanged
      expect(input).toHaveValue(originalValue);
    });

    it('clears prediction on submit', async () => {
      mockPredictText.mockResolvedValue('world!');

      render(<QuickChatApp />);

      await vi.advanceTimersByTimeAsync(100);

      const input = screen.getByTestId('quick-chat-input');
      fireEvent.change(input, { target: { value: 'Hello ' } });

      await vi.advanceTimersByTimeAsync(350);

      await waitFor(() => {
        expect(screen.getByTestId('quick-chat-ghost-text')).toBeInTheDocument();
      });

      // Submit without accepting prediction
      fireEvent.keyDown(input, { key: 'Enter' });

      // Should submit original text, not prediction
      expect(mockSubmitQuickChat).toHaveBeenCalledWith('Hello');
      expect(screen.queryByTestId('quick-chat-ghost-text')).not.toBeInTheDocument();
    });
  });
});
