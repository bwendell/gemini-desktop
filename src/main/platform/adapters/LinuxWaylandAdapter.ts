/**
 * LinuxWaylandAdapter — Linux under Wayland compositor.
 *
 * Encapsulates Linux Wayland-specific app configuration and hotkey
 * registration strategy. Delegates Wayland detection to the existing
 * `getWaylandPlatformStatus()` in constants.ts (which wraps waylandDetector).
 *
 * @module LinuxWaylandAdapter
 */

import type { WaylandStatus } from '../../../shared/types/hotkeys';
import type { Logger } from '../../types';
import type { PlatformAdapter } from '../PlatformAdapter';
import type { HotkeyRegistrationPlan } from '../types';
import { getWaylandPlatformStatus } from '../../utils/constants';

export class LinuxWaylandAdapter implements PlatformAdapter {
    readonly id = 'linux-wayland' as const;

    /**
     * Apply Linux-specific app configuration at startup.
     *
     * Sets app name, WM_CLASS, desktop name for portal integration,
     * and logs Wayland detection status with portal availability.
     */
    applyAppConfiguration(app: Electron.App, logger: Logger): void {
        // Set internal app name to match the executable/id for better WM_CLASS matching
        app.setName('gemini-desktop');

        // Set the Wayland app_id / X11 WM_CLASS so KDE and other DEs identify the app
        // correctly in portal dialogs and task managers (instead of "org.chromium.Chromium")
        app.commandLine.appendSwitch('class', 'gemini-desktop');

        // Set desktop name for portal integration
        try {
            if (typeof (app as any).setDesktopName === 'function') {
                (app as any).setDesktopName('gemini-desktop');
            }
        } catch (e) {
            logger.error('Error calling setDesktopName:', e);
        }

        // Wayland Global Shortcuts Detection
        const waylandStatus = getWaylandPlatformStatus();
        logger.log('Wayland detection:', JSON.stringify(waylandStatus));

        if (waylandStatus.isWayland && waylandStatus.portalAvailable) {
            // NOTE: We intentionally do NOT enable Chromium's GlobalShortcutsPortal feature flag.
            // Chromium's globalShortcut.register() reports false positive success on KDE Plasma 6
            // and interferes with our direct D-Bus portal session. We handle global shortcuts
            // entirely via dbus-next in hotkeyManager._registerViaDBusDirect().
            logger.log('Wayland detected with portal — will use D-Bus portal for global shortcuts');
        } else if (waylandStatus.isWayland) {
            logger.warn(
                `Wayland detected but portal unavailable. DE: ${waylandStatus.desktopEnvironment}, Version: ${waylandStatus.deVersion}`
            );
        }
    }

    /**
     * No-op on Linux — AppUserModelId is Windows-only.
     */
    applyAppUserModelId(_app: Electron.App): void {
        // No-op on Linux
    }

    /**
     * Determine hotkey registration strategy for Wayland.
     *
     * Returns `wayland-dbus` when the XDG Desktop Portal GlobalShortcuts
     * interface is available, `disabled` otherwise.
     */
    getHotkeyRegistrationPlan(): HotkeyRegistrationPlan {
        const waylandStatus = getWaylandPlatformStatus();
        return {
            mode: waylandStatus.portalAvailable ? 'wayland-dbus' : 'disabled',
            waylandStatus,
        };
    }

    /**
     * Get the real Wayland detection status for diagnostic/UI reporting.
     */
    getWaylandStatus(): WaylandStatus {
        return getWaylandPlatformStatus();
    }

    shouldQuitOnWindowAllClosed(): boolean {
        return true;
    }
}
