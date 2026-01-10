/**
 * Path resolution utilities for Electron.
 * Centralizes all file path logic for easier maintenance and testing.
 *
 * @module paths
 */

import * as path from 'path';
import { app } from 'electron';
import { isWindows } from './constants';

/**
 * Get the preload script path.
 * Resolves to compiled CJS in dist-electron directory.
 *
 * @returns Absolute path to preload.cjs
 */
export function getPreloadPath(): string {
    return path.join(__dirname, '../../preload/preload.cjs');
}

/**
 * Get path to a file in the dist directory.
 *
 * @param filename - Name of the HTML file (e.g., 'index.html', 'options.html')
 * @returns Absolute path to the dist HTML file
 */
export function getDistHtmlPath(filename: string): string {
    return path.join(__dirname, '../../../dist', filename);
}

/**
 * Get the application icon path.
 * In development: uses the build/ directory relative to source
 * In production: uses process.resourcesPath where electron-builder copies icons
 *
 * @returns Absolute path to app icon
 */
export function getIconPath(): string {
    const iconFilename = isWindows ? 'icon.ico' : 'icon.png';

    // In packaged app, icons are in resources/ directory (via electron-builder extraFiles)
    if (app.isPackaged) {
        return path.join(process.resourcesPath, iconFilename);
    }

    // In development, icons are in build/ directory
    return path.join(__dirname, '../../../build', iconFilename);
}

/**
 * Get the notification icon path.
 * Notifications always require PNG format (even on Windows).
 * Supports Flatpak, standard packaging, and development environments.
 *
 * @returns Absolute path to notification icon (PNG)
 */
export function getNotificationIconPath(): string {
    // Icon filename - always PNG for notifications (Electron Notification requirement)
    const iconFilename = 'icon.png';

    if (app.isPackaged) {
        // Check Flatpak environment first
        // Flatpak sets FLATPAK_ID and stores icons in /app/share/icons
        if (process.env.FLATPAK_ID) {
            // Flatpak standard icon location
            const flatpakIconPath = path.join('/app/share/icons/hicolor/256x256/apps', `${process.env.FLATPAK_ID}.png`);
            return flatpakIconPath;
        }

        // Standard electron-builder packaging (AppImage, deb, rpm, dmg, nsis)
        return path.join(process.resourcesPath, iconFilename);
    }

    // In development, icons are in build/ directory
    return path.join(__dirname, '../../../build', iconFilename);
}
