/**
 * Update Toast Notification Component
 *
 * Displays toast notifications for auto-update events:
 * - Update available (info)
 * - Update downloaded (success with action buttons)
 * - Update error (error message)
 *
 * Position: Bottom-left corner with slide-in animation
 *
 * This component uses the generic Toast component internally while preserving
 * update-specific logic and behavior.
 *
 * @module UpdateToast
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Toast, ToastType, ToastAction } from './Toast';
import './UpdateToast.css';

/**
 * Update notification types
 */
export type UpdateNotificationType =
  | 'available'
  | 'downloaded'
  | 'error'
  | 'not-available'
  | 'progress';

/**
 * Update information from electron-updater
 */
export interface UpdateInfo {
  version: string;
  releaseName?: string;
  releaseNotes?: string | Array<{ version: string; note: string }>;
}

/**
 * Props for the UpdateToast component
 */
export interface UpdateToastProps {
  /** Type of update notification */
  type: UpdateNotificationType;
  /** Update information (version, release notes) */
  updateInfo?: UpdateInfo;
  /** Error message (for error type) */
  errorMessage?: string;
  /** Whether the toast is visible */
  visible: boolean;
  /** Callback when user dismisses the toast */
  onDismiss: () => void;
  /** Callback when user clicks "Restart Now" */
  onInstall?: () => void;
  /** Callback when user clicks "Later" (download complete only) */
  onLater?: () => void;
  /** Download progress percentage (0-100) */
  downloadProgress?: number | null;
}

/**
 * Animation variants for the toast
 */
const toastVariants = {
  hidden: {
    opacity: 0,
    x: -100,
    transition: { duration: 0.2 },
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    x: -100,
    transition: { duration: 0.2 },
  },
};

/**
 * Map UpdateNotificationType to generic ToastType
 *
 * @param type - The update notification type
 * @returns The corresponding generic toast type
 */
function mapToToastType(type: UpdateNotificationType): ToastType {
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
 * Get icon for notification type
 */
function getIcon(type: UpdateNotificationType): string {
  switch (type) {
    case 'available':
      return '⬇️';
    case 'downloaded':
      return '✅';
    case 'error':
      return '⚠️';
    case 'not-available':
      return 'ℹ️';
    case 'progress':
      return '⏳';
  }
}

/**
 * Get title for notification type
 */
function getTitle(type: UpdateNotificationType): string {
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
 * Update Toast notification component
 *
 * This component wraps the generic Toast component while preserving
 * update-specific functionality like action buttons and custom icons.
 */
export function UpdateToast({
  type,
  updateInfo,
  errorMessage,
  visible,
  downloadProgress,
  onDismiss,
  onInstall,
  onLater,
}: UpdateToastProps) {
  const version = updateInfo?.version;

  const getMessage = (): string => {
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
  };

  /**
   * Build action buttons based on update type
   */
  const getActions = (): ToastAction[] => {
    const actions: ToastAction[] = [];

    if (type === 'downloaded') {
      if (onInstall) {
        actions.push({
          label: 'Restart Now',
          onClick: onInstall,
          primary: true,
        });
      }
      if (onLater) {
        actions.push({
          label: 'Later',
          onClick: onLater,
          primary: false,
        });
      }
    }

    return actions;
  };

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          key="update-toast"
          className={`update-toast update-toast--${type}`}
          variants={toastVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          data-testid="update-toast"
        >
          <Toast
            id="update-toast"
            type={mapToToastType(type)}
            title={getTitle(type)}
            message={getMessage()}
            icon={getIcon(type)}
            progress={type === 'progress' ? (downloadProgress ?? undefined) : undefined}
            actions={getActions()}
            onDismiss={onDismiss}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default UpdateToast;
