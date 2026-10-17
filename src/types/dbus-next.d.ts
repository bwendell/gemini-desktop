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
     * A D-Bus message, such as a method call built for MessageBus.call().
     */
    export class Message {
        constructor(options: {
            destination?: string;
            path: string;
            interface?: string;
            member: string;
            signature?: string;
            body?: unknown[];
        });
        body: unknown[];
    }

    /**
     * Options for connecting to a bus.
     */
    export interface BusOptions {
        /** The bus address, e.g. `unix:socket=/run/user/1000/bus`. Defaults to DBUS_SESSION_BUS_ADDRESS. */
        busAddress?: string;
    }

    /**
     * Message bus connection.
     */
    export interface MessageBus {
        /** Unique bus name assigned by the D-Bus daemon once connected (e.g., ':1.123') */
        name: string | null;

        /**
         * Send a method call and wait for its reply. Rejects with a DBusError for an error reply.
         * @param message - The method call
         */
        call(message: Message): Promise<Message | null>;

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
     * @param options - Connection options, such as the bus address
     */
    export function sessionBus(options?: BusOptions): MessageBus;

    /**
     * Get a connection to the system bus.
     */
    export function systemBus(): MessageBus;
}
