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
    PrintIpcHandler,
    HotkeyIpcHandler,
    AppIpcHandler,
    AutoUpdateIpcHandler,
    QuickChatIpcHandler,
    TextPredictionIpcHandler,
    IpcHandlerDependencies,
} from './ipc/index';
import SettingsStore from '../store';
import { createLogger } from '../utils/logger';
import type WindowManager from './windowManager';
import type HotkeyManager from './hotkeyManager';
import type UpdateManager from './updateManager';
import type PrintManager from './printManager';
import type LlmManager from './llmManager';
import type { ModelStatus } from './llmManager';
import type { ThemePreference, Logger } from '../types';

/**
 * User preferences structure for settings store.
 */
interface UserPreferences extends Record<string, unknown> {
    theme: ThemePreference;
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
    textPredictionModelStatus: ModelStatus;
    textPredictionModelId: string;
    // Zoom settings
    zoomLevel: number;
}

/**
 * Manages IPC communication between main and renderer processes.
 * Orchestrates domain-specific handlers for all IPC channels.
 */
export default class IpcManager {
    private readonly handlers: BaseIpcHandler[] = [];
    private readonly textPredictionHandler: TextPredictionIpcHandler;
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
     * @param store - Optional store instance for testing
     * @param logger - Optional logger instance for testing
     */
    constructor(
        windowManager: WindowManager,
        hotkeyManager?: HotkeyManager | null,
        updateManager?: UpdateManager | null,
        printManager?: PrintManager | null,
        llmManager?: LlmManager | null,
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
                    hotkeyBossKey: true,
                    hotkeyQuickChat: true,
                    hotkeyPrintToPdf: true,
                    autoUpdateEnabled: true,
                    textPredictionEnabled: false,
                    textPredictionGpuEnabled: false,
                    textPredictionModelStatus: 'not-downloaded',
                    textPredictionModelId: 'qwen3-0.6b',
                    zoomLevel: 100,
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
            printManager: printManager || null,
            llmManager: llmManager || null,
        };

        // Create TextPredictionIpcHandler first (we need reference for initializeTextPrediction)
        this.textPredictionHandler = new TextPredictionIpcHandler(handlerDeps);

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
            new PrintIpcHandler(handlerDeps),
            new HotkeyIpcHandler(handlerDeps),
            new AppIpcHandler(handlerDeps),
            // Phase 4 handlers
            new AutoUpdateIpcHandler(handlerDeps),
            new QuickChatIpcHandler(handlerDeps),
            this.textPredictionHandler,
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
}
