/**
 * Options window root component.
 * 
 * This component provides the main layout for the options/settings window.
 * Currently a placeholder for future settings functionality.
 * 
 * @module OptionsWindow
 */

import { ErrorBoundary } from '../ErrorBoundary';
import { OptionsWindowTitlebar } from './OptionsWindowTitlebar';
import { useTheme } from '../../context/ThemeContext';
import './options-window.css';

/**
 * Root component for the Options window.
 * 
 * Layout:
 * - Custom titlebar at the top (with window controls only)
 * - Content area for options/settings (placeholder for now)
 * 
 * The window is designed to be opened from the File menu in the main window.
 */
export function OptionsWindow() {
    const { theme, setTheme } = useTheme();

    return (
        <ErrorBoundary>
            <div className="options-window" data-testid="options-window">
                <OptionsWindowTitlebar title="Options" />
                <main className="options-content" data-testid="options-content">
                    <section className="options-section">
                        <h2>Appearance</h2>
                        <div className="theme-selector">
                            <label className="theme-option">
                                <input
                                    type="radio"
                                    name="theme"
                                    value="system"
                                    checked={theme === 'system'}
                                    onChange={() => setTheme('system')}
                                    data-testid="theme-system"
                                />
                                <span>System Default</span>
                            </label>
                            <label className="theme-option">
                                <input
                                    type="radio"
                                    name="theme"
                                    value="light"
                                    checked={theme === 'light'}
                                    onChange={() => setTheme('light')}
                                    data-testid="theme-light"
                                />
                                <span>Light</span>
                            </label>
                            <label className="theme-option">
                                <input
                                    type="radio"
                                    name="theme"
                                    value="dark"
                                    checked={theme === 'dark'}
                                    onChange={() => setTheme('dark')}
                                    data-testid="theme-dark"
                                />
                                <span>Dark</span>
                            </label>
                        </div>
                    </section>
                </main>
            </div>
        </ErrorBoundary>
    );
}
