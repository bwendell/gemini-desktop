/**
 * TextPredictionSettings Component
 *
 * Settings controls for local LLM text prediction feature.
 * Displays enable toggle, GPU toggle, download progress, and status indicator.
 *
 * @module TextPredictionSettings
 */

import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { CapsuleToggle } from '../common/CapsuleToggle';
import { isDevMode } from '../../utils/platform';
import { createRendererLogger } from '../../utils';
import type { TextPredictionSettings as TextPredictionSettingsType } from '../../../shared/types/text-prediction';
import './TextPredictionSettings.css';

const logger = createRendererLogger('[TextPredictionSettings]');

/**
 * TextPredictionSettings component.
 * Renders controls for enabling/disabling text prediction and GPU acceleration.
 */
export const TextPredictionSettings = memo(function TextPredictionSettings() {
  // Settings state from IPC
  const [settings, setSettings] = useState<TextPredictionSettingsType>({
    enabled: false,
    gpuEnabled: false,
    status: 'not-downloaded',
  });
  const [loading, setLoading] = useState(true);

  // Debug mode state
  const [debugProgress, setDebugProgress] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load initial state from main process
  useEffect(() => {
    const loadState = async () => {
      logger.log('Loading initial state from main process');
      try {
        const status = await window.electronAPI?.getTextPredictionStatus();
        if (status) {
          logger.log('Initial state loaded:', status);
          setSettings(status);
        } else {
          logger.log('No status returned from getTextPredictionStatus');
        }
      } catch (error) {
        logger.error('Failed to load text prediction state:', error);
      } finally {
        setLoading(false);
      }
    };

    loadState();

    // Subscribe to status changes
    const unsubscribeStatus = window.electronAPI?.onTextPredictionStatusChanged((newSettings) => {
      logger.log('Status changed event received:', newSettings);
      setSettings(newSettings);
    });

    // Subscribe to download progress
    const unsubscribeProgress = window.electronAPI?.onTextPredictionDownloadProgress((progress) => {
      logger.log('Download progress:', progress + '%');
      setSettings((prev) => ({
        ...prev,
        downloadProgress: progress,
      }));
    });

    return () => {
      unsubscribeStatus?.();
      unsubscribeProgress?.();
    };
  }, []);

  // Handle enable toggle change
  const handleEnableChange = useCallback(async (newEnabled: boolean) => {
    logger.log('Enable toggle changed:', newEnabled);
    setSettings((prev) => ({ ...prev, enabled: newEnabled }));
    try {
      logger.log('Calling setTextPredictionEnabled IPC...');
      await window.electronAPI?.setTextPredictionEnabled(newEnabled);
      logger.log('setTextPredictionEnabled IPC completed');
    } catch (error) {
      logger.error('Failed to set text prediction enabled:', error);
      // Revert on error
      setSettings((prev) => ({ ...prev, enabled: !newEnabled }));
    }
  }, []);

  // Handle GPU toggle change
  const handleGpuChange = useCallback(async (newEnabled: boolean) => {
    logger.log('GPU toggle changed:', newEnabled);
    setSettings((prev) => ({ ...prev, gpuEnabled: newEnabled }));
    try {
      logger.log('Calling setTextPredictionGpuEnabled IPC...');
      await window.electronAPI?.setTextPredictionGpuEnabled(newEnabled);
      logger.log('setTextPredictionGpuEnabled IPC completed');
    } catch (error) {
      logger.error('Failed to set GPU enabled:', error);
      // Revert on error
      setSettings((prev) => ({ ...prev, gpuEnabled: !newEnabled }));
    }
  }, []);

  // Debug: Simulate download progress animation
  const handleSimulateDownload = useCallback(() => {
    if (isSimulating) return;

    setIsSimulating(true);
    setDebugProgress(0);
    setSettings((prev) => ({ ...prev, status: 'downloading', downloadProgress: 0 }));

    let progress = 0;
    simulationRef.current = setInterval(() => {
      progress += 2;
      setDebugProgress(progress);
      setSettings((prev) => ({ ...prev, downloadProgress: progress }));

      if (progress >= 100) {
        if (simulationRef.current) {
          clearInterval(simulationRef.current);
          simulationRef.current = null;
        }
        setIsSimulating(false);
        setSettings((prev) => ({ ...prev, status: 'ready', downloadProgress: 100 }));
      }
    }, 60); // ~3 seconds total for 0-100%
  }, [isSimulating]);

  // Cleanup simulation on unmount
  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        clearInterval(simulationRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div
        className="text-prediction-settings loading"
        data-testid="text-prediction-settings-loading"
      >
        Loading...
      </div>
    );
  }

  return (
    <div className="text-prediction-settings" data-testid="text-prediction-settings">
      {/* Enable toggle */}
      <CapsuleToggle
        checked={settings.enabled}
        onChange={handleEnableChange}
        label="Enable Text Prediction"
        description="Use local AI to suggest text completions in Quick Chat"
        testId="text-prediction-enable-toggle"
      />

      {/* GPU toggle - only visible when enabled */}
      {settings.enabled && (
        <CapsuleToggle
          checked={settings.gpuEnabled}
          onChange={handleGpuChange}
          label="Use GPU Acceleration"
          description="Enable for faster predictions (requires GPU)"
          testId="text-prediction-gpu-toggle"
        />
      )}

      {/* Download progress bar - only visible when downloading */}
      {settings.status === 'downloading' && (
        <div className="text-prediction-progress" data-testid="text-prediction-progress">
          <div className="text-prediction-progress__bar">
            <div
              className="text-prediction-progress__fill"
              style={{ width: `${settings.downloadProgress ?? 0}%` }}
              data-testid="text-prediction-progress-fill"
            />
          </div>
          <span className="text-prediction-progress__text">
            Downloading model... {Math.round(settings.downloadProgress ?? 0)}%
          </span>
        </div>
      )}

      {/* Status indicator - shows current model status */}
      {settings.enabled && (
        <div className="text-prediction-status" data-testid="text-prediction-status">
          <span
            className={`text-prediction-status__text text-prediction-status--${settings.status}`}
            data-testid="text-prediction-status-text"
          >
            {settings.status === 'not-downloaded' && 'Not downloaded'}
            {settings.status === 'downloading' && 'Downloading...'}
            {settings.status === 'initializing' && 'Initializing...'}
            {settings.status === 'ready' && 'Ready'}
            {settings.status === 'error' && `Error: ${settings.errorMessage ?? 'Unknown error'}`}
          </span>
          {settings.status === 'error' && (
            <button
              className="text-prediction-status__retry"
              onClick={() => handleEnableChange(true)}
              data-testid="text-prediction-retry-button"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Debug: Simulate download button - only in dev mode */}
      {isDevMode() && (
        <div className="text-prediction-debug" data-testid="text-prediction-debug">
          <button
            className="text-prediction-debug__button"
            onClick={handleSimulateDownload}
            disabled={isSimulating}
            data-testid="text-prediction-simulate-button"
          >
            {isSimulating ? `Simulating... ${debugProgress}%` : 'Simulate Download'}
          </button>
        </div>
      )}
    </div>
  );
});

export default TextPredictionSettings;
