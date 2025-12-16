/**
 * Options window titlebar component.
 * 
 * A simplified titlebar for secondary windows that displays only:
 * - Window title
 * - Drag region
 * - Window controls (minimize, maximize, close)
 * 
 * Unlike the main window titlebar, this does NOT include a menu bar.
 * This component is designed to be reusable for other secondary windows.
 * 
 * @module OptionsWindowTitlebar
 */

import { usesCustomWindowControls } from '../../utils';
import { useWindowControls } from '../../hooks/useWindowControls';
import './options-window.css';

interface OptionsWindowTitlebarProps {
    /** Title to display in the titlebar */
    title?: string;
}

/**
 * Titlebar component for secondary windows (options, settings, etc.)
 * 
 * Features:
 * - Draggable region for window movement
 * - Title display centered in the titlebar
 * - Window controls on the right (Windows/Linux only)
 * - macOS uses native traffic light controls
 */
export function OptionsWindowTitlebar({ title = 'Options' }: OptionsWindowTitlebarProps) {
    const { minimize, close } = useWindowControls();


    return (
        <header className="options-titlebar" data-testid="options-titlebar">
            {/* Drag region - covers entire titlebar for easy window dragging */}
            <div className="options-titlebar-drag-region">
                <span className="options-titlebar-title" data-testid="options-titlebar-title">
                    {title}
                </span>
            </div>

            {/* Window controls - only shown on Windows/Linux */}
            {usesCustomWindowControls() && (
                <div className="options-window-controls" data-testid="options-window-controls">
                    <button
                        className="options-window-control-button minimize"
                        onClick={minimize}
                        aria-label="Minimize window"
                        title="Minimize"
                        data-testid="options-minimize-button"
                    >
                        <svg width="10" height="1" viewBox="0 0 10 1">
                            <rect width="10" height="1" fill="currentColor" />
                        </svg>
                    </button>

                    <button
                        className="options-window-control-button close"
                        onClick={close}
                        aria-label="Close window"
                        title="Close"
                        data-testid="options-close-button"
                    >
                        <svg width="10" height="10" viewBox="0 0 10 10">
                            <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2" />
                            <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.2" />
                        </svg>
                    </button>
                </div>
            )}
        </header>
    );
}
