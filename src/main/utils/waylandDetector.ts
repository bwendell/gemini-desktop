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
        if (part.toLowerCase() === 'kde') {
            return 'kde';
        }
    }

    return 'unknown';
}

export function detectDEVersion(de: DesktopEnvironment): string | null {
    if (de !== 'kde') {
        return null;
    }

    const version = process.env.KDE_SESSION_VERSION;
    if (!version) {
        return null;
    }

    return version;
}

export function isSupportedDE(de: DesktopEnvironment, version: string | null): boolean {
    if (de !== 'kde') {
        return false;
    }

    if (version === null) {
        return false;
    }

    const majorVersion = parseInt(version, 10);
    if (isNaN(majorVersion)) {
        return false;
    }

    return majorVersion >= 5;
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
