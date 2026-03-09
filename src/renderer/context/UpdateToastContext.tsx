import React, { createContext, useContext, useEffect, useCallback, useRef } from 'react';
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
function mapToToastType(
    type: 'available' | 'downloaded' | 'error' | 'not-available' | 'progress' | 'manual-available'
): ToastType {
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
        case 'manual-available':
            return 'info';
    }
}

/**
 * Get title for notification type
 */
function getTitle(
    type: 'available' | 'downloaded' | 'error' | 'not-available' | 'progress' | 'manual-available'
): string {
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
        case 'manual-available':
            return 'Update Available';
    }
}

/**
 * Get message for notification type
 */
function getMessage(
    type: 'available' | 'downloaded' | 'error' | 'not-available' | 'progress' | 'manual-available',
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
        case 'manual-available':
            return `Version ${version} is available. Download it from the releases page.`;
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
    const { showToast, dismissToast, toasts } = useToast();

    // Use ref to track callbacks for actions to avoid stale closures
    const callbacksRef = useRef<{
        onInstall: () => void;
        onLater: () => void;
        onDismiss: () => void;
    } | null>(null);

    const pendingToastRef = useRef(false);

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
        baseDismissNotification();
    }, [dismissToast, baseDismissNotification]);

    /**
     * Handle "Later" action - dismiss toast but keep pending flag
     */
    const handleLater = useCallback(() => {
        // Always dismiss using the stable ID to avoid race condition with queueMicrotask
        dismissToast(UPDATE_TOAST_ID);
        baseHandleLater();
    }, [dismissToast, baseHandleLater]);

    /**
     * Install the update
     */
    const installUpdate = useCallback(() => {
        // Always dismiss using the stable ID to avoid race condition with queueMicrotask
        dismissToast(UPDATE_TOAST_ID);
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
            dismissToast(UPDATE_TOAST_ID);
            pendingToastRef.current = false;
            return;
        }

        const actions: ToastAction[] = [];
        const version = updateInfo?.version;
        if (type === 'manual-available') {
            actions.push({
                label: 'Download',
                onClick: () => window.open(getReleaseNotesUrl(version)),
                primary: true,
            });
        }
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

        const message = getMessage(type, version, errorMessage, downloadProgress);

        if (type === 'available' || type === 'downloaded' || type === 'not-available') {
            const releaseNotesAction: ToastAction = {
                label: 'View Release Notes',
                onClick: () => window.open(getReleaseNotesUrl(version)),
                primary: type !== 'downloaded',
            };

            actions.push(releaseNotesAction);
        }

        pendingToastRef.current = true;
        showToast({
            id: UPDATE_TOAST_ID,
            type: mapToToastType(type),
            title: getTitle(type),
            message,
            progress: type === 'progress' ? (downloadProgress ?? undefined) : undefined,
            actions: actions.length > 0 ? actions : undefined,
            persistent: true,
        });
    }, [type, visible, updateInfo, errorMessage, downloadProgress, showToast, dismissToast]);

    useEffect(() => {
        if (!visible || !type) {
            return;
        }

        const hasUpdateToast = toasts.some((toast) => toast.id === UPDATE_TOAST_ID);

        if (pendingToastRef.current) {
            if (hasUpdateToast) {
                pendingToastRef.current = false;
            }
            return;
        }

        if (!hasUpdateToast) {
            baseDismissNotification();
        }
    }, [visible, type, toasts, baseDismissNotification]);

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
// eslint-disable-next-line react-refresh/only-export-components -- context hook export pattern used across renderer contexts
export function useUpdateToast(): UpdateToastContextType {
    const context = useContext(UpdateToastContext);
    if (context === undefined) {
        throw new Error('useUpdateToast must be used within an UpdateToastProvider');
    }
    return context;
}
