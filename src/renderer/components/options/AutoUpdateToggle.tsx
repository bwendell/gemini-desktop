/**
 * AutoUpdateToggle Component
 * 
 * Toggle switch for enabling/disabling automatic updates.
 * Integrates with the UpdateManager via IPC.
 * 
 * @module AutoUpdateToggle
 */

import { memo, useState, useEffect, useCallback } from 'react';
import { CapsuleToggle } from '../common/CapsuleToggle';

/**
 * AutoUpdateToggle component.
 * Renders a toggle switch for auto-update preferences.
 */
export const AutoUpdateToggle = memo(function AutoUpdateToggle() {
    const [enabled, setEnabled] = useState(true);
    const [loading, setLoading] = useState(true);

    // Load initial state from main process
    useEffect(() => {
        const loadState = async () => {
            try {
                const isEnabled = await window.electronAPI?.getAutoUpdateEnabled();
                setEnabled(isEnabled ?? true);
            } catch (error) {
                console.error('Failed to load auto-update state:', error);
            } finally {
                setLoading(false);
            }
        };

        loadState();
    }, []);

    // Handle toggle change
    const handleChange = useCallback((newEnabled: boolean) => {
        setEnabled(newEnabled);
        window.electronAPI?.setAutoUpdateEnabled(newEnabled);
    }, []);

    if (loading) {
        return (
            <div className="auto-update-toggle loading" data-testid="auto-update-toggle-loading">
                Loading...
            </div>
        );
    }

    return (
        <div className="auto-update-toggle" data-testid="auto-update-toggle">
            <CapsuleToggle
                checked={enabled}
                onChange={handleChange}
                label="Automatic Updates"
                description="Check for and download updates automatically"
                testId="auto-update-toggle-switch"
            />
        </div>
    );
});

export default AutoUpdateToggle;
