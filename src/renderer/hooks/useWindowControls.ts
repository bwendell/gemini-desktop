import { useCallback } from 'react';
import { createRendererLogger } from '../utils';

const logger = createRendererLogger('[useWindowControls]');

/**
 * Custom hook for window control operations.
 * Provides minimize, maximize/restore, and close functionality.
 *
 * Works with both Electron (via preload API) and falls back gracefully.
 *
 * @returns {object} Object containing window control functions
 */
export function useWindowControls(): {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
} {
  /**
   * Minimizes the current window.
   */
  const minimize = useCallback((): void => {
    if (window.electronAPI) {
      window.electronAPI.minimizeWindow();
    } else {
      logger.warn('Window controls not available');
    }
  }, []);

  /**
   * Maximizes or restores the current window.
   */
  const maximize = useCallback((): void => {
    if (window.electronAPI) {
      window.electronAPI.maximizeWindow();
    } else {
      logger.warn('Window controls not available');
    }
  }, []);

  /**
   * Closes the current window.
   */
  const close = useCallback((): void => {
    if (window.electronAPI) {
      window.electronAPI.closeWindow();
    } else {
      logger.warn('Window controls not available');
    }
  }, []);

  return {
    minimize,
    maximize,
    close,
  };
}
