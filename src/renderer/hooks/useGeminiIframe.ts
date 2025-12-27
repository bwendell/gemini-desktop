/**
 * Custom hook for managing Gemini iframe state.
 *
 * Encapsulates loading, error, and network status logic for the Gemini iframe.
 * Provides a cleaner interface for App.tsx.
 *
 * @module useGeminiIframe
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { createRendererLogger } from '../utils';

const logger = createRendererLogger('[useGeminiIframe]');

/** Timeout for connectivity check (ms) */
const CONNECTIVITY_TIMEOUT_MS = 10000;

/** URL to test connectivity - uses Gemini's favicon which should be fast */
const CONNECTIVITY_TEST_URL = 'https://gemini.google.com/favicon.ico';

/**
 * State and handlers for the Gemini iframe.
 */
export interface GeminiIframeState {
  /** Whether the iframe is currently loading */
  isLoading: boolean;
  /** Error message if loading failed, null otherwise */
  error: string | null;
  /** Whether the network is online */
  isOnline: boolean;
  /** Callback for iframe onLoad event */
  handleLoad: () => void;
  /** Callback for iframe onError event */
  handleError: () => void;
  /** Function to retry loading */
  retry: () => void;
}

/**
 * Check if Gemini is reachable by attempting to fetch its favicon.
 * This detects DNS failures, network issues, etc.
 */
async function checkGeminiConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONNECTIVITY_TIMEOUT_MS);

    await fetch(CONNECTIVITY_TEST_URL, {
      method: 'HEAD',
      mode: 'no-cors', // We don't need the response, just checking connectivity
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    // In no-cors mode, response.ok may be false, but we just care that the request completed
    return true;
  } catch (error) {
    logger.error('Connectivity check failed:', error);
    return false;
  }
}

/**
 * Custom hook for Gemini iframe state management.
 *
 * @returns {GeminiIframeState} State and handlers for the iframe
 */
export function useGeminiIframe(): GeminiIframeState {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isOnline = useNetworkStatus();
  const hasCheckedConnectivity = useRef(false);

  // Initial connectivity check
  useEffect(() => {
    if (!hasCheckedConnectivity.current && !navigator.onLine) {
      // If we're already offline, set error immediately
      setError('Network unavailable');
      setIsLoading(false);
      hasCheckedConnectivity.current = true;
    }
  }, []);

  /**
   * Handle iframe load event.
   * Performs a connectivity check to verify Gemini is actually reachable.
   */
  const handleLoad = useCallback(async () => {
    // Quick check: if navigator says offline, set error immediately
    if (!navigator.onLine) {
      setIsLoading(false);
      setError('Network unavailable');
      logger.error('Gemini iframe onLoad fired but navigator.onLine is false');
      return;
    }

    // Perform actual connectivity check
    logger.log('Checking Gemini connectivity...');
    const isReachable = await checkGeminiConnectivity();

    if (isReachable) {
      setIsLoading(false);
      setError(null);
      logger.log('Gemini iframe loaded and connectivity verified');
    } else {
      setIsLoading(false);
      setError('Unable to reach Gemini');
      logger.error('Gemini iframe onLoad fired but connectivity check failed');
    }
  }, []);

  /**
   * Handle iframe load error.
   */
  const handleError = useCallback(() => {
    setIsLoading(false);
    setError('Failed to load Gemini');
    logger.error('Failed to load Gemini iframe');
  }, []);

  /**
   * Retry loading the iframe by forcing a page reload.
   * This is useful when the network connection is restored.
   */
  const retry = useCallback(() => {
    logger.log('Retrying connection - reloading page');
    window.location.reload();
  }, []);

  return {
    isLoading,
    error,
    isOnline,
    handleLoad,
    handleError,
    retry,
  };
}
