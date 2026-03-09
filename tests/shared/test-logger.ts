/**
 * Valid logging levels for tests.
 */
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * Enhanced Logger for tests.
 * Wraps console logging with timestamps and consistent formatting.
 * Only logs 'debug' level if E2E_DEBUG env var is set.
 */
export class TestLogger {
    /**
     * Logs an informational message.
     * @param context The context/component name (e.g. 'menu_bar')
     * @param message The message to log
     * @param data Optional data object to log
     */
    static info(context: string, message: string, data?: any) {
        this.log('info', context, message, data);
    }

    /**
     * Logs an error message.
     * @param context The context/component name
     * @param message The error message
     * @param error The error object or data
     */
    static error(context: string, message: string, error?: any) {
        this.log('error', context, message, error);
    }

    /**
     * Logs a warning message.
     * @param context The context/component name
     * @param message The warning message
     * @param data Optional data
     */
    static warn(context: string, message: string, data?: any) {
        this.log('warn', context, message, data);
    }

    /**
     * Logs a debug message. Only visible if process.env.E2E_DEBUG is set.
     * @param context The context/component name
     * @param message The debug message
     * @param data Optional data
     */
    static debug(context: string, message: string, data?: any) {
        if (process.env.E2E_DEBUG) {
            this.log('debug', context, message, data);
        }
    }

    /**
     * Internal log handler.
     * @private
     */
    private static log(level: LogLevel, context: string, message: string, data?: any) {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}] [${context}]`;

        if (data) {
            console.log(`${prefix} ${message}`, data);
        } else {
            console.log(`${prefix} ${message}`);
        }
    }
}
