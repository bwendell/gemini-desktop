/**
 * IndividualHotkeyToggles Component
 *
 * Container component that renders toggle switches for each individual hotkey feature.
 * Allows users to enable/disable hotkeys independently and customize their keyboard shortcuts.
 *
 * ## Hotkeys
 * - **Always on Top**: Toggle window always-on-top
 * - **Boss Key**: Minimize window
 * - **Quick Chat**: Open quick chat overlay
 *
 * @module IndividualHotkeyToggles
 */

import { memo } from 'react';
import { CapsuleToggle } from '../common/CapsuleToggle';
import {
  useIndividualHotkeys,
  HotkeyId,
  DEFAULT_ACCELERATORS,
} from '../../context/IndividualHotkeysContext';
import { HotkeyAcceleratorInput } from './HotkeyAcceleratorInput';
import './individualHotkeyToggles.css';

// ============================================================================
// Types
// ============================================================================

interface HotkeyConfig {
  id: HotkeyId;
  label: string;
  description: string;
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
  },
  {
    id: 'bossKey',
    label: 'Boss Key',
    description: 'Quickly minimize to system tray',
  },
  {
    id: 'quickChat',
    label: 'Quick Chat',
    description: 'Open floating chat overlay',
  },
  {
    id: 'printToPdf',
    label: 'Print to PDF',
    description: 'Save current conversation as PDF',
  },
];

// ============================================================================
// Component
// ============================================================================

/**
 * Individual hotkey toggle component.
 * Renders all hotkey toggles with editable keyboard shortcuts.
 */
export const IndividualHotkeyToggles = memo(function IndividualHotkeyToggles() {
  const { settings, accelerators, setEnabled, setAccelerator } = useIndividualHotkeys();

  return (
    <div className="individual-hotkey-toggles" data-testid="individual-hotkey-toggles">
      {HOTKEY_CONFIGS.map((config) => (
        <div key={config.id} className="hotkey-row" data-testid={`hotkey-row-${config.id}`}>
          <div className="hotkey-label-wrapper">
            <span className="hotkey-label">{config.label}</span>
            <span className="hotkey-description">{config.description}</span>
          </div>
          <div className="hotkey-accelerator-wrapper">
            <HotkeyAcceleratorInput
              hotkeyId={config.id}
              currentAccelerator={accelerators[config.id]}
              disabled={!settings[config.id]}
              onAcceleratorChange={setAccelerator}
              defaultAccelerator={DEFAULT_ACCELERATORS[config.id]}
            />
          </div>
          <div className="hotkey-toggle-wrapper">
            <CapsuleToggle
              checked={settings[config.id]}
              onChange={(enabled) => setEnabled(config.id, enabled)}
              label=""
              description=""
              testId={`hotkey-toggle-${config.id}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
});

export default IndividualHotkeyToggles;
