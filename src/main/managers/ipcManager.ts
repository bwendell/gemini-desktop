/**
 * IPC Manager for the Electron main process.
 *
 * Centralizes all IPC (Inter-Process Communication) handlers between the
 * renderer and main processes. This architecture enables:
 * - Clean separation of concerns
 * - Easy extension for new IPC channels
 * - Consistent error handling across all handlers
 * - Cross-platform compatibility (Windows, macOS, Linux)
 *
 * @module IpcManager
 */

import {
    BaseIpcHandler,
    ShellIpcHandler,
    WindowIpcHandler,
    ThemeIpcHandler,
    ZoomIpcHandler,
    AlwaysOnTopIpcHandler,
    HotkeyIpcHandler,
    AppIpcHandler,
    AutoUpdateIpcHandler,
    QuickChatIpcHandler,
    TextPredictionIpcHandler,
    ResponseNotificationIpcHandler,
    ExportIpcHandler,
    TabStateIpcHandler,
    IpcHandlerDependencies,
} from './ipc/index';
import SettingsStore from '../store';
import { createLogger } from '../utils/logger';
import type WindowManager from './windowManager';
import type HotkeyManager from './hotkeyManager';
import type UpdateManager from './updateManager';
import type LlmManager from './llmManager';
import type NotificationManager from './notificationManager';
import type ExportManager from './exportManager';
import type { ModelStatus } from './llmManager';
import type { ThemePreference, Logger } from '../types';
import { DEFAULT_ACCELERATORS } from '../../shared/types/hotkeys';

/**
 * User preferences structure for settings store.
 */
interface UserPreferences extends Record<string, unknown> {
    theme: ThemePreference;
    alwaysOnTop: boolean;
    // Individual hotkey settings
    hotkeyAlwaysOnTop: boolean;
    hotkeyPeekAndHide: boolean;
    hotkeyQuickChat: boolean;
    hotkeyVoiceChat: boolean;
    hotkeyPrintToPdf: boolean;
    // Hotkey accelerators
    acceleratorAlwaysOnTop: string;
    acceleratorPeekAndHide: string;
    acceleratorQuickChat: string;
    acceleratorVoiceChat: string;
    acceleratorPrintToPdf: string;
    // Auto-update settings
    autoUpdateEnabled: boolean;
    // Text prediction settings
    textPredictionEnabled: boolean;
    textPredictionGpuEnabled: boolean;
    textPredictionModelStatus: ModelStatus;
    textPredictionModelId: string;
    // Zoom settings
    zoomLevel: number;
    // Response notification settings
    responseNotificationsEnabled: boolean;
}

/**
 * Manages IPC communication between main and renderer processes.
 * Orchestrates domain-specific handlers for all IPC channels.
 */
export default class IpcManager {
    private readonly handlers: BaseIpcHandler[] = [];
    private readonly textPredictionHandler: TextPredictionIpcHandler;
    private readonly responseNotificationHandler: ResponseNotificationIpcHandler;
    private readonly quickChatHandler: QuickChatIpcHandler;
    private readonly logger: Logger;
    /** Settings store exposed for integration tests */
    public readonly store: SettingsStore<UserPreferences>;

