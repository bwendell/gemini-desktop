/**
 * Individual Hotkeys Context for the application.
 *
 * Provides individual hotkey enabled state and accelerator management
 * with synchronization to the Electron backend.
 * Each hotkey can be independently enabled/disabled and have its accelerator customized.
 *
 * @module IndividualHotkeysContext
 * @example
 * // Wrap your app with IndividualHotkeysProvider
 * <IndividualHotkeysProvider>
 *   <App />
 * </IndividualHotkeysProvider>
 *
 * // Use the hotkey state in components
 * const { settings, accelerators, setEnabled, setAccelerator } = useIndividualHotkeys();
 * setEnabled('quickChat', false);
 * setAccelerator('peekAndHide', 'CommandOrControl+Shift+Space');
 */

import { createRendererLogger } from '../utils';
import { createElectronContext } from './createElectronContext';
import type {
    HotkeyId as SharedHotkeyId,
    IndividualHotkeySettings as SharedIndividualHotkeySettings,
    HotkeyAccelerators as SharedHotkeyAccelerators,
} from '../../shared/types/hotkeys';
import { DEFAULT_ACCELERATORS as SHARED_DEFAULT_ACCELERATORS } from '../../shared/types/hotkeys';

const logger = createRendererLogger('[IndividualHotkeysContext]');

// ============================================================================
// Types - Re-exported from shared for convenience
// ============================================================================

/** Hotkey identifier */
export type HotkeyId = SharedHotkeyId;

/** Individual hotkey settings (enabled states) */
export type IndividualHotkeySettings = SharedIndividualHotkeySettings;

/** Hotkey accelerators (keyboard shortcuts) */
export type HotkeyAccelerators = SharedHotkeyAccelerators;

/** Default accelerators for each hotkey */
export const DEFAULT_ACCELERATORS: HotkeyAccelerators = SHARED_DEFAULT_ACCELERATORS;

/** Individual hotkeys context value exposed to consumers */
interface IndividualHotkeysContextType {
    /** Current enabled state for each hotkey */
    settings: IndividualHotkeySettings;
    /** Current accelerator for each hotkey */
    accelerators: HotkeyAccelerators;
    /** Function to update a specific hotkey's enabled state */
    setEnabled: (id: HotkeyId, enabled: boolean) => void;
    /** Function to update a specific hotkey's accelerator */
    setAccelerator: (id: HotkeyId, accelerator: string) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/** Default settings when API is unavailable */
const DEFAULT_SETTINGS: IndividualHotkeySettings = {
    alwaysOnTop: true,
    peekAndHide: true,
    quickChat: true,
    voiceChat: true,
    printToPdf: true,
};

/**
 * Type guard to check if data is in the expected format.
 */
function isValidSettings(data: unknown): data is IndividualHotkeySettings {
    return (
        typeof data === 'object' &&
        data !== null &&
        'alwaysOnTop' in data &&
        'peekAndHide' in data &&
        'quickChat' in data &&
        'voiceChat' in data &&
        'printToPdf' in data &&
        typeof (data as IndividualHotkeySettings).alwaysOnTop === 'boolean' &&
        typeof (data as IndividualHotkeySettings).peekAndHide === 'boolean' &&
        typeof (data as IndividualHotkeySettings).quickChat === 'boolean' &&
        typeof (data as IndividualHotkeySettings).voiceChat === 'boolean' &&
        typeof (data as IndividualHotkeySettings).printToPdf === 'boolean'
    );
}

/**
 * Type guard to check if data is valid accelerators.
 */
function isValidAccelerators(data: unknown): data is HotkeyAccelerators {
    return (
        typeof data === 'object' &&
        data !== null &&
        'alwaysOnTop' in data &&
        'peekAndHide' in data &&
        'quickChat' in data &&
        'voiceChat' in data &&
        'printToPdf' in data &&
        typeof (data as HotkeyAccelerators).alwaysOnTop === 'string' &&
        typeof (data as HotkeyAccelerators).peekAndHide === 'string' &&
        typeof (data as HotkeyAccelerators).quickChat === 'string' &&
        typeof (data as HotkeyAccelerators).voiceChat === 'string' &&
        typeof (data as HotkeyAccelerators).printToPdf === 'string'
    );
}

const hotkeyChannels = {
    settings: {
        defaultValue: DEFAULT_SETTINGS,
        getter: (api: NonNullable<typeof window.electronAPI>) => api.getIndividualHotkeys,
        onChange: (api: NonNullable<typeof window.electronAPI>) => api.onIndividualHotkeysChanged,
        validate: (data: unknown): data is IndividualHotkeySettings => isValidSettings(data),
    },
    accelerators: {
        defaultValue: DEFAULT_ACCELERATORS,
        getter: (api: NonNullable<typeof window.electronAPI>) => api.getHotkeyAccelerators,
        onChange: (api: NonNullable<typeof window.electronAPI>) => api.onHotkeyAcceleratorsChanged,
        validate: (data: unknown): data is HotkeyAccelerators => isValidAccelerators(data),
    },
} as const;

const { Provider: IndividualHotkeysProvider, useContextHook: useIndividualHotkeys } = createElectronContext({
    displayName: 'IndividualHotkeys',
    channels: hotkeyChannels,
    buildContextValue: (state, setters): IndividualHotkeysContextType => ({
        settings: state.settings,
        accelerators: state.accelerators,
        setEnabled: (id: HotkeyId, enabled: boolean) => {
            setters.settings((prev) => ({ ...prev, [id]: enabled }));
            try {
                window.electronAPI?.setIndividualHotkey(id, enabled);
            } catch (error) {
                logger.error('Failed to set individual hotkey:', error);
            }
        },
        setAccelerator: (id: HotkeyId, accelerator: string) => {
            setters.accelerators((prev) => ({ ...prev, [id]: accelerator }));
            try {
                window.electronAPI?.setHotkeyAccelerator(id, accelerator);
            } catch (error) {
                logger.error('Failed to set hotkey accelerator:', error);
            }
        },
    }),
});

export { IndividualHotkeysProvider, useIndividualHotkeys };
