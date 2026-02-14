/**
 * Platform Adapter Factory.
 *
 * Selects and caches the appropriate PlatformAdapter based on the current
 * platform and session type. The cached singleton ensures consistent
 * behavior across the application lifetime.
 *
 * @module PlatformAdapterFactory
 */

import type { PlatformAdapter } from './PlatformAdapter';
import { isLinux, isWayland } from '../utils/constants';
import { LinuxWaylandAdapter } from './adapters/LinuxWaylandAdapter';
import { LinuxX11Adapter } from './adapters/LinuxX11Adapter';
import { WindowsAdapter } from './adapters/WindowsAdapter';
import { MacAdapter } from './adapters/MacAdapter';

/** Cached adapter singleton */
let _cachedAdapter: PlatformAdapter | null = null;

/**
 * Get the platform adapter for the current environment.
 *
 * Selection logic:
 * - Linux + Wayland session → LinuxWaylandAdapter
 * - Linux + X11 session    → LinuxX11Adapter
 * - Windows (win32)        → WindowsAdapter
 * - macOS (darwin)          → MacAdapter
 *
 * The adapter is cached after first creation.
 *
 * @returns The platform adapter singleton
 */
export function getPlatformAdapter(): PlatformAdapter {
    if (_cachedAdapter) {
        return _cachedAdapter;
    }

    if (isLinux) {
        _cachedAdapter = isWayland ? new LinuxWaylandAdapter() : new LinuxX11Adapter();
    } else if (process.platform === 'win32') {
        _cachedAdapter = new WindowsAdapter();
    } else if (process.platform === 'darwin') {
        _cachedAdapter = new MacAdapter();
    } else {
        throw new Error(`Unsupported platform: ${process.platform}`);
    }

    return _cachedAdapter;
}

/**
 * Clear the cached adapter. **Test-only** — use to reset state between tests.
 */
export function resetPlatformAdapterForTests(): void {
    _cachedAdapter = null;
}
