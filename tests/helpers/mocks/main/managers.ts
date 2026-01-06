/**
 * Shared mock factories for main process managers.
 *
 * Usage in tests:
 * ```typescript
 * import {
 *   createMockWindowManager,
 *   createMockStore,
 *   createMockUpdateManager,
 * } from 'tests/helpers/mocks';
 *
 * // Create with defaults
 * const mockWindowManager = createMockWindowManager();
 *
 * // Create with overrides
 * const mockStore = createMockStore({ theme: 'dark' });
 * const mockUpdateManager = createMockUpdateManager({ isEnabled: vi.fn().mockReturnValue(false) });
 * ```
 *
 * @module tests/helpers/mocks/main/managers
 */
import { vi } from 'vitest';

// ============================================================================
// Types
// ============================================================================

/**
 * Type for a mock store with common get/set/has methods.
 */
export interface MockStore {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    has: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
    _reset: () => void;
    _defaults: Record<string, unknown>;
}

/**
 * Type for a mock WindowManager with all public methods.
 */
export interface MockWindowManager {
    createOptionsWindow: ReturnType<typeof vi.fn>;
    createAuthWindow: ReturnType<typeof vi.fn>;
    createMainWindow: ReturnType<typeof vi.fn>;
    createQuickChatWindow: ReturnType<typeof vi.fn>;
    setAlwaysOnTop: ReturnType<typeof vi.fn>;
    isAlwaysOnTop: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    emit: ReturnType<typeof vi.fn>;
    removeListener: ReturnType<typeof vi.fn>;
    hideQuickChat: ReturnType<typeof vi.fn>;
    showQuickChat: ReturnType<typeof vi.fn>;
    toggleQuickChat: ReturnType<typeof vi.fn>;
    focusMainWindow: ReturnType<typeof vi.fn>;
    getMainWindow: ReturnType<typeof vi.fn>;
    getQuickChatWindow: ReturnType<typeof vi.fn>;
    restoreFromTray: ReturnType<typeof vi.fn>;
    hideToTray: ReturnType<typeof vi.fn>;
    minimizeMainWindow: ReturnType<typeof vi.fn>;
    setQuitting: ReturnType<typeof vi.fn>;
    // Zoom control methods
    getZoomLevel: ReturnType<typeof vi.fn>;
    setZoomLevel: ReturnType<typeof vi.fn>;
    zoomIn: ReturnType<typeof vi.fn>;
    zoomOut: ReturnType<typeof vi.fn>;
    initializeZoomLevel: ReturnType<typeof vi.fn>;
    applyZoomLevel: ReturnType<typeof vi.fn>;
    _reset: () => void;
}

/**
 * Type for a mock UpdateManager with all public methods.
 */
export interface MockUpdateManager {
    isEnabled: ReturnType<typeof vi.fn>;
    setEnabled: ReturnType<typeof vi.fn>;
    checkForUpdates: ReturnType<typeof vi.fn>;
    quitAndInstall: ReturnType<typeof vi.fn>;
    startPeriodicChecks: ReturnType<typeof vi.fn>;
    stopPeriodicChecks: ReturnType<typeof vi.fn>;
    getLastCheckTime: ReturnType<typeof vi.fn>;
    getTrayTooltip: ReturnType<typeof vi.fn>;
    devShowBadge: ReturnType<typeof vi.fn>;
    devClearBadge: ReturnType<typeof vi.fn>;
    devMockPlatform: ReturnType<typeof vi.fn>;
    devMockEnv: ReturnType<typeof vi.fn>;
    devEmitUpdateEvent: ReturnType<typeof vi.fn>;
    devReevaluate: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
    _reset: () => void;
}

/**
 * Type for a mock PrintManager with all public methods.
 */
export interface MockPrintManager {
    printToPdf: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
    _reset: () => void;
}

/**
 * Type for a mock HotkeyManager with all public methods.
 */
