/**
 * Path resolution utilities for Electron.
 * Centralizes all file path logic for easier maintenance and testing.
 * 
 * @module paths
 */

import * as path from 'path';
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
 * 
 * @returns Absolute path to app icon
 */
export function getIconPath(): string {
    if (isWindows) {
        return path.join(__dirname, '../../../build/icon.ico');
    }
    return path.join(__dirname, '../../../build/icon.png');
}
