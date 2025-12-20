/**
 * Zen Mode Context for the application.
 * 
 * Provides Zen Mode enabled state management and synchronization with the Electron backend.
 * Follows the same pattern as HotkeysContext for consistency.
 * 
 * Zen Mode is a distraction-free mode that hides UI elements like the title bar.
 * 
 * This module handles:
 * - Initial Zen Mode state loading from Electron store
 * - Real-time synchronization across all application windows
 * - Graceful degradation when Electron API is unavailable
 * 
 * @module ZenModeContext
 * @example
 * // Wrap your app with ZenModeProvider
 * <ZenModeProvider>
 *   <App />
 * </ZenModeProvider>
 * 
 * // Use the Zen Mode state in components
 * const { enabled, setEnabled } = useZenMode();
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

/** Zen Mode data from Electron API */
interface ZenModeData {
    enabled: boolean;
}

/** Zen Mode context value exposed to consumers */
interface ZenModeContextType {
    /** Whether Zen Mode is currently enabled */
    enabled: boolean;
    /** Function to update the Zen Mode enabled state */
    setEnabled: (enabled: boolean) => void;
}

// ============================================================================
// Context
// ============================================================================

const ZenModeContext = createContext<ZenModeContextType | undefined>(undefined);

interface ZenModeProviderProps {
    children: React.ReactNode;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Type guard to check if data is in the expected format.
 */
function isZenModeData(data: unknown): data is ZenModeData {
    return (
        typeof data === 'object' &&
        data !== null &&
        'enabled' in data &&
        typeof (data as ZenModeData).enabled === 'boolean'
    );
}

// ============================================================================
// Provider Component
// ============================================================================

/**
 * Zen Mode provider component that manages Zen Mode state and synchronization.
 * 
 * Features:
 * - Syncs enabled state with Electron backend
 * - Listens for changes from other windows or hotkey toggles
 * - Falls back to enabled=false when Electron is unavailable
 */
export function ZenModeProvider({ children }: ZenModeProviderProps) {
    const [enabled, setEnabledState] = useState<boolean>(false);

    // Initialize state from Electron on mount
    useEffect(() => {
        let isMounted = true;

        const initZenMode = async () => {
            // No Electron API - use default (disabled)
            if (!window.electronAPI?.getZenMode) {
                console.log('[ZenModeContext] No Electron API, using default (disabled)');
                return;
            }

            try {
                const result = await window.electronAPI.getZenMode();

                /* v8 ignore next -- race condition guard for async unmount */
                if (!isMounted) return;

                if (isZenModeData(result)) {
                    setEnabledState(result.enabled);
                } else {
                    console.log('[ZenModeContext] Unexpected data format:', result);
                }
            } catch (error) {
                console.error('[ZenModeContext] Failed to initialize Zen Mode:', error);
            }
        };

        initZenMode();

        // Subscribe to Zen Mode changes from other windows or hotkey
        let cleanup: (() => void) | undefined;

        if (window.electronAPI?.onZenModeChanged) {
            cleanup = window.electronAPI.onZenModeChanged((data) => {
                /* v8 ignore next -- race condition guard for callback after unmount */
                if (!isMounted) return;

                if (isZenModeData(data)) {
                    setEnabledState(data.enabled);
                }
            });
        }

        return () => {
            isMounted = false;
            if (cleanup) cleanup();
        };
    }, []);

    // Memoized setter to prevent unnecessary re-renders
    const setEnabled = useCallback((newEnabled: boolean) => {
        setEnabledState(newEnabled);

        if (window.electronAPI?.setZenMode) {
            try {
                window.electronAPI.setZenMode(newEnabled);
            } catch (error) {
                console.error('[ZenModeContext] Failed to set Zen Mode:', error);
            }
        }
    }, []);

    return (
        <ZenModeContext.Provider value={{ enabled, setEnabled }}>
            {children}
        </ZenModeContext.Provider>
    );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access the Zen Mode context.
 * Must be used within a ZenModeProvider.
 * 
 * @returns Zen Mode context with enabled and setEnabled
 * @throws Error if used outside of ZenModeProvider
 * 
 * @example
 * const { enabled, setEnabled } = useZenMode();
 * setEnabled(true); // Enable Zen Mode
 */
export function useZenMode(): ZenModeContextType {
    const context = useContext(ZenModeContext);
    if (context === undefined) {
        throw new Error('useZenMode must be used within a ZenModeProvider');
    }
    return context;
}
