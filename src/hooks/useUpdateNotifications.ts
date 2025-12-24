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
import { isDevMode } from '../utils/platform';

/**
 * Update notification state
 */
export interface UpdateNotificationState {
    /** Type of notification currently showing */
    type: 'available' | 'downloaded' | 'error' | 'not-available' | 'progress' | null;
    /** Update information from electron-updater */
    updateInfo: UpdateInfo | null;
    /** Error message if type is 'error' */
    errorMessage: string | null;
    /** Whether the toast is currently visible */
    visible: boolean;
    /** Whether an update has been downloaded and is pending install */
    hasPendingUpdate: boolean;
    /** Download progress percentage (0-100) */
    downloadProgress: number | null;
}

/**
 * Initial state for update notifications
 */
const initialState: UpdateNotificationState = {
    type: null,
    updateInfo: null,
    errorMessage: null,
    visible: false,
    hasPendingUpdate: false,
    downloadProgress: null
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
                hasPendingUpdate: false,
                downloadProgress: null
            });
        });

        // Update downloaded - show action toast
        const cleanupDownloaded = window.electronAPI.onUpdateDownloaded((info) => {
            setState({
                type: 'downloaded',
                updateInfo: info,
                errorMessage: null,
                visible: true,
                hasPendingUpdate: true,
                downloadProgress: 100
            });
        });

        // Update error - show error toast
        const cleanupError = window.electronAPI.onUpdateError((error) => {
            setState({
                type: 'error',
                updateInfo: null,
                errorMessage: error,
                visible: true,
                hasPendingUpdate: false,
                downloadProgress: null
            });
        });

        // Update not available - show "you're up to date" toast
        const cleanupNotAvailable = window.electronAPI.onUpdateNotAvailable?.((info) => {
            setState({
                type: 'not-available',
                updateInfo: info,
                errorMessage: null,
                visible: true,
                hasPendingUpdate: false,
                downloadProgress: null
            });
        });

        // Download progress - update progress state
        const cleanupProgress = window.electronAPI.onDownloadProgress?.((progress) => {
            setState(prev => ({
                ...prev,
                type: 'progress',
                downloadProgress: progress.percent,
                visible: true
            }));
        });

        // Cleanup subscriptions on unmount
        return () => {
            cleanupAvailable?.();
            cleanupDownloaded?.();
            cleanupError?.();
            cleanupNotAvailable?.();
            cleanupProgress?.();
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
        const devMode = isDevMode();
        console.log('[useUpdateNotifications] Dev mode check:', devMode, {
            DEV: import.meta.env.DEV,
            MODE: import.meta.env.MODE,
            hostname: window.location.hostname
        });
        if (devMode) {
            console.log('[useUpdateNotifications] Creating __testUpdateToast helper');
            (window as unknown as Record<string, unknown>).__testUpdateToast = {
                /* v8 ignore next 8 */
                showAvailable: (version = '2.0.0') => {
                    setState({
                        type: 'available',
                        updateInfo: { version },
                        errorMessage: null,
                        visible: true,
                        hasPendingUpdate: false,
                        downloadProgress: null
                    });
                    // Also trigger native badge in main process
                    window.electronAPI?.devShowBadge(version);
                },
                /* v8 ignore next 10 */
                showDownloaded: (version = '2.0.0') => {
                    setState({
                        type: 'downloaded',
                        updateInfo: { version },
                        errorMessage: null,
                        visible: true,
                        hasPendingUpdate: true,
                        downloadProgress: 100
                    });
                    // Also trigger native badge in main process
                    window.electronAPI?.devShowBadge(version);
                },
                /* v8 ignore next 8 */
                showError: (message = 'Test error message') => {
                    setState({
                        type: 'error',
                        updateInfo: null,
                        errorMessage: message,
                        visible: true,
                        hasPendingUpdate: false,
                        downloadProgress: null
                    });
                },
                /* v8 ignore next 8 */
                showNotAvailable: (version = '1.0.0') => {
                    setState({
                        type: 'not-available',
                        updateInfo: { version },
                        errorMessage: null,
                        visible: true,
                        hasPendingUpdate: false,
                        downloadProgress: null
                    });
                },
                /* v8 ignore next 8 */
                showProgress: (percent = 50) => {
                    setState(prev => ({
                        ...prev,
                        type: 'progress',
                        downloadProgress: percent,
                        visible: true
                    }));
                },
                /* v8 ignore next 11 */
                hide: () => {
                    // Reset all state including hasPendingUpdate (for titlebar badge)
                    setState({
                        type: null,
                        updateInfo: null,
                        errorMessage: null,
                        visible: false,
                        hasPendingUpdate: false,
                        downloadProgress: null
                    });
                    // Also clear native badge in main process
                    window.electronAPI?.devClearBadge();
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

