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
import { createRendererLogger } from '../utils';

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
    typeof data === 'object' && data !== null && 'preference' in data && 'effectiveTheme' in data
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
    const abortController = new AbortController();
    const { signal } = abortController;

    const initTheme = async (): Promise<void> => {
      // No Electron API - use browser defaults
      /* v8 ignore start -- browser-only fallback path */
      if (!window.electronAPI) {
        logger.log('No Electron API, using browser defaults');
        const systemTheme = getSystemThemePreference();
        if (!signal.aborted) {
          setEffectiveTheme(systemTheme);
          applyThemeToDom(systemTheme);
        }
        return;
      }
      /* v8 ignore stop */

      try {
        const result = await window.electronAPI.getTheme();

        /* v8 ignore next -- race condition guard for async unmount */
        if (signal.aborted) return;

        if (isThemeData(result)) {
          setThemeState(result.preference);
          setEffectiveTheme(result.effectiveTheme);
          applyThemeToDom(result.effectiveTheme);
          logger.log('Theme initialized:', result);
        } else if (typeof result === 'string') {
          // Legacy string format fallback
          logger.log('Using legacy theme format:', result);
          const preference = result as Theme;
          const effective = preference === 'system' ? getSystemThemePreference() : preference;
          setThemeState(preference);
          setEffectiveTheme(effective);
          applyThemeToDom(effective);
        } else {
          logger.warn('Received invalid theme data:', result);
          // Invalid data - safe fallback to system
          const systemTheme = getSystemThemePreference();
          setEffectiveTheme(systemTheme);
          applyThemeToDom(systemTheme);
        }
      } catch (error) {
        logger.error('Failed to initialize theme:', error);
        // Fall back to system preference on error
        const systemTheme = getSystemThemePreference();
        /* v8 ignore next 4 -- race condition guard for async error fallback */
        if (!signal.aborted) {
          setEffectiveTheme(systemTheme);
          applyThemeToDom(systemTheme);
        }
      }
    };

    initTheme();

    // Subscribe to theme changes from other windows
    let cleanup: (() => void) | undefined;

    if (window.electronAPI) {
      cleanup = window.electronAPI.onThemeChanged((data): void => {
        /* v8 ignore next -- race condition guard for callback after unmount */
        if (signal.aborted) return;

        if (isThemeData(data)) {
          setThemeState(data.preference);
          setEffectiveTheme(data.effectiveTheme);
          applyThemeToDom(data.effectiveTheme);
          logger.log('Theme updated from external source:', data);
        } else {
          // Legacy format fallback
          logger.log('Using legacy change format:', data);
          const preference = data as Theme;
          const effective = preference === 'system' ? getSystemThemePreference() : preference;
          setThemeState(preference);
          setEffectiveTheme(effective);
          applyThemeToDom(effective);
        }
      });
    }

    return (): void => {
      abortController.abort();
      if (cleanup) cleanup();
    };
  }, []);

  // Handle theme changes when Electron API is unavailable (browser-only fallback)
  /* v8 ignore start -- browser-only fallback path */
  useEffect(() => {
    if (window.electronAPI) return;
    const computed = theme === 'system' ? getSystemThemePreference() : theme;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setEffectiveTheme(computed);
    applyThemeToDom(computed);
  }, [theme]);
  /* v8 ignore stop */

  // Memoized theme setter to prevent unnecessary re-renders
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);

    if (window.electronAPI) {
      try {
        window.electronAPI.setTheme(newTheme);
      } catch (error) {
        logger.error('Failed to set theme:', error);
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
