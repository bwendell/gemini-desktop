/**
 * Update Toast Context
 *
 * Provides update notification state throughout the application.
 * Renders the UpdateToast component at app root level and exposes
 * update state for components like the titlebar badge.
 *
 * @module UpdateToastContext
 */

import React, { createContext, useContext } from 'react';
import { UpdateToast } from '../components/toast';
import { useUpdateNotifications } from '../hooks/useUpdateNotifications';
import type { UpdateNotificationState } from '../hooks/useUpdateNotifications';

// ============================================================================
// Context Types
// ============================================================================

interface UpdateToastContextType extends UpdateNotificationState {
  /** Dismiss the current toast notification */
  dismissNotification: () => void;
  /** Handle "Later" action - dismiss but keep pending flag */
  handleLater: () => void;
  /** Install the downloaded update */
  installUpdate: () => void;
}

// ============================================================================
// Context
// ============================================================================

const UpdateToastContext = createContext<UpdateToastContextType | undefined>(undefined);

interface UpdateToastProviderProps {
  children: React.ReactNode;
}

// ============================================================================
// Provider Component
// ============================================================================

/**
 * Provider component that manages update notifications globally.
 *
 * Features:
 * - Subscribes to IPC update events
 * - Renders UpdateToast at app root level
 * - Exposes update state (including hasPendingUpdate for badge)
 */
export function UpdateToastProvider({ children }: UpdateToastProviderProps) {
  const {
    type,
    updateInfo,
    errorMessage,
    visible,
    hasPendingUpdate,
    downloadProgress,
    dismissNotification,
    handleLater,
    installUpdate,
  } = useUpdateNotifications();

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

  return (
    <UpdateToastContext.Provider value={contextValue}>
      {children}

      {/* Render toast at root level */}
      {type && (
        <UpdateToast
          type={type}
          updateInfo={updateInfo ?? undefined}
          errorMessage={errorMessage ?? undefined}
          visible={visible}
          downloadProgress={downloadProgress}
          onDismiss={dismissNotification}
          onInstall={installUpdate}
          onLater={handleLater}
        />
      )}
    </UpdateToastContext.Provider>
  );
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
