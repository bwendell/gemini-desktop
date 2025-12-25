/**
 * Hotkey Types
 * 
 * Shared types for hotkey management across main and renderer processes.
 */

/**
 * Identifiers for individual hotkey features.
 */
export type HotkeyId = 'alwaysOnTop' | 'bossKey' | 'quickChat';

/**
 * Individual hotkey settings returned from main process.
 * Each key represents a hotkey feature's enabled state.
 */
export interface IndividualHotkeySettings {
    /** Always on Top toggle hotkey (Ctrl/Cmd+Shift+T) */
    alwaysOnTop: boolean;
    /** Boss Key / Minimize hotkey (Ctrl/Cmd+Alt+E) */
    bossKey: boolean;
    /** Quick Chat toggle hotkey (Ctrl/Cmd+Shift+Space) */
    quickChat: boolean;
}
