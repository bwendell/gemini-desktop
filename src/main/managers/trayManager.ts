/**
 * Tray Manager for the Electron main process.
 * Handles system tray icon and context menu functionality.
 *
 * @module TrayManager
 */

import { Tray, Menu, app, nativeImage } from 'electron';
import * as fs from 'fs';
import type { MenuItemConstructorOptions } from 'electron';
import { getIconPath, getTrayIconPath } from '../utils/paths';
import { TRAY_MENU_ITEMS, TRAY_TOOLTIP } from '../utils/constants';
import { createLogger } from '../utils/logger';
import type WindowManager from './windowManager';

const logger = createLogger('[TrayManager]');

/**
 * Manages the system tray icon and context menu.
 *
 * ## Features
 * - Creates system tray icon with app icon
 * - Provides context menu for show/quit actions
 * - Handles tray click to restore window
 * - Cross-platform support (Windows, macOS, Linux)
 *
 * @class TrayManager
 */
export default class TrayManager {
    /** Reference to the window manager */
    private windowManager: WindowManager;

    /** The system tray instance */
    private tray: Tray | null = null;

    /** Track current tooltip for E2E testing */
    private currentToolTip: string = TRAY_TOOLTIP;

    /**
     * Creates a new TrayManager instance.
     * @param windowManager - The WindowManager instance for window control
     */
    constructor(windowManager: WindowManager) {
        this.windowManager = windowManager;
        logger.log('TrayManager initialized');
    }

    /**
     * Create and configure the system tray icon.
     * @returns The created Tray instance
     */
    createTray(): Tray {
        try {
            if (this.tray) {
                logger.warn('Tray already exists, returning existing instance');
                return this.tray;
            }

            let iconPath = getTrayIconPath();
            if (!fs.existsSync(iconPath)) {
                logger.warn(`Tray icon not found: ${iconPath}, falling back to app icon`);
                iconPath = getIconPath();
                if (!fs.existsSync(iconPath)) {
                    throw new Error(`Icon not found: ${iconPath}`);
                }
            }

            // Create nativeImage for tray (required for proper icon handling)
            const trayIcon = nativeImage.createFromPath(iconPath);
            if (trayIcon.isEmpty()) {
                throw new Error(`Failed to load tray icon: ${iconPath}`);
            }

            this.tray = new Tray(trayIcon);

            // Set tooltip
            this.tray.setToolTip(this.currentToolTip);

            // Build and set context menu
            const contextMenu = this._buildContextMenu();
            this.tray.setContextMenu(contextMenu);

            // Handle tray click to restore window
            this.tray.on('click', () => {
                logger.log('Tray icon clicked');
                this.windowManager.restoreFromTray();
            });

            logger.log('Tray created successfully');
            return this.tray;
        } catch (error) {
            /* v8 ignore next 2 -- defensive error handling, hard to trigger in tests */
            logger.error('Failed to create tray:', error);
            throw error;
        }
    }

    /**
     * Build the context menu from TRAY_MENU_ITEMS configuration.
     * @private
     * @returns The Menu instance
     */
    private _buildContextMenu(): Electron.Menu {
        const menuTemplate: MenuItemConstructorOptions[] = Object.values(TRAY_MENU_ITEMS).map((item) => {
            if (item.isSeparator) {
                return { type: 'separator' as const };
            }

            return {
                label: item.label,
                accelerator: item.accelerator,
                click: () => this._handleMenuItemClick(item.id),
            };
        });

        return Menu.buildFromTemplate(menuTemplate);
    }

    /**
     * Handle context menu item clicks.
     * @private
     * @param itemId - The id of the clicked menu item
     */
    private _handleMenuItemClick(itemId: string): void {
        logger.log('Menu item clicked:', itemId);

        switch (itemId) {
            case 'show':
                this.windowManager.restoreFromTray();
                break;
            case 'quit':
                app.quit();
                break;
            /* v8 ignore next 2 -- fallback for unknown menu items, extensibility safety net */
            default:
                logger.warn('Unknown menu item:', itemId);
        }
    }

    /**
     * Execute a tray action programmatically.
     *
     * This method exists primarily for E2E testing, allowing tests to trigger
     * the same code path that would be executed when a user clicks the tray icon
     * or a tray menu item.
     *
     * @param action - The action to execute: 'click', 'show', or 'quit'
     */
    executeTrayAction(action: 'click' | 'show' | 'quit'): void {
        logger.log(`Executing tray action programmatically: ${action}`);

        switch (action) {
            case 'click':
            case 'show':
                // Same as tray click handler
                this.windowManager.restoreFromTray();
                break;
            case 'quit':
                app.quit();
                break;
        }
    }

    /**
     * Destroy the system tray icon.
     * Should be called on app quit.
     */
    destroyTray(): void {
        try {
            if (this.tray && !this.tray.isDestroyed()) {
                this.tray.destroy();
                logger.log('Tray destroyed');
            }
            this.tray = null;
        } catch (error) {
            /* v8 ignore next -- defensive error handling */
            logger.error('Failed to destroy tray:', error);
        }
    }

    /**
     * Get the tray instance.
     * @returns The Tray instance or null if not created
     */
    getTray(): Tray | null {
        return this.tray;
    }

    /**
     * Get current tooltip text.
     * @returns The current tooltip string
     */
    getToolTip(): string {
        return this.currentToolTip;
    }

    /**
     * Set the tray tooltip to show an update notification.
     * @param version - The update version available
     */
    setUpdateTooltip(version: string): void {
        if (this.tray && !this.tray.isDestroyed()) {
            this.currentToolTip = `${TRAY_TOOLTIP} - Update v${version} available`;
            this.tray.setToolTip(this.currentToolTip);
            logger.log('Tray tooltip updated for version:', version);
        }
    }

    /**
     * Clear the update tooltip and restore default.
     */
    clearUpdateTooltip(): void {
        if (this.tray && !this.tray.isDestroyed()) {
            this.currentToolTip = TRAY_TOOLTIP;
            this.tray.setToolTip(this.currentToolTip);
            logger.log('Tray tooltip reset to default');
        }
    }
}
