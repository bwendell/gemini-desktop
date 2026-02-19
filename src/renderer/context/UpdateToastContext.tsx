import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from './ToastContext';
import { useUpdateNotifications } from '../hooks/useUpdateNotifications';
import type { UpdateNotificationState } from '../hooks/useUpdateNotifications';
import type { ToastType, ToastAction } from '../components/toast/Toast';
import { getReleaseNotesUrl } from '../../shared/utils/releaseNotes';

interface UpdateToastContextType extends UpdateNotificationState {
    dismissNotification: () => void;
    handleLater: () => void;
    installUpdate: () => void;
}

const UpdateToastContext = createContext<UpdateToastContextType | undefined>(undefined);

interface UpdateToastProviderProps {
    children: React.ReactNode;
}

/**
 * Map UpdateNotificationType to generic ToastType
 */
function mapToToastType(type: 'available' | 'downloaded' | 'error' | 'not-available' | 'progress'): ToastType {
    switch (type) {
        case 'available':
            return 'info';
        case 'downloaded':
            return 'success';
        case 'error':
            return 'error';
        case 'not-available':
            return 'info';
        case 'progress':
            return 'progress';
    }
}

/**
 * Get title for notification type
 */
function getTitle(type: 'available' | 'downloaded' | 'error' | 'not-available' | 'progress'): string {
    switch (type) {
        case 'available':
            return 'Update Available';
        case 'downloaded':
            return 'Update Ready';
        case 'error':
            return 'Update Error';
        case 'not-available':
            return 'Up to Date';
        case 'progress':
            return 'Downloading Update';
    }
}

/**
 * Get message for notification type
 */
function getMessage(
    type: 'available' | 'downloaded' | 'error' | 'not-available' | 'progress',
    version: string | undefined,
    errorMessage: string | null,
    downloadProgress: number | null
): string {
    switch (type) {
        case 'available':
            return `Version ${version} is downloading...`;
        case 'downloaded':
            return `Version ${version} is ready to install.`;
        case 'error':
            return errorMessage || 'An error occurred while updating.';
        case 'not-available':
            return `Gemini Desktop is up to date (v${version}).`;
        case 'progress':
            return typeof downloadProgress === 'number'
                ? `Downloading... ${Math.round(downloadProgress)}%`
                : 'Downloading...';
    }
}

// ============================================================================
// Provider Component
// ============================================================================

/**
 * Provider component that manages update notifications globally.
 *
 * Features:
 * - Subscribes to IPC update events
 * - Uses generic ToastContext to display update notifications
 * - Exposes update state (including hasPendingUpdate for badge)
 */
export function UpdateToastProvider({ children }: UpdateToastProviderProps) {
    const { showToast, dismissToast } = useToast();
    const [currentToastId, setCurrentToastId] = useState<string | null>(null);

    // Use ref to track callbacks for actions to avoid stale closures
    const callbacksRef = useRef<{
        onInstall: () => void;
        onLater: () => void;
        onDismiss: () => void;
    } | null>(null);

    const {
        type,
        updateInfo,
        errorMessage,
        visible,
        hasPendingUpdate,
        downloadProgress,
        dismissNotification: baseDismissNotification,
        handleLater: baseHandleLater,
        installUpdate: baseInstallUpdate,
    } = useUpdateNotifications();

    // Stable ID for update toasts (must match the ID used in showToast below)
    const UPDATE_TOAST_ID = 'update-notification';

    /**
     * Dismiss the current toast and call the base dismiss function
     */
    const dismissNotification = useCallback(() => {
        // Always dismiss using the stable ID to avoid race condition with queueMicrotask
        dismissToast(UPDATE_TOAST_ID);
        setCurrentToastId(null);
        baseDismissNotification();
    }, [dismissToast, baseDismissNotification]);

    /**
     * Handle "Later" action - dismiss toast but keep pending flag
     */
    const handleLater = useCallback(() => {
        // Always dismiss using the stable ID to avoid race condition with queueMicrotask
        dismissToast(UPDATE_TOAST_ID);
        setCurrentToastId(null);
        baseHandleLater();
    }, [dismissToast, baseHandleLater]);

    /**
     * Install the update
     */
    const installUpdate = useCallback(() => {
        // Always dismiss using the stable ID to avoid race condition with queueMicrotask
        dismissToast(UPDATE_TOAST_ID);
        setCurrentToastId(null);
        baseInstallUpdate();
    }, [dismissToast, baseInstallUpdate]);

    // Update callbacks ref in effect to avoid updating during render
    useEffect(() => {
        callbacksRef.current = {
            onInstall: installUpdate,
            onLater: handleLater,
            onDismiss: dismissNotification,
        };
    }, [installUpdate, handleLater, dismissNotification]);

    /**
     * Show or update toast when update state changes
     */
    useEffect(() => {
        if (!visible || !type) {
            if (currentToastId) {
                dismissToast(currentToastId);
                queueMicrotask(() => setCurrentToastId(null));
            }
            return;
        }

        const actions: ToastAction[] = [];
        if (type === 'downloaded') {
            actions.push({
                label: 'Restart Now',
                onClick: () => callbacksRef.current?.onInstall(),
                primary: true,
            });
            actions.push({
                label: 'Later',
                onClick: () => callbacksRef.current?.onLater(),
                primary: false,
            });
        }

        const version = updateInfo?.version;
        const message = getMessage(type, version, errorMessage, downloadProgress);

        if (type === 'available' || type === 'downloaded' || type === 'not-available') {
            const releaseNotesAction: ToastAction = {
                label: 'View Release Notes',
                onClick: () => window.open(getReleaseNotesUrl(version)),
                primary: type !== 'downloaded',
            };

            actions.push(releaseNotesAction);
        }

        if (currentToastId && currentToastId !== UPDATE_TOAST_ID) {
            dismissToast(currentToastId);
        }

        const id = showToast({
            id: UPDATE_TOAST_ID,
            type: mapToToastType(type),
            title: getTitle(type),
            message,
            progress: type === 'progress' ? (downloadProgress ?? undefined) : undefined,
            actions: actions.length > 0 ? actions : undefined,
            persistent: true,
        });

        queueMicrotask(() => setCurrentToastId(id));
    }, [type, visible, updateInfo, errorMessage, downloadProgress, showToast, dismissToast]);

    const contextValue: UpdateToastContextType = {
        type,
        updateInfo,
        errorMessage,
        visible,
        hasPendingUpdate,
        downloadProgress,
        dismissNotification,
        handleLater,
        installUpdate,
    };

    return <UpdateToastContext.Provider value={contextValue}>{children}</UpdateToastContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access update toast context.
 *
 * Use this to check if an update is pending (for badge indicator).
 * Must be used within UpdateToastProvider.
 *
 * @returns Update toast context with state and actions
 * @throws Error if used outside of UpdateToastProvider
 *
 * @example
 * const { hasPendingUpdate, installUpdate } = useUpdateToast();
 */
export function useUpdateToast(): UpdateToastContextType {
    const context = useContext(UpdateToastContext);
    if (context === undefined) {
        throw new Error('useUpdateToast must be used within an UpdateToastProvider');
    }
    return context;
}
