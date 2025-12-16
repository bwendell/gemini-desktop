/**
 * Hook for webview initialization (deprecated).
 * 
 * In Electron, we use an iframe instead of a native webview,
 * so this hook just returns a ready state.
 * 
 * @deprecated This hook is no longer needed with Electron
 */

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
 * In Electron, we use an iframe instead of a native webview,
 * so this hook immediately returns a ready state.
 * 
 * @returns Object containing ready state
 */
export function useWebviewInit(): UseWebviewInitResult {
    return {
        isReady: true,
        error: null,
        isLoading: false,
        retry: () => { },
    };
}
