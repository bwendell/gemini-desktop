/**
 * Theme Types
 * 
 * Shared types for theme management across main and renderer processes.
 */

/**
 * Valid theme preference values.
 */
export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * Theme data returned from main process.
 */
export interface ThemeData {
    /** User's theme preference (light, dark, or system) */
    preference: ThemePreference;
    /** Resolved effective theme based on system settings */
    effectiveTheme: 'light' | 'dark';
}
