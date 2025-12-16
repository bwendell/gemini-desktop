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

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

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
// Context
// ============================================================================

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: React.ReactNode;
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
    return (
        typeof data === 'object' &&
        data !== null &&
        'preference' in data &&
        'effectiveTheme' in data
    );
}

// ============================================================================
// Provider Component
// ============================================================================

/**
 * Theme provider component that manages theme state and synchronization.
 * 
 * Features:
 * - Syncs theme preference with Electron backend
 * - Listens for theme changes from other windows
 * - Falls back to browser APIs when Electron is unavailable
 * - Applies theme via data-theme attribute on <html>
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
    const [theme, setThemeState] = useState<Theme>('system');
    const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('dark');

    // Initialize theme from Electron on mount
    useEffect(() => {
        let isMounted = true;

        const initTheme = async () => {
            // No Electron API - use browser defaults
            if (!window.electronAPI) {
                console.log('[ThemeContext] No Electron API, using browser defaults');
                const systemTheme = getSystemThemePreference();
                if (isMounted) {
                    setEffectiveTheme(systemTheme);
                    applyThemeToDom(systemTheme);
                }
                return;
            }

            try {
                const result = await window.electronAPI.getTheme();

                if (!isMounted) return;

                if (isThemeData(result)) {
                    setThemeState(result.preference);
                    setEffectiveTheme(result.effectiveTheme);
                    applyThemeToDom(result.effectiveTheme);
                    console.log('[ThemeContext] Theme initialized:', result);
                } else {
                    // Legacy string format fallback
                    console.log('[ThemeContext] Using legacy theme format:', result);
                    const preference = result as Theme;
                    const effective = preference === 'system' ? getSystemThemePreference() : preference;
                    setThemeState(preference);
                    setEffectiveTheme(effective);
                    applyThemeToDom(effective);
                }
            } catch (error) {
                console.error('[ThemeContext] Failed to initialize theme:', error);
                // Fall back to system preference on error
                const systemTheme = getSystemThemePreference();
                if (isMounted) {
                    setEffectiveTheme(systemTheme);
                    applyThemeToDom(systemTheme);
                }
            }
        };

        initTheme();

        // Subscribe to theme changes from other windows
        let cleanup: (() => void) | undefined;

        if (window.electronAPI) {
            cleanup = window.electronAPI.onThemeChanged((data) => {
                if (!isMounted) return;

                if (isThemeData(data)) {
                    setThemeState(data.preference);
                    setEffectiveTheme(data.effectiveTheme);
                    applyThemeToDom(data.effectiveTheme);
                    console.log('[ThemeContext] Theme updated from external source:', data);
                } else {
                    // Legacy format fallback
                    console.log('[ThemeContext] Using legacy change format:', data);
                    const preference = data as Theme;
                    const effective = preference === 'system' ? getSystemThemePreference() : preference;
                    setThemeState(preference);
                    setEffectiveTheme(effective);
                    applyThemeToDom(effective);
                }
            });
        }

        return () => {
            isMounted = false;
            if (cleanup) cleanup();
        };
    }, []);

    // Handle theme changes when Electron API is unavailable (browser-only fallback)
    useEffect(() => {
        if (window.electronAPI) return;

        const computed = theme === 'system' ? getSystemThemePreference() : theme;
        setEffectiveTheme(computed);
        applyThemeToDom(computed);
    }, [theme]);

    // Memoized theme setter to prevent unnecessary re-renders
    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);

        if (window.electronAPI) {
            try {
                window.electronAPI.setTheme(newTheme);
            } catch (error) {
                console.error('[ThemeContext] Failed to set theme:', error);
            }
        }
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, currentEffectiveTheme: effectiveTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access the theme context.
 * Must be used within a ThemeProvider.
 * 
 * @returns Theme context with theme, setTheme, and currentEffectiveTheme
 * @throws Error if used outside of ThemeProvider
 * 
 * @example
 * const { theme, setTheme, currentEffectiveTheme } = useTheme();
 * setTheme('dark');
 */
export function useTheme(): ThemeContextType {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
