/**
 * Coordinated tests for Quick Chat text prediction integration.
 * Tests the coordination between QuickChatApp component and prediction IPC.
 *
 * Tasks 8.5-8.8: Quick Chat prediction tests
 *
 * @module text-prediction-quickchat.coordinated.test
 */

import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import QuickChatApp from '../../src/renderer/components/quickchat/QuickChatApp';
import type { TextPredictionSettings } from '../../src/shared/types/text-prediction';
import { useFakeTimers, useRealTimers } from '../helpers/harness';

// Mock the CSS import
vi.mock('../../src/renderer/components/quickchat/QuickChat.css', () => ({}));

describe('QuickChatApp Text Prediction Coordination', () => {
    // Mock electronAPI methods
    let mockGetTextPredictionStatus: ReturnType<typeof vi.fn>;
    let mockOnTextPredictionStatusChanged: ReturnType<typeof vi.fn>;
    let mockPredictText: ReturnType<typeof vi.fn>;
    let mockSubmitQuickChat: ReturnType<typeof vi.fn>;
    let mockCancelQuickChat: ReturnType<typeof vi.fn>;

    // Callback reference for simulating events from main process
    let statusChangedCallback: ((settings: TextPredictionSettings) => void) | null = null;

    beforeEach(() => {
        vi.clearAllMocks();
        useFakeTimers();

        // Reset callback reference
        statusChangedCallback = null;

        // Create mock functions
        mockGetTextPredictionStatus = vi.fn();
        mockOnTextPredictionStatusChanged = vi.fn();
        mockPredictText = vi.fn();
        mockSubmitQuickChat = vi.fn();
        mockCancelQuickChat = vi.fn();

        // Default implementation - prediction enabled and ready
        mockGetTextPredictionStatus.mockResolvedValue({
            enabled: true,
            gpuEnabled: false,
            status: 'ready',
        });

        mockPredictText.mockResolvedValue(null); // Default: no prediction

        // Capture the status changed callback
        mockOnTextPredictionStatusChanged.mockImplementation((cb: (settings: TextPredictionSettings) => void) => {
            statusChangedCallback = cb;
            return () => {
                statusChangedCallback = null;
            };
        });

        // Set up window.electronAPI
        (window as any).electronAPI = {
            getTextPredictionStatus: mockGetTextPredictionStatus,
            onTextPredictionStatusChanged: mockOnTextPredictionStatusChanged,
            predictText: mockPredictText,
            submitQuickChat: mockSubmitQuickChat,
            cancelQuickChat: mockCancelQuickChat,
            minimizeWindow: vi.fn(),
            maximizeWindow: vi.fn(),
            closeWindow: vi.fn(),
            isMaximized: vi.fn().mockResolvedValue(false),
            openOptions: vi.fn(),
            openGoogleSignIn: vi.fn().mockResolvedValue(undefined),
            getTheme: vi.fn().mockResolvedValue({ preference: 'system', effectiveTheme: 'dark' }),
            setTheme: vi.fn(),
            onThemeChanged: vi.fn().mockReturnValue(() => {}),
            platform: 'win32',
            isElectron: true,
        };
    });

    afterEach(() => {
        useRealTimers();
        vi.restoreAllMocks();
    });

    /**
     * Task 8.5: Coordinated test - Predict request → response received in Quick Chat
     *
     * Verifies that when the user types text and waits, a prediction request is made
     * and the ghost text appears with the mocked prediction.
     */
    describe('8.5 - Predict request triggers ghost text display', () => {
        it('should request prediction after typing and display ghost text', async () => {
            const mockPrediction = ' is the capital of France.';
            mockPredictText.mockResolvedValue(mockPrediction);

            render(<QuickChatApp />);

            // Wait for initial status to load
            await act(async () => {
                await vi.advanceTimersByTimeAsync(10);
            });

            const input = screen.getByTestId('quick-chat-input');

            // Type something
            await act(async () => {
                fireEvent.change(input, { target: { value: 'Paris' } });
            });

            // Wait for debounce (300ms)
            await act(async () => {
                await vi.advanceTimersByTimeAsync(350);
            });

            // VERIFY: predictText was called with the input value
            expect(mockPredictText).toHaveBeenCalledWith('Paris');

            // VERIFY: Ghost text appears with prediction
            expect(screen.getByTestId('quick-chat-ghost-text')).toBeInTheDocument();
            expect(screen.getByTestId('quick-chat-ghost-text')).toHaveTextContent(mockPrediction);
        });

        it('should not show ghost text when prediction returns null', async () => {
            mockPredictText.mockResolvedValue(null);

            render(<QuickChatApp />);

            await act(async () => {
                await vi.advanceTimersByTimeAsync(10);
            });

            const input = screen.getByTestId('quick-chat-input');

            // Type something
            await act(async () => {
                fireEvent.change(input, { target: { value: 'Hello' } });
            });

            // Wait for debounce
            await act(async () => {
                await vi.advanceTimersByTimeAsync(350);
            });

            // VERIFY: Ghost text should not appear
            expect(screen.queryByTestId('quick-chat-ghost-text')).not.toBeInTheDocument();
        });

        it('should debounce prediction requests (300ms delay)', async () => {
            mockPredictText.mockResolvedValue(' world');

            render(<QuickChatApp />);

            await act(async () => {
                await vi.advanceTimersByTimeAsync(10);
            });

            const input = screen.getByTestId('quick-chat-input');

            // Type multiple characters quickly
            await act(async () => {
                fireEvent.change(input, { target: { value: 'H' } });
            });
            await act(async () => {
                await vi.advanceTimersByTimeAsync(100);
            });
            await act(async () => {
                fireEvent.change(input, { target: { value: 'He' } });
            });
            await act(async () => {
                await vi.advanceTimersByTimeAsync(100);
            });
            await act(async () => {
                fireEvent.change(input, { target: { value: 'Hel' } });
            });

            // Not enough time passed - no prediction request yet
            expect(mockPredictText).not.toHaveBeenCalled();

            // Wait for debounce
            await act(async () => {
                await vi.advanceTimersByTimeAsync(350);
            });

            // VERIFY: Only one prediction request was made with final value
            expect(mockPredictText).toHaveBeenCalledTimes(1);
            expect(mockPredictText).toHaveBeenCalledWith('Hel');
        });
    });

    /**
     * Task 8.6: Coordinated test - Tab key → prediction accepted in Quick Chat
     *
     * Verifies that pressing Tab with a visible prediction appends it to the input.
     */
    describe('8.6 - Tab key accepts prediction', () => {
        it('should append prediction to input when Tab is pressed', async () => {
            const mockPrediction = ' world!';
            mockPredictText.mockResolvedValue(mockPrediction);

            render(<QuickChatApp />);

            await act(async () => {
                await vi.advanceTimersByTimeAsync(10);
            });

            const input = screen.getByTestId('quick-chat-input') as HTMLInputElement;

            // Type and wait for prediction
            await act(async () => {
                fireEvent.change(input, { target: { value: 'Hello' } });
            });
            await act(async () => {
                await vi.advanceTimersByTimeAsync(350);
            });

            // Verify ghost text is shown
            expect(screen.getByTestId('quick-chat-ghost-text')).toBeInTheDocument();

            // EXECUTE: Press Tab
            await act(async () => {
                fireEvent.keyDown(input, { key: 'Tab' });
            });

            // VERIFY: Input value now contains original + prediction
            expect(input.value).toBe('Hello world!');

            // VERIFY: Ghost text is cleared
            expect(screen.queryByTestId('quick-chat-ghost-text')).not.toBeInTheDocument();
        });

        it('should do nothing when Tab pressed with no prediction', async () => {
            render(<QuickChatApp />);

            await act(async () => {
                await vi.advanceTimersByTimeAsync(10);
            });

            const input = screen.getByTestId('quick-chat-input') as HTMLInputElement;

            // Type but no prediction available
            await act(async () => {
                fireEvent.change(input, { target: { value: 'Hello' } });
            });

            // Press Tab immediately (no prediction yet)
            await act(async () => {
                fireEvent.keyDown(input, { key: 'Tab' });
            });

            // Input unchanged (Tab should have default behavior or nothing)
            expect(input.value).toBe('Hello');
        });
    });

    /**
     * Task 8.7: Coordinated test - Continued typing → prediction dismissed
     *
     * Verifies that typing more clears any visible prediction.
     */
    describe('8.7 - Continued typing dismisses prediction', () => {
        it('should clear ghost text when user continues typing', async () => {
            const mockPrediction = ' world!';
            mockPredictText.mockResolvedValue(mockPrediction);

            render(<QuickChatApp />);

            await act(async () => {
                await vi.advanceTimersByTimeAsync(10);
            });

            const input = screen.getByTestId('quick-chat-input') as HTMLInputElement;

            // Type and wait for prediction
            await act(async () => {
                fireEvent.change(input, { target: { value: 'Hello' } });
            });
            await act(async () => {
                await vi.advanceTimersByTimeAsync(350);
            });

            // Verify ghost text is shown
            expect(screen.getByTestId('quick-chat-ghost-text')).toBeInTheDocument();

            // EXECUTE: Continue typing
            await act(async () => {
                fireEvent.change(input, { target: { value: 'Hello there' } });
            });

            // VERIFY: Ghost text is immediately cleared
            expect(screen.queryByTestId('quick-chat-ghost-text')).not.toBeInTheDocument();
        });

        it('should cancel pending prediction when typing continues', async () => {
            mockPredictText.mockImplementation(async () => {
                // Simulate slow prediction
                await new Promise((resolve) => setTimeout(resolve, 500));
                return ' slow prediction';
            });

            render(<QuickChatApp />);

            await act(async () => {
                await vi.advanceTimersByTimeAsync(10);
            });

            const input = screen.getByTestId('quick-chat-input');

            // Start typing
            await act(async () => {
                fireEvent.change(input, { target: { value: 'Hello' } });
            });

            // Wait for debounce but not full prediction
            await act(async () => {
                await vi.advanceTimersByTimeAsync(300);
            });

            // Continue typing before prediction completes
            await act(async () => {
                fireEvent.change(input, { target: { value: 'Hello world' } });
            });

            // The old prediction request was cancelled
            // No ghost text from the cancelled request
            expect(screen.queryByTestId('quick-chat-ghost-text')).not.toBeInTheDocument();
        });
    });

    /**
     * Task 8.8: Coordinated test - Prediction disabled → no ghost text
     *
     * Verifies that when prediction is disabled, no requests are made.
     */
    describe('8.8 - Prediction disabled shows no ghost text', () => {
        it('should not request prediction when feature is disabled', async () => {
            // Disable prediction
            mockGetTextPredictionStatus.mockResolvedValue({
                enabled: false,
                gpuEnabled: false,
                status: 'not-downloaded',
            });

            render(<QuickChatApp />);

            await act(async () => {
                await vi.advanceTimersByTimeAsync(10);
            });

            const input = screen.getByTestId('quick-chat-input');

            // Type something
            await act(async () => {
                fireEvent.change(input, { target: { value: 'Hello' } });
            });

            // Wait for debounce
            await act(async () => {
                await vi.advanceTimersByTimeAsync(350);
            });

            // VERIFY: No prediction request made
            expect(mockPredictText).not.toHaveBeenCalled();

            // VERIFY: No ghost text
            expect(screen.queryByTestId('quick-chat-ghost-text')).not.toBeInTheDocument();
        });

        it('should not request prediction when model is not ready', async () => {
            // Enabled but downloading (not ready)
            mockGetTextPredictionStatus.mockResolvedValue({
                enabled: true,
                gpuEnabled: false,
                status: 'downloading',
                downloadProgress: 50,
            });

            render(<QuickChatApp />);

            await act(async () => {
                await vi.advanceTimersByTimeAsync(10);
            });

            const input = screen.getByTestId('quick-chat-input');

            // Type something
            await act(async () => {
                fireEvent.change(input, { target: { value: 'Hello' } });
            });

            // Wait for debounce
            await act(async () => {
                await vi.advanceTimersByTimeAsync(350);
            });

            // VERIFY: No prediction request made
            expect(mockPredictText).not.toHaveBeenCalled();
        });

        it('should not request prediction for empty input', async () => {
            mockPredictText.mockResolvedValue(' prediction');

            render(<QuickChatApp />);

            await act(async () => {
                await vi.advanceTimersByTimeAsync(10);
            });

            const input = screen.getByTestId('quick-chat-input');

            // Type whitespace only
            await act(async () => {
                fireEvent.change(input, { target: { value: '   ' } });
            });

            // Wait for debounce
            await act(async () => {
                await vi.advanceTimersByTimeAsync(350);
            });

            // VERIFY: No prediction request for empty/whitespace input
            expect(mockPredictText).not.toHaveBeenCalled();
        });

        it('should stop showing prediction when feature is disabled mid-session', async () => {
            const mockPrediction = ' world!';
            mockPredictText.mockResolvedValue(mockPrediction);

            render(<QuickChatApp />);

            await act(async () => {
                await vi.advanceTimersByTimeAsync(10);
            });

            const input = screen.getByTestId('quick-chat-input');

            // Type and get prediction
            await act(async () => {
                fireEvent.change(input, { target: { value: 'Hello' } });
            });
            await act(async () => {
                await vi.advanceTimersByTimeAsync(350);
            });

            // Ghost text should be shown
            expect(screen.getByTestId('quick-chat-ghost-text')).toBeInTheDocument();

            // Disable prediction via status change
            await act(async () => {
                if (statusChangedCallback) {
                    statusChangedCallback({
                        enabled: false,
                        gpuEnabled: false,
                        status: 'not-downloaded',
                    });
                }
            });

            // Type more - should not make new prediction request
            mockPredictText.mockClear();
            await act(async () => {
                fireEvent.change(input, { target: { value: 'Hello there' } });
            });
            await act(async () => {
                await vi.advanceTimersByTimeAsync(350);
            });

            // No new prediction request
            expect(mockPredictText).not.toHaveBeenCalled();
        });
    });
});
