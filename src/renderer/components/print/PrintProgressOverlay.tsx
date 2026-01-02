/**
 * PrintProgressOverlay Component
 *
 * Displays a full-screen overlay during PDF generation showing
 * capture progress and providing a cancel option.
 *
 * @module PrintProgressOverlay
 */

import { motion, AnimatePresence } from 'framer-motion';
import './PrintProgressOverlay.css';

/**
 * Props for the PrintProgressOverlay component
 */
export interface PrintProgressOverlayProps {
  /** Whether the overlay should be visible */
  visible: boolean;
  /** Current page being captured */
  currentPage: number;
  /** Total number of pages to capture */
  totalPages: number;
  /** Progress percentage (0-100) */
  progress: number;
  /** Callback when cancel button is clicked */
  onCancel: () => void;
}

/**
 * Animation variants for the overlay
 */
const overlayVariants = {
  hidden: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

/**
 * Animation variants for the modal
 */
const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.2 },
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.2 },
  },
};

/**
 * PrintProgressOverlay displays PDF generation progress.
 *
 * Shows a centered modal with:
 * - "Generating PDF..." heading
 * - "Capturing page X of Y" text
 * - Progress bar
 * - Cancel button
 */
export function PrintProgressOverlay({
  visible,
  currentPage,
  totalPages,
  progress,
  onCancel,
}: PrintProgressOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="print-progress-overlay"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          data-testid="print-progress-overlay"
        >
          <motion.div
            className="print-progress-modal"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-labelledby="print-progress-title"
            aria-describedby="print-progress-description"
            data-testid="print-progress-modal"
          >
            <div className="print-progress-spinner" aria-hidden="true" />

            <h2 id="print-progress-title" className="print-progress-title">
              Generating PDF...
            </h2>

            <p id="print-progress-description" className="print-progress-description">
              Capturing page {currentPage} of {totalPages}
            </p>

            <div
              className="print-progress-bar-container"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="PDF generation progress"
              data-testid="print-progress-bar"
            >
              <div
                className="print-progress-bar-fill"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>

            <span className="print-progress-percentage" data-testid="print-progress-percentage">
              {Math.round(progress)}%
            </span>

            <button
              className="print-progress-cancel"
              onClick={onCancel}
              type="button"
              data-testid="print-progress-cancel"
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PrintProgressOverlay;
