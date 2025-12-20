import { ReactNode } from 'react';
import { Titlebar } from '../titlebar';
import { useZenMode } from '../../context/ZenModeContext';
import { isMacOS } from '../../utils/platform';
import './layout.css';

interface MainLayoutProps {
    children?: ReactNode;
}

/**
 * Main application layout component.
 * 
 * Provides the structure with:
 * - Custom titlebar at the top (hidden in Zen Mode on Windows/Linux)
 * - Content area below for the webview or other content
 * 
 * This component handles the overall app structure and ensures
 * proper sizing for the embedded webview.
 */
export function MainLayout({ children }: MainLayoutProps) {
    const { enabled: zenModeEnabled } = useZenMode();

    // On macOS, the native title bar is used, so always show the React Titlebar
    // (it becomes effectively a menu bar). On Windows/Linux, hide it in Zen Mode.
    const showTitlebar = isMacOS() || !zenModeEnabled;

    return (
        <div className="main-layout" data-testid="main-layout">
            {showTitlebar && <Titlebar />}
            <main className="main-content">
                {children}
            </main>
        </div>
    );
}

