/**
 * WindowsAdapter — Windows platform adapter.
 *
 * Encapsulates Windows-specific app configuration, AppUserModelId setup,
 * native hotkey registration strategy, badge overlay, tray behavior,
 * and menu configuration.
 *
 * @module WindowsAdapter
 */

import type { MenuItemConstructorOptions } from 'electron';
import type { WaylandStatus } from '../../../shared/types/hotkeys';
import type { Logger } from '../../types';
import type { PlatformAdapter } from '../PlatformAdapter';
import type {
    HotkeyRegistrationPlan,
    ShowBadgeParams,
    ClearBadgeParams,
    DockMenuCallbacks,
    MainWindowPlatformConfig,
} from '../types';
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

    // ----- Badge methods -----

    supportsBadges(): boolean {
        return true;
    }

    showBadge(params: ShowBadgeParams): void {
        if (params.window && !params.window.isDestroyed() && params.overlayIcon) {
            params.window.setOverlayIcon(params.overlayIcon, params.description);
        }
    }

    clearBadge(params: ClearBadgeParams): void {
        if (params.window && !params.window.isDestroyed()) {
            params.window.setOverlayIcon(null, '');
        }
    }

    // ----- Window methods -----

    getMainWindowPlatformConfig(): MainWindowPlatformConfig {
        return {};
    }

    hideToTray(window: Electron.BrowserWindow): void {
        window.hide();
        window.setSkipTaskbar(true);
    }

    restoreFromTray(window: Electron.BrowserWindow): void {
        window.show();
        window.focus();
        window.setSkipTaskbar(false);
    }

    // ----- Menu methods -----

    shouldIncludeAppMenu(): boolean {
        return false;
    }

    getSettingsMenuLabel(): string {
        return 'Options';
    }

    getWindowCloseRole(): 'close' | 'quit' {
        return 'quit';
    }

    getDockMenuTemplate(_callbacks: DockMenuCallbacks): MenuItemConstructorOptions[] | null {
        return null;
    }
}
