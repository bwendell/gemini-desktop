/**
 * Coordinated tests for TextPredictionSettings component.
 * Tests the coordination between the UI component and IPC handlers.
 *
 * Task 8.1: Enable toggle → triggers model download
 *
 * @module text-prediction-settings.coordinated.test
 */

import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { TextPredictionSettings } from '../../src/renderer/components/options/TextPredictionSettings';
import type { TextPredictionSettings as TextPredictionSettingsType } from '../../src/shared/types/text-prediction';
import { setupMockElectronAPI } from '../helpers/mocks';

// Mock platform utils
vi.mock('../../src/renderer/utils/platform', () => ({
  isDevMode: vi.fn().mockReturnValue(false),
  getIsDev: vi.fn().mockReturnValue(false),
}));

// Mock the renderer logger to avoid console noise
vi.mock('../../src/renderer/utils', () => ({
  createRendererLogger: () => ({
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

describe('TextPredictionSettings Coordination', () => {
  // Mock electronAPI methods
  let mockGetTextPredictionStatus: ReturnType<typeof vi.fn>;
  let mockSetTextPredictionEnabled: ReturnType<typeof vi.fn>;
  let mockSetTextPredictionGpuEnabled: ReturnType<typeof vi.fn>;
  let mockOnTextPredictionStatusChanged: ReturnType<typeof vi.fn>;
  let mockOnTextPredictionDownloadProgress: ReturnType<typeof vi.fn>;

  // Callback references for simulating events from main process
  let statusChangedCallback: ((settings: TextPredictionSettingsType) => void) | null = null;
  let downloadProgressCallback: ((progress: number) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset callback references
    statusChangedCallback = null;
    downloadProgressCallback = null;

    // Create mock functions
    mockGetTextPredictionStatus = vi.fn();
    mockSetTextPredictionEnabled = vi.fn();
    mockSetTextPredictionGpuEnabled = vi.fn();
    mockOnTextPredictionStatusChanged = vi.fn();
    mockOnTextPredictionDownloadProgress = vi.fn();

    // Default implementation - model not downloaded
    mockGetTextPredictionStatus.mockResolvedValue({
      enabled: false,
      gpuEnabled: false,
      status: 'not-downloaded',
    });
    mockSetTextPredictionEnabled.mockResolvedValue(undefined);
    mockSetTextPredictionGpuEnabled.mockResolvedValue(undefined);

    // Capture the status changed callback
    mockOnTextPredictionStatusChanged.mockImplementation(
      (cb: (settings: TextPredictionSettingsType) => void) => {
        statusChangedCallback = cb;
        return () => {
          statusChangedCallback = null;
        };
      }
    );

    // Capture the download progress callback
    mockOnTextPredictionDownloadProgress.mockImplementation((cb: (progress: number) => void) => {
      downloadProgressCallback = cb;
      return () => {
        downloadProgressCallback = null;
      };
    });

    // Use shared factory with test-specific overrides
    setupMockElectronAPI({
      getTextPredictionStatus: mockGetTextPredictionStatus,
      setTextPredictionEnabled: mockSetTextPredictionEnabled,
      setTextPredictionGpuEnabled: mockSetTextPredictionGpuEnabled,
      onTextPredictionStatusChanged: mockOnTextPredictionStatusChanged,
      onTextPredictionDownloadProgress: mockOnTextPredictionDownloadProgress,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Task 8.1: Coordinated test - Enable toggle → triggers model download
   *
   * Verifies that when the user clicks the enable toggle to turn ON text prediction,
   * the setTextPredictionEnabled IPC is called with `true`, which signals the main
   * process LlmManager to initiate the model download.
   */
  describe('8.1 - Enable toggle triggers model download', () => {
    it('should call setTextPredictionEnabled(true) when toggle is clicked from OFF to ON', async () => {
      // SETUP: Render component with prediction disabled
      render(<TextPredictionSettings />);

      // Wait for initial state to load
      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-settings')).toBeInTheDocument();
      });

      // Find the enable toggle switch button and click it
      const toggleButton = screen.getByTestId('text-prediction-enable-toggle-switch');

      // EXECUTE: Click the toggle to enable
      await act(async () => {
        fireEvent.click(toggleButton);
      });

      // VERIFY: setTextPredictionEnabled was called with true
      await waitFor(() => {
        expect(mockSetTextPredictionEnabled).toHaveBeenCalledWith(true);
      });
    });

    it('should trigger download when enabling with model not downloaded', async () => {
      // Track IPC call sequence to verify the flow
      const ipcCallOrder: string[] = [];

      mockSetTextPredictionEnabled.mockImplementation(async (enabled: boolean) => {
        ipcCallOrder.push(`setEnabled:${enabled}`);
        // Simulate main process response: status changes to downloading
        if (enabled && statusChangedCallback) {
          statusChangedCallback({
            enabled: true,
            gpuEnabled: false,
            status: 'downloading',
            downloadProgress: 0,
          });
        }
      });

      // SETUP: Render component with model not downloaded
      render(<TextPredictionSettings />);

      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-settings')).toBeInTheDocument();
      });

      // EXECUTE: Click enable toggle
      const toggleButton = screen.getByTestId('text-prediction-enable-toggle-switch');

      await act(async () => {
        fireEvent.click(toggleButton);
      });

      // VERIFY: IPC was called
      expect(ipcCallOrder).toContain('setEnabled:true');

      // VERIFY: Status changed to downloading (simulating LlmManager.downloadModel being called)
      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-status')).toBeInTheDocument();
        expect(screen.getByTestId('text-prediction-progress')).toBeInTheDocument();
      });
    });

    it('should show initial status as not-downloaded before enabling', async () => {
      // Enable with model not downloaded, but start enabled to see status
      mockGetTextPredictionStatus.mockResolvedValue({
        enabled: true,
        gpuEnabled: false,
        status: 'not-downloaded',
      });

      render(<TextPredictionSettings />);

      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-status-text')).toHaveTextContent(
          'Not downloaded'
        );
      });
    });

    it('should transition status from not-downloaded → downloading when enabled', async () => {
      // SETUP: Start with disabled state
      render(<TextPredictionSettings />);

      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-settings')).toBeInTheDocument();
      });

      // Enable toggle
      const toggleButton = screen.getByTestId('text-prediction-enable-toggle-switch');

      // Simulate main process triggering status change after enable
      mockSetTextPredictionEnabled.mockImplementation(async () => {
        // First, the feature is enabled
        if (statusChangedCallback) {
          statusChangedCallback({
            enabled: true,
            gpuEnabled: false,
            status: 'not-downloaded',
          });
        }

        // Then download starts
        await new Promise((resolve) => setTimeout(resolve, 10));
        if (statusChangedCallback) {
          statusChangedCallback({
            enabled: true,
            gpuEnabled: false,
            status: 'downloading',
            downloadProgress: 0,
          });
        }
      });

      // EXECUTE: Click toggle
      await act(async () => {
        fireEvent.click(toggleButton);
      });

      // VERIFY: Status transitions to downloading
      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-status-text')).toHaveTextContent('Downloading');
      });
    });

    it('should call setTextPredictionEnabled only once per toggle click', async () => {
      render(<TextPredictionSettings />);

      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-settings')).toBeInTheDocument();
      });

      const toggleButton = screen.getByTestId('text-prediction-enable-toggle-switch');

      // Click toggle once
      await act(async () => {
        fireEvent.click(toggleButton);
      });

      // Verify called exactly once
      expect(mockSetTextPredictionEnabled).toHaveBeenCalledTimes(1);
      expect(mockSetTextPredictionEnabled).toHaveBeenCalledWith(true);
    });

    it('should revert toggle state on IPC error', async () => {
      mockSetTextPredictionEnabled.mockRejectedValue(new Error('IPC failed'));

      render(<TextPredictionSettings />);

      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-settings')).toBeInTheDocument();
      });

      const toggleButton = screen.getByTestId(
        'text-prediction-enable-toggle-switch'
      ) as HTMLButtonElement;

      // Initial state should be aria-checked="false"
      expect(toggleButton.getAttribute('aria-checked')).toBe('false');

      // Click toggle to enable
      await act(async () => {
        fireEvent.click(toggleButton);
      });

      // Wait for error handling and revert
      await waitFor(() => {
        expect(toggleButton.getAttribute('aria-checked')).toBe('false');
      });
    });
  });

  /**
   * Task 8.2: Coordinated test - Download progress → UI updates
   *
   * Verifies that when download progress events are emitted from the main process,
   * the TextPredictionSettings component updates the progress bar to reflect
   * the emitted percentages.
   */
  describe('8.2 - Download progress updates UI', () => {
    it('should update progress bar when download progress event is received', async () => {
      // SETUP: Start with downloading status
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

      // EXECUTE: Emit progress event from main process
      await act(async () => {
        if (downloadProgressCallback) {
          downloadProgressCallback(50);
        }
      });

      // VERIFY: Progress bar reflects the emitted percentage
      await waitFor(() => {
        expect(screen.getByText(/50%/)).toBeInTheDocument();
      });
    });

    it('should update progress bar as percentage increases from 0 to 100', async () => {
      // SETUP: Start with downloading status at 0%
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

      // EXECUTE: Emit multiple progress updates
      const progressValues = [25, 50, 75, 100];
      for (const progress of progressValues) {
        await act(async () => {
          if (downloadProgressCallback) {
            downloadProgressCallback(progress);
          }
        });

        // VERIFY: Progress bar shows the current percentage
        await waitFor(() => {
          expect(screen.getByText(new RegExp(`${progress}%`))).toBeInTheDocument();
        });
      }
    });

    it('should display progress bar fill width matching percentage', async () => {
      // SETUP: Start with downloading status
      mockGetTextPredictionStatus.mockResolvedValue({
        enabled: true,
        gpuEnabled: false,
        status: 'downloading',
        downloadProgress: 0,
      });

      render(<TextPredictionSettings />);

      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-progress-fill')).toBeInTheDocument();
      });

      // EXECUTE: Emit progress event
      await act(async () => {
        if (downloadProgressCallback) {
          downloadProgressCallback(75);
        }
      });

      // VERIFY: Progress bar fill has correct width style
      await waitFor(() => {
        const progressFill = screen.getByTestId('text-prediction-progress-fill');
        expect(progressFill).toHaveStyle({ width: '75%' });
      });
    });

    it('should show "Downloading model..." text during download', async () => {
      // SETUP: Start with downloading status
      mockGetTextPredictionStatus.mockResolvedValue({
        enabled: true,
        gpuEnabled: false,
        status: 'downloading',
        downloadProgress: 42,
      });

      render(<TextPredictionSettings />);

      // VERIFY: Download text is shown with percentage
      await waitFor(() => {
        expect(screen.getByText(/Downloading model\.\.\./)).toBeInTheDocument();
        expect(screen.getByText(/42%/)).toBeInTheDocument();
      });
    });

    it('should hide progress bar when status changes from downloading to ready', async () => {
      // SETUP: Start with downloading status
      mockGetTextPredictionStatus.mockResolvedValue({
        enabled: true,
        gpuEnabled: false,
        status: 'downloading',
        downloadProgress: 100,
      });

      render(<TextPredictionSettings />);

      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-progress')).toBeInTheDocument();
      });

      // EXECUTE: Emit status change to ready
      await act(async () => {
        if (statusChangedCallback) {
          statusChangedCallback({
            enabled: true,
            gpuEnabled: false,
            status: 'ready',
            downloadProgress: 100,
          });
        }
      });

      // VERIFY: Progress bar is hidden
      await waitFor(() => {
        expect(screen.queryByTestId('text-prediction-progress')).not.toBeInTheDocument();
      });
    });
  });

  /**
   * Task 8.3: Coordinated test - Status changes → component re-renders
   *
   * Verifies that when status change events are emitted from the main process,
   * the TextPredictionSettings component re-renders with the appropriate
   * status indicator text for each state.
   */
  describe('8.3 - Status changes trigger component re-renders', () => {
    it('should display "Downloading..." when status changes to downloading', async () => {
      // SETUP: Start with enabled and not-downloaded status
      mockGetTextPredictionStatus.mockResolvedValue({
        enabled: true,
        gpuEnabled: false,
        status: 'not-downloaded',
      });

      render(<TextPredictionSettings />);

      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-status-text')).toHaveTextContent(
          'Not downloaded'
        );
      });

      // EXECUTE: Emit status change to downloading
      await act(async () => {
        if (statusChangedCallback) {
          statusChangedCallback({
            enabled: true,
            gpuEnabled: false,
            status: 'downloading',
            downloadProgress: 0,
          });
        }
      });

      // VERIFY: Status indicator shows "Downloading..."
      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-status-text')).toHaveTextContent('Downloading');
      });
    });

    it('should display "Initializing..." when status changes to initializing', async () => {
      // SETUP: Start with downloading status
      mockGetTextPredictionStatus.mockResolvedValue({
        enabled: true,
        gpuEnabled: false,
        status: 'downloading',
        downloadProgress: 100,
      });

      render(<TextPredictionSettings />);

      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-status-text')).toHaveTextContent('Downloading');
      });

      // EXECUTE: Emit status change to initializing
      await act(async () => {
        if (statusChangedCallback) {
          statusChangedCallback({
            enabled: true,
            gpuEnabled: false,
            status: 'initializing',
          });
        }
      });

      // VERIFY: Status indicator shows "Initializing..."
      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-status-text')).toHaveTextContent('Initializing');
      });
    });

    it('should display "Ready" when status changes to ready', async () => {
      // SETUP: Start with initializing status
      mockGetTextPredictionStatus.mockResolvedValue({
        enabled: true,
        gpuEnabled: false,
        status: 'initializing',
      });

      render(<TextPredictionSettings />);

      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-status-text')).toHaveTextContent('Initializing');
      });

      // EXECUTE: Emit status change to ready
      await act(async () => {
        if (statusChangedCallback) {
          statusChangedCallback({
            enabled: true,
            gpuEnabled: false,
            status: 'ready',
          });
        }
      });

      // VERIFY: Status indicator shows "Ready"
      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-status-text')).toHaveTextContent('Ready');
      });
    });

    it('should transition through full status sequence: downloading → initializing → ready', async () => {
      // SETUP: Start with enabled and not-downloaded status
      mockGetTextPredictionStatus.mockResolvedValue({
        enabled: true,
        gpuEnabled: false,
        status: 'not-downloaded',
      });

      render(<TextPredictionSettings />);

      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-status-text')).toHaveTextContent(
          'Not downloaded'
        );
      });

      // STEP 1: downloading
      await act(async () => {
        if (statusChangedCallback) {
          statusChangedCallback({
            enabled: true,
            gpuEnabled: false,
            status: 'downloading',
            downloadProgress: 50,
          });
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-status-text')).toHaveTextContent('Downloading');
      });

      // STEP 2: initializing
      await act(async () => {
        if (statusChangedCallback) {
          statusChangedCallback({
            enabled: true,
            gpuEnabled: false,
            status: 'initializing',
          });
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-status-text')).toHaveTextContent('Initializing');
      });

      // STEP 3: ready
      await act(async () => {
        if (statusChangedCallback) {
          statusChangedCallback({
            enabled: true,
            gpuEnabled: false,
            status: 'ready',
          });
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-status-text')).toHaveTextContent('Ready');
      });
    });

    it('should display error status with error message', async () => {
      // SETUP: Start with enabled state
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

      // EXECUTE: Emit status change to error
      await act(async () => {
        if (statusChangedCallback) {
          statusChangedCallback({
            enabled: true,
            gpuEnabled: false,
            status: 'error',
            errorMessage: 'Network connection failed',
          });
        }
      });

      // VERIFY: Status indicator shows error message
      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-status-text')).toHaveTextContent(
          /Error:.*Network connection failed/
        );
      });
    });

    it('should show retry button when status is error', async () => {
      // SETUP: Start with error status
      mockGetTextPredictionStatus.mockResolvedValue({
        enabled: true,
        gpuEnabled: false,
        status: 'error',
        errorMessage: 'Download failed',
      });

      render(<TextPredictionSettings />);

      // VERIFY: Retry button is shown
      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-retry-button')).toBeInTheDocument();
      });
    });
  });

  /**
   * Task 8.4: Coordinated test - GPU toggle → setting persisted
   *
   * Verifies that when the user toggles GPU acceleration, the setting is
   * correctly sent via IPC and the component updates to reflect the change.
   */
  describe('8.4 - GPU toggle setting persisted', () => {
    it('should call setTextPredictionGpuEnabled(true) when GPU toggle is turned ON', async () => {
      // SETUP: Start with text prediction enabled but GPU disabled
      mockGetTextPredictionStatus.mockResolvedValue({
        enabled: true,
        gpuEnabled: false,
        status: 'ready',
      });

      render(<TextPredictionSettings />);

      // Wait for GPU toggle to appear (only visible when prediction enabled)
      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-gpu-toggle-switch')).toBeInTheDocument();
      });

      // EXECUTE: Click GPU toggle to enable
      const gpuToggle = screen.getByTestId('text-prediction-gpu-toggle-switch');
      await act(async () => {
        fireEvent.click(gpuToggle);
      });

      // VERIFY: setTextPredictionGpuEnabled was called with true
      await waitFor(() => {
        expect(mockSetTextPredictionGpuEnabled).toHaveBeenCalledWith(true);
      });
    });

    it('should call setTextPredictionGpuEnabled(false) when GPU toggle is turned OFF', async () => {
      // SETUP: Start with text prediction enabled and GPU enabled
      mockGetTextPredictionStatus.mockResolvedValue({
        enabled: true,
        gpuEnabled: true,
        status: 'ready',
      });

      render(<TextPredictionSettings />);

      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-gpu-toggle-switch')).toBeInTheDocument();
      });

      // EXECUTE: Click GPU toggle to disable
      const gpuToggle = screen.getByTestId('text-prediction-gpu-toggle-switch');
      await act(async () => {
        fireEvent.click(gpuToggle);
      });

      // VERIFY: setTextPredictionGpuEnabled was called with false
      await waitFor(() => {
        expect(mockSetTextPredictionGpuEnabled).toHaveBeenCalledWith(false);
      });
    });

    it('should update GPU toggle state when status change event is received', async () => {
      // SETUP: Start with GPU disabled
      mockGetTextPredictionStatus.mockResolvedValue({
        enabled: true,
        gpuEnabled: false,
        status: 'ready',
      });

      render(<TextPredictionSettings />);

      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-gpu-toggle-switch')).toBeInTheDocument();
      });

      const gpuToggle = screen.getByTestId(
        'text-prediction-gpu-toggle-switch'
      ) as HTMLButtonElement;
      expect(gpuToggle.getAttribute('aria-checked')).toBe('false');

      // EXECUTE: Emit status change with GPU enabled
      await act(async () => {
        if (statusChangedCallback) {
          statusChangedCallback({
            enabled: true,
            gpuEnabled: true,
            status: 'ready',
          });
        }
      });

      // VERIFY: GPU toggle reflects the updated state
      await waitFor(() => {
        expect(gpuToggle.getAttribute('aria-checked')).toBe('true');
      });
    });

    it('should round-trip GPU setting through IPC correctly', async () => {
      // Track the IPC call and simulate main process updating the state
      mockSetTextPredictionGpuEnabled.mockImplementation(async (enabled: boolean) => {
        // Simulate main process response: status changes with new GPU state
        if (statusChangedCallback) {
          statusChangedCallback({
            enabled: true,
            gpuEnabled: enabled, // Reflect the change
            status: 'ready',
          });
        }
      });

      // SETUP: Start with GPU disabled
      mockGetTextPredictionStatus.mockResolvedValue({
        enabled: true,
        gpuEnabled: false,
        status: 'ready',
      });

      render(<TextPredictionSettings />);

      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-gpu-toggle-switch')).toBeInTheDocument();
      });

      const gpuToggle = screen.getByTestId(
        'text-prediction-gpu-toggle-switch'
      ) as HTMLButtonElement;

      // Initial state: GPU off
      expect(gpuToggle.getAttribute('aria-checked')).toBe('false');

      // EXECUTE: Toggle GPU on
      await act(async () => {
        fireEvent.click(gpuToggle);
      });

      // VERIFY: IPC called and state updated from main process response
      await waitFor(() => {
        expect(mockSetTextPredictionGpuEnabled).toHaveBeenCalledWith(true);
        expect(gpuToggle.getAttribute('aria-checked')).toBe('true');
      });
    });

    it('should revert GPU toggle state on IPC error', async () => {
      mockSetTextPredictionGpuEnabled.mockRejectedValue(new Error('IPC failed'));

      // SETUP: Start with GPU disabled
      mockGetTextPredictionStatus.mockResolvedValue({
        enabled: true,
        gpuEnabled: false,
        status: 'ready',
      });

      render(<TextPredictionSettings />);

      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-gpu-toggle-switch')).toBeInTheDocument();
      });

      const gpuToggle = screen.getByTestId(
        'text-prediction-gpu-toggle-switch'
      ) as HTMLButtonElement;

      // Initial state: GPU off
      expect(gpuToggle.getAttribute('aria-checked')).toBe('false');

      // EXECUTE: Try to toggle GPU on
      await act(async () => {
        fireEvent.click(gpuToggle);
      });

      // VERIFY: Toggle reverted to off after error
      await waitFor(() => {
        expect(gpuToggle.getAttribute('aria-checked')).toBe('false');
      });
    });

    it('should hide GPU toggle when text prediction is disabled', async () => {
      // SETUP: Start with text prediction disabled
      mockGetTextPredictionStatus.mockResolvedValue({
        enabled: false,
        gpuEnabled: false,
        status: 'not-downloaded',
      });

      render(<TextPredictionSettings />);

      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-settings')).toBeInTheDocument();
      });

      // VERIFY: GPU toggle is not visible when prediction disabled
      expect(screen.queryByTestId('text-prediction-gpu-toggle-switch')).not.toBeInTheDocument();
    });
  });

  /**
   * Task 8.9: Coordinated test - Error status → retry button works
   *
   * Verifies that when an error occurs, the retry button re-initiates download.
   */
  describe('8.9 - Error status retry button works', () => {
    it('should call setTextPredictionEnabled(true) when retry button is clicked', async () => {
      // SETUP: Start with error status
      mockGetTextPredictionStatus.mockResolvedValue({
        enabled: true,
        gpuEnabled: false,
        status: 'error',
        errorMessage: 'Download failed',
      });

      render(<TextPredictionSettings />);

      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-retry-button')).toBeInTheDocument();
      });

      // EXECUTE: Click retry button
      const retryButton = screen.getByTestId('text-prediction-retry-button');
      await act(async () => {
        fireEvent.click(retryButton);
      });

      // VERIFY: setTextPredictionEnabled was called to re-initiate download
      await waitFor(() => {
        expect(mockSetTextPredictionEnabled).toHaveBeenCalledWith(true);
      });
    });

    it('should trigger status change to downloading after retry', async () => {
      // Simulate retry triggering download
      mockSetTextPredictionEnabled.mockImplementation(async () => {
        if (statusChangedCallback) {
          statusChangedCallback({
            enabled: true,
            gpuEnabled: false,
            status: 'downloading',
            downloadProgress: 0,
          });
        }
      });

      // SETUP: Start with error status
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

      // EXECUTE: Click retry button
      const retryButton = screen.getByTestId('text-prediction-retry-button');
      await act(async () => {
        fireEvent.click(retryButton);
      });

      // VERIFY: Status changed to downloading
      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-status-text')).toHaveTextContent('Downloading');
      });
    });

    it('should show error message before retry', async () => {
      const errorMessage = 'Connection timed out';
      mockGetTextPredictionStatus.mockResolvedValue({
        enabled: true,
        gpuEnabled: false,
        status: 'error',
        errorMessage,
      });

      render(<TextPredictionSettings />);

      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-status-text')).toHaveTextContent(
          new RegExp(errorMessage)
        );
      });
    });
  });

  /**
   * Task 8.10: Coordinated test - IPC getTextPredictionStatus returns full state
   *
   * Verifies that the component correctly receives all state fields from IPC.
   */
  describe('8.10 - IPC getTextPredictionStatus returns full state', () => {
    it('should display all state fields from getTextPredictionStatus', async () => {
      // SETUP: Return complete state from IPC
      mockGetTextPredictionStatus.mockResolvedValue({
        enabled: true,
        gpuEnabled: true,
        status: 'ready',
        downloadProgress: 100,
      });

      render(<TextPredictionSettings />);

      // VERIFY: Component reflects all state fields
      await waitFor(() => {
        // enabled: true - enable toggle should be on
        const enableToggle = screen.getByTestId(
          'text-prediction-enable-toggle-switch'
        ) as HTMLButtonElement;
        expect(enableToggle.getAttribute('aria-checked')).toBe('true');

        // gpuEnabled: true - GPU toggle should be on
        const gpuToggle = screen.getByTestId(
          'text-prediction-gpu-toggle-switch'
        ) as HTMLButtonElement;
        expect(gpuToggle.getAttribute('aria-checked')).toBe('true');

        // status: ready - status text should show Ready
        expect(screen.getByTestId('text-prediction-status-text')).toHaveTextContent('Ready');
      });
    });

    it('should display error message when status includes errorMessage', async () => {
      const errorMessage = 'GPU not available';
      mockGetTextPredictionStatus.mockResolvedValue({
        enabled: true,
        gpuEnabled: false,
        status: 'error',
        errorMessage,
      });

      render(<TextPredictionSettings />);

      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-status-text')).toHaveTextContent(
          /Error:.*GPU not available/
        );
      });
    });

    it('should display download progress from status', async () => {
      mockGetTextPredictionStatus.mockResolvedValue({
        enabled: true,
        gpuEnabled: false,
        status: 'downloading',
        downloadProgress: 67,
      });

      render(<TextPredictionSettings />);

      await waitFor(() => {
        expect(screen.getByText(/67%/)).toBeInTheDocument();
      });
    });

    it('should update all fields when status changed event is received', async () => {
      // SETUP: Start with minimal state
      mockGetTextPredictionStatus.mockResolvedValue({
        enabled: false,
        gpuEnabled: false,
        status: 'not-downloaded',
      });

      render(<TextPredictionSettings />);

      await waitFor(() => {
        expect(screen.getByTestId('text-prediction-settings')).toBeInTheDocument();
      });

      // EXECUTE: Emit full status with all fields
      await act(async () => {
        if (statusChangedCallback) {
          statusChangedCallback({
            enabled: true,
            gpuEnabled: true,
            status: 'ready',
            downloadProgress: 100,
          });
        }
      });

      // VERIFY: All fields are updated
      const enableToggle = screen.getByTestId(
        'text-prediction-enable-toggle-switch'
      ) as HTMLButtonElement;
      expect(enableToggle.getAttribute('aria-checked')).toBe('true');

      const gpuToggle = screen.getByTestId(
        'text-prediction-gpu-toggle-switch'
      ) as HTMLButtonElement;
      expect(gpuToggle.getAttribute('aria-checked')).toBe('true');

      expect(screen.getByTestId('text-prediction-status-text')).toHaveTextContent('Ready');
    });
  });
});
