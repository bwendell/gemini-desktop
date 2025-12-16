import { ReactNode } from 'react';
import { Titlebar } from '../titlebar';
import './layout.css';

interface MainLayoutProps {
    children?: ReactNode;
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
export function MainLayout({ children }: MainLayoutProps) {
    return (
        <div className="main-layout">
            <Titlebar />
            <main className="main-content">
                {children}
            </main>
        </div>
    );
}
