/**
 * Hotkey Manager for the Electron main process.
 * Handles global shortcut registration and management.
 * 
 * @module HotkeyManager
 */

import { globalShortcut } from 'electron';
import type WindowManager from './windowManager';
import { createLogger } from '../utils/logger';

const logger = createLogger('[HotkeyManager]');

interface Shortcut {
    accelerator: string;
    action: () => void;
}

/**
 * Manages global keyboard shortcuts for the application.
 */
export default class HotkeyManager {
    private windowManager: WindowManager;
    private shortcuts: Shortcut[];

    /**
     * Creates a new HotkeyManager instance.
     * @param windowManager - The window manager instance
     */
    constructor(windowManager: WindowManager) {
        this.windowManager = windowManager;

        // Define shortcuts configuration
        // This structure allows for easy platform-specific overrides if needed
        this.shortcuts = [
            {
                // Minimize Window
                accelerator: 'CommandOrControl+Alt+E',
                action: () => {
                    logger.log('Hotkey pressed: CommandOrControl+Alt+E (Minimize)');
                    this.windowManager.minimizeMainWindow();
                }
            }
        ];
    }

    /**
     * Register global shortcuts.
     */
    registerShortcuts(): void {
        this.shortcuts.forEach(shortcut => {
            const ret = globalShortcut.register(shortcut.accelerator, shortcut.action);

            if (!ret) {
                logger.error(`Registration failed for hotkey: ${shortcut.accelerator}`);
            } else {
                logger.log(`Hotkey registered: ${shortcut.accelerator}`);
            }
        });
    }

    /**
     * Unregister all shortcuts.
     */
    unregisterAll(): void {
        globalShortcut.unregisterAll();
        logger.log('All hotkeys unregistered');
    }
}
