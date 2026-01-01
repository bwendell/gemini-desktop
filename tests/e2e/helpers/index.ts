/**
 * E2E Test Helpers Barrel Export.
 * Import all utilities from this single entry point.
 */

// Core utilities
export * from './platform';
export * from './logger';
export * from './selectors';
export * from './e2eConstants';
import './types';

// Window management
export * from './windowActions';
export * from './windowStateActions';
export * from './optionsWindowActions';

// Input actions
export * from './menuActions';
export * from './keyboardActions';
export * from './hotkeyHelpers';
export * from './trayActions';

// Feature-specific actions
export * from './quickChatActions';
export * from './alwaysOnTopActions';
export * from './printActions';

// NEW: Reusable test patterns
export * from './assertions';
export * from './workflows';
export { SettingsHelper, SettingsData } from './SettingsHelper';

// Page Object Model
export * from '../pages';
