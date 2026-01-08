/**
 * Notification Types
 *
 * Shared types for response notification functionality across main and renderer processes.
 */

/**
 * Response notification settings.
 * Controls whether notifications are shown when Gemini finishes generating a response.
 */
export interface ResponseNotificationSettings {
    /** Whether response notifications are enabled */
    enabled: boolean;
}
