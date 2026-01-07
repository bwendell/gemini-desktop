/**
 * Theme IPC Handler.
 *
 * Handles IPC channels for theme management:
 * - theme:get - Returns current theme preference and effective theme
 * - theme:set - Sets the theme preference
 *
 * @module ipc/ThemeIpcHandler
 */

import { ipcMain, nativeTheme } from 'electron';
import { BaseIpcHandler } from './BaseIpcHandler';
import { IPC_CHANNELS } from '../../utils/constants';
import type { ThemePreference, ThemeData } from '../../types';

/** Valid theme preference values */
const VALID_THEMES: ThemePreference[] = ['light', 'dark', 'system'];

/**
 * Handler for theme-related IPC channels.
 *
 * Manages theme persistence, nativeTheme synchronization, and broadcasting
 * theme changes to all windows.
 */
export class ThemeIpcHandler extends BaseIpcHandler {
    /**
     * Register theme IPC handlers with ipcMain.
     */
    register(): void {
        // Get current theme preference and effective theme
        ipcMain.handle(IPC_CHANNELS.THEME_GET, (): ThemeData => {
            return this._handleGetTheme();
        });

        // Set theme preference
        ipcMain.on(IPC_CHANNELS.THEME_SET, (_event, theme: ThemePreference) => {
            this._handleSetTheme(theme);
        });
    }

    /**
     * Initialize nativeTheme based on stored preference.
     * Called during handler initialization.
     */
    initialize(): void {
        try {
            const savedTheme = this.deps.store.get('theme') || 'system';
            nativeTheme.themeSource = savedTheme;
            this.logger.log(`Native theme initialized to: ${savedTheme}`);
        } catch (error) {
            this.handleError('initializing native theme', error);
        }
    }

    /**
     * Handle theme:get request.
     * @returns Current theme preference and effective theme
     */
    private _handleGetTheme(): ThemeData {
        try {
            const preference = this.deps.store.get('theme') || 'system';
            const effectiveTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
            return { preference, effectiveTheme };
        } catch (error) {
            this.logger.error('Error getting theme:', error);
            return { preference: 'system', effectiveTheme: 'dark' };
        }
    }

    /**
     * Handle theme:set request.
     * @param theme - The theme preference to set
     */
    private _handleSetTheme(theme: ThemePreference): void {
        try {
            // Validate theme value
            if (!VALID_THEMES.includes(theme)) {
                this.logger.warn(`Invalid theme value: ${theme}`);
                return;
            }

            // Persist preference
            this.deps.store.set('theme', theme);

            // Update native theme (affects nativeTheme.shouldUseDarkColors)
            nativeTheme.themeSource = theme;

            // Compute effective theme after nativeTheme update
            const effectiveTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';

            this.logger.log(`Theme set to: ${theme} (effective: ${effectiveTheme})`);

            // Broadcast to all windows
            this._broadcastThemeChange(theme, effectiveTheme);
        } catch (error) {
            this.logger.error('Error setting theme:', {
                error: (error as Error).message,
                requestedTheme: theme,
            });
        }
    }

    /**
     * Broadcast theme change to all open windows.
     * @param preference - The theme preference
     * @param effectiveTheme - The resolved effective theme
     */
    private _broadcastThemeChange(preference: ThemePreference, effectiveTheme: 'light' | 'dark'): void {
        this.broadcastToAllWindows(IPC_CHANNELS.THEME_CHANGED, {
            preference,
            effectiveTheme,
        });
    }
}
