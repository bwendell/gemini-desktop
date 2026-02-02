/**
 * Linux Hotkey Notice Toast Component
 *
 * Displays a warning toast on Linux about global hotkeys being disabled.
 * Shows on each app startup when running on Linux.
 *
 * Uses the ToastContext system for theme consistency and duplicate prevention.
 *
 * @module LinuxHotkeyNotice
 */

import { useEffect, useRef } from 'react';
import { useToast } from '../../context/ToastContext';
import { isLinux } from '../../utils/platform';

/**
 * Toast ID for duplicate prevention
 */
const TOAST_ID = 'linux-hotkey-notice';

/**
 * Delay before showing the toast (ms)
 */
const SHOW_DELAY_MS = 500;

/**
 * Toast duration (ms)
 */
const TOAST_DURATION_MS = 5000;

/**
 * Linux Hotkey Notice component
 *
 * Shows a warning toast on Linux explaining that global hotkeys
 * are disabled due to Wayland limitations. Uses the existing toast
 * system for consistent theming.
 */
export function LinuxHotkeyNotice() {
    const { showWarning } = useToast();
    const hasShownRef = useRef(false);

    useEffect(() => {
        // Only show on Linux
        if (!isLinux()) return;

        // Prevent duplicate toasts from strict mode double-mount
        if (hasShownRef.current) return;
        hasShownRef.current = true;

        // Show after a short delay to let the app initialize
        const timer = setTimeout(() => {
            showWarning('Global keyboard shortcuts are currently unavailable on Linux due to Wayland limitations.', {
                id: TOAST_ID,
                title: 'Global Hotkeys Disabled',
                duration: TOAST_DURATION_MS,
            });
        }, SHOW_DELAY_MS);

        return () => {
            clearTimeout(timer);
        };
    }, [showWarning]);

    // This component doesn't render anything directly
    // The toast is rendered by ToastContainer
    return null;
}

export default LinuxHotkeyNotice;
