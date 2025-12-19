import { memo } from 'react';
import { usesCustomWindowControls } from '../../utils';
import { useWindowControls } from '../../hooks/useWindowControls';
import { TITLEBAR_TEST_IDS } from '../../utils/testIds';
import './titlebar.css';

/**
 * Window control buttons component (minimize, maximize, close).
 * Uses CSS for styling with hover effects.
 * 
 * The `-webkit-app-region: no-drag` ensures buttons are clickable
 * even when placed within the draggable titlebar region.
 * 
 * Memoized to prevent unnecessary re-renders.
 */
export const WindowControls = memo(function WindowControls() {
    const { minimize, maximize, close } = useWindowControls();

    // On macOS, we use the native traffic lights provided by 'titleBarStyle: Overlay'
    // So we hide these custom controls.
    if (!usesCustomWindowControls()) {
        return null;
    }

    return (
        <div className="window-controls">
            <button
                className="window-control-button minimize"
                onClick={minimize}
                aria-label="Minimize window"
                title="Minimize"
                data-testid={TITLEBAR_TEST_IDS.MINIMIZE_BUTTON}
            >
                <svg width="10" height="1" viewBox="0 0 10 1">
                    <rect width="10" height="1" fill="currentColor" />
                </svg>
            </button>

            <button
                className="window-control-button maximize"
                onClick={maximize}
                aria-label="Maximize window"
                title="Maximize"
                data-testid={TITLEBAR_TEST_IDS.MAXIMIZE_BUTTON}
            >
                <svg width="10" height="10" viewBox="0 0 10 10">
                    <rect
                        width="9"
                        height="9"
                        x="0.5"
                        y="0.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                    />
                </svg>
            </button>

            <button
                className="window-control-button close"
                onClick={close}
                aria-label="Close window"
                title="Close"
                data-testid={TITLEBAR_TEST_IDS.CLOSE_BUTTON}
            >
                <svg width="10" height="10" viewBox="0 0 10 10">
                    <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2" />
                    <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.2" />
                </svg>
            </button>
        </div>
    );
});
