/**
 * Platform adapter types.
 *
 * Defines the type vocabulary shared across all platform adapters
 * and the factory that selects them.
 *
 * @module PlatformTypes
 */

import type { WaylandStatus } from '../../shared/types/hotkeys';

/**
 * Identifies the concrete adapter in use at runtime.
 */
export type PlatformId = 'linux-wayland' | 'linux-x11' | 'windows' | 'mac';

/**
 * How global hotkeys should be registered on this platform.
 *
 * - `native`       — Electron's globalShortcut API (Windows/macOS)
 * - `wayland-dbus` — D-Bus XDG Desktop Portal (Linux Wayland with portal)
 * - `disabled`     — No global hotkeys (Linux X11 or portal unavailable)
 */
export type HotkeyRegistrationMode = 'native' | 'wayland-dbus' | 'disabled';

/**
 * Describes how and whether to register global hotkeys,
 * along with the Wayland detection status for diagnostic reporting.
 */
export interface HotkeyRegistrationPlan {
    /** Registration strategy to use */
    mode: HotkeyRegistrationMode;
    /** Wayland session status; non-Linux adapters use a default (all-false) value */
    waylandStatus: WaylandStatus;
}
