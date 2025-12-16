import { useEffect, useState, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

/**
 * Result of the webview initialization hook.
 */
interface UseWebviewInitResult {
    /** Whether the webview is ready to use */
    isReady: boolean;
    /** Error message if initialization failed, null otherwise */
    error: string | null;
    /** Whether initialization is in progress */
    isLoading: boolean;
    /** Function to reset and retry initialization */
    retry: () => void;
}

/**
 * Custom hook for Gemini webview initialization.
 * 
 * Handles:
 * - Single initialization (prevents double-init in StrictMode)
 * - Error capture and logging
 * - Retry capability after errors
 * 
 * This hook is designed to be easily testable and can be extended
 * for cross-platform initialization differences if needed.
 * 
 * @returns Object containing ready state, error state, and retry function
 */
export function useWebviewInit(): UseWebviewInitResult {
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const hasInitialized = useRef(false);

    const initWebview = useCallback(async () => {
        // Prevent double initialization (e.g. in React Strict Mode)
        // This defensive check is hard to trigger in unit tests because StrictMode's
        // double-effect behavior doesn't occur in the test environment.
        /* istanbul ignore if -- @preserve Defensive code for React StrictMode */
        if (hasInitialized.current) {
            console.debug('[useWebviewInit] Skipping duplicate initialization');
            return;
        }
        hasInitialized.current = true;
        setIsLoading(true);
        setError(null);

        try {
            console.debug('[useWebviewInit] Creating Gemini webview...');
            await invoke('create_gemini_webview');
            console.debug('[useWebviewInit] Webview created successfully');

            // Measure startup time
            performance.mark('webview-ready');
            performance.measure('startup-time', 'app-start', 'webview-ready');
            const startupTime = performance.getEntriesByName('startup-time')[0];
            console.log(`[Performance] Startup time: ${startupTime.duration.toFixed(2)}ms`);

            setIsReady(true);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.error('[useWebviewInit] Failed to create webview:', {
                error: err,
                message: errorMessage,
                timestamp: new Date().toISOString(),
            });
            setError(errorMessage);
            // Reset initialization flag on error to allow retries
            hasInitialized.current = false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const retry = useCallback(() => {
        hasInitialized.current = false;
        setError(null);
        setIsReady(false);
        initWebview();
    }, [initWebview]);

    useEffect(() => {
        initWebview();
    }, [initWebview]);

    return {
        isReady,
        error,
        isLoading,
        retry,
    };
}
