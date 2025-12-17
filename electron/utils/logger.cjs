/**
 * Simple logger utility for the Electron main process.
 * Provides consistent log formatting with prefixes.
 * 
 * @module Logger
 */

/**
 * Creates a logger instance with a consistent prefix.
 * 
 * @param {string} prefix - The prefix to prepend to all log messages (e.g., '[WindowManager]')
 * @returns {Object} Logger object with log and error methods
 * 
 * @example
 * const logger = createLogger('[MyModule]');
 * logger.log('Hello world'); // [MyModule] Hello world
 * logger.error('Something failed'); // [MyModule] Something failed
 */
function createLogger(prefix) {
    return {
        /**
         * Log an info message.
         * @param {string} message - Message to log
         * @param {...*} args - Additional arguments
         */
        log(message, ...args) {
            console.log(`${prefix} ${message}`, ...args);
        },

        /**
         * Log an error message.
         * @param {string} message - Message to log
         * @param {...*} args - Additional arguments
         */
        error(message, ...args) {
            console.error(`${prefix} ${message}`, ...args);
        },

        /**
         * Log a warning message.
         * @param {string} message - Message to log
         * @param {...*} args - Additional arguments
         */
        warn(message, ...args) {
            console.warn(`${prefix} ${message}`, ...args);
        }
    };
}

module.exports = { createLogger };
