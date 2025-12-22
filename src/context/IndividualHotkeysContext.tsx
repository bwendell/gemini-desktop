/**
 * Individual Hotkeys Context for the application.
 * 
 * Provides individual hotkey enabled state management and synchronization with the Electron backend.
 * Each hotkey can be independently enabled/disabled.
 * 
 * @module IndividualHotkeysContext
 * @example
 * // Wrap your app with IndividualHotkeysProvider
 * <IndividualHotkeysProvider>
 *   <App />
 * </IndividualHotkeysProvider>
 * 
 * // Use the hotkey state in components
 * const { settings, setEnabled } = useIndividualHotkeys();
 * setEnabled('quickChat', false);
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createRendererLogger } from '../utils';

const logger = createRendererLogger('[IndividualHotkeysContext]');

// ============================================================================
// Types
// ============================================================================

/** Hotkey identifier */
export type HotkeyId = 'alwaysOnTop' | 'bossKey' | 'quickChat';

/** Individual hotkey settings */
export interface IndividualHotkeySettings {
    alwaysOnTop: boolean;
    bossKey: boolean;
    quickChat: boolean;
}

/** Individual hotkeys context value exposed to consumers */
interface IndividualHotkeysContextType {
    /** Current settings for each hotkey */
    settings: IndividualHotkeySettings;
    /** Function to update a specific hotkey's enabled state */
    setEnabled: (id: HotkeyId, enabled: boolean) => void;
}

// ============================================================================
// Context
// ============================================================================

const IndividualHotkeysContext = createContext<IndividualHotkeysContextType | undefined>(undefined);

interface IndividualHotkeysProviderProps {
    children: React.ReactNode;
}

// ============================================================================
// Helper Functions
// ============================================================================

/** Default settings when API is unavailable */
const DEFAULT_SETTINGS: IndividualHotkeySettings = {
    alwaysOnTop: true,
    bossKey: true,
    quickChat: true,
};

/**
 * Type guard to check if data is in the expected format.
 */
function isValidSettings(data: unknown): data is IndividualHotkeySettings {
    return (
        typeof data === 'object' &&
        data !== null &&
        'alwaysOnTop' in data &&
        'bossKey' in data &&
        'quickChat' in data &&
        typeof (data as IndividualHotkeySettings).alwaysOnTop === 'boolean' &&
        typeof (data as IndividualHotkeySettings).bossKey === 'boolean' &&
        typeof (data as IndividualHotkeySettings).quickChat === 'boolean'
    );
}

// ============================================================================
// Provider Component
// ============================================================================

/**
 * Individual hotkeys provider component.
 * 
 * Features:
 * - Syncs individual hotkey settings with Electron backend
 * - Listens for changes from other windows
 * - Falls back to defaults when Electron is unavailable
 */
export function IndividualHotkeysProvider({ children }: IndividualHotkeysProviderProps) {
    const [settings, setSettingsState] = useState<IndividualHotkeySettings>(DEFAULT_SETTINGS);

    // Initialize state from Electron on mount
    useEffect(() => {
        let isMounted = true;

        const initHotkeys = async () => {
            // No Electron API - use defaults
            if (!window.electronAPI?.getIndividualHotkeys) {
                logger.log('No Electron API, using defaults');
                return;
            }

            try {
                const result = await window.electronAPI.getIndividualHotkeys();

                /* v8 ignore next -- race condition guard for async unmount */
                if (!isMounted) return;

                if (isValidSettings(result)) {
                    setSettingsState(result);
                    logger.log('Individual hotkeys initialized:', result);
                } else {
                    logger.log('Unexpected data format:', result);
                }
            } catch (error) {
                logger.error('Failed to initialize individual hotkeys:', error);
            }
        };

        initHotkeys();

        // Subscribe to hotkeys changes from other windows
        let cleanup: (() => void) | undefined;

        if (window.electronAPI?.onIndividualHotkeysChanged) {
            cleanup = window.electronAPI.onIndividualHotkeysChanged((data) => {
                /* v8 ignore next -- race condition guard for callback after unmount */
                if (!isMounted) return;

                if (isValidSettings(data)) {
                    setSettingsState(data);
                    logger.log('Individual hotkeys updated from external source:', data);
                }
            });
        }

        return () => {
            isMounted = false;
            if (cleanup) cleanup();
        };
    }, []);

    // Memoized setter to prevent unnecessary re-renders
    const setEnabled = useCallback((id: HotkeyId, enabled: boolean) => {
        setSettingsState(prev => ({ ...prev, [id]: enabled }));

        if (window.electronAPI?.setIndividualHotkey) {
            try {
                window.electronAPI.setIndividualHotkey(id, enabled);
            } catch (error) {
                logger.error('Failed to set individual hotkey:', error);
            }
        }
    }, []);

    return (
        <IndividualHotkeysContext.Provider value={{ settings, setEnabled }}>
            {children}
        </IndividualHotkeysContext.Provider>
    );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access the individual hotkeys context.
 * Must be used within an IndividualHotkeysProvider.
 * 
 * @returns Individual hotkeys context with settings and setEnabled
 * @throws Error if used outside of IndividualHotkeysProvider
 * 
 * @example
 * const { settings, setEnabled } = useIndividualHotkeys();
 * setEnabled('quickChat', false); // Disable Quick Chat hotkey
 */
export function useIndividualHotkeys(): IndividualHotkeysContextType {
    const context = useContext(IndividualHotkeysContext);
    if (context === undefined) {
        throw new Error('useIndividualHotkeys must be used within an IndividualHotkeysProvider');
    }
    return context;
}
