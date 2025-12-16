import { WindowControls } from './WindowControls';
import { TitlebarMenu } from './TitlebarMenu';
import { useMenuDefinitions } from './useMenuDefinitions';
import type { TitlebarConfig } from '../../types';
import './titlebar.css';

/**
 * Default titlebar configuration
 */
const defaultConfig: TitlebarConfig = {
    title: 'Gemini Desktop',
    showIcon: true,
};

interface TitlebarProps {
    config?: Partial<TitlebarConfig>;
}

/**
 * Custom titlebar component that replaces the native window decorations.
 * 
 * Features:
 * - Draggable region for moving the window
 * - VS Code-style dropdown menus (Windows/Linux only)
 * - App title display
 * - Window control buttons (minimize, maximize, close)
 * 
 * Note: The drag region is applied to a dedicated element, not the entire header,
 * to allow menu buttons to receive click events.
 * 
 * @param config - Optional configuration for theming/customization
 */
export function Titlebar({ config = {} }: TitlebarProps) {
    const mergedConfig = { ...defaultConfig, ...config };
    const menus = useMenuDefinitions();

    return (
        <header className="titlebar" data-testid="titlebar">
            <div className="titlebar-left">
                {mergedConfig.showIcon && (
                    <div className="titlebar-icon">
                        {/* Placeholder for app icon - can be customized later */}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                            <path d="M8 12 L11 15 L16 9" stroke="currentColor" strokeWidth="2" fill="none" />
                        </svg>
                    </div>
                )}
                <TitlebarMenu menus={menus} />
            </div>
            {/* Drag region - allows window dragging without blocking menu clicks */}
            <div className="titlebar-drag-region" data-tauri-drag-region>
                <span className="titlebar-title" data-testid="titlebar-title">{mergedConfig.title}</span>
            </div>
            <WindowControls />
        </header>
    );
}


