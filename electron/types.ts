/**
 * Shared TypeScript type definitions for Electron application.
 * These types are used across main process, preload scripts, and renderer process.
 */

/**
 * Valid theme preference values.
 */
export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * Theme data returned from main process.
 */
export interface ThemeData {
    /** User's theme preference (light, dark, or system) */
    preference: ThemePreference;
    /** Resolved effective theme based on system settings */
    effectiveTheme: 'light' | 'dark';
}

/**
 * Hotkeys data returned from main process.
 */
export interface HotkeysData {
    /** Whether hotkeys are currently enabled */
    enabled: boolean;
}

/**
 * Settings store options.
 */
export interface SettingsStoreOptions {
    /** Name of the config file (without extension) */
    configName?: string;
    /** Default values for settings */
    defaults?: Record<string, unknown>;
    /** File system module (for testing) */
    fs?: typeof import('fs');
}

/**
 * Logger interface for consistent logging across modules.
 */
export interface Logger {
    log(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
}

/**
 * Electron API exposed to renderer process via contextBridge.
 * Available as `window.electronAPI` in renderer.
 */
export interface ElectronAPI {
    // Window Controls
    minimizeWindow: () => void;
    maximizeWindow: () => void;
    closeWindow: () => void;
    isMaximized: () => Promise<boolean>;
    openOptions: (tab?: 'settings' | 'about') => void;
    openGoogleSignIn: () => Promise<void>;

    // Platform Detection
    platform: NodeJS.Platform;
    isElectron: true;

    // Theme API
    getTheme: () => Promise<ThemeData>;
    setTheme: (theme: ThemePreference) => void;
    onThemeChanged: (callback: (themeData: ThemeData) => void) => () => void;

    // Quick Chat API
    submitQuickChat: (text: string) => void;
    hideQuickChat: () => void;
    cancelQuickChat: () => void;
    onQuickChatExecute: (callback: (text: string) => void) => () => void;

    // Hotkeys API
    getHotkeysEnabled: () => Promise<HotkeysData>;
    setHotkeysEnabled: (enabled: boolean) => void;
    onHotkeysChanged: (callback: (data: HotkeysData) => void) => () => void;
}

/**
 * Augment Window interface to include our Electron API.
 * This provides type safety in renderer process.
 */
declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
