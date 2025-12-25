import { WindowControls } from './WindowControls';
import { TitlebarMenu } from './TitlebarMenu';
import { useMenuDefinitions } from './useMenuDefinitions';
import { useUpdateToast } from '../../context/UpdateToastContext';
import type { TitlebarConfig } from '../../types';
import { TITLEBAR_TEST_IDS } from '../../utils/testIds';
import icon from '@/assets/icon.png';
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
 * - Update badge indicator when update is pending
 *
 * Note: The drag region is applied to a dedicated element, not the entire header,
 * to allow menu buttons to receive click events.
 *
 * @param config - Optional configuration for theming/customization
 */
export function Titlebar({ config = {} }: TitlebarProps) {
  const mergedConfig = { ...defaultConfig, ...config };
  const menus = useMenuDefinitions();

  // Get pending update state for badge display
  let hasPendingUpdate = false;
  let installUpdate: (() => void) | undefined;

  try {
    const updateToast = useUpdateToast();
    hasPendingUpdate = updateToast.hasPendingUpdate;
    installUpdate = updateToast.installUpdate;
  } catch (e) {
    // Context not available (e.g., in tests without provider)
    // Badge will not be shown
    console.warn('[Titlebar] UpdateToastContext not available:', e);
  }

  const handleBadgeClick = () => {
    if (installUpdate) {
      // Open options to About tab to show update info
      window.electronAPI?.openOptions('about');
    }
  };

  return (
    <header className="titlebar" data-testid="titlebar">
      <div className="titlebar-left">
        {mergedConfig.showIcon && (
          <div className="titlebar-icon">
            {/* Placeholder for app icon - can be customized later */}
            <img
              src={icon}
              alt="App Icon"
              style={{ width: 16, height: 16 }}
              data-testid={TITLEBAR_TEST_IDS.APP_ICON}
            />
            {/* Update badge indicator */}
            {hasPendingUpdate && (
              <button
                className="update-badge"
                onClick={handleBadgeClick}
                title="Update ready - click to install"
                aria-label="Update available, click to install"
                data-testid="update-badge"
              />
            )}
          </div>
        )}
        <TitlebarMenu menus={menus} />
      </div>
      {/* 
                Drag region - allows window dragging without blocking menu clicks.
                Dragging is handled by CSS (-webkit-app-region: drag) in titlebar.css
            */}
      <div className="titlebar-drag-region">
        <span className="titlebar-title" data-testid="titlebar-title">
          {mergedConfig.title}
        </span>
      </div>
      <WindowControls />
    </header>
  );
}
