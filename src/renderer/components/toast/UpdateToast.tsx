/**
 * Update Toast Notification Component
 *
 * Displays toast notifications for auto-update events:
 * - Update available (info)
 * - Update downloaded (success with action buttons)
 * - Update error (error message)
 *
 * Position: Bottom-left corner with slide-in animation
 * @module UpdateToast
 */

import { motion, AnimatePresence } from 'framer-motion';
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
  // Debug logging
  console.log('[UpdateToast] Render - visible:', visible, 'type:', type);
  
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
          role="alert"
          aria-live="polite"
          data-testid="update-toast"
        >
          <div className="update-toast__icon" aria-hidden="true">
            {getIcon(type)}
          </div>

          <div className="update-toast__content">
            <div className="update-toast__title" data-testid="update-toast-title">
              {getTitle(type)}
            </div>
            <div className="update-toast__message" data-testid="update-toast-message">
              {getMessage()}
            </div>

            {type === 'progress' && typeof downloadProgress === 'number' && (
              <div
                className="update-toast__progress-container"
                role="progressbar"
                aria-valuenow={downloadProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="update-toast__progress-bar"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            )}
          </div>

          <div className="update-toast__actions">
            {type === 'downloaded' && onInstall && (
              <button
                className="update-toast__button update-toast__button--primary"
                onClick={onInstall}
                data-testid="update-toast-restart"
              >
                Restart Now
              </button>
            )}

            {type === 'downloaded' && onLater && (
              <button
                className="update-toast__button update-toast__button--secondary"
                onClick={onLater}
                data-testid="update-toast-later"
              >
                Later
              </button>
            )}

            {type !== 'downloaded' && (
              <button
                className="update-toast__button update-toast__button--secondary"
                onClick={onDismiss}
                data-testid="update-toast-dismiss"
                aria-label="Dismiss notification"
              >
                ✕
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default UpdateToast;
