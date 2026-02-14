import { createLogger } from './logger';
import type { WaylandStatus, DesktopEnvironment, PortalMethod } from '../../shared/types/hotkeys';

const logger = createLogger('[WaylandDetector]');

export function detectWaylandSession(): boolean {
    const sessionType = process.env.XDG_SESSION_TYPE;
    if (!sessionType) {
        return false;
    }
    return sessionType.toLowerCase() === 'wayland';
}

export function detectDesktopEnvironment(): DesktopEnvironment {
    const desktopEnv = process.env.XDG_CURRENT_DESKTOP;
    if (!desktopEnv) {
        return 'unknown';
    }

    const parts = desktopEnv.split(':');
    for (const part of parts) {
        const normalized = part.toLowerCase();
        if (normalized === 'kde') {
            return 'kde';
        }
        if (normalized === 'gnome') {
            return 'gnome';
        }
        if (normalized === 'hyprland') {
            return 'hyprland';
        }
        if (normalized === 'sway') {
            return 'sway';
        }
        if (normalized === 'cosmic') {
            return 'cosmic';
        }
        if (normalized === 'deepin') {
            return 'deepin';
        }
    }

    return 'unknown';
}

export function detectDEVersion(de: DesktopEnvironment): string | null {
    if (de === 'kde') {
        const version = process.env.KDE_SESSION_VERSION;
        if (!version) {
            return null;
        }

        return version;
    }

    if (de === 'gnome') {
        const sessionId = process.env.GNOME_DESKTOP_SESSION_ID;
        if (!sessionId) {
            return null;
        }

        return sessionId;
    }

    return null;
}

export function isSupportedDE(de: DesktopEnvironment, _version: string | null): boolean {
    return de !== 'unknown';
}

export function getWaylandStatus(): WaylandStatus {
    const isWayland = detectWaylandSession();
    const desktopEnvironment = detectDesktopEnvironment();
    const deVersion = detectDEVersion(desktopEnvironment);
    const hasSessionBus = Boolean(process.env.DBUS_SESSION_BUS_ADDRESS || process.env.XDG_RUNTIME_DIR);
    const portalAvailable = isWayland && isSupportedDE(desktopEnvironment, deVersion) && hasSessionBus;
    const portalMethod: PortalMethod = 'none';

    const status: WaylandStatus = {
        isWayland,
        desktopEnvironment,
        deVersion,
        portalAvailable,
        portalMethod,
    };

    logger.log('Wayland detection:', status);

    return status;
}
