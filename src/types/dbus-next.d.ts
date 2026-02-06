/**
 * Type declarations for dbus-next module.
 *
 * This module provides D-Bus bindings for Node.js.
 * These are minimal type declarations for the subset used by the dbusFallback module.
 *
 * @see https://github.com/dbusjs/node-dbus-next
 */
declare module 'dbus-next' {
    /**
     * D-Bus Variant wrapper for typed values.
     */
    export class Variant<T = unknown> {
        constructor(signature: string, value: T);
        signature: string;
        value: T;
    }

    /**
     * Message bus connection.
     */
    export interface MessageBus {
        /**
         * Get a proxy object for a remote D-Bus service.
         * @param busName - The bus name (e.g., 'org.freedesktop.portal.Desktop')
         * @param objectPath - The object path (e.g., '/org/freedesktop/portal/desktop')
         */
        getProxyObject(busName: string, objectPath: string): Promise<ProxyObject>;

        /**
         * Disconnect from the bus.
         */
        disconnect(): void;
    }

    /**
     * Proxy object representing a remote D-Bus object.
     */
    export interface ProxyObject {
        /**
         * Get an interface from the proxy object.
         * @param interfaceName - The interface name (e.g., 'org.freedesktop.portal.GlobalShortcuts')
         */
        getInterface(interfaceName: string): ClientInterface;
    }

    /**
     * Client interface for making D-Bus method calls.
     */
    export interface ClientInterface {
        [methodName: string]: unknown;

        /**
         * Subscribe to a D-Bus signal.
         * @param signal - Signal name
         * @param handler - Handler function
         */
        on?(signal: string, handler: (...args: unknown[]) => void): void;
    }

    /**
     * Get a connection to the session bus.
     */
    export function sessionBus(): MessageBus;

    /**
     * Get a connection to the system bus.
     */
    export function systemBus(): MessageBus;
}
