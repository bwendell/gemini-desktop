/**
 * NotificationSettings Component
 *
 * Toggle switch for enabling/disabling response notifications.
 * Shows notifications when Gemini finishes generating a response
 * while the app window is not focused.
 *
 * @module NotificationSettings
 */

import { memo, useState, useEffect, useCallback } from 'react';
import { CapsuleToggle } from '../common/CapsuleToggle';
import './NotificationSettings.css';

/**
 * NotificationSettings component.
 * Renders a toggle switch for response notification preferences.
 */
export const NotificationSettings = memo(function NotificationSettings() {
    const [enabled, setEnabled] = useState(true);
    const [loading, setLoading] = useState(true);

    // Load initial state from main process
    useEffect(() => {
        const loadState = async () => {
            try {
                const getResponseNotificationsEnabled = window.electronAPI?.getResponseNotificationsEnabled;

                if (typeof getResponseNotificationsEnabled !== 'function') {
                    setEnabled(true);
                    return;
                }

                const isEnabled = await getResponseNotificationsEnabled();
                setEnabled(isEnabled ?? true);
            } catch (error) {
                console.error('Failed to load response notifications state:', error);
            } finally {
                setLoading(false);
            }
        };

        loadState();
    }, []);

    // Handle toggle change
    const handleChange = useCallback(
        async (newEnabled: boolean) => {
            const previousEnabled = enabled;
            setEnabled(newEnabled);

            try {
                const setResponseNotificationsEnabled = window.electronAPI?.setResponseNotificationsEnabled;

                if (typeof setResponseNotificationsEnabled === 'function') {
                    await setResponseNotificationsEnabled(newEnabled);
                }
            } catch (error) {
                // Revert state on failure
                console.error('Failed to set response notifications state:', error);
                setEnabled(previousEnabled);
            }
        },
        [enabled]
    );

    if (loading) {
        return (
            <div className="notification-settings loading" data-testid="notification-settings-loading">
                Loading...
            </div>
        );
    }

    return (
        <div className="notification-settings" data-testid="notification-settings">
            <CapsuleToggle
                checked={enabled}
                onChange={handleChange}
                label="Response Notifications"
                description="Show a notification when Gemini finishes generating a response while the window is unfocused"
                testId="response-notifications-toggle"
            />
        </div>
    );
});

export default NotificationSettings;
