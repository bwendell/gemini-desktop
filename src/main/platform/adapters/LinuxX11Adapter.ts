/**
 * LinuxX11Adapter — Linux under X11 display server.
 *
 * Encapsulates Linux X11-specific app configuration, hotkey registration
 * strategy, badge/tray/menu behavior. X11 does not support global hotkeys
 * through Electron's globalShortcut API, so hotkeys are always disabled.
 *
 * @module LinuxX11Adapter
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
    TitleBarStyle,
    AppIconFilename,
} from '../types';

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

    getTitleBarStyle(): TitleBarStyle {
        return undefined;
    }

    getAppIconFilename(): AppIconFilename {
        return 'icon.png';
    }

    shouldDisableUpdates(env: NodeJS.ProcessEnv): boolean {
        return !env.APPIMAGE;
    }

    async requestMediaPermissions(_logger: Logger): Promise<void> {
        return;
    }

    getNotificationSupportHint(): string | undefined {
        return (
            'Notifications not supported on this platform. ' +
            'On Linux, ensure libnotify is installed: ' +
            'Ubuntu/Debian: apt install libnotify-bin | ' +
            'Fedora: dnf install libnotify | ' +
            'Arch: pacman -S libnotify'
        );
    }

    // ----- Badge methods -----

    supportsBadges(): boolean {
        return false;
    }

    showBadge(_params: ShowBadgeParams): void {
        // No native badge support on Linux
    }

    clearBadge(_params: ClearBadgeParams): void {
        // No native badge support on Linux
    }

    // ----- Window methods -----

    getMainWindowPlatformConfig(): MainWindowPlatformConfig {
        return { wmClass: 'gemini-desktop' };
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
