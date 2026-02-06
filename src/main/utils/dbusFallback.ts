/**
 * D-Bus Fallback Module for Wayland Global Shortcuts.
 *
 * This module provides a fallback mechanism for registering global shortcuts
 * on Wayland systems using the XDG Desktop Portal GlobalShortcuts interface.
 * It communicates via D-Bus using the `dbus-next` library.
 *
 * ## Key Design Decisions:
 * - **Dynamic import**: `dbus-next` is imported dynamically to avoid loading
 *   it on systems where it's not needed (Windows, macOS, X11)
 * - **Single session**: One portal session handles all shortcuts
 * - **Batch binding**: All shortcuts are bound in a single BindShortcuts call
 * - **Error containment**: All D-Bus errors are caught and never thrown
 *
 * @module DBusFallback
 * @see https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.GlobalShortcuts.html
 */

import { createLogger } from './logger';
import type { HotkeyId, HotkeyRegistrationResult } from '../../shared/types/hotkeys';

const logger = createLogger('[DBusFallback]');

// ============================================================================
// Types
// ============================================================================

/**
 * Shortcut definition for D-Bus registration.
 */
export interface DBusShortcutConfig {
    id: HotkeyId;
    accelerator: string;
    description: string;
}

/**
 * D-Bus session bus connection interface.
 */
interface DBusConnection {
    getProxyObject: (
        busName: string,
        objectPath: string
    ) => Promise<{
        getInterface: (interfaceName: string) => DBusInterface;
    }>;
    disconnect: () => void;
}

/**
 * D-Bus interface proxy.
 */
interface DBusInterface {
    CreateSession?: (options: Record<string, unknown>) => Promise<{ session_handle: string }>;
    BindShortcuts?: (
        sessionPath: string,
        shortcuts: Array<[string, Record<string, unknown>]>,
        parentWindow: string,
        options: Record<string, unknown>
    ) => Promise<unknown>;
    Get?: (interfaceName: string, propertyName: string) => Promise<string[]>;
    on?: (signal: string, handler: (...args: unknown[]) => void) => void;
}

// ============================================================================
// Module State
// ============================================================================

let connection: DBusConnection | null = null;
let sessionPath: string | null = null;
let portalInterface: DBusInterface | null = null;

// ============================================================================
// Constants
// ============================================================================

const PORTAL_BUS_NAME = 'org.freedesktop.portal.Desktop';
const PORTAL_OBJECT_PATH = '/org/freedesktop/portal/desktop';
const GLOBAL_SHORTCUTS_INTERFACE = 'org.freedesktop.portal.GlobalShortcuts';
const PROPERTIES_INTERFACE = 'org.freedesktop.DBus.Properties';
const APP_ID = 'io.github.nicolomaioli.gemini-desktop';

// ============================================================================
// Public Functions
// ============================================================================

/**
 * Check if D-Bus GlobalShortcuts portal is available.
 *
 * This function attempts to connect to the session bus and verify that the
 * XDG Desktop Portal exposes the GlobalShortcuts interface.
 *
 * @returns True if D-Bus fallback is available, false otherwise
 */
