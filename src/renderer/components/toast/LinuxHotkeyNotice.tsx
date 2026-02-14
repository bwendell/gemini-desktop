/**
 * Linux Hotkey Notice Toast Component
 *
 * Displays a conditional warning toast on Linux about global hotkeys.
 * Only shows toast when global hotkeys fail or are unsupported.
 * Silent success when Wayland + portal is working correctly.
 *
 * Uses the ToastContext system for theme consistency and duplicate prevention.
 *
 * @module LinuxHotkeyNotice
 */

import { useEffect, useRef } from 'react';
import { useToast } from '../../context/ToastContext';
import { isLinux } from '../../utils/platform';
import type { PlatformHotkeyStatus, DesktopEnvironment } from '../../../shared/types/hotkeys';

/**
 * Toast ID for duplicate prevention
 */
const TOAST_ID = 'linux-hotkey-notice';

/**
 * Delay before showing the toast (ms)
 * Increased to 1000ms to allow time for IPC response
 */
const SHOW_DELAY_MS = 1000;

/**
 * Toast duration (ms)
 */
const TOAST_DURATION_MS = 20000;

function getDisplayName(de: DesktopEnvironment): string | null {
    if (de === 'kde') return 'KDE Plasma';
    if (de === 'gnome') return 'GNOME';
    if (de === 'hyprland') return 'Hyprland';
    if (de === 'sway') return 'Sway';
    if (de === 'cosmic') return 'COSMIC';
    if (de === 'deepin') return 'Deepin';
    return null;
}

/**
 * Linux Hotkey Notice component
 *
 * Shows a warning toast on Linux only when global hotkeys fail or are unsupported.
 * Implements silent success - no toast when everything works correctly.
 */
export function LinuxHotkeyNotice() {
    const { showWarning } = useToast();
    const hasShownRef = useRef(false);

    useEffect(() => {
        // Only show on Linux
        if (!isLinux()) return;

        // Prevent duplicate toasts from strict mode double-mount
        if (hasShownRef.current) return;

        // Show after a delay to let the app initialize and await IPC response
        const timer = setTimeout(async () => {
            // Query platform status from main process
            let status: PlatformHotkeyStatus | null = null;
            try {
                status = (await window.electronAPI?.getPlatformHotkeyStatus?.()) ?? null;
            } catch {
                // If IPC fails, fall back to showing warning (defensive)
            }

            hasShownRef.current = true;

            // If global hotkeys are enabled, check for partial failures
            if (status?.globalHotkeysEnabled) {
                const failures = status.registrationResults.filter((r) => !r.success);
                if (failures.length === 0) {
                    return; // All good, no toast needed
                }

                // Partial failure — warn about specific shortcuts
                const failedNames = failures.map((f) => f.hotkeyId).join(', ');
                showWarning(
                    `Some global shortcuts could not be registered: ${failedNames}. These may conflict with other applications.`,
                    {
                        id: TOAST_ID,
                        title: 'Hotkey Registration Partial',
                        duration: TOAST_DURATION_MS,
                    }
                );
                return;
            }

            // Hotkeys not enabled — show appropriate message
            const waylandStatus = status?.waylandStatus;
            const failures = status?.registrationResults.filter((result) => !result.success) ?? [];
            const deName = waylandStatus ? getDisplayName(waylandStatus.desktopEnvironment) : null;

            let message: string;

            if (failures.length > 0) {
                const failedNames = failures.map((failure) => failure.hotkeyId).join(', ');
                const failureDetails = Array.from(
                    new Set(
                        failures
                            .map((failure) => failure.error)
                            .filter((error): error is string => Boolean(error?.trim()))
                    )
                );

                if (failureDetails.length > 0) {
                    message = `Global shortcuts could not be registered: ${failedNames}. ${failureDetails.join('; ')}.`;
                } else {
                    message = `Global shortcuts could not be registered: ${failedNames}.`;
                }
            } else if (waylandStatus?.isWayland) {
                if (!waylandStatus.portalAvailable) {
                    message = deName
                        ? `Global shortcuts are not available on ${deName}. Portal registration is unavailable because the desktop environment is unsupported or no Wayland session bus was detected.`
                        : 'Global shortcuts are not available. Portal registration is unavailable because the desktop environment is unsupported or no Wayland session bus was detected.';
                } else {
                    message = deName
                        ? `Global shortcuts are currently disabled on ${deName}. Enable them in Settings to register shortcuts.`
                        : 'Global shortcuts are currently disabled. Enable them in Settings to register shortcuts.';
                }
            } else {
                message = deName
                    ? `Global shortcuts are not available on ${deName}.`
                    : 'Global shortcuts are not available.';
            }

            showWarning(message, {
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
