/**
 * Update Notifications Hook
 * 
 * Manages update notification state by subscribing to IPC events
 * from the Electron main process. Provides state and actions for
 * displaying update toasts and tracking pending updates.
 * 
 * @module useUpdateNotifications
 */

import { useState, useEffect, useCallback } from 'react';
import type { UpdateInfo } from '../components/toast';

/**
 * Update notification state
 */
export interface UpdateNotificationState {
    /** Type of notification currently showing */
    type: 'available' | 'downloaded' | 'error' | null;
    /** Update information from electron-updater */
    updateInfo: UpdateInfo | null;
    /** Error message if type is 'error' */
    errorMessage: string | null;
    /** Whether the toast is currently visible */
    visible: boolean;
    /** Whether an update has been downloaded and is pending install */
    hasPendingUpdate: boolean;
}

/**
 * Initial state for update notifications
 */
const initialState: UpdateNotificationState = {
    type: null,
    updateInfo: null,
    errorMessage: null,
    visible: false,
    hasPendingUpdate: false
};

/**
 * Hook to manage update notification state
 * 
 * Subscribes to:
 * - onUpdateAvailable: Update is being downloaded
 * - onUpdateDownloaded: Update ready to install
 * - onUpdateError: Error during update process
 * 
 * @returns Update notification state and actions
 */
export function useUpdateNotifications() {
    const [state, setState] = useState<UpdateNotificationState>(initialState);

    // Debug log on every render - removed

    /**
     * Dismiss the current toast notification
     */
    const dismissNotification = useCallback(() => {
        setState(prev => ({
            ...prev,
            visible: false
        }));
    }, []);

    /**
     * Handle "Later" action - dismiss toast but keep pending flag
     */
    const handleLater = useCallback(() => {
        setState(prev => ({
            ...prev,
            visible: false
            // hasPendingUpdate remains true
        }));
    }, []);

    /**
     * Install the downloaded update
     */
    const installUpdate = useCallback(() => {
        window.electronAPI?.installUpdate();
        // Clear pending state since we're installing
        setState(prev => ({
            ...prev,
            visible: false,
            hasPendingUpdate: false
        }));
    }, []);

    /**
     * Subscribe to IPC events on mount
     */
    useEffect(() => {
        // Skip if not in Electron environment
        if (!window.electronAPI) {
            return;
        }

        // Update available - show info toast
        const cleanupAvailable = window.electronAPI.onUpdateAvailable((info) => {
            setState({
                type: 'available',
                updateInfo: info,
                errorMessage: null,
                visible: true,
                hasPendingUpdate: false
            });
        });

        // Update downloaded - show action toast
        const cleanupDownloaded = window.electronAPI.onUpdateDownloaded((info) => {
            setState({
                type: 'downloaded',
                updateInfo: info,
                errorMessage: null,
                visible: true,
                hasPendingUpdate: true
            });
        });

        // Update error - show error toast
        const cleanupError = window.electronAPI.onUpdateError((error) => {
            setState({
                type: 'error',
                updateInfo: null,
                errorMessage: error,
                visible: true,
                hasPendingUpdate: false
            });
        });

        // Cleanup subscriptions on unmount
        return () => {
            cleanupAvailable?.();
            cleanupDownloaded?.();
            cleanupError?.();
        };
    }, []);

    /**
     * Dev mode: Expose test triggers on window for manual testing
     * Usage in console:
     *   __testUpdateToast.showAvailable()
     *   __testUpdateToast.showDownloaded()
     *   __testUpdateToast.showError('Custom error')
     *   __testUpdateToast.hide()
     */
    /* v8 ignore start -- dev-only code for manual testing */
    useEffect(() => {
        const isDev = import.meta.env.DEV || import.meta.env.MODE !== 'production';
        if (isDev) {
            (window as unknown as Record<string, unknown>).__testUpdateToast = {
                /* v8 ignore next 8 */
                showAvailable: (version = '2.0.0') => {
                    setState({
                        type: 'available',
                        updateInfo: { version },
                        errorMessage: null,
                        visible: true,
                        hasPendingUpdate: false
                    });
                },
                /* v8 ignore next 8 */
                showDownloaded: (version = '2.0.0') => {
                    setState({
                        type: 'downloaded',
                        updateInfo: { version },
                        errorMessage: null,
                        visible: true,
                        hasPendingUpdate: true
                    });
                },
                /* v8 ignore next 8 */
                showError: (message = 'Test error message') => {
                    setState({
                        type: 'error',
                        updateInfo: null,
                        errorMessage: message,
                        visible: true,
                        hasPendingUpdate: false
                    });
                },
                /* v8 ignore next 3 */
                hide: () => {
                    setState(prev => ({ ...prev, visible: false }));
                }
            };

            /* v8 ignore next 3 */
            return () => {
                delete (window as unknown as Record<string, unknown>).__testUpdateToast;
            };
        }
        /* v8 ignore next */
        return undefined;
    }, []);
    /* v8 ignore stop */

    return {
        ...state,
        dismissNotification,
        handleLater,
        installUpdate
    };
}

export default useUpdateNotifications;

