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
    return (
        <ErrorBoundary>
            <div className="options-window" data-testid="options-window">
                <OptionsWindowTitlebar title="Options" />
                <main className="options-content" data-testid="options-content">
                    <div className="options-placeholder">
                        <p>Options will be available here in a future update.</p>
                    </div>
                </main>
            </div>
        </ErrorBoundary>
    );
}
