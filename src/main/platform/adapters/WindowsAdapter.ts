/**
 * WindowsAdapter — Windows platform adapter.
 *
 * Encapsulates Windows-specific app configuration, AppUserModelId setup,
 * and native hotkey registration strategy.
 *
 * @module WindowsAdapter
 */

import type { WaylandStatus } from '../../../shared/types/hotkeys';
import type { Logger } from '../../types';
import type { PlatformAdapter } from '../PlatformAdapter';
import type { HotkeyRegistrationPlan } from '../types';
import { APP_ID } from '../../utils/constants';

/** Default WaylandStatus for non-Linux platforms */
const DEFAULT_WAYLAND_STATUS: WaylandStatus = {
    isWayland: false,
    desktopEnvironment: 'unknown',
    deVersion: null,
    portalAvailable: false,
    portalMethod: 'none',
};

export class WindowsAdapter implements PlatformAdapter {
    readonly id = 'windows' as const;

    /**
     * Apply Windows-specific app configuration at startup.
     * Sets the display name shown in the taskbar and window titles.
     */
    applyAppConfiguration(app: Electron.App, _logger: Logger): void {
        app.setName('Gemini Desktop');
    }

    /**
     * Set Windows Application User Model ID for notification branding
     * and taskbar grouping.
     */
    applyAppUserModelId(app: Electron.App): void {
        app.setAppUserModelId(APP_ID);
    }

    /**
     * Windows uses Electron's native globalShortcut API.
     */
    getHotkeyRegistrationPlan(): HotkeyRegistrationPlan {
        return {
            mode: 'native',
            waylandStatus: DEFAULT_WAYLAND_STATUS,
        };
    }

    /**
     * Windows is not Wayland — return default (all-false) status.
     */
    getWaylandStatus(): WaylandStatus {
        return DEFAULT_WAYLAND_STATUS;
    }

    shouldQuitOnWindowAllClosed(): boolean {
        return true;
    }
}
