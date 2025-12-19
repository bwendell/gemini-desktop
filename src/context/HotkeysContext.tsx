/**
 * Hotkeys Context for the application.
 * 
 * Provides hotkeys enabled state management and synchronization with the Electron backend.
 * Follows the same pattern as ThemeContext for consistency.
 * 
 * This module handles:
 * - Initial hotkeys enabled loading from Electron store
 * - Real-time synchronization across all application windows
 * - Graceful degradation when Electron API is unavailable
 * 
 * @module HotkeysContext
 * @example
 * // Wrap your app with HotkeysProvider
 * <HotkeysProvider>
 *   <App />
 * </HotkeysProvider>
 * 
 * // Use the hotkeys state in components
 * const { enabled, setEnabled } = useHotkeys();
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

/** Hotkeys data from Electron API */
interface HotkeysData {
    enabled: boolean;
}

/** Hotkeys context value exposed to consumers */
interface HotkeysContextType {
    /** Whether hotkeys are currently enabled */
    enabled: boolean;
    /** Function to update the hotkeys enabled state */
    setEnabled: (enabled: boolean) => void;
}

// ============================================================================
// Context
// ============================================================================

const HotkeysContext = createContext<HotkeysContextType | undefined>(undefined);

interface HotkeysProviderProps {
    children: React.ReactNode;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Type guard to check if data is in the expected format.
 */
function isHotkeysData(data: unknown): data is HotkeysData {
    return (
        typeof data === 'object' &&
        data !== null &&
        'enabled' in data &&
        typeof (data as HotkeysData).enabled === 'boolean'
    );
}

// ============================================================================
// Provider Component
// ============================================================================

/**
 * Hotkeys provider component that manages hotkeys enabled state and synchronization.
 * 
 * Features:
 * - Syncs enabled state with Electron backend
 * - Listens for changes from other windows
 * - Falls back to enabled=true when Electron is unavailable
 */
export function HotkeysProvider({ children }: HotkeysProviderProps) {
    const [enabled, setEnabledState] = useState<boolean>(true);

    // Initialize state from Electron on mount
    useEffect(() => {
        let isMounted = true;

        const initHotkeys = async () => {
            // No Electron API - use default (enabled)
            if (!window.electronAPI?.getHotkeysEnabled) {
                console.log('[HotkeysContext] No Electron API, using default (enabled)');
                return;
            }

            try {
                const result = await window.electronAPI.getHotkeysEnabled();

                /* v8 ignore next -- race condition guard for async unmount */
                if (!isMounted) return;

                if (isHotkeysData(result)) {
                    setEnabledState(result.enabled);
                    console.log('[HotkeysContext] Hotkeys initialized:', result);
                } else {
                    console.log('[HotkeysContext] Unexpected data format:', result);
                }
            } catch (error) {
                console.error('[HotkeysContext] Failed to initialize hotkeys:', error);
            }
        };

        initHotkeys();

        // Subscribe to hotkeys changes from other windows
        let cleanup: (() => void) | undefined;

        if (window.electronAPI?.onHotkeysChanged) {
            cleanup = window.electronAPI.onHotkeysChanged((data) => {
                /* v8 ignore next -- race condition guard for callback after unmount */
                if (!isMounted) return;

                if (isHotkeysData(data)) {
                    setEnabledState(data.enabled);
                    console.log('[HotkeysContext] Hotkeys updated from external source:', data);
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

        if (window.electronAPI?.setHotkeysEnabled) {
            try {
                window.electronAPI.setHotkeysEnabled(newEnabled);
            } catch (error) {
                console.error('[HotkeysContext] Failed to set hotkeys enabled:', error);
            }
        }
    }, []);

    return (
        <HotkeysContext.Provider value={{ enabled, setEnabled }}>
            {children}
        </HotkeysContext.Provider>
    );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access the hotkeys context.
 * Must be used within a HotkeysProvider.
 * 
 * @returns Hotkeys context with enabled and setEnabled
 * @throws Error if used outside of HotkeysProvider
 * 
 * @example
 * const { enabled, setEnabled } = useHotkeys();
 * setEnabled(false); // Disable hotkeys
 */
export function useHotkeys(): HotkeysContextType {
    const context = useContext(HotkeysContext);
    if (context === undefined) {
        throw new Error('useHotkeys must be used within a HotkeysProvider');
    }
    return context;
}
