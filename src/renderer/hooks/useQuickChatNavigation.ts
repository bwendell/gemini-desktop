/**
 * Custom hook for managing Quick Chat navigation via IPC.
 *
 * Handles navigation requests from the main process, manages iframe reload state,
 * and signals readiness for text injection after navigation completes.
 *
 * @module useQuickChatNavigation
 */

import { useState, useCallback, useEffect } from 'react';

import type { GeminiNavigatePayload, GeminiReadyPayload } from '../../shared/types/tabs';
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
export function useQuickChatNavigation(originalHandleLoad: () => void): QuickChatNavigationState {
    // State for Quick Chat navigation
    const [iframeKey, setIframeKey] = useState(0);
    const [pendingNavigate, setPendingNavigate] = useState<GeminiNavigatePayload | null>(null);

    // Enhanced load handler that signals ready for pending Quick Chat injection
    const handleIframeLoad = useCallback(() => {
        // Call the original load handler
        originalHandleLoad();

        if (pendingNavigate !== null && window.electronAPI?.signalGeminiReady) {
            // Small delay to ensure iframe content is fully initialized
            setTimeout(() => {
                const readyPayload: GeminiReadyPayload = {
                    requestId: pendingNavigate.requestId,
                    targetTabId: pendingNavigate.targetTabId,
                };
                window.electronAPI!.signalGeminiReady(readyPayload);
                setPendingNavigate(null);
                logger.log('Signaled Gemini ready for text injection');
            }, READY_SIGNAL_DELAY_MS);
        }
    }, [originalHandleLoad, pendingNavigate]);

    // Subscribe to Gemini navigation requests from main process
    useEffect(() => {
        if (!window.electronAPI?.onGeminiNavigate) {
            return;
        }

        const unsubscribe = window.electronAPI.onGeminiNavigate((data) => {
            logger.log('Gemini navigation requested for tab:', data.targetTabId);

            setPendingNavigate(data);

            // Force iframe to reload by changing its key
            // This causes React to unmount and remount the iframe
            setIframeKey((prev) => prev + 1);
        });

        return unsubscribe;
    }, []);

    return {
        iframeKey,
        handleIframeLoad,
    };
}
