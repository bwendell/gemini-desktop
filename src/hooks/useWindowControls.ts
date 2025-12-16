import { Window } from '@tauri-apps/api/window';
import { useCallback } from 'react';

/**
 * Custom hook for window control operations.
 * Provides minimize, maximize/restore, and close functionality.
 * 
 * This hook is designed to be easily extensible for future features
 * like window state persistence or custom animations.
 */
export function useWindowControls() {
    const appWindow = Window.getCurrent();

    const minimize = useCallback(async () => {
        await appWindow.minimize();
    }, [appWindow]);

    const maximize = useCallback(async () => {
        const isMaximized = await appWindow.isMaximized();
        if (isMaximized) {
            await appWindow.unmaximize();
        } else {
            await appWindow.maximize();
        }
    }, [appWindow]);

    const close = useCallback(async () => {
        await appWindow.close();
    }, [appWindow]);

    return {
        minimize,
        maximize,
        close,
    };
}
