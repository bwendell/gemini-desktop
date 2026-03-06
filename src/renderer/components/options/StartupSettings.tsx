import { memo, useCallback, useEffect, useState } from 'react';

import { CapsuleToggle } from '../common/CapsuleToggle';
import './StartupSettings.css';

export const StartupSettings = memo(function StartupSettings() {
    const [launchAtStartup, setLaunchAtStartup] = useState(false);
    const [startMinimized, setStartMinimized] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const loadState = async () => {
            try {
                const getLaunchAtStartup = window.electronAPI?.getLaunchAtStartup;
                const getStartMinimized = window.electronAPI?.getStartMinimized;

                if (typeof getLaunchAtStartup !== 'function' || typeof getStartMinimized !== 'function') {
                    return;
                }

                const [launchEnabled, minimizedEnabled] = await Promise.all([
                    getLaunchAtStartup(),
                    getStartMinimized(),
                ]);

                if (isMounted) {
                    setLaunchAtStartup(launchEnabled ?? false);
                    setStartMinimized(minimizedEnabled ?? false);
                }
            } catch (error) {
                console.error('Failed to load startup settings:', error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadState();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleLaunchAtStartupChange = useCallback((newEnabled: boolean) => {
        setLaunchAtStartup(newEnabled);

        if (!newEnabled) {
            setStartMinimized(false);
            try {
                const setStartMinimizedApi = window.electronAPI?.setStartMinimized;
                if (typeof setStartMinimizedApi === 'function') {
                    setStartMinimizedApi(false);
                }
            } catch (error) {
                console.error('Failed to disable start minimized:', error);
            }
        }

        try {
            const setLaunchAtStartupApi = window.electronAPI?.setLaunchAtStartup;
            if (typeof setLaunchAtStartupApi === 'function') {
                setLaunchAtStartupApi(newEnabled);
            }
        } catch (error) {
            console.error('Failed to set launch at startup:', error);
            setLaunchAtStartup((current) => !current);
        }
    }, []);

    const handleStartMinimizedChange = useCallback((newEnabled: boolean) => {
        setStartMinimized(newEnabled);

        try {
            const setStartMinimizedApi = window.electronAPI?.setStartMinimized;
            if (typeof setStartMinimizedApi === 'function') {
                setStartMinimizedApi(newEnabled);
            }
        } catch (error) {
            console.error('Failed to set start minimized:', error);
            setStartMinimized((current) => !current);
        }
    }, []);

    if (loading) {
        return (
            <div className="startup-settings loading" data-testid="startup-settings-loading">
                Loading...
            </div>
        );
    }

    return (
        <div className="startup-settings" data-testid="startup-settings">
            <CapsuleToggle
                checked={launchAtStartup}
                onChange={handleLaunchAtStartupChange}
                label="Launch at Startup"
                description="Automatically start Gemini Desktop when you log in to your computer"
                testId="launch-at-startup-toggle"
            />

            <div className="startup-settings__start-minimized">
                <CapsuleToggle
                    checked={startMinimized}
                    onChange={handleStartMinimizedChange}
                    label="Start Minimized to Tray"
                    description="Start in the system tray instead of opening the main window"
                    disabled={!launchAtStartup}
                    testId="start-minimized-toggle"
                />
            </div>
        </div>
    );
});

export default StartupSettings;
