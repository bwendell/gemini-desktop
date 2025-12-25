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
 * Identifiers for individual hotkey features.
 */
export type HotkeyId = 'alwaysOnTop' | 'bossKey' | 'quickChat';

/**
 * Individual hotkey settings returned from main process.
 * Each key represents a hotkey feature's enabled state.
 */
export interface IndividualHotkeySettings {
    /** Always on Top toggle hotkey (Ctrl/Cmd+Shift+T) */
    alwaysOnTop: boolean;
    /** Boss Key / Minimize hotkey (Ctrl/Cmd+Alt+E) */
    bossKey: boolean;
    /** Quick Chat toggle hotkey (Ctrl/Cmd+Shift+Space) */
    quickChat: boolean;
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
 * Update information from electron-updater.
 * Simplified version for renderer process.
 */
export interface UpdateInfo {
    /** The version of the update */
    version: string;
    /** Release name */
    releaseName?: string;
    /** Release notes (may be HTML or markdown) */
    releaseNotes?: string | Array<{ version: string; note: string }>;
    /** Release date */
    releaseDate?: string;
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
    showWindow: () => void;
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

    // Individual Hotkeys API
    getIndividualHotkeys: () => Promise<IndividualHotkeySettings>;
    setIndividualHotkey: (id: HotkeyId, enabled: boolean) => void;
    onIndividualHotkeysChanged: (callback: (settings: IndividualHotkeySettings) => void) => () => void;

    // Always On Top API
    getAlwaysOnTop: () => Promise<{ enabled: boolean }>;
    setAlwaysOnTop: (enabled: boolean) => void;
    onAlwaysOnTopChanged: (callback: (data: { enabled: boolean }) => void) => () => void;

    // Auto-Update API
    getAutoUpdateEnabled: () => Promise<boolean>;
    setAutoUpdateEnabled: (enabled: boolean) => void;
    checkForUpdates: () => void;
    installUpdate: () => void;
    onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
    onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => () => void;
    onUpdateError: (callback: (error: string) => void) => () => void;
    onUpdateNotAvailable: (callback: (info: UpdateInfo) => void) => () => void;
    onDownloadProgress: (callback: (progress: { percent: number; bytesPerSecond?: number; transferred?: number; total?: number }) => void) => () => void;

    // Dev Testing API (only for manual testing in development)
    devShowBadge: (version?: string) => void;
    devClearBadge: () => void;
    devSetUpdateEnabled: (enabled: boolean) => void;
    devEmitUpdateEvent: (event: string, data: any) => void;
    devMockPlatform: (platform: NodeJS.Platform | null, env: Record<string, string> | null) => void;

    // E2E Testing Helpers
    getTrayTooltip: () => Promise<string>;
    onCheckingForUpdate: (callback: () => void) => () => void;
    getLastUpdateCheckTime: () => Promise<number>;
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
