/**
 * IPC Channel Constants
 *
 * Centralized IPC channel names for communication between main and renderer processes.
 * This ensures type safety and consistency across the application.
 *
 * @module shared/constants/ipc-channels
 */

/**
 * IPC channel names used for main process <-> renderer communication.
 * Centralized to ensure consistency between ipcMain handlers and ipcRenderer calls.
 */
export const IPC_CHANNELS = {
    // Window controls
    WINDOW_MINIMIZE: 'window-minimize',
    WINDOW_MAXIMIZE: 'window-maximize',
    WINDOW_CLOSE: 'window-close',
    WINDOW_SHOW: 'window-show',
    WINDOW_IS_MAXIMIZED: 'window-is-maximized',

    // Theme
    THEME_GET: 'theme:get',
    THEME_SET: 'theme:set',
    THEME_CHANGED: 'theme:changed',

    // App
    OPEN_OPTIONS: 'open-options-window',
    OPEN_GOOGLE_SIGNIN: 'open-google-signin',

    // Quick Chat
    QUICK_CHAT_SUBMIT: 'quick-chat:submit',
    QUICK_CHAT_HIDE: 'quick-chat:hide',
    QUICK_CHAT_CANCEL: 'quick-chat:cancel',
    QUICK_CHAT_EXECUTE: 'quick-chat:execute',

    // Gemini Iframe Navigation (for Quick Chat integration)
    GEMINI_NAVIGATE: 'gemini:navigate',
    GEMINI_READY: 'gemini:ready',

    // Always On Top
    ALWAYS_ON_TOP_GET: 'always-on-top:get',
    ALWAYS_ON_TOP_SET: 'always-on-top:set',
    ALWAYS_ON_TOP_CHANGED: 'always-on-top:changed',

    // Zoom
    ZOOM_GET_LEVEL: 'zoom:get-level',
    ZOOM_IN: 'zoom:zoom-in',
    ZOOM_OUT: 'zoom:zoom-out',
    ZOOM_LEVEL_CHANGED: 'zoom:level-changed',

    // Individual Hotkeys
    HOTKEYS_INDIVIDUAL_GET: 'hotkeys:individual:get',
    HOTKEYS_INDIVIDUAL_SET: 'hotkeys:individual:set',
    HOTKEYS_INDIVIDUAL_CHANGED: 'hotkeys:individual:changed',

    // Hotkey Accelerators
    HOTKEYS_ACCELERATOR_GET: 'hotkeys:accelerator:get',
    HOTKEYS_ACCELERATOR_SET: 'hotkeys:accelerator:set',
    HOTKEYS_ACCELERATOR_CHANGED: 'hotkeys:accelerator:changed',
    HOTKEYS_FULL_SETTINGS_GET: 'hotkeys:full-settings:get',

    // Auto-Update
    AUTO_UPDATE_GET_ENABLED: 'auto-update:get-enabled',
    AUTO_UPDATE_SET_ENABLED: 'auto-update:set-enabled',
    AUTO_UPDATE_CHECK: 'auto-update:check',
    AUTO_UPDATE_INSTALL: 'auto-update:install',
    AUTO_UPDATE_GET_LAST_CHECK: 'auto-update:get-last-check',
    AUTO_UPDATE_AVAILABLE: 'auto-update:available',
    AUTO_UPDATE_DOWNLOADED: 'auto-update:downloaded',
    AUTO_UPDATE_ERROR: 'auto-update:error',
    AUTO_UPDATE_CHECKING: 'auto-update:checking',
    AUTO_UPDATE_NOT_AVAILABLE: 'auto-update:not-available',
    AUTO_UPDATE_DOWNLOAD_PROGRESS: 'auto-update:download-progress',

    // Tray
    TRAY_GET_TOOLTIP: 'tray:get-tooltip',

    // Print to PDF
    PRINT_TO_PDF_TRIGGER: 'print-to-pdf:trigger',
    PRINT_TO_PDF_SUCCESS: 'print-to-pdf:success',
    PRINT_TO_PDF_ERROR: 'print-to-pdf:error',

    // Print Progress (for scrolling screenshot capture)
    PRINT_PROGRESS_START: 'print:progress-start',
    PRINT_PROGRESS_UPDATE: 'print:progress-update',
    PRINT_PROGRESS_END: 'print:progress-end',
    PRINT_CANCEL: 'print:cancel',
    PRINT_OVERLAY_HIDE: 'print:overlay-hide',
    PRINT_OVERLAY_SHOW: 'print:overlay-show',

    // Toast (main process → renderer notifications)
    TOAST_SHOW: 'toast:show',

    // Shell (filesystem operations)
    SHELL_SHOW_ITEM_IN_FOLDER: 'shell:show-item-in-folder',

    // Text Prediction (local LLM inference)
    TEXT_PREDICTION_GET_ENABLED: 'text-prediction:get-enabled',
    TEXT_PREDICTION_SET_ENABLED: 'text-prediction:set-enabled',
    TEXT_PREDICTION_GET_GPU_ENABLED: 'text-prediction:get-gpu-enabled',
    TEXT_PREDICTION_SET_GPU_ENABLED: 'text-prediction:set-gpu-enabled',
    TEXT_PREDICTION_GET_STATUS: 'text-prediction:get-status',
    TEXT_PREDICTION_STATUS_CHANGED: 'text-prediction:status-changed',
    TEXT_PREDICTION_DOWNLOAD_PROGRESS: 'text-prediction:download-progress',
    TEXT_PREDICTION_PREDICT: 'text-prediction:predict',

    // Dev Testing (only used in development for manual testing)
    DEV_TEST_SHOW_BADGE: 'dev:test:show-badge',
    DEV_TEST_CLEAR_BADGE: 'dev:test:clear-badge',
    DEV_TEST_SET_UPDATE_ENABLED: 'dev:test:set-update-enabled',
    DEV_TEST_EMIT_UPDATE_EVENT: 'dev:test:emit-update-event',
    DEV_TEST_MOCK_PLATFORM: 'dev:test:mock-platform',
    DEBUG_TRIGGER_ERROR: 'debug-trigger-error',
} as const;

/**
 * Type representing all valid IPC channel names.
 */
export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
