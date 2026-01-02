/**
 * usePrintProgress Hook
 *
 * Manages print progress state and IPC communication for the
 * PrintProgressOverlay component.
 *
 * @module usePrintProgress
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Print progress state interface
 */
export interface PrintProgressState {
  /** Whether the overlay is visible */
  visible: boolean;
  /** Current page being captured */
  currentPage: number;
  /** Total pages to capture */
  totalPages: number;
  /** Progress percentage (0-100) */
  progress: number;
}

/**
 * Return type for usePrintProgress hook
 */
export interface UsePrintProgressReturn {
  /** Current print progress state */
  state: PrintProgressState;
  /** Handler to cancel the print operation */
  handleCancel: () => void;
}

/**
 * Hook to manage print progress state and IPC listeners.
 *
 * Listens for:
 * - PRINT_PROGRESS_START: Shows overlay with total pages
 * - PRINT_PROGRESS_UPDATE: Updates current page and progress
 * - PRINT_PROGRESS_END: Hides overlay
 *
 * @returns Print progress state and cancel handler
 */
export function usePrintProgress(): UsePrintProgressReturn {
  const [state, setState] = useState<PrintProgressState>({
    visible: false,
    currentPage: 0,
    totalPages: 0,
    progress: 0,
  });

  // Handle cancel button click
  const handleCancel = useCallback(() => {
    if (window.electronAPI?.cancelPrint) {
      window.electronAPI.cancelPrint();
    }
  }, []);

  useEffect(() => {
    const electronAPI = window.electronAPI;
    if (!electronAPI) return;

    // Handle progress start
    const unsubStart = electronAPI.onPrintProgressStart((data) => {
      setState({
        visible: true,
        currentPage: 0,
        totalPages: data.totalPages,
        progress: 0,
      });
    });

    // Handle progress update
    const unsubUpdate = electronAPI.onPrintProgressUpdate((data) => {
      setState((prev) => ({
        ...prev,
        currentPage: data.currentPage,
        totalPages: data.totalPages,
        progress: data.progress,
      }));
    });

    // Handle progress end
    const unsubEnd = electronAPI.onPrintProgressEnd(() => {
      setState((prev) => ({
        ...prev,
        visible: false,
      }));
    });

    // Handle overlay hide (before capture)
    const unsubHide = electronAPI.onPrintOverlayHide(() => {
      setState((prev) => ({
        ...prev,
        visible: false,
      }));
    });

    // Handle overlay show (after capture)
    const unsubShow = electronAPI.onPrintOverlayShow(() => {
      setState((prev) => ({
        ...prev,
        visible: true,
      }));
    });

    // Cleanup on unmount
    return () => {
      unsubStart();
      unsubUpdate();
      unsubEnd();
      unsubHide();
      unsubShow();
    };
  }, []);

  return { state, handleCancel };
}
