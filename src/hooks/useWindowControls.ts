import { useCallback } from 'react';

// Type declaration for the Electron API exposed via preload
declare global {
    interface Window {
        electronAPI?: {
            minimizeWindow: () => void;
            maximizeWindow: () => void;
            closeWindow: () => void;
            isMaximized: () => Promise<boolean>;
            platform: string;
            isElectron: boolean;
        };
    }
}

/**
 * Custom hook for window control operations.
 * Provides minimize, maximize/restore, and close functionality.
 * 
 * Works with both Electron (via preload API) and falls back gracefully.
 */
export function useWindowControls() {
    const minimize = useCallback(() => {
        if (window.electronAPI) {
            window.electronAPI.minimizeWindow();
        } else {
            console.warn('Window controls not available');
        }
    }, []);

    const maximize = useCallback(() => {
        if (window.electronAPI) {
            window.electronAPI.maximizeWindow();
        } else {
            console.warn('Window controls not available');
        }
    }, []);

    const close = useCallback(() => {
        if (window.electronAPI) {
            window.electronAPI.closeWindow();
        } else {
            console.warn('Window controls not available');
        }
    }, []);

    return {
        minimize,
        maximize,
        close,
    };
}
