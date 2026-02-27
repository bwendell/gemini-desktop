/**
 * Theme Context for the application.
 *
 * Provides theme state management and synchronization with the Electron backend.
 * Supports three theme modes: 'light', 'dark', and 'system' (follows OS preference).
 *
 * This module is cross-platform compatible and handles:
 * - Initial theme loading from Electron store
 * - Real-time synchronization across all application windows
 * - Fallback to browser matchMedia when running outside Electron
 * - Graceful degradation when Electron API is unavailable
 *
 * @module ThemeContext
 * @example
 * // Wrap your app with ThemeProvider
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 *
 * // Use the theme in components
 * const { theme, setTheme, currentEffectiveTheme } = useTheme();
 */

import { createRendererLogger } from '../utils';
import { createElectronContext } from './createElectronContext';

const logger = createRendererLogger('[ThemeContext]');

// ============================================================================
// Types
// ============================================================================

/** Available theme preference options */
export type Theme = 'light' | 'dark' | 'system';

/** Theme data returned from Electron API */
interface ThemeData {
    preference: Theme;
    effectiveTheme: 'light' | 'dark';
}

/** Theme context value exposed to consumers */
interface ThemeContextType {
    /** Current theme preference (light, dark, or system) */
    theme: Theme;
    /** Function to update the theme preference */
    setTheme: (theme: Theme) => void;
    /** The actual theme being rendered (resolves 'system' to light/dark) */
    currentEffectiveTheme: 'light' | 'dark';
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Detect system color scheme preference.
 * Cross-platform compatible via standard matchMedia API.
 * @returns 'dark' if system prefers dark mode, 'light' otherwise
 */
function getSystemThemePreference(): 'light' | 'dark' {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDark ? 'dark' : 'light';
}

/**
 * Apply theme to the DOM by setting data-theme attribute.
 * @param effectiveTheme - The resolved theme to apply
 */
function applyThemeToDom(effectiveTheme: 'light' | 'dark'): void {
    document.documentElement.setAttribute('data-theme', effectiveTheme);
}

/**
 * Type guard to check if theme data is in the new object format.
 */
function isThemeData(data: unknown): data is ThemeData {
    return typeof data === 'object' && data !== null && 'preference' in data && 'effectiveTheme' in data;
}

function normalizeThemeData(data: unknown): ThemeData | null {
    if (isThemeData(data)) {
        return data;
    }
    if (typeof data === 'string') {
        const preference = data as Theme;
        const effective = preference === 'system' ? getSystemThemePreference() : preference;
        return {
            preference,
            effectiveTheme: effective,
        };
    }
    return null;
}

const themeChannels = {
    theme: {
        defaultValue: {
            preference: 'system' as Theme,
            effectiveTheme: getSystemThemePreference(),
        },
        getter: (api: NonNullable<typeof window.electronAPI>) => api.getTheme,
        onChange: (api: NonNullable<typeof window.electronAPI>) => api.onThemeChanged,
        validate: (data: unknown): data is ThemeData => isThemeData(data),
        adapter: (data: unknown) => normalizeThemeData(data),
    },
} as const;

const { Provider: ThemeProvider, useContextHook: useTheme } = createElectronContext({
    displayName: 'Theme',
    channels: themeChannels,
    buildContextValue: (state, setters): ThemeContextType => {
        const resolvedEffectiveTheme =
            window.electronAPI || state.theme.preference !== 'system'
                ? state.theme.effectiveTheme
                : getSystemThemePreference();

        return {
            theme: state.theme.preference,
            setTheme: (newTheme: Theme) => {
                const effectiveTheme = newTheme === 'system' ? getSystemThemePreference() : newTheme;
                const nextData: ThemeData = {
                    preference: newTheme,
                    effectiveTheme,
                };
                setters.theme(nextData);
                applyThemeToDom(effectiveTheme);
                try {
                    window.electronAPI?.setTheme(newTheme);
                } catch (error) {
                    logger.error('Failed to set theme:', error);
                }
            },
            currentEffectiveTheme: resolvedEffectiveTheme,
        };
    },
    onStateChange: (_name, value) => {
        const resolvedEffectiveTheme =
            window.electronAPI || value.preference !== 'system' ? value.effectiveTheme : getSystemThemePreference();
        applyThemeToDom(resolvedEffectiveTheme);
    },
});

export { ThemeProvider, useTheme };
