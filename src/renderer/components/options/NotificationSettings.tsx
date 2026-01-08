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
                const isEnabled = await window.electronAPI?.getResponseNotificationsEnabled();
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
    const handleChange = useCallback((newEnabled: boolean) => {
        setEnabled(newEnabled);
        window.electronAPI?.setResponseNotificationsEnabled(newEnabled);
    }, []);

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
