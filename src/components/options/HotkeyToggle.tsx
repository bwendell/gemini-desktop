/**
 * HotkeyToggle Component
 * 
 * A toggle switch for enabling/disabling global hotkey combinations.
 * This component provides the UI for the hotkey toggle feature in the Options window.
 * 
 * ## Architecture
 * 
 * This component is part of the hotkey toggle feature:
 * ```
 * User clicks toggle
 *        ↓
 * HotkeyToggle (this component)
 *        ↓
 * HotkeysContext (state management)
 *        ↓
 * Electron IPC → HotkeyManager (backend)
 * ```
 * 
 * ## Features
 * - Uses CapsuleToggle for consistent visual appearance
 * - Integrates with HotkeysContext for state management
 * - State is persisted and synchronized across all windows
 * - Displays user-friendly description of available hotkeys
 * 
 * ## Available Hotkeys (when enabled)
 * - **Ctrl+Alt+E** / **Cmd+Alt+E**: Minimize main window
 * - **Ctrl+Shift+Space** / **Cmd+Shift+Space**: Toggle Quick Chat
 * 
 * @module HotkeyToggle
 * @see CapsuleToggle - The underlying toggle switch component
 * @see HotkeysContext - State management for hotkeys
 * @see HotkeyManager - Backend manager in Electron main process
 * 
 * @example
 * // Used in OptionsWindow.tsx
 * <OptionsSection title="Appearance">
 *     <ThemeSelector />
 *     <HotkeyToggle />
 * </OptionsSection>
 */

import { memo } from 'react';
import { CapsuleToggle } from '../common/CapsuleToggle';
import { useHotkeys } from '../../context/HotkeysContext';

// ============================================================================
// Component
// ============================================================================

/**
 * Toggle component for hotkey combinations setting.
 * 
 * Renders a capsule toggle that enables/disables all global hotkeys.
 * When toggled:
 * - ON: All global shortcuts are registered and active
 * - OFF: All global shortcuts are unregistered (but configs preserved)
 * 
 * The setting is persisted to the Electron store and synchronized
 * across all application windows in real-time.
 * 
 * @returns JSX element containing the toggle switch
 */
export const HotkeyToggle = memo(function HotkeyToggle() {
    // Get hotkey state from context
    const { enabled, setEnabled } = useHotkeys();

    return (
        <CapsuleToggle
            checked={enabled}
            onChange={setEnabled}
            label="Hotkey Combinations"
            description="Enable global keyboard shortcuts (Ctrl+Alt+E, Ctrl+Shift+Space)"
            testId="hotkey-toggle"
        />
    );
});

export default HotkeyToggle;
