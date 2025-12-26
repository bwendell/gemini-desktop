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
 * setAccelerator('bossKey', 'CommandOrControl+Alt+H');
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createRendererLogger } from '../utils';
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
// Context
// ============================================================================

const IndividualHotkeysContext = createContext<IndividualHotkeysContextType | undefined>(undefined);

interface IndividualHotkeysProviderProps {
  children: React.ReactNode;
}

// ============================================================================
// Helper Functions
// ============================================================================

/** Default settings when API is unavailable */
const DEFAULT_SETTINGS: IndividualHotkeySettings = {
  alwaysOnTop: true,
  bossKey: true,
  quickChat: true,
};

/**
 * Type guard to check if data is in the expected format.
 */
function isValidSettings(data: unknown): data is IndividualHotkeySettings {
  return (
    typeof data === 'object' &&
    data !== null &&
    'alwaysOnTop' in data &&
    'bossKey' in data &&
    'quickChat' in data &&
    typeof (data as IndividualHotkeySettings).alwaysOnTop === 'boolean' &&
    typeof (data as IndividualHotkeySettings).bossKey === 'boolean' &&
    typeof (data as IndividualHotkeySettings).quickChat === 'boolean'
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
    'bossKey' in data &&
    'quickChat' in data &&
    typeof (data as HotkeyAccelerators).alwaysOnTop === 'string' &&
    typeof (data as HotkeyAccelerators).bossKey === 'string' &&
    typeof (data as HotkeyAccelerators).quickChat === 'string'
  );
}

// ============================================================================
// Provider Component
// ============================================================================

/**
 * Individual hotkeys provider component.
 *
 * Features:
 * - Syncs individual hotkey settings with Electron backend
 * - Syncs hotkey accelerators with Electron backend
 * - Listens for changes from other windows
 * - Falls back to defaults when Electron is unavailable
 */
export function IndividualHotkeysProvider({ children }: IndividualHotkeysProviderProps) {
  const [settings, setSettingsState] = useState<IndividualHotkeySettings>(DEFAULT_SETTINGS);
  const [accelerators, setAcceleratorsState] = useState<HotkeyAccelerators>(DEFAULT_ACCELERATORS);

  // Initialize state from Electron on mount
  useEffect(() => {
    let isMounted = true;

    const initHotkeys = async () => {
      // No Electron API - use defaults
      if (!window.electronAPI?.getIndividualHotkeys) {
        logger.log('No Electron API, using defaults');
        return;
      }

      try {
        // Fetch enabled settings
        const settingsResult = await window.electronAPI.getIndividualHotkeys();

        /* v8 ignore next -- race condition guard for async unmount */
        if (!isMounted) return;

        if (isValidSettings(settingsResult)) {
          setSettingsState(settingsResult);
          logger.log('Individual hotkeys initialized:', settingsResult);
        } else {
          logger.log('Unexpected settings format:', settingsResult);
        }

        // Fetch accelerators
        if (window.electronAPI?.getHotkeyAccelerators) {
          const acceleratorsResult = await window.electronAPI.getHotkeyAccelerators();
          
          /* v8 ignore next -- race condition guard for async unmount */
          if (!isMounted) return;

          if (isValidAccelerators(acceleratorsResult)) {
            setAcceleratorsState(acceleratorsResult);
            logger.log('Accelerators initialized:', acceleratorsResult);
          } else {
            logger.log('Unexpected accelerators format:', acceleratorsResult);
          }
        }
      } catch (error) {
        logger.error('Failed to initialize individual hotkeys:', error);
      }
    };

    initHotkeys();

    // Subscribe to settings changes from other windows
    const cleanups: (() => void)[] = [];

    if (window.electronAPI?.onIndividualHotkeysChanged) {
      const cleanup = window.electronAPI.onIndividualHotkeysChanged((data) => {
        /* v8 ignore next -- race condition guard for callback after unmount */
        if (!isMounted) return;

        if (isValidSettings(data)) {
          setSettingsState(data);
          logger.log('Individual hotkeys updated from external source:', data);
        }
      });
      cleanups.push(cleanup);
    }

    // Subscribe to accelerator changes from other windows
    if (window.electronAPI?.onHotkeyAcceleratorsChanged) {
      const cleanup = window.electronAPI.onHotkeyAcceleratorsChanged((data) => {
        /* v8 ignore next -- race condition guard for callback after unmount */
        if (!isMounted) return;

        if (isValidAccelerators(data)) {
          setAcceleratorsState(data);
          logger.log('Accelerators updated from external source:', data);
        }
      });
      cleanups.push(cleanup);
    }

    return () => {
      isMounted = false;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  // Memoized setter for enabled state
  const setEnabled = useCallback((id: HotkeyId, enabled: boolean) => {
    setSettingsState((prev) => ({ ...prev, [id]: enabled }));

    if (window.electronAPI?.setIndividualHotkey) {
      try {
        window.electronAPI.setIndividualHotkey(id, enabled);
      } catch (error) {
        logger.error('Failed to set individual hotkey:', error);
      }
    }
  }, []);

  // Memoized setter for accelerator
  const setAccelerator = useCallback((id: HotkeyId, accelerator: string) => {
    setAcceleratorsState((prev) => ({ ...prev, [id]: accelerator }));

    if (window.electronAPI?.setHotkeyAccelerator) {
      try {
        window.electronAPI.setHotkeyAccelerator(id, accelerator);
      } catch (error) {
        logger.error('Failed to set hotkey accelerator:', error);
      }
    }
  }, []);

  return (
    <IndividualHotkeysContext.Provider value={{ settings, accelerators, setEnabled, setAccelerator }}>
      {children}
    </IndividualHotkeysContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access the individual hotkeys context.
 * Must be used within an IndividualHotkeysProvider.
 *
 * @returns Individual hotkeys context with settings, accelerators, setEnabled, setAccelerator
 * @throws Error if used outside of IndividualHotkeysProvider
 *
 * @example
 * const { settings, accelerators, setEnabled, setAccelerator } = useIndividualHotkeys();
 * setEnabled('quickChat', false); // Disable Quick Chat hotkey
 * setAccelerator('bossKey', 'CommandOrControl+Alt+H'); // Change Boss Key shortcut
 */
export function useIndividualHotkeys(): IndividualHotkeysContextType {
  const context = useContext(IndividualHotkeysContext);
  if (context === undefined) {
    throw new Error('useIndividualHotkeys must be used within an IndividualHotkeysProvider');
  }
  return context;
}
