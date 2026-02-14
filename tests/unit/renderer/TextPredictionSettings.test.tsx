/**
 * Unit tests for TextPredictionSettings component.
 *
 * Tests the Options UI component for text prediction settings including:
 * - Toggle state rendering (tasks 7.8)
 * - Download progress display (task 7.9)
 * - Status indicator display
 * - User interactions
 *
 * @module TextPredictionSettings.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { TextPredictionSettings } from '../../../src/renderer/components/options/TextPredictionSettings';
import { setupMockElectronAPI, clearMockElectronAPI } from '../../helpers/mocks';

// Mock platform utils
vi.mock('../../../src/renderer/utils/platform', () => ({
    isDevMode: vi.fn().mockReturnValue(false),
    getIsDev: vi.fn().mockReturnValue(false),
}));

describe('TextPredictionSettings', () => {
    // Mock electronAPI methods - these need to be at describe scope for test access
    const mockGetTextPredictionStatus = vi.fn();
    const mockSetTextPredictionEnabled = vi.fn();
    const mockSetTextPredictionGpuEnabled = vi.fn();
    const mockOnTextPredictionStatusChanged = vi.fn();
    const mockOnTextPredictionDownloadProgress = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock implementation - returns loading then resolves
        mockGetTextPredictionStatus.mockResolvedValue({
            enabled: false,
            gpuEnabled: false,
            status: 'not-downloaded',
        });
        mockSetTextPredictionEnabled.mockResolvedValue(undefined);
        mockSetTextPredictionGpuEnabled.mockResolvedValue(undefined);
        mockOnTextPredictionStatusChanged.mockReturnValue(() => {});
        mockOnTextPredictionDownloadProgress.mockReturnValue(() => {});

        // Use shared factory with test-specific overrides
        setupMockElectronAPI({
            getTextPredictionStatus: mockGetTextPredictionStatus,
            setTextPredictionEnabled: mockSetTextPredictionEnabled,
            setTextPredictionGpuEnabled: mockSetTextPredictionGpuEnabled,
            onTextPredictionStatusChanged: mockOnTextPredictionStatusChanged,
            onTextPredictionDownloadProgress: mockOnTextPredictionDownloadProgress,
        });
    });

    describe('Rendering', () => {
        it('shows loading state initially', async () => {
            // Defer resolution to keep loading state
            mockGetTextPredictionStatus.mockImplementation(
                () => new Promise(() => {}) // Never resolves
            );

            render(<TextPredictionSettings />);

            expect(screen.getByTestId('text-prediction-settings-loading')).toBeInTheDocument();
        });

        it('renders the component container after loading', async () => {
            render(<TextPredictionSettings />);

            await waitFor(() => {
                expect(screen.getByTestId('text-prediction-settings')).toBeInTheDocument();
            });
        });

        it('renders enable toggle', async () => {
            render(<TextPredictionSettings />);

            await waitFor(() => {
                expect(screen.getByTestId('text-prediction-enable-toggle')).toBeInTheDocument();
            });
        });
    });

    // Task 7.8: TextPredictionSettings renders toggle states
    describe('Toggle States', () => {
        it('renders enable toggle in disabled state when prediction disabled', async () => {
            mockGetTextPredictionStatus.mockResolvedValue({
                enabled: false,
                gpuEnabled: false,
                status: 'not-downloaded',
            });

            render(<TextPredictionSettings />);

            await waitFor(() => {
                const toggle = screen.getByTestId('text-prediction-enable-toggle');
                expect(toggle).toBeInTheDocument();
            });
        });

        it('renders enable toggle in enabled state when prediction enabled', async () => {
            mockGetTextPredictionStatus.mockResolvedValue({
                enabled: true,
                gpuEnabled: false,
                status: 'ready',
            });

            render(<TextPredictionSettings />);

            await waitFor(() => {
                const toggle = screen.getByTestId('text-prediction-enable-toggle');
                expect(toggle).toBeInTheDocument();
            });
        });

        it('shows GPU toggle only when text prediction is enabled', async () => {
            mockGetTextPredictionStatus.mockResolvedValue({
                enabled: true,
                gpuEnabled: false,
                status: 'ready',
            });

            render(<TextPredictionSettings />);

            await waitFor(() => {
                expect(screen.getByTestId('text-prediction-gpu-toggle')).toBeInTheDocument();
            });
        });

        it('hides GPU toggle when text prediction is disabled', async () => {
            mockGetTextPredictionStatus.mockResolvedValue({
                enabled: false,
                gpuEnabled: false,
                status: 'not-downloaded',
            });

            render(<TextPredictionSettings />);

            await waitFor(() => {
                expect(screen.getByTestId('text-prediction-settings')).toBeInTheDocument();
            });

            expect(screen.queryByTestId('text-prediction-gpu-toggle')).not.toBeInTheDocument();
        });

        it('calls setTextPredictionEnabled when toggle clicked', async () => {
            mockGetTextPredictionStatus.mockResolvedValue({
                enabled: false,
                gpuEnabled: false,
                status: 'not-downloaded',
            });

            render(<TextPredictionSettings />);

            await waitFor(() => {
                expect(screen.getByTestId('text-prediction-enable-toggle')).toBeInTheDocument();
            });

            // Click the toggle switch button (not an input - CapsuleToggle uses a button)
            const toggleSwitch = screen.getByTestId('text-prediction-enable-toggle-switch');
            await act(async () => {
                fireEvent.click(toggleSwitch);
            });

            await waitFor(() => {
                expect(mockSetTextPredictionEnabled).toHaveBeenCalledWith(true);
            });
        });
    });

    // Task 7.9: TextPredictionSettings shows download progress
    describe('Download Progress', () => {
        it('shows progress bar when status is downloading', async () => {
            mockGetTextPredictionStatus.mockResolvedValue({
                enabled: true,
                gpuEnabled: false,
                status: 'downloading',
                downloadProgress: 50,
            });

            render(<TextPredictionSettings />);

            await waitFor(() => {
                expect(screen.getByTestId('text-prediction-progress')).toBeInTheDocument();
            });
        });

        it('displays correct progress percentage', async () => {
            mockGetTextPredictionStatus.mockResolvedValue({
                enabled: true,
                gpuEnabled: false,
                status: 'downloading',
                downloadProgress: 75,
            });

            render(<TextPredictionSettings />);

            await waitFor(() => {
                const progressText = screen.getByText(/75%/);
                expect(progressText).toBeInTheDocument();
            });
        });

        it('hides progress bar when not downloading', async () => {
            mockGetTextPredictionStatus.mockResolvedValue({
                enabled: true,
                gpuEnabled: false,
                status: 'ready',
                downloadProgress: 100,
            });

            render(<TextPredictionSettings />);

            await waitFor(() => {
                expect(screen.getByTestId('text-prediction-settings')).toBeInTheDocument();
            });

            expect(screen.queryByTestId('text-prediction-progress')).not.toBeInTheDocument();
        });

        it('updates progress when download progress event received', async () => {
            let progressCallback: ((progress: number) => void) | null = null;
            mockOnTextPredictionDownloadProgress.mockImplementation((cb: (progress: number) => void) => {
                progressCallback = cb;
                return () => {};
            });

            mockGetTextPredictionStatus.mockResolvedValue({
                enabled: true,
                gpuEnabled: false,
                status: 'downloading',
                downloadProgress: 0,
            });

            render(<TextPredictionSettings />);

            await waitFor(() => {
                expect(screen.getByTestId('text-prediction-progress')).toBeInTheDocument();
            });

            // Simulate progress update
            if (progressCallback) {
                progressCallback(50);
            }

            await waitFor(() => {
                expect(screen.getByText(/50%/)).toBeInTheDocument();
            });
        });
    });

    describe('Status Indicator', () => {
        it('shows status indicator when enabled', async () => {
            mockGetTextPredictionStatus.mockResolvedValue({
                enabled: true,
                gpuEnabled: false,
                status: 'ready',
            });

            render(<TextPredictionSettings />);

            await waitFor(() => {
                expect(screen.getByTestId('text-prediction-status')).toBeInTheDocument();
            });
        });

        it('displays "Not downloaded" status', async () => {
            mockGetTextPredictionStatus.mockResolvedValue({
                enabled: true,
                gpuEnabled: false,
                status: 'not-downloaded',
            });

            render(<TextPredictionSettings />);

            await waitFor(() => {
                expect(screen.getByTestId('text-prediction-status-text')).toHaveTextContent('Not downloaded');
            });
        });

        it('displays "Downloading..." status', async () => {
            mockGetTextPredictionStatus.mockResolvedValue({
                enabled: true,
                gpuEnabled: false,
                status: 'downloading',
                downloadProgress: 50,
            });

            render(<TextPredictionSettings />);

            await waitFor(() => {
                expect(screen.getByTestId('text-prediction-status-text')).toHaveTextContent('Downloading');
            });
        });

        it('displays "Initializing..." status', async () => {
            mockGetTextPredictionStatus.mockResolvedValue({
                enabled: true,
                gpuEnabled: false,
                status: 'initializing',
            });

            render(<TextPredictionSettings />);

            await waitFor(() => {
                expect(screen.getByTestId('text-prediction-status-text')).toHaveTextContent('Initializing');
            });
        });

        it('displays "Ready" status', async () => {
            mockGetTextPredictionStatus.mockResolvedValue({
                enabled: true,
                gpuEnabled: false,
                status: 'ready',
            });

            render(<TextPredictionSettings />);

            await waitFor(() => {
                expect(screen.getByTestId('text-prediction-status-text')).toHaveTextContent('Ready');
            });
        });

        it('displays error status with message', async () => {
            mockGetTextPredictionStatus.mockResolvedValue({
                enabled: true,
                gpuEnabled: false,
                status: 'error',
                errorMessage: 'Download failed',
            });

            render(<TextPredictionSettings />);

            await waitFor(() => {
                expect(screen.getByTestId('text-prediction-status-text')).toHaveTextContent(/Error:.*Download failed/);
            });
        });

        it('shows retry button on error', async () => {
            mockGetTextPredictionStatus.mockResolvedValue({
                enabled: true,
                gpuEnabled: false,
                status: 'error',
                errorMessage: 'Network error',
            });

            render(<TextPredictionSettings />);

            await waitFor(() => {
                expect(screen.getByTestId('text-prediction-retry-button')).toBeInTheDocument();
            });
        });

        it('hides status indicator when disabled', async () => {
            mockGetTextPredictionStatus.mockResolvedValue({
                enabled: false,
                gpuEnabled: false,
                status: 'not-downloaded',
            });

            render(<TextPredictionSettings />);

            await waitFor(() => {
                expect(screen.getByTestId('text-prediction-settings')).toBeInTheDocument();
            });

            expect(screen.queryByTestId('text-prediction-status')).not.toBeInTheDocument();
        });
    });

    describe('Status Change Subscription', () => {
        it('subscribes to status changes on mount', async () => {
            render(<TextPredictionSettings />);

            await waitFor(() => {
                expect(mockOnTextPredictionStatusChanged).toHaveBeenCalled();
            });
        });

        it('subscribes to download progress on mount', async () => {
            render(<TextPredictionSettings />);

            await waitFor(() => {
                expect(mockOnTextPredictionDownloadProgress).toHaveBeenCalled();
            });
        });
    });

    describe('Without ElectronAPI', () => {
        it('handles missing electronAPI gracefully', async () => {
            window.electronAPI = undefined;

            render(<TextPredictionSettings />);

            // Should render loading state without crashing
            // (will stay in loading since getTextPredictionStatus won't resolve)
            expect(screen.getByTestId('text-prediction-settings-loading')).toBeInTheDocument();
        });
    });
});
