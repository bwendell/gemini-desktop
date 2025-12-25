/**
 * IndividualHotkeyToggles Component
 * 
 * Container component that renders toggle switches for each individual hotkey feature.
 * Allows users to enable/disable hotkeys independently.
 * 
 * ## Hotkeys
 * - **Always on Top**: Toggle window always-on-top (Ctrl/Cmd+Shift+T)
 * - **Boss Key**: Minimize window (Ctrl/Cmd+Alt+E) 
 * - **Quick Chat**: Open quick chat overlay (Ctrl/Cmd+Shift+Space)
 * 
 * @module IndividualHotkeyToggles
 */

import { memo, useMemo } from 'react';
import { CapsuleToggle } from '../common/CapsuleToggle';
import { useIndividualHotkeys, HotkeyId } from '../../context/IndividualHotkeysContext';

// ============================================================================
// Types
// ============================================================================

interface HotkeyConfig {
    id: HotkeyId;
    label: string;
    description: string;
    /** Shortcut with platform placeholder */
    shortcutWin: string;
    shortcutMac: string;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for each hotkey toggle.
 * This array is the source of truth for adding new hotkeys.
 */
const HOTKEY_CONFIGS: HotkeyConfig[] = [
    {
        id: 'alwaysOnTop',
        label: 'Always on Top',
        description: 'Toggle window always-on-top',
        shortcutWin: 'Ctrl+Shift+T',
        shortcutMac: 'Cmd+Shift+T',
    },
    {
        id: 'bossKey',
        label: 'Boss Key',
        description: 'Quickly minimize to system tray',
        shortcutWin: 'Ctrl+Alt+E',
        shortcutMac: 'Cmd+Alt+E',
    },
    {
        id: 'quickChat',
        label: 'Quick Chat',
        description: 'Open floating chat overlay',
        shortcutWin: 'Ctrl+Shift+Space',
        shortcutMac: 'Cmd+Shift+Space',
    },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get platform-appropriate shortcut display text.
 */
function getShortcutDisplay(config: HotkeyConfig): string {
    const isMac = window.electronAPI?.platform === 'darwin';
    return isMac ? config.shortcutMac : config.shortcutWin;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Individual hotkey toggle component.
 * Renders all hotkey toggles with platform-aware shortcut display.
 */
export const IndividualHotkeyToggles = memo(function IndividualHotkeyToggles() {
    const { settings, setEnabled } = useIndividualHotkeys();

    // Memoize configs with platform-appropriate shortcuts
    const configs = useMemo(() =>
        HOTKEY_CONFIGS.map(config => ({
            ...config,
            shortcut: getShortcutDisplay(config),
        })),
        []);

    return (
        <div className="individual-hotkey-toggles" data-testid="individual-hotkey-toggles">
            {configs.map(config => (
                <CapsuleToggle
                    key={config.id}
                    checked={settings[config.id]}
                    onChange={(enabled) => setEnabled(config.id, enabled)}
                    label={config.label}
                    description={`${config.description} (${config.shortcut})`}
                    testId={`hotkey-toggle-${config.id}`}
                />
            ))}
        </div>
    );
});

export default IndividualHotkeyToggles;
