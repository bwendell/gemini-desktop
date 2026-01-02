/**
 * Toast Container Component
 *
 * Manages toast stack rendering and animations:
 * - Fixed position in bottom-left corner
 * - Stacks toasts vertically (newest on top)
 * - Limits max visible toasts to 5, queuing extras
 * - Uses framer-motion for enter/exit animations
 *
 * @module ToastContainer
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Toast, ToastProps } from './Toast';
import './ToastContainer.css';

/** Maximum number of visible toasts at once */
const MAX_VISIBLE_TOASTS = 5;

/**
 * Toast item with all required props
 */
export interface ToastItem extends Omit<ToastProps, 'onDismiss'> {
  /** Unique identifier for the toast */
  id: string;
}

/**
 * Props for the ToastContainer component
 */
export interface ToastContainerProps {
  /** Array of toast items to display */
  toasts: ToastItem[];
  /** Callback when a toast is dismissed */
  onDismiss: (id: string) => void;
}

/**
 * Animation variants for individual toasts
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
 * Toast Container component
 *
 * Renders a stack of toast notifications in the bottom-left corner.
 * Newest toasts appear on top, oldest at bottom.
 * Only shows up to MAX_VISIBLE_TOASTS at once.
 *
 * @example
 * ```tsx
 * <ToastContainer
 *   toasts={[
 *     { id: '1', type: 'success', message: 'Saved!' },
 *     { id: '2', type: 'error', message: 'Failed to save' },
 *   ]}
 *   onDismiss={(id) => removeToast(id)}
 * />
 * ```
 */
export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  // Show only the most recent MAX_VISIBLE_TOASTS
  // Newest toasts are at the end of the array, so we slice from the end
  const visibleToasts = toasts.slice(-MAX_VISIBLE_TOASTS);

  // Reverse so newest appears on top (rendered first in flex-column-reverse)
  const orderedToasts = [...visibleToasts].reverse();

  return (
    <div
      className="toast-container"
      role="region"
      aria-label="Notifications"
      data-testid="toast-container"
    >
      <AnimatePresence mode="popLayout">
        {orderedToasts.map((toast) => (
          <motion.div
            key={toast.id}
            variants={toastVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            layout
          >
            <Toast {...toast} onDismiss={() => onDismiss(toast.id)} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default ToastContainer;
