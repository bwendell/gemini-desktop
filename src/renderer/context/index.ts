/**
 * Barrel exports for context providers.
 * Enables cleaner imports: import { ThemeProvider, useTheme } from '@/context'
 */

export { ThemeProvider, useTheme } from './ThemeContext';
export type { Theme } from './ThemeContext';

export { IndividualHotkeysProvider, useIndividualHotkeys } from './IndividualHotkeysContext';
export type { HotkeyId, IndividualHotkeySettings, HotkeyAccelerators } from './IndividualHotkeysContext';

export { UpdateToastProvider, useUpdateToast } from './UpdateToastContext';

export { ToastProvider, ToastContext, useToast } from './ToastContext';
export type { ShowToastOptions, ToastContextValue } from './ToastContext';

export { TabProvider, useTabContext } from './TabContext';

export { createElectronContext } from './createElectronContext';
