/**
 * MacAdapter — macOS platform adapter.
 *
 * Encapsulates macOS-specific app configuration and native hotkey
 * registration strategy. macOS stays in the dock when all windows
 * are closed.
 *
 * @module MacAdapter
 */

import type { WaylandStatus } from '../../../shared/types/hotkeys';
import type { Logger } from '../../types';
import type { PlatformAdapter } from '../PlatformAdapter';
import type { HotkeyRegistrationPlan } from '../types';

/** Default WaylandStatus for non-Linux platforms */
const DEFAULT_WAYLAND_STATUS: WaylandStatus = {
    isWayland: false,
    desktopEnvironment: 'unknown',
    deVersion: null,
    portalAvailable: false,
    portalMethod: 'none',
};

export class MacAdapter implements PlatformAdapter {
    readonly id = 'mac' as const;

    /**
     * Apply macOS-specific app configuration at startup.
     * Sets the display name shown in the menu bar and Dock.
     */
    applyAppConfiguration(app: Electron.App, _logger: Logger): void {
        app.setName('Gemini Desktop');
    }

    /**
     * No-op on macOS — AppUserModelId is Windows-only.
     */
    applyAppUserModelId(_app: Electron.App): void {
        // No-op on macOS
    }

    /**
     * macOS uses Electron's native globalShortcut API.
     */
    getHotkeyRegistrationPlan(): HotkeyRegistrationPlan {
        return {
            mode: 'native',
            waylandStatus: DEFAULT_WAYLAND_STATUS,
        };
    }

    /**
     * macOS is not Wayland — return default (all-false) status.
     */
    getWaylandStatus(): WaylandStatus {
        return DEFAULT_WAYLAND_STATUS;
    }

    /**
     * macOS stays in the dock when all windows are closed.
     */
    shouldQuitOnWindowAllClosed(): boolean {
        return false;
    }
}
