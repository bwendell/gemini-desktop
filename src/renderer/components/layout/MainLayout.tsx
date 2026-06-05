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
        let unsubscribe: (() => void) | undefined;

        const initializeFullscreen = async () => {
            if (window.electronAPI?.isFullscreen) {
                try {
                    const isFS = await window.electronAPI.isFullscreen();
                    setIsFullscreen(isFS);
                } catch (error) {
                    console.error('[MainLayout] Failed to check initial fullscreen state:', error);
                }
            }
        };

        initializeFullscreen();

        if (window.electronAPI?.onFullscreenChanged) {
            unsubscribe = window.electronAPI.onFullscreenChanged((fullscreen: boolean) => {
                setIsFullscreen(fullscreen);
            });
        } else {
            const checkFullscreen = () => {
                const outerHeight = window.outerHeight;
                const screenHeight = window.screen?.height;
                const innerHeight = window.innerHeight;

                // In JSDOM/test environment, outerHeight and screenHeight can be 0.
                // Avoid false positives by ensuring we ensure we have non-zero dimensions.
                if (!outerHeight || !screenHeight) {
                    return;
                }

                const fullscreen = outerHeight >= screenHeight || innerHeight >= screenHeight;
                setIsFullscreen(fullscreen);
            };

            window.addEventListener('resize', checkFullscreen);
            checkFullscreen();

            unsubscribe = () => {
                window.removeEventListener('resize', checkFullscreen);
            };
        }

        return () => {
            unsubscribe?.();
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
