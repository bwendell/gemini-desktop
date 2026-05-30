import { ReactNode, useEffect, useState } from 'react';
import { Titlebar } from '../titlebar';
import './layout.css';

interface MainLayoutProps {
    children?: ReactNode;
    tabBar?: ReactNode;
}

/**
 * Main application layout component.
 *
 * Provides the structure with:
 * - Custom titlebar at the top
 * - Content area below for the webview or other content
 *
 * This component handles the overall app structure and ensures
 * proper sizing for the embedded webview.
 */
export function MainLayout({ children, tabBar }: MainLayoutProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        if (!window.electronAPI?.onFullscreenChanged) return;

        const unsubscribe = window.electronAPI.onFullscreenChanged((fullscreen: boolean) => {
            setIsFullscreen(fullscreen);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    return (
        <div className={`main-layout${isFullscreen ? ' fullscreen' : ''}`} data-testid="main-layout">
            {!isFullscreen && <Titlebar />}
            {!isFullscreen && tabBar}
            <main className="main-content">{children}</main>
        </div>
    );
}
