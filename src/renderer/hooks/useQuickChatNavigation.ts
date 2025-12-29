/**
 * Custom hook for managing Quick Chat navigation via IPC.
 *
 * Handles navigation requests from the main process, manages iframe reload state,
 * and signals readiness for text injection after navigation completes.
 *
 * @module useQuickChatNavigation
 */

import { useState, useCallback, useEffect } from 'react';
import { createRendererLogger } from '../utils';

const logger = createRendererLogger('[useQuickChatNavigation]');

/** Delay before signaling ready to ensure iframe content is fully initialized */
const READY_SIGNAL_DELAY_MS = 500;

/**
 * State and handlers for Quick Chat navigation.
 */
export interface QuickChatNavigationState {
  /** Key to force iframe remount on navigation */
  iframeKey: number;
  /** Enhanced load handler that signals ready for pending text injection */
  handleIframeLoad: () => void;
}

/**
 * Custom hook for Quick Chat navigation via IPC.
 *
 * Subscribes to gemini:navigate events from the main process and coordinates
 * iframe reload with text injection signaling.
 *
 * @param originalHandleLoad - The original iframe load handler from useGeminiIframe
 * @returns {QuickChatNavigationState} State and handlers for Quick Chat navigation
 */
export function useQuickChatNavigation(
  originalHandleLoad: () => void
): QuickChatNavigationState {
  // State for Quick Chat navigation
  const [iframeKey, setIframeKey] = useState(0);
  const [pendingText, setPendingText] = useState<string | null>(null);

  // Enhanced load handler that signals ready for pending Quick Chat injection
  const handleIframeLoad = useCallback(() => {
    // Call the original load handler
    originalHandleLoad();

    // If there's pending text from Quick Chat navigation, signal ready
    if (pendingText !== null && window.electronAPI?.signalGeminiReady) {
      // Small delay to ensure iframe content is fully initialized
      setTimeout(() => {
        window.electronAPI!.signalGeminiReady(pendingText);
        setPendingText(null);
        logger.log('Signaled Gemini ready for text injection');
      }, READY_SIGNAL_DELAY_MS);
    }
  }, [originalHandleLoad, pendingText]);

  // Subscribe to Gemini navigation requests from main process
  useEffect(() => {
    if (!window.electronAPI?.onGeminiNavigate) {
      return;
    }

    const unsubscribe = window.electronAPI.onGeminiNavigate(
      (data: { url: string; text: string }) => {
        logger.log('Gemini navigation requested:', data.url);

        // Store the text to inject after iframe loads
        setPendingText(data.text);

        // Force iframe to reload by changing its key
        // This causes React to unmount and remount the iframe
        setIframeKey((prev) => prev + 1);
      }
    );

    return unsubscribe;
  }, []);

  return {
    iframeKey,
    handleIframeLoad,
  };
}
