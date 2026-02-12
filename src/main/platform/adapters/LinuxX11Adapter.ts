/**
 * LinuxX11Adapter — Linux under X11 display server.
 *
 * Encapsulates Linux X11-specific app configuration and hotkey
 * registration strategy. X11 does not support global hotkeys through
 * Electron's globalShortcut API, so hotkeys are always disabled.
 *
 * @module LinuxX11Adapter
 */

import type { WaylandStatus } from '../../../shared/types/hotkeys';
import type { Logger } from '../../types';
import type { PlatformAdapter } from '../PlatformAdapter';
import type { HotkeyRegistrationPlan } from '../types';

/** Default WaylandStatus for non-Wayland contexts */
const DEFAULT_WAYLAND_STATUS: WaylandStatus = {
    isWayland: false,
    desktopEnvironment: 'unknown',
    deVersion: null,
    portalAvailable: false,
    portalMethod: 'none',
};

export class LinuxX11Adapter implements PlatformAdapter {
    readonly id = 'linux-x11' as const;

    /**
     * Apply Linux-specific app configuration at startup.
     *
     * Sets app name, WM_CLASS, and desktop name for proper DE integration.
     * Does NOT log Wayland-specific messages (this is X11).
     */
    applyAppConfiguration(app: Electron.App, logger: Logger): void {
        // Set internal app name to match the executable/id for better WM_CLASS matching
        app.setName('gemini-desktop');

        // Set X11 WM_CLASS so DEs identify the app correctly in task managers
        app.commandLine.appendSwitch('class', 'gemini-desktop');

        // Set desktop name for integration
        try {
            if (typeof (app as any).setDesktopName === 'function') {
                (app as any).setDesktopName('gemini-desktop');
            }
        } catch (e) {
            logger.error('Error calling setDesktopName:', e);
        }
    }

    /**
     * No-op on Linux — AppUserModelId is Windows-only.
     */
    applyAppUserModelId(_app: Electron.App): void {
        // No-op on Linux
    }

    /**
     * X11 does not support global hotkeys through Electron — always disabled.
     */
    getHotkeyRegistrationPlan(): HotkeyRegistrationPlan {
        return {
            mode: 'disabled',
            waylandStatus: DEFAULT_WAYLAND_STATUS,
        };
    }

    /**
     * X11 is not Wayland — return default (all-false) status.
     */
    getWaylandStatus(): WaylandStatus {
        return DEFAULT_WAYLAND_STATUS;
    }

    shouldQuitOnWindowAllClosed(): boolean {
        return true;
    }
}
