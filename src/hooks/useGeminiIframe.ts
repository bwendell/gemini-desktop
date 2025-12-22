/**
 * Custom hook for managing Gemini iframe state.
 *
 * Encapsulates loading, error, and network status logic for the Gemini iframe.
 * Provides a cleaner interface for App.tsx.
 *
 * @module useGeminiIframe
 */

import { useState, useCallback } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { createRendererLogger } from '../utils';

const logger = createRendererLogger('[useGeminiIframe]');

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
 * Custom hook for Gemini iframe state management.
 *
 * @returns {GeminiIframeState} State and handlers for the iframe
 */
export function useGeminiIframe(): GeminiIframeState {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const isOnline = useNetworkStatus();

    /**
     * Handle successful iframe load.
     */
    const handleLoad = useCallback(() => {
        setIsLoading(false);
        setError(null);
        logger.log('Gemini iframe loaded successfully');
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
     * Retry loading the iframe by resetting state.
     */
    const retry = useCallback(() => {
        setIsLoading(true);
        setError(null);
        logger.log('Retrying Gemini iframe load');
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
