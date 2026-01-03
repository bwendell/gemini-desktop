/**
 * TextPredictionSettings Component
 *
 * Settings controls for local LLM text prediction feature.
 * Displays enable toggle, GPU toggle, download progress, and status indicator.
 *
 * @module TextPredictionSettings
 */

import { memo, useState, useEffect, useCallback } from 'react';
import { CapsuleToggle } from '../common/CapsuleToggle';
import type { TextPredictionSettings as TextPredictionSettingsType } from '../../../shared/types/text-prediction';
import './TextPredictionSettings.css';

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

  // Load initial state from main process
  useEffect(() => {
    const loadState = async () => {
      try {
        const status = await window.electronAPI?.getTextPredictionStatus();
        if (status) {
          setSettings(status);
        }
      } catch (error) {
        console.error('Failed to load text prediction state:', error);
      } finally {
        setLoading(false);
      }
    };

    loadState();

    // Subscribe to status changes
    const unsubscribeStatus = window.electronAPI?.onTextPredictionStatusChanged((newSettings) => {
      setSettings(newSettings);
    });

    // Subscribe to download progress
    const unsubscribeProgress = window.electronAPI?.onTextPredictionDownloadProgress((progress) => {
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
    setSettings((prev) => ({ ...prev, enabled: newEnabled }));
    try {
      await window.electronAPI?.setTextPredictionEnabled(newEnabled);
    } catch (error) {
      console.error('Failed to set text prediction enabled:', error);
      // Revert on error
      setSettings((prev) => ({ ...prev, enabled: !newEnabled }));
    }
  }, []);

  // Handle GPU toggle change
  const handleGpuChange = useCallback(async (newEnabled: boolean) => {
    setSettings((prev) => ({ ...prev, gpuEnabled: newEnabled }));
    try {
      await window.electronAPI?.setTextPredictionGpuEnabled(newEnabled);
    } catch (error) {
      console.error('Failed to set GPU enabled:', error);
      // Revert on error
      setSettings((prev) => ({ ...prev, gpuEnabled: !newEnabled }));
    }
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
    </div>
  );
});

export default TextPredictionSettings;