    /**
     * Creates a new IpcManager instance.
     * @param windowManager - The window manager instance
     * @param hotkeyManager - Optional hotkey manager for hotkey handling
     * @param updateManager - Optional update manager for auto-updates
     * @param printManager - Optional print manager for PDF printing
     * @param llmManager - Optional LLM manager for text prediction
     * @param notificationManager - Optional notification manager for response notifications
     * @param store - Optional store instance for testing
     * @param logger - Optional logger instance for testing
     */
    constructor(
        windowManager: WindowManager,
        hotkeyManager?: HotkeyManager | null,
        updateManager?: UpdateManager | null,
        exportManager?: ExportManager | null,
        llmManager?: LlmManager | null,
        notificationManager?: NotificationManager | null,
        store?: SettingsStore<UserPreferences>,
        logger?: Logger
    ) {
        /* v8 ignore next 16 -- production fallback, tests always inject dependencies */
        const actualStore =
            store ||
            new SettingsStore<UserPreferences>({
                configName: 'user-preferences',
                defaults: {
                    theme: 'system',
                    alwaysOnTop: false,
                    hotkeyAlwaysOnTop: true,
                    hotkeyPeekAndHide: true,
                    hotkeyQuickChat: true,
                    hotkeyVoiceChat: true,
                    hotkeyPrintToPdf: true,
                    acceleratorAlwaysOnTop: DEFAULT_ACCELERATORS.alwaysOnTop,
                    acceleratorPeekAndHide: DEFAULT_ACCELERATORS.peekAndHide,
                    acceleratorQuickChat: DEFAULT_ACCELERATORS.quickChat,
                    acceleratorVoiceChat: DEFAULT_ACCELERATORS.voiceChat,
                    acceleratorPrintToPdf: DEFAULT_ACCELERATORS.printToPdf,
                    autoUpdateEnabled: true,
                    textPredictionEnabled: false,
                    textPredictionGpuEnabled: false,
                    textPredictionModelStatus: 'not-downloaded',
                    textPredictionModelId: 'qwen3-0.6b',
                    zoomLevel: 100,
                    responseNotificationsEnabled: true,
                },
            });
        /* v8 ignore next -- production fallback, tests always inject logger */
        this.logger = logger || createLogger('[IpcManager]');
        this.store = actualStore;

        // Create shared handler dependencies
        const handlerDeps: IpcHandlerDependencies = {
            store: actualStore,
            logger: this.logger,
            windowManager: windowManager,
            hotkeyManager: hotkeyManager || null,
            updateManager: updateManager || null,
            llmManager: llmManager || null,
            llmNativeAvailable: llmManager ? llmManager.isNativeAvailable() : false,
            notificationManager: notificationManager || null,
            exportManager: exportManager || null,
        };

        // Create TextPredictionIpcHandler first (we need reference for initializeTextPrediction)
        this.textPredictionHandler = new TextPredictionIpcHandler(handlerDeps);

        // Create ResponseNotificationIpcHandler (we need reference for setNotificationManager)
        this.responseNotificationHandler = new ResponseNotificationIpcHandler(handlerDeps);

        this.quickChatHandler = new QuickChatIpcHandler(handlerDeps);
        if (process.argv.includes('--e2e-disable-auto-submit')) {
            (global as typeof globalThis & { __e2eQuickChatHandler?: QuickChatIpcHandler }).__e2eQuickChatHandler =
                this.quickChatHandler;
        }

        // Instantiate all handlers
        this.handlers = [
            // Phase 1 handlers
            new ShellIpcHandler(handlerDeps),
            new WindowIpcHandler(handlerDeps),
            // Phase 2 handlers
            new ThemeIpcHandler(handlerDeps),
            new ZoomIpcHandler(handlerDeps),
            new AlwaysOnTopIpcHandler(handlerDeps),
            // Phase 3 handlers
            new HotkeyIpcHandler(handlerDeps),
            new AppIpcHandler(handlerDeps),
            // Phase 4 handlers
            new AutoUpdateIpcHandler(handlerDeps),
            this.quickChatHandler,
            this.textPredictionHandler,
            // Response notification handler
            this.responseNotificationHandler,
            // Export handler
            new ExportIpcHandler(handlerDeps),
            new TabStateIpcHandler(handlerDeps),
        ];

        this.logger.log('Initialized');
    }

    /**
     * Set up all IPC handlers.
     * Call this after app is ready.
     */
    setupIpcHandlers(): void {
        // Register all domain-specific handlers
        for (const handler of this.handlers) {
            handler.register();
        }

        // Initialize handlers that need initialization after registration
        for (const handler of this.handlers) {
            if (handler.initialize) {
                handler.initialize();
            }
        }

        this.logger.log('All IPC handlers registered');
    }

    /**
     * Initialize text prediction on app startup.
     * Delegates to TextPredictionIpcHandler.initializeOnStartup().
     * Should be called after setupIpcHandlers().
     */
    async initializeTextPrediction(): Promise<void> {
        await this.textPredictionHandler.initializeOnStartup();
    }

    /**
     * Set the NotificationManager for response notifications.
     * This is used for late injection when NotificationManager is created after IpcManager.
     * @param manager - The NotificationManager instance to use
     */
    setNotificationManager(manager: NotificationManager | null): void {
        this.responseNotificationHandler.setNotificationManager(manager);
        this.logger.log(`NotificationManager ${manager ? 'injected' : 'cleared'}`);
    }

    /**
     * Clean up all IPC handlers.
     * Calls unregister() on all handlers that implement it.
     * Should be called during app shutdown to prevent memory leaks.
     */
    dispose(): void {
        for (const handler of this.handlers) {
            if (handler.unregister) {
                try {
                    handler.unregister();
                } catch (error) {
                    this.logger.error('Error unregistering handler:', error);
                }
            }
        }
        this.logger.log('All IPC handlers unregistered');
    }
}