export async function isDBusFallbackAvailable(): Promise<boolean> {
    try {
        const dbusNext = await import('dbus-next');
        const bus = dbusNext.sessionBus() as DBusConnection;

        try {
            const proxyObj = await bus.getProxyObject(PORTAL_BUS_NAME, PORTAL_OBJECT_PATH);
            const propsInterface = proxyObj.getInterface(PROPERTIES_INTERFACE);

            if (!propsInterface?.Get) {
                logger.log('Properties interface not available on portal');
                bus.disconnect();
                return false;
            }

            // Check if GlobalShortcuts interface is listed
            const interfaces = await propsInterface.Get('org.freedesktop.DBus.Introspectable', 'Interfaces');

            bus.disconnect();

            const hasGlobalShortcuts = Array.isArray(interfaces) && interfaces.includes(GLOBAL_SHORTCUTS_INTERFACE);

            logger.log(`GlobalShortcuts interface available: ${hasGlobalShortcuts}`);
            return hasGlobalShortcuts;
        } catch (innerError) {
            bus.disconnect();
            throw innerError;
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.log(`D-Bus fallback not available: ${errorMessage}`);
        return false;
    }
}

/**
 * Register global shortcuts via D-Bus portal.
 *
 * This function:
 * 1. Connects to the session bus
 * 2. Creates a portal session
 * 3. Binds all shortcuts in a single batch call
 * 4. Sets up signal handlers for Activated/Deactivated
 *
 * @param shortcuts Array of shortcuts to register
 * @returns Per-shortcut registration results
 */
export async function registerViaDBus(shortcuts: DBusShortcutConfig[]): Promise<HotkeyRegistrationResult[]> {
    // Early exit for empty array
    if (shortcuts.length === 0) {
        return [];
    }

    try {
        // Dynamically import dbus-next
        const dbusNext = await import('dbus-next');

        // Clean up any existing session first
        await destroySession();

        // Connect to session bus
        connection = dbusNext.sessionBus() as DBusConnection;
        logger.log('Connected to D-Bus session bus');

        // Get portal proxy
        const proxyObj = await connection.getProxyObject(PORTAL_BUS_NAME, PORTAL_OBJECT_PATH);
        portalInterface = proxyObj.getInterface(GLOBAL_SHORTCUTS_INTERFACE);

        if (!portalInterface?.CreateSession || !portalInterface?.BindShortcuts) {
            throw new Error('GlobalShortcuts interface methods not available');
        }

        // Create session
        const sessionOptions = {
            handle_token: `session_${Date.now()}`,
            session_handle_token: `session_handle_${Date.now()}`,
        };

        const sessionResult = await portalInterface.CreateSession(sessionOptions);
        sessionPath = sessionResult.session_handle;
        logger.log(`Created portal session: ${sessionPath}`);

        // Set up signal handlers
        if (portalInterface.on) {
            portalInterface.on('Activated', (session: string, shortcutId: string, options: Record<string, unknown>) => {
                logger.log(`Shortcut activated: ${shortcutId}`, { session, options });
                // TODO: Emit event for hotkeyManager to handle
            });

            portalInterface.on(
                'Deactivated',
                (session: string, shortcutId: string, options: Record<string, unknown>) => {
                    logger.log(`Shortcut deactivated: ${shortcutId}`, { session, options });
                }
            );
        }

        // Prepare shortcuts for BindShortcuts call
        // Format: array of (shortcut_id, options_dict) tuples
        const shortcutSpecs: Array<[string, Record<string, unknown>]> = shortcuts.map((s) => [
            s.id,
            {
                description: new dbusNext.Variant('s', s.description),
                preferred_trigger: new dbusNext.Variant('s', s.accelerator),
            },
        ]);

        // Bind all shortcuts in a single batch call
        await portalInterface.BindShortcuts(
            sessionPath,
            shortcutSpecs,
            '', // parent window (empty for no parent)
            {} // options
        );

        logger.log(`Bound ${shortcuts.length} shortcuts via D-Bus portal`);

        // Return success for all shortcuts
        return shortcuts.map((s) => ({
            hotkeyId: s.id,
            success: true,
        }));
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to register shortcuts via D-Bus: ${errorMessage}`);

        // Return failure for all shortcuts
        return shortcuts.map((s) => ({
            hotkeyId: s.id,
            success: false,
            error: errorMessage,
        }));
    }
}

/**
 * Destroy the current D-Bus session and clean up resources.
 *
 * This function:
 * 1. Disconnects from the session bus
 * 2. Clears module state
 *
 * Safe to call multiple times or without an active session.
 */
export async function destroySession(): Promise<void> {
    try {
        if (connection) {
            connection.disconnect();
            logger.log('D-Bus connection disconnected');
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error during D-Bus session cleanup: ${errorMessage}`);
    } finally {
        connection = null;
        sessionPath = null;
        portalInterface = null;
    }
}