export interface MockHotkeyManager {
    registerShortcuts: ReturnType<typeof vi.fn>;
    unregisterAll: ReturnType<typeof vi.fn>;
    isEnabled: ReturnType<typeof vi.fn>;
    setEnabled: ReturnType<typeof vi.fn>;
    isIndividualEnabled: ReturnType<typeof vi.fn>;
    setIndividualEnabled: ReturnType<typeof vi.fn>;
    getIndividualSettings: ReturnType<typeof vi.fn>;
    updateAllSettings: ReturnType<typeof vi.fn>;
    getAccelerator: ReturnType<typeof vi.fn>;
    getAccelerators: ReturnType<typeof vi.fn>;
    setAccelerator: ReturnType<typeof vi.fn>;
    updateAllAccelerators: ReturnType<typeof vi.fn>;
    getFullSettings: ReturnType<typeof vi.fn>;
    executeHotkeyAction: ReturnType<typeof vi.fn>;
    getGlobalHotkeyActions: ReturnType<typeof vi.fn>;
    getApplicationHotkeyActions: ReturnType<typeof vi.fn>;
    _reset: () => void;
}

/**
 * Type for a mock LlmManager with all public methods.
 */
export interface MockLlmManager {
    initialize: ReturnType<typeof vi.fn>;
    downloadModel: ReturnType<typeof vi.fn>;
    loadModel: ReturnType<typeof vi.fn>;
    unloadModel: ReturnType<typeof vi.fn>;
    getStatus: ReturnType<typeof vi.fn>;
    getErrorMessage: ReturnType<typeof vi.fn>;
    isModelDownloaded: ReturnType<typeof vi.fn>;
    isModelLoaded: ReturnType<typeof vi.fn>;
    predict: ReturnType<typeof vi.fn>;
    cancelPrediction: ReturnType<typeof vi.fn>;
    onStatusChange: ReturnType<typeof vi.fn>;
    isGpuEnabled: ReturnType<typeof vi.fn>;
    setGpuEnabled: ReturnType<typeof vi.fn>;
    getModelsDirectory: ReturnType<typeof vi.fn>;
    _reset: () => void;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a mock WindowManager with all methods as vi.fn().
 *
 * @param overrides - Optional object with mock implementations to override defaults
 * @returns A mock WindowManager instance
 *
 * @example
 * ```typescript
 * const mockWindowManager = createMockWindowManager({
 *   isAlwaysOnTop: vi.fn().mockReturnValue(true),
 * });
 * ```
 */
export function createMockWindowManager(overrides?: Partial<Omit<MockWindowManager, '_reset'>>): MockWindowManager {
    const mockAuthWindow = {
        on: vi.fn((event: string, handler: () => void) => {
            if (event === 'closed') handler();
        }),
    };

    const manager: MockWindowManager = {
        createOptionsWindow: vi.fn(),
        createAuthWindow: vi.fn().mockReturnValue(mockAuthWindow),
        createMainWindow: vi.fn(),
        createQuickChatWindow: vi.fn(),
        setAlwaysOnTop: vi.fn(),
        isAlwaysOnTop: vi.fn().mockReturnValue(false),
        on: vi.fn(),
        emit: vi.fn(),
        removeListener: vi.fn(),
        hideQuickChat: vi.fn(),
        showQuickChat: vi.fn(),
        toggleQuickChat: vi.fn(),
        focusMainWindow: vi.fn(),
        getMainWindow: vi.fn().mockReturnValue(null),
        getQuickChatWindow: vi.fn().mockReturnValue(null),
        restoreFromTray: vi.fn(),
        hideToTray: vi.fn(),
        minimizeMainWindow: vi.fn(),
        setQuitting: vi.fn(),
        // Zoom control methods
        getZoomLevel: vi.fn().mockReturnValue(100),
        setZoomLevel: vi.fn(),
        zoomIn: vi.fn(),
        zoomOut: vi.fn(),
        initializeZoomLevel: vi.fn(),
        applyZoomLevel: vi.fn(),
        _reset() {
            Object.values(manager).forEach((value) => {
                if (typeof value === 'function' && value !== manager._reset && 'mockClear' in value) {
                    (value as ReturnType<typeof vi.fn>).mockClear();
                }
            });
        },
        ...overrides,
    };
    return manager;
}

/**
 * Creates a mock Store with get/set/has/delete/clear methods.
 *
 * The mock store maintains an internal defaults object that is used for `get()` calls.
 * You can override defaults by passing them in, or override specific methods.
 *
 * @param defaults - Default values to return from get() calls
 * @param overrides - Optional object with mock implementations to override defaults
 * @returns A mock Store instance
 *
 * @example
 * ```typescript
 * // Simple usage with defaults
 * const mockStore = createMockStore({ theme: 'dark', autoUpdateEnabled: true });
 *
 * // With method overrides
 * const mockStore = createMockStore(
 *   { theme: 'light' },
 *   { get: vi.fn().mockImplementation((key) => key === 'theme' ? 'dark' : undefined) }
 * );
 * ```
 */
export function createMockStore(
    defaults: Record<string, unknown> = {},
    overrides?: Partial<Omit<MockStore, '_reset' | '_defaults'>>
): MockStore {
    const store: MockStore = {
        _defaults: { ...defaults },
        get: vi.fn((key: string) => store._defaults[key]),
        set: vi.fn((key: string, value: unknown) => {
            store._defaults[key] = value;
        }),
        has: vi.fn((key: string) => key in store._defaults),
        delete: vi.fn((key: string) => {
            delete store._defaults[key];
        }),
        clear: vi.fn(() => {
            store._defaults = {};
        }),
        _reset() {
            store._defaults = { ...defaults };
            store.get.mockClear();
            store.set.mockClear();
            store.has.mockClear();
            store.delete.mockClear();
            store.clear.mockClear();
        },
        ...overrides,
    };
    return store;
}

/**
 * Creates a mock UpdateManager with all methods as vi.fn().
 *
 * @param overrides - Optional object with mock implementations to override defaults
 * @returns A mock UpdateManager instance
 *
 * @example
 * ```typescript
 * const mockUpdateManager = createMockUpdateManager({
 *   isEnabled: vi.fn().mockReturnValue(false),
 * });
 * ```
 */
export function createMockUpdateManager(overrides?: Partial<Omit<MockUpdateManager, '_reset'>>): MockUpdateManager {
    const manager: MockUpdateManager = {
        isEnabled: vi.fn().mockReturnValue(true),
        setEnabled: vi.fn(),
        checkForUpdates: vi.fn().mockResolvedValue(undefined),
        quitAndInstall: vi.fn(),
        startPeriodicChecks: vi.fn(),
        stopPeriodicChecks: vi.fn(),
        getLastCheckTime: vi.fn().mockReturnValue(0),
        getTrayTooltip: vi.fn().mockReturnValue(''),
        devShowBadge: vi.fn(),
        devClearBadge: vi.fn(),
        devMockPlatform: vi.fn(),
        devMockEnv: vi.fn(),
        devEmitUpdateEvent: vi.fn(),
        devReevaluate: vi.fn(),
        destroy: vi.fn(),
        _reset() {
            Object.values(manager).forEach((value) => {
                if (typeof value === 'function' && value !== manager._reset && 'mockClear' in value) {
                    (value as ReturnType<typeof vi.fn>).mockClear();
                }
            });
        },
        ...overrides,
    };
    return manager;
}

/**
 * Creates a mock PrintManager with all methods as vi.fn().
 *
 * @param overrides - Optional object with mock implementations to override defaults
 * @returns A mock PrintManager instance
 *
 * @example
 * ```typescript
 * const mockPrintManager = createMockPrintManager({
 *   printToPdf: vi.fn().mockRejectedValue(new Error('Print failed')),
 * });
 * ```
 */
export function createMockPrintManager(overrides?: Partial<Omit<MockPrintManager, '_reset'>>): MockPrintManager {
    const manager: MockPrintManager = {
        printToPdf: vi.fn().mockResolvedValue(undefined),
        cancel: vi.fn(),
        _reset() {
            manager.printToPdf.mockClear();
            manager.cancel.mockClear();
        },
        ...overrides,
    };
    return manager;
}

/**
 * Creates a mock HotkeyManager with all methods as vi.fn().
 *
 * @param overrides - Optional object with mock implementations to override defaults
 * @returns A mock HotkeyManager instance
 *
 * @example
 * ```typescript
 * const mockHotkeyManager = createMockHotkeyManager({
 *   getIndividualSettings: vi.fn().mockReturnValue({
 *     alwaysOnTop: true,
 *     bossKey: true,
 *     quickChat: true,
 *     printToPdf: true,
 *   }),
 * });
 * ```
 */
export function createMockHotkeyManager(overrides?: Partial<Omit<MockHotkeyManager, '_reset'>>): MockHotkeyManager {
    const defaultSettings = {
        alwaysOnTop: true,
        bossKey: true,
        quickChat: true,
        printToPdf: true,
    };

    const manager: MockHotkeyManager = {
        registerShortcuts: vi.fn(),
        unregisterAll: vi.fn(),
        isEnabled: vi.fn().mockReturnValue(true),
        setEnabled: vi.fn(),
        isIndividualEnabled: vi.fn().mockReturnValue(true),
        setIndividualEnabled: vi.fn(),
        getIndividualSettings: vi.fn().mockReturnValue(defaultSettings),
        updateAllSettings: vi.fn(),
        getAccelerator: vi.fn().mockReturnValue(''),
        getAccelerators: vi.fn().mockReturnValue({}),
        setAccelerator: vi.fn().mockReturnValue(true),
        updateAllAccelerators: vi.fn(),
        getFullSettings: vi.fn().mockReturnValue({}),
        executeHotkeyAction: vi.fn(),
        getGlobalHotkeyActions: vi.fn().mockReturnValue([]),
        getApplicationHotkeyActions: vi.fn().mockReturnValue([]),
        _reset() {
            Object.values(manager).forEach((value) => {
                if (typeof value === 'function' && value !== manager._reset && 'mockClear' in value) {
                    (value as ReturnType<typeof vi.fn>).mockClear();
                }
            });
        },
        ...overrides,
    };
    return manager;
}

/**
 * Creates a mock LlmManager with all methods as vi.fn().
 *
 * @param overrides - Optional object with mock implementations to override defaults
 * @returns A mock LlmManager instance
 *
 * @example
 * ```typescript
 * const mockLlmManager = createMockLlmManager({
 *   isModelLoaded: vi.fn().mockReturnValue(true),
 *   predict: vi.fn().mockResolvedValue('predicted text'),
 * });
 * ```
 */
export function createMockLlmManager(overrides?: Partial<Omit<MockLlmManager, '_reset'>>): MockLlmManager {
    const manager: MockLlmManager = {
        initialize: vi.fn().mockResolvedValue(undefined),
        downloadModel: vi.fn().mockResolvedValue(undefined),
        loadModel: vi.fn().mockResolvedValue(undefined),
        unloadModel: vi.fn(),
        getStatus: vi.fn().mockReturnValue('idle'),
        getErrorMessage: vi.fn().mockReturnValue(null),
        isModelDownloaded: vi.fn().mockReturnValue(false),
        isModelLoaded: vi.fn().mockReturnValue(false),
        predict: vi.fn().mockResolvedValue(''),
        cancelPrediction: vi.fn(),
        onStatusChange: vi.fn().mockReturnValue(() => {}),
        isGpuEnabled: vi.fn().mockReturnValue(false),
        setGpuEnabled: vi.fn(),
        getModelsDirectory: vi.fn().mockReturnValue('/mock/models'),
        _reset() {
            Object.values(manager).forEach((value) => {
                if (typeof value === 'function' && value !== manager._reset && 'mockClear' in value) {
                    (value as ReturnType<typeof vi.fn>).mockClear();
                }
            });
        },
        ...overrides,
    };
    return manager;
}
