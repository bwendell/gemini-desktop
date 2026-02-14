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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import QuickChatApp from './QuickChatApp';

describe('QuickChatApp', () => {
    // Mock electronAPI
    const mockSubmitQuickChat = vi.fn();
    const mockCancelQuickChat = vi.fn();
    const mockHideQuickChat = vi.fn();
    const mockGetTextPredictionStatus = vi.fn();
    const mockPredictText = vi.fn();
    const mockOnTextPredictionStatusChanged = vi.fn();

    const waitForInitialization = async () => {
        await waitFor(() => {
            expect(mockGetTextPredictionStatus).toHaveBeenCalled();
        });
    };

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
        it('renders the container', async () => {
            render(<QuickChatApp />);
            await waitForInitialization();
            expect(screen.getByTestId('quick-chat-container')).toBeInTheDocument();
        });

        it('renders the input field', async () => {
            render(<QuickChatApp />);
            await waitForInitialization();
            const input = screen.getByTestId('quick-chat-input');
            expect(input).toBeInTheDocument();
            expect(input).toHaveAttribute('placeholder', 'Ask Gemini...');
        });

        it('renders the submit button', async () => {
            render(<QuickChatApp />);
            await waitForInitialization();
            expect(screen.getByTestId('quick-chat-submit')).toBeInTheDocument();
        });

        it('auto-focuses the input on mount', async () => {
            render(<QuickChatApp />);
            await waitForInitialization();
            const input = screen.getByTestId('quick-chat-input');
            expect(document.activeElement).toBe(input);
        });
    });

    describe('Input Handling', () => {
        it('updates value when typing', async () => {
            render(<QuickChatApp />);
            await waitForInitialization();

            const input = screen.getByTestId('quick-chat-input');
            await act(async () => {
                fireEvent.change(input, { target: { value: 'Hello Gemini' } });
            });

            expect(input).toHaveValue('Hello Gemini');
        });

        it('enables submit button when input has text', async () => {
            render(<QuickChatApp />);
            await waitForInitialization();

            const submit = screen.getByTestId('quick-chat-submit');
            expect(submit).toBeDisabled();

            await act(async () => {
                fireEvent.change(screen.getByTestId('quick-chat-input'), { target: { value: 'test' } });
            });
            expect(submit).not.toBeDisabled();
        });

        it('disables submit button when input is empty', async () => {
            render(<QuickChatApp />);
            await waitForInitialization();

            const submit = screen.getByTestId('quick-chat-submit');
            expect(submit).toBeDisabled();
        });

        it('disables submit button when input is only whitespace', async () => {
            render(<QuickChatApp />);
            await waitForInitialization();

            await act(async () => {
                fireEvent.change(screen.getByTestId('quick-chat-input'), { target: { value: '   ' } });
            });
            expect(screen.getByTestId('quick-chat-submit')).toBeDisabled();
        });
    });

    describe('Submit Functionality', () => {
        it('calls submitQuickChat when clicking submit button', async () => {
            render(<QuickChatApp />);
            await waitForInitialization();

            await act(async () => {
                fireEvent.change(screen.getByTestId('quick-chat-input'), {
                    target: { value: 'Test prompt' },
                });
            });
            await act(async () => {
                fireEvent.click(screen.getByTestId('quick-chat-submit'));
            });

            expect(mockSubmitQuickChat).toHaveBeenCalledWith('Test prompt');
        });

        it('clears input after submit', async () => {
            render(<QuickChatApp />);
            await waitForInitialization();

            const input = screen.getByTestId('quick-chat-input');
            await act(async () => {
                fireEvent.change(input, { target: { value: 'Test prompt' } });
            });
            await act(async () => {
                fireEvent.click(screen.getByTestId('quick-chat-submit'));
            });

            expect(input).toHaveValue('');
        });

        it('does not call submitQuickChat when input is empty', async () => {
            render(<QuickChatApp />);
            await waitForInitialization();

            await act(async () => {
                fireEvent.click(screen.getByTestId('quick-chat-submit'));
            });

            expect(mockSubmitQuickChat).not.toHaveBeenCalled();
        });

        it('trims whitespace from input before submit', async () => {
            render(<QuickChatApp />);
            await waitForInitialization();

            await act(async () => {
                fireEvent.change(screen.getByTestId('quick-chat-input'), {
                    target: { value: '  Test prompt  ' },
                });
            });
            await act(async () => {
                fireEvent.click(screen.getByTestId('quick-chat-submit'));
            });

            expect(mockSubmitQuickChat).toHaveBeenCalledWith('Test prompt');
        });
    });

    describe('Edge Cases', () => {
        it('does not submit on Enter when input is empty', async () => {
            render(<QuickChatApp />);
            await waitForInitialization();

            const input = screen.getByTestId('quick-chat-input');
            await act(async () => {
                fireEvent.keyDown(input, { key: 'Enter' });
            });
            expect(mockSubmitQuickChat).not.toHaveBeenCalled();
        });

        it('ignores other keys', async () => {
            render(<QuickChatApp />);
            await waitForInitialization();

            const input = screen.getByTestId('quick-chat-input');
            await act(async () => {
                fireEvent.keyDown(input, { key: 'a' });
            });
            expect(mockSubmitQuickChat).not.toHaveBeenCalled();
            expect(mockCancelQuickChat).not.toHaveBeenCalled();
        });
    });

    describe('Keyboard Shortcuts', () => {
        it('submits on Enter key', async () => {
            render(<QuickChatApp />);
            await waitForInitialization();

            const input = screen.getByTestId('quick-chat-input');
            await act(async () => {
                fireEvent.change(input, { target: { value: 'Enter test' } });
            });
            await act(async () => {
                fireEvent.keyDown(input, { key: 'Enter' });
            });

            expect(mockSubmitQuickChat).toHaveBeenCalledWith('Enter test');
        });

        it('calls cancelQuickChat on Escape key when no prediction is showing', async () => {
            render(<QuickChatApp />);
            await waitForInitialization();

            const input = screen.getByTestId('quick-chat-input');
            await act(async () => {
                fireEvent.keyDown(input, { key: 'Escape' });
            });

            expect(mockCancelQuickChat).toHaveBeenCalled();
        });

        it('does not submit on Shift+Enter', async () => {
            render(<QuickChatApp />);
            await waitForInitialization();

            const input = screen.getByTestId('quick-chat-input');
            await act(async () => {
                fireEvent.change(input, { target: { value: 'Test' } });
            });
            await act(async () => {
                fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
            });

            expect(mockSubmitQuickChat).not.toHaveBeenCalled();
        });
    });

    describe('Without ElectronAPI', () => {
        it('handles missing electronAPI gracefully', async () => {
            window.electronAPI = undefined;

            render(<QuickChatApp />);

            await act(async () => {
                await Promise.resolve();
            });

            expect(screen.getByTestId('quick-chat-container')).toBeInTheDocument();
        });

        it('does not throw when submitting without electronAPI', async () => {
            window.electronAPI = undefined;

            render(<QuickChatApp />);

            await act(async () => {
                await Promise.resolve();
            });

            const input = screen.getByTestId('quick-chat-input');
            await act(async () => {
                fireEvent.change(input, { target: { value: 'Test' } });
            });

            await act(async () => {
                expect(() => {
                    fireEvent.click(screen.getByTestId('quick-chat-submit'));
                }).not.toThrow();
            });
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
            await waitForInitialization();

            const input = screen.getByTestId('quick-chat-input');
            await act(async () => {
                fireEvent.change(input, { target: { value: 'Hello ' } });
            });

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
            await waitForInitialization();

            const input = screen.getByTestId('quick-chat-input');
            await act(async () => {
                fireEvent.change(input, { target: { value: 'Hello ' } });
            });

            // Wait for debounce
            await vi.advanceTimersByTimeAsync(350);

            // Ghost text should not appear because model is not ready
            expect(screen.queryByTestId('quick-chat-ghost-text')).not.toBeInTheDocument();
            expect(mockPredictText).not.toHaveBeenCalled();
        });

        it('shows ghost text when prediction is available', async () => {
            mockPredictText.mockResolvedValue('world!');

            render(<QuickChatApp />);
            await waitForInitialization();

            const input = screen.getByTestId('quick-chat-input');

            await act(async () => {
                fireEvent.change(input, { target: { value: 'Hello ' } });
                await vi.advanceTimersByTimeAsync(350);
            });

            expect(screen.getByTestId('quick-chat-ghost-text')).toBeInTheDocument();
        });

        it('ghost text contains the prediction', async () => {
            mockPredictText.mockResolvedValue('world!');

            render(<QuickChatApp />);
            await waitForInitialization();

            const input = screen.getByTestId('quick-chat-input');

            await act(async () => {
                fireEvent.change(input, { target: { value: 'Hello ' } });
                await vi.advanceTimersByTimeAsync(350);
            });

            const ghostText = screen.getByTestId('quick-chat-ghost-text');
            expect(ghostText).toHaveTextContent('world!');
        });

        it('clears ghost text when typing continues', async () => {
            mockPredictText.mockResolvedValue('world!');

            render(<QuickChatApp />);
            await waitForInitialization();

            const input = screen.getByTestId('quick-chat-input');
            await act(async () => {
                fireEvent.change(input, { target: { value: 'Hello ' } });
                await vi.advanceTimersByTimeAsync(350);
            });

            expect(screen.getByTestId('quick-chat-ghost-text')).toBeInTheDocument();

            await act(async () => {
                fireEvent.change(input, { target: { value: 'Hello world' } });
            });

            expect(screen.queryByTestId('quick-chat-ghost-text')).not.toBeInTheDocument();
        });

        it('clears ghost text on blur', async () => {
            mockPredictText.mockResolvedValue('world!');

            render(<QuickChatApp />);
            await waitForInitialization();

            const input = screen.getByTestId('quick-chat-input');
            await act(async () => {
                fireEvent.change(input, { target: { value: 'Hello ' } });
                await vi.advanceTimersByTimeAsync(350);
            });

            expect(screen.getByTestId('quick-chat-ghost-text')).toBeInTheDocument();

            await act(async () => {
                fireEvent.blur(input);
            });

            expect(screen.queryByTestId('quick-chat-ghost-text')).not.toBeInTheDocument();
        });

        it('requests prediction after debounce delay', async () => {
            mockPredictText.mockResolvedValue('world!');

            render(<QuickChatApp />);
            await waitForInitialization();

            const input = screen.getByTestId('quick-chat-input');

            await act(async () => {
                fireEvent.change(input, { target: { value: 'Hello ' } });
                expect(mockPredictText).not.toHaveBeenCalled();
                await vi.advanceTimersByTimeAsync(350);
            });

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
            await waitForInitialization();

            const input = screen.getByTestId('quick-chat-input');
            await act(async () => {
                fireEvent.change(input, { target: { value: 'Hello ' } });
                await vi.advanceTimersByTimeAsync(350);
            });

            expect(screen.getByTestId('quick-chat-ghost-text')).toBeInTheDocument();

            await act(async () => {
                fireEvent.keyDown(input, { key: 'Tab' });
            });

            expect(input).toHaveValue('Hello world!');
        });

        it('dismisses prediction on Escape key instead of canceling', async () => {
            mockPredictText.mockResolvedValue('world!');

            render(<QuickChatApp />);
            await waitForInitialization();

            const input = screen.getByTestId('quick-chat-input');
            await act(async () => {
                fireEvent.change(input, { target: { value: 'Hello ' } });
                await vi.advanceTimersByTimeAsync(350);
            });

            expect(screen.getByTestId('quick-chat-ghost-text')).toBeInTheDocument();

            await act(async () => {
                fireEvent.keyDown(input, { key: 'Escape' });
            });

            expect(screen.queryByTestId('quick-chat-ghost-text')).not.toBeInTheDocument();
            expect(mockCancelQuickChat).not.toHaveBeenCalled();
            expect(input).toHaveValue('Hello ');
        });

        it('clears ghost text after accepting prediction', async () => {
            mockPredictText.mockResolvedValue('world!');

            render(<QuickChatApp />);
            await waitForInitialization();

            const input = screen.getByTestId('quick-chat-input');
            await act(async () => {
                fireEvent.change(input, { target: { value: 'Hello ' } });
                await vi.advanceTimersByTimeAsync(350);
            });

            expect(screen.getByTestId('quick-chat-ghost-text')).toBeInTheDocument();

            await act(async () => {
                fireEvent.keyDown(input, { key: 'Tab' });
            });

            expect(screen.queryByTestId('quick-chat-ghost-text')).not.toBeInTheDocument();
        });

        it('Tab does nothing when no prediction available', async () => {
            mockPredictText.mockResolvedValue(null);

            render(<QuickChatApp />);
            await waitForInitialization();

            const input = screen.getByTestId('quick-chat-input');
            await act(async () => {
                fireEvent.change(input, { target: { value: 'Hello ' } });
                await vi.advanceTimersByTimeAsync(350);
            });

            const originalValue = 'Hello ';
            await act(async () => {
                fireEvent.keyDown(input, { key: 'Tab' });
            });

            expect(input).toHaveValue(originalValue);
        });

        it('clears prediction on submit', async () => {
            mockPredictText.mockResolvedValue('world!');

            render(<QuickChatApp />);
            await waitForInitialization();

            const input = screen.getByTestId('quick-chat-input');
            await act(async () => {
                fireEvent.change(input, { target: { value: 'Hello ' } });
                await vi.advanceTimersByTimeAsync(350);
            });

            expect(screen.getByTestId('quick-chat-ghost-text')).toBeInTheDocument();

            await act(async () => {
                fireEvent.keyDown(input, { key: 'Enter' });
            });

            expect(mockSubmitQuickChat).toHaveBeenCalledWith('Hello');
            expect(screen.queryByTestId('quick-chat-ghost-text')).not.toBeInTheDocument();
        });
    });
});
