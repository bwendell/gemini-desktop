/**
 * Shared types and interfaces for IPC handlers.
 *
 * @module ipc/types
 */

import type SettingsStore from '../../store';
import type WindowManager from '../windowManager';
import type HotkeyManager from '../hotkeyManager';
import type UpdateManager from '../updateManager';
import type LlmManager from '../llmManager';
import type NotificationManager from '../notificationManager';
import type ExportManager from '../exportManager';
import type { Logger } from '../../types';

/**
 * User preferences structure for settings store.
 * Matches the structure defined in ipcManager.ts.
 */
export interface UserPreferences extends Record<string, unknown> {
    theme: 'light' | 'dark' | 'system';
    alwaysOnTop: boolean;
    // Individual hotkey settings
    hotkeyAlwaysOnTop: boolean;
    hotkeyBossKey: boolean;
    hotkeyQuickChat: boolean;
    hotkeyPrintToPdf: boolean;
    // Hotkey accelerators
    acceleratorAlwaysOnTop: string;
    acceleratorBossKey: string;
    acceleratorQuickChat: string;
    acceleratorPrintToPdf: string;
    // Auto-update settings
    autoUpdateEnabled: boolean;
    // Text prediction settings
    textPredictionEnabled: boolean;
    textPredictionGpuEnabled: boolean;
    textPredictionModelStatus: string;
    textPredictionModelId: string;
    // Zoom settings
    zoomLevel: number;
    // Response notification settings
    responseNotificationsEnabled: boolean;
}

/**
 * Dependencies interface for IPC handlers.
 * Enables dependency injection for testability and follows Dependency Inversion Principle.
 */
export interface IpcHandlerDependencies {
    /** Settings store for persisting preferences */
    store: SettingsStore<UserPreferences>;
    /** Logger instance for consistent logging */
    logger: Logger;
    /** Window manager for window operations */
    windowManager: WindowManager;
    /** Optional hotkey manager for keyboard shortcut handling */
    hotkeyManager?: HotkeyManager | null;
    /** Optional update manager for auto-update functionality */
    updateManager?: UpdateManager | null;
    /** Optional LLM manager for text prediction */
    llmManager?: LlmManager | null;
    /** Optional notification manager for response notifications */
    notificationManager?: NotificationManager | null;
    /** Optional export manager for high-quality PDF/MD export */
    exportManager?: ExportManager | null;
}
