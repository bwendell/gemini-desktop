/**
 * Hook for opening the Options window.
 * 
 * Provides a function to open the options window via Tauri command.
 * The window will be created if it doesn't exist, or focused if it does.
 * 
 * @module useOptionsWindow
 */

import { invoke } from '@tauri-apps/api/core';
import { useCallback } from 'react';

/**
 * Hook for interacting with the Options window.
 * 
 * @returns Object containing openOptions function
 * 
 * @example
 * ```tsx
 * const { openOptions } = useOptionsWindow();
 * 
 * return <button onClick={openOptions}>Open Options</button>;
 * ```
 */
export function useOptionsWindow() {
    /**
     * Opens the options window.
     * If the window already exists, it will be focused.
     * Logs any errors that occur during window creation/focus.
     */
    const openOptions = useCallback(async () => {
        try {
            await invoke('create_options_window');
        } catch (error) {
            console.error('Failed to open options window:', error);
            // Re-throw to allow callers to handle if needed
            throw error;
        }
    }, []);

    return { openOptions };
}
