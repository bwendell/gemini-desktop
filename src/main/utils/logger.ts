/**
 * Simple logger utility for the Electron main process.
 * Provides consistent log formatting with prefixes.
 *
 * @module Logger
 */

import { app } from 'electron';
import type { Logger } from '../types';

/**
 * Check if we're in production mode.
 * Uses app.isPackaged when available, falls back to NODE_ENV check.
 * Lazily evaluated to handle early startup scenarios.
 */
function isProduction(): boolean {
    try {
        return app.isPackaged;
    } catch {
        // app may not be ready yet during very early startup
        return process.env.NODE_ENV === 'production';
    }
}

/**
 * Creates a logger instance with a consistent prefix.
 *
 * @param prefix - The prefix to prepend to all log messages (e.g., '[WindowManager]')
 * @returns Logger object with log, error, warn, and debug methods
 *
 * @example
 * const logger = createLogger('[MyModule]');
 * logger.log('Hello world'); // [MyModule] Hello world
 * logger.debug('Debug info'); // Only logs in development mode
 * logger.error('Something failed'); // [MyModule] Something failed
 */
export function createLogger(prefix: string): Logger {
    /**
     * Safely writes to console, catching EPIPE errors that occur
     * when stdout/stderr is closed during app reload on Windows.
     */
    const safeWrite = (method: 'log' | 'error' | 'warn', message: string, args: unknown[]): void => {
        try {
            console[method](`${prefix} ${message}`, ...args);
        } catch {
            // Swallow all console errors to prevent logging failures from crashing the app.
            // Common cases include EPIPE errors when stdout/stderr is closed (e.g., detached process).
            // In production, it's safer to silently fail logging than to crash.
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
        },

        /**
         * Log a debug message (only in development mode).
         * In production, this is a no-op with minimal overhead.
         * @param message - Message to log
         * @param args - Additional arguments
         */
        debug(message: string, ...args: unknown[]): void {
            // Early exit in production - minimal overhead (just a function call + boolean check)
            if (isProduction()) return;
            safeWrite('log', `[DEBUG] ${message}`, args);
        },
    };
}
