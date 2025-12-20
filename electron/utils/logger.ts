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
    /**
     * Safely writes to console, catching EPIPE errors that occur
     * when stdout/stderr is closed during app reload on Windows.
     */
    const safeWrite = (
        method: 'log' | 'error' | 'warn',
        message: string,
        args: unknown[]
    ): void => {
        try {
            console[method](`${prefix} ${message}`, ...args);
        } catch (e) {
            // Ignore EPIPE errors - they occur when the pipe is closed during reload
            // This is expected behavior on Windows and can be safely ignored
            if (!(e instanceof Error && e.message.includes('EPIPE'))) {
                throw e;
            }
        }
    };

    return {
        /**
         * Log an info message.
         * @param message - Message to log
         * @param args - Additional arguments
         */
        log(message: string, ...args: unknown[]): void {
            safeWrite('log', message, args);
        },

        /**
         * Log an error message.
         * @param message - Message to log
         * @param args - Additional arguments
         */
        error(message: string, ...args: unknown[]): void {
            safeWrite('error', message, args);
        },

        /**
         * Log a warning message.
         * @param message - Message to log
         * @param args - Additional arguments
         */
        warn(message: string, ...args: unknown[]): void {
            safeWrite('warn', message, args);
        }
    };
}
