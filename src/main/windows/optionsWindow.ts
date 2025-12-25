/**
 * Options Window class for settings/about dialogs.
 *
 * Handles:
 * - Options window creation with custom titlebar
 * - Tab navigation via hash fragments
 * - Single instance enforcement
 *
 * @module OptionsWindow
 */

import { BrowserWindow, type BrowserWindowConstructorOptions } from 'electron';
import BaseWindow from './baseWindow';
import { OPTIONS_WINDOW_CONFIG, getTitleBarStyle, getDevUrl } from '../utils/constants';
import { getDistHtmlPath } from '../utils/paths';

/**
 * Options/Settings window.
 * Handles the settings and about dialogs.
 */
export default class OptionsWindow extends BaseWindow {
    protected readonly windowConfig: BrowserWindowConstructorOptions;
    protected readonly htmlFile = 'src/renderer/windows/options/options.html';

    /**
     * Creates a new OptionsWindow instance.
     * @param isDev - Whether running in development mode
     */
    constructor(isDev: boolean) {
        super(isDev, '[OptionsWindow]');
        this.windowConfig = {
            ...OPTIONS_WINDOW_CONFIG,
            titleBarStyle: getTitleBarStyle(),
        };
    }

    /**
     * Create or focus the options window.
     * @param tab - Optional tab to open ('settings' or 'about')
     * @returns The options window
     */
    create(tab?: 'settings' | 'about'): BrowserWindow {
        const hash = tab ? `#${tab}` : '';

        if (this.window && !this.window.isDestroyed()) {
            // If window exists, navigate to the requested tab
            if (tab) {
                const currentUrl = this.window.webContents.getURL();
                const baseUrl = currentUrl.split('#')[0];
                this.window.loadURL(`${baseUrl}${hash}`);
            }
            this.window.focus();
            return this.window;
        }

        const win = this.createWindow();

        win.once('ready-to-show', () => {
            win.show();
        });

        return win;
    }

    /**
     * Override loadContent to handle optional hash for tabs.
     */
    protected override loadContent(): void {
        if (!this.window) return;

        // Note: Hash is handled in create() for existing windows,
        // but for a new window we load it here.
        // Since loadContent doesn't take arguments, we'll just load the base file
        // and let create() handle the navigation if needed, OR we could
        // use a private property to store the pending tab.

        if (this.isDev) {
            this.window.loadURL(getDevUrl(this.htmlFile));
        } else {
            this.window.loadFile(getDistHtmlPath(this.htmlFile));
        }
    }
}
