import { Window } from '@tauri-apps/api/window';
import { useCallback, useMemo } from 'react';

/**
 * Custom hook for window control operations.
 * Provides minimize, maximize/restore, and close functionality.
 * 
 * This hook is designed to be easily extensible for future features
 * like window state persistence or custom animations.
 */
export function useWindowControls() {
    // Memoize window reference to avoid repeated getCurrent() calls
    const appWindow = useMemo(() => Window.getCurrent(), []);

    const minimize = useCallback(async () => {
        try {
            await appWindow.minimize();
        } catch (error) {
            console.error('Failed to minimize window:', error);
        }
    }, [appWindow]);

    const maximize = useCallback(async () => {
        try {
            const isMaximized = await appWindow.isMaximized();
            if (isMaximized) {
                await appWindow.unmaximize();
            } else {
                await appWindow.maximize();
            }
        } catch (error) {
            console.error('Failed to maximize/restore window:', error);
        }
    }, [appWindow]);

    const close = useCallback(async () => {
        try {
            await appWindow.close();
        } catch (error) {
            console.error('Failed to close window:', error);
        }
    }, [appWindow]);

    return {
        minimize,
        maximize,
        close,
    };
}
