/**
 * MacAdapter — macOS platform adapter.
 *
 * Encapsulates macOS-specific app configuration, native hotkey registration
 * strategy, dock badge, tray behavior, and menu configuration. macOS stays
 * in the dock when all windows are closed.
 *
 * @module MacAdapter
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

    getTitleBarStyle(): TitleBarStyle {
        return 'hidden';
    }

    getAppIconFilename(): AppIconFilename {
        return 'icon.png';
    }

    shouldDisableUpdates(_env: NodeJS.ProcessEnv): boolean {
        return false;
    }

    async requestMediaPermissions(logger: Logger): Promise<void> {
        const { systemPreferences } = await import('electron');
        if (systemPreferences.askForMediaAccess) {
            const granted = await systemPreferences.askForMediaAccess('microphone');
            logger.log(`macOS microphone access: ${granted ? 'granted' : 'denied'}`);
        }
    }

    getNotificationSupportHint(): string | undefined {
        return undefined;
    }

    // ----- Badge methods -----

    supportsBadges(): boolean {
        return true;
    }

    showBadge(params: ShowBadgeParams, app?: Electron.App): void {
        app?.dock?.setBadge(params.text);
    }

    clearBadge(_params: ClearBadgeParams, app?: Electron.App): void {
        app?.dock?.setBadge('');
    }

    // ----- Window methods -----

    getMainWindowPlatformConfig(): MainWindowPlatformConfig {
        return {};
    }

    /**
     * macOS: only hide, do NOT skip taskbar (Dock stays visible).
     */
    hideToTray(window: Electron.BrowserWindow): void {
        window.hide();
    }

    /**
     * macOS: show and focus, no taskbar restoration needed.
     */
    restoreFromTray(window: Electron.BrowserWindow): void {
        window.show();
        window.focus();
    }

    // ----- Menu methods -----

    shouldIncludeAppMenu(): boolean {
        return true;
    }

    getSettingsMenuLabel(): string {
        return 'Settings...';
    }

    getWindowCloseRole(): 'close' | 'quit' {
        return 'close';
    }

    getDockMenuTemplate(callbacks: DockMenuCallbacks): MenuItemConstructorOptions[] | null {
        return [
            {
                label: 'Show Gemini',
                click: () => callbacks.restoreFromTray(),
            },
            { type: 'separator' },
            {
                label: 'Settings',
                click: () => callbacks.createOptionsWindow(),
            },
        ];
    }
}
