/**
 * Generic Toast Notification Component
 *
 * Displays toast notifications for various event types:
 * - Success (green) - confirmations, completed actions
 * - Error (red) - failures, error messages
 * - Info (blue) - informational messages
 * - Warning (yellow) - warnings, cautions
 * - Progress (blue) - shows progress bar
 *
 * Position: Managed by ToastContainer (bottom-left corner)
 * @module Toast
 */

import './Toast.css';

/**
 * Toast notification types
 */
export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'progress';

/**
 * Action button for toast
 */
export interface ToastAction {
  /** Button label text */
  label: string;
  /** Click handler */
  onClick: () => void;
  /** Whether this is the primary action (uses accent styling) */
  primary?: boolean;
}

/**
 * Props for the Toast component
 */
export interface ToastProps {
  /** Unique identifier for the toast */
  id: string;
  /** Type of toast notification */
  type: ToastType;
  /** Optional title (bold header) */
  title?: string;
  /** Toast message content */
  message: string;
  /** Custom icon override (emoji or text) */
  icon?: string;
  /** Progress percentage (0-100) for progress type */
  progress?: number;
  /** Action buttons to display */
  actions?: ToastAction[];
  /** Callback when toast is dismissed */
  onDismiss: () => void;
}

/**
 * Get default emoji icon for notification type
 */
function getDefaultIcon(type: ToastType): string {
  switch (type) {
    case 'success':
      return '✅';
    case 'error':
      return '❌';
    case 'info':
      return 'ℹ️';
    case 'warning':
      return '⚠️';
    case 'progress':
      return '⏳';
  }
}

/**
 * Generic Toast notification component
 *
 * @example
 * ```tsx
 * <Toast
 *   id="my-toast"
 *   type="success"
 *   title="Saved"
 *   message="Your changes have been saved."
 *   onDismiss={() => dismissToast('my-toast')}
 * />
 * ```
 */
export function Toast({
  id,
  type,
  title,
  message,
  icon,
  progress,
  actions,
  onDismiss,
}: ToastProps) {
  return (
    <div
      className={`toast toast--${type}`}
      role="alert"
      aria-live="polite"
      data-testid="toast"
      data-toast-id={id}
    >
      <div className="toast__icon" aria-hidden="true">
        {icon ?? getDefaultIcon(type)}
      </div>

      <div className="toast__content">
        {title && (
          <div className="toast__title" data-testid="toast-title">
            {title}
          </div>
        )}
        <div className="toast__message" data-testid="toast-message">
          {message}
        </div>

        {type === 'progress' && typeof progress === 'number' && (
          <div
            className="toast__progress-container"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="toast__progress-bar"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
      </div>

      <div className="toast__actions">
        {actions?.map((action, index) => (
          <button
            key={index}
            className={`toast__button ${action.primary ? 'toast__button--primary' : 'toast__button--secondary'}`}
            onClick={action.onClick}
            data-testid={`toast-action-${index}`}
          >
            {action.label}
          </button>
        ))}

        <button
          className="toast__button toast__button--dismiss"
          onClick={onDismiss}
          data-testid="toast-dismiss"
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default Toast;
