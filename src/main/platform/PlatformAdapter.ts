/**
 * PlatformAdapter interface.
 *
 * Defines the contract that each platform-specific adapter must implement.
 * Adapters encapsulate higher-level platform behaviors (app configuration,
 * hotkey strategy) rather than simple boolean checks.
 *
 * @module PlatformAdapter
 */

import type { WaylandStatus } from '../../shared/types/hotkeys';
import type { Logger } from '../types';
import type { PlatformId, HotkeyRegistrationPlan } from './types';

/**
 * Contract for platform-specific behavior in the Electron main process.
 *
 * Concrete implementations:
 * - LinuxWaylandAdapter — Linux under Wayland compositor
 * - LinuxX11Adapter     — Linux under X11
 * - WindowsAdapter      — Windows
 * - MacAdapter          — macOS
 */
export interface PlatformAdapter {
    /** Identifies which adapter is active */
    readonly id: PlatformId;

    /**
     * Apply platform-specific app configuration at startup.
     * For Linux: sets app name, WM_CLASS, desktop name, Wayland logging.
     * For Windows/macOS: sets display name.
     */
    applyAppConfiguration(app: Electron.App, logger: Logger): void;

    /**
     * Apply Windows Application User Model ID for notification branding
     * and taskbar grouping. No-op on non-Windows platforms.
     */
    applyAppUserModelId(app: Electron.App): void;

    /**
     * Determine how global hotkeys should be registered on this platform.
     */
    getHotkeyRegistrationPlan(): HotkeyRegistrationPlan;

    /**
     * Get the Wayland detection status for diagnostic/UI reporting.
     * Non-Linux adapters return a default (all-false) WaylandStatus.
     */
    getWaylandStatus(): WaylandStatus;

    /**
     * Whether the app should quit when all windows are closed.
     * macOS returns false (stay in dock); all others return true.
     */
    shouldQuitOnWindowAllClosed(): boolean;
}
