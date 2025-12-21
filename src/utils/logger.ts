/**
 * Simple logger utility for the renderer process.
 * Provides consistent log formatting with prefixes.
 * In development, logs to console. In production, could be extended to send to main process.
 * 
 * @module RendererLogger
 */

export interface Logger {
    log(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
}

/**
 * Creates a logger instance with a consistent prefix for renderer components.
 * 
 * @param prefix - The prefix to prepend to all log messages (e.g., '[useMenuDefinitions]')
 * @returns Logger object with log, error, and warn methods
 * 
 * @example
 * const logger = createRendererLogger('[MyComponent]');
 * logger.log('Component mounted');
 * logger.error('Failed to load data');
 */
export function createRendererLogger(prefix: string): Logger {
    const isDev = import.meta.env.DEV;

    return {
        log(message: string, ...args: unknown[]): void {
            if (isDev) {
                console.log(`${prefix} ${message}`, ...args);
            }
        },

        error(message: string, ...args: unknown[]): void {
            // Always log errors, even in production
            console.error(`${prefix} ${message}`, ...args);
        },

        warn(message: string, ...args: unknown[]): void {
            if (isDev) {
                console.warn(`${prefix} ${message}`, ...args);
            }
        }
    };
}
