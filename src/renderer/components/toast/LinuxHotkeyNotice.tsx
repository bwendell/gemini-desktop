/**
 * Linux Hotkey Notice Toast Component
 *
 * Displays an informational notice on Linux about global hotkeys being disabled.
 * This is shown once on app startup when running on Linux.
 *
 * @module LinuxHotkeyNotice
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { isLinux } from '../../utils/platform';
import './LinuxHotkeyNotice.css';

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
 * Local storage key for tracking if notice has been dismissed
 */
const STORAGE_KEY = 'linux-hotkey-notice-dismissed';

/**
 * Linux Hotkey Notice component
 * 
 * Shows an informational toast on Linux explaining that global hotkeys
 * are disabled due to Wayland limitations.
 */
export function LinuxHotkeyNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show on Linux
    if (!isLinux()) return;

    // Check if user has already dismissed this notice
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) return;

    // Show after a short delay to let the app load
    const timer = setTimeout(() => {
      setVisible(true);
    }, 2000);

    // Auto-hide after 10 seconds
    const autoHideTimer = setTimeout(() => {
      setVisible(false);
    }, 12000);

    return () => {
      clearTimeout(timer);
      clearTimeout(autoHideTimer);
    };
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="linux-hotkey-notice"
          variants={toastVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="alert"
          aria-live="polite"
          data-testid="linux-hotkey-notice"
        >
          <div className="linux-hotkey-notice__icon" aria-hidden="true">
            ℹ️
          </div>

          <div className="linux-hotkey-notice__content">
            <div className="linux-hotkey-notice__title">
              Global Hotkeys Disabled
            </div>
            <div className="linux-hotkey-notice__message">
              Global keyboard shortcuts are currently unavailable on Linux due to 
              Wayland limitations. You can configure custom shortcuts in your 
              desktop environment settings.
            </div>
          </div>

          <button
            className="linux-hotkey-notice__dismiss"
            onClick={handleDismiss}
            aria-label="Dismiss notification"
            data-testid="linux-hotkey-notice-dismiss"
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default LinuxHotkeyNotice;
