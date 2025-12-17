/**
 * Simple logger utility for the Electron main process.
 * Provides consistent log formatting with prefixes.
 * 
 * @module Logger
 */

import type { Logger } from '../types';

/**
 * Creates a logger instance with a consistent prefix.
 * 
 * @param prefix - The prefix to prepend to all log messages (e.g., '[WindowManager]')
 * @returns Logger object with log, error, and warn methods
 * 
 * @example
 * const logger = createLogger('[MyModule]');
 * logger.log('Hello world'); // [MyModule] Hello world
 * logger.error('Something failed'); // [MyModule] Something failed
 */
export function createLogger(prefix: string): Logger {
    return {
        /**
         * Log an info message.
         * @param message - Message to log
         * @param args - Additional arguments
         */
        log(message: string, ...args: unknown[]): void {
            console.log(`${prefix} ${message}`, ...args);
        },

        /**
         * Log an error message.
         * @param message - Message to log
         * @param args - Additional arguments
         */
        error(message: string, ...args: unknown[]): void {
            console.error(`${prefix} ${message}`, ...args);
        },

        /**
         * Log a warning message.
         * @param message - Message to log
         * @param args - Additional arguments
         */
        warn(message: string, ...args: unknown[]): void {
            console.warn(`${prefix} ${message}`, ...args);
        }
    };
}
