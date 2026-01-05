/**
 * Shared mock factory for ElectronAPI (window.electronAPI).
 *
 * Provides a configurable mock implementation of the ElectronAPI interface
 * that is exposed to the renderer process via contextBridge.
 *
 * Usage:
 * ```typescript
 * import { createMockElectronAPI, setupMockElectronAPI } from '../../helpers/mocks/renderer/electronAPI';
 *
 * // Create a mock for assertions:
 * const mockAPI = createMockElectronAPI({
 *   getTheme: vi.fn().mockResolvedValue({ preference: 'dark', effectiveTheme: 'dark' }),
 * });
 *
 * // Or directly assign to window.electronAPI:
 * const api = setupMockElectronAPI({
 *   platform: 'darwin',
 * });
 * ```
 *
 * @module tests/helpers/mocks/renderer/electronAPI
 */

import { vi } from 'vitest';
import type { ElectronAPI } from '../../../../src/shared/types/ipc';
import type { ThemeData } from '../../../../src/shared/types/theme';
import type { TextPredictionSettings } from '../../../../src/shared/types/text-prediction';

/**
 * Options for creating a mock ElectronAPI.
 * All methods are optional overrides for the default mock implementations.
 */
export type MockElectronAPIOverrides = Partial<ElectronAPI>;

/**
 * Creates a mock ElectronAPI with all methods pre-mocked using vi.fn().
 * Overrides can be supplied to customize specific method behaviors.
 *
 * @param overrides - Optional partial ElectronAPI to override default mocks
 * @returns A complete mock ElectronAPI object
 */
export function createMockElectronAPI(overrides: MockElectronAPIOverrides = {}): ElectronAPI {
  // Default unsubscribe function returned by event listeners
  const defaultUnsubscribe = () => {};

  // Build the complete mock API with all methods
  const mockAPI: ElectronAPI = {
    // =========================================================================
    // Window Controls
    // =========================================================================
    minimizeWindow: vi.fn(),
    maximizeWindow: vi.fn(),
    closeWindow: vi.fn(),
    showWindow: vi.fn(),
    isMaximized: vi.fn().mockResolvedValue(false),
    openOptions: vi.fn(),
    openGoogleSignIn: vi.fn().mockResolvedValue(undefined),

    // =========================================================================
    // Platform Detection
    // =========================================================================
    platform: 'win32',
    isElectron: true,

    // =========================================================================
    // Theme API
    // =========================================================================
    getTheme: vi.fn().mockResolvedValue({
      preference: 'system',
      effectiveTheme: 'dark',
    } as ThemeData),
    setTheme: vi.fn(),
    onThemeChanged: vi.fn().mockReturnValue(defaultUnsubscribe),

    // =========================================================================
    // Quick Chat API
    // =========================================================================
    submitQuickChat: vi.fn(),
    hideQuickChat: vi.fn(),
    cancelQuickChat: vi.fn(),
    onQuickChatExecute: vi.fn().mockReturnValue(defaultUnsubscribe),

    // =========================================================================
    // Gemini Iframe Navigation API
    // =========================================================================
    onGeminiNavigate: vi.fn().mockReturnValue(defaultUnsubscribe),
    signalGeminiReady: vi.fn(),

    // =========================================================================
    // Individual Hotkeys API
    // =========================================================================
    getIndividualHotkeys: vi.fn().mockResolvedValue({
      quickChat: true,
      alwaysOnTop: true,
      printToPdf: true,
    }),
    setIndividualHotkey: vi.fn(),
    onIndividualHotkeysChanged: vi.fn().mockReturnValue(defaultUnsubscribe),

    // =========================================================================
    // Hotkey Accelerators API
    // =========================================================================
    getHotkeyAccelerators: vi.fn().mockResolvedValue({
      quickChat: 'CommandOrControl+Shift+Space',
      alwaysOnTop: 'CommandOrControl+Alt+T',
      printToPdf: 'CommandOrControl+Alt+P',
    }),
    getFullHotkeySettings: vi.fn().mockResolvedValue({
      individualHotkeys: {
        quickChat: true,
        alwaysOnTop: true,
        printToPdf: true,
      },
      accelerators: {
        quickChat: 'CommandOrControl+Shift+Space',
        alwaysOnTop: 'CommandOrControl+Alt+T',
        printToPdf: 'CommandOrControl+Alt+P',
      },
    }),
    setHotkeyAccelerator: vi.fn(),
    onHotkeyAcceleratorsChanged: vi.fn().mockReturnValue(defaultUnsubscribe),

    // =========================================================================
    // Always On Top API
    // =========================================================================
    getAlwaysOnTop: vi.fn().mockResolvedValue({ enabled: false }),
    setAlwaysOnTop: vi.fn(),
    onAlwaysOnTopChanged: vi.fn().mockReturnValue(defaultUnsubscribe),

    // =========================================================================
    // Auto-Update API
    // =========================================================================
    getAutoUpdateEnabled: vi.fn().mockResolvedValue(true),
    setAutoUpdateEnabled: vi.fn(),
    checkForUpdates: vi.fn(),
    installUpdate: vi.fn(),
    onUpdateAvailable: vi.fn().mockReturnValue(defaultUnsubscribe),
    onUpdateDownloaded: vi.fn().mockReturnValue(defaultUnsubscribe),
    onUpdateError: vi.fn().mockReturnValue(defaultUnsubscribe),
    onUpdateNotAvailable: vi.fn().mockReturnValue(defaultUnsubscribe),
    onDownloadProgress: vi.fn().mockReturnValue(defaultUnsubscribe),

    // =========================================================================
    // Dev Testing API
    // =========================================================================
    devShowBadge: vi.fn(),
    devClearBadge: vi.fn(),
    devSetUpdateEnabled: vi.fn(),
    devEmitUpdateEvent: vi.fn(),
    devMockPlatform: vi.fn(),

    // =========================================================================
    // E2E Testing Helpers
    // =========================================================================
    getTrayTooltip: vi.fn().mockResolvedValue('Gemini'),
    onCheckingForUpdate: vi.fn().mockReturnValue(defaultUnsubscribe),
    getLastUpdateCheckTime: vi.fn().mockResolvedValue(0),
    onDebugTriggerError: vi.fn().mockReturnValue(defaultUnsubscribe),

    // =========================================================================
    // Print to PDF API
    // =========================================================================
    printToPdf: vi.fn(),
    cancelPrint: vi.fn(),
    onPrintToPdfSuccess: vi.fn().mockReturnValue(defaultUnsubscribe),
    onPrintToPdfError: vi.fn().mockReturnValue(defaultUnsubscribe),
    onPrintProgressStart: vi.fn().mockReturnValue(defaultUnsubscribe),
    onPrintProgressUpdate: vi.fn().mockReturnValue(defaultUnsubscribe),
    onPrintProgressEnd: vi.fn().mockReturnValue(defaultUnsubscribe),
    onPrintOverlayHide: vi.fn().mockReturnValue(defaultUnsubscribe),
    onPrintOverlayShow: vi.fn().mockReturnValue(defaultUnsubscribe),

    // =========================================================================
    // Toast API
    // =========================================================================
    onToastShow: vi.fn().mockReturnValue(defaultUnsubscribe),

    // =========================================================================
    // Shell API
    // =========================================================================
    revealInFolder: vi.fn(),

    // =========================================================================
    // Text Prediction API
    // =========================================================================
    getTextPredictionEnabled: vi.fn().mockResolvedValue(false),
    setTextPredictionEnabled: vi.fn().mockResolvedValue(undefined),
    getTextPredictionGpuEnabled: vi.fn().mockResolvedValue(false),
    setTextPredictionGpuEnabled: vi.fn().mockResolvedValue(undefined),
    getTextPredictionStatus: vi.fn().mockResolvedValue({
      enabled: false,
      gpuEnabled: false,
      status: 'not-downloaded',
    } as TextPredictionSettings),
    onTextPredictionStatusChanged: vi.fn().mockReturnValue(defaultUnsubscribe),
    onTextPredictionDownloadProgress: vi.fn().mockReturnValue(defaultUnsubscribe),
    predictText: vi.fn().mockResolvedValue(null),

    // Apply overrides last to allow customization
    ...overrides,
  };

  return mockAPI;
}

/**
 * Creates a mock ElectronAPI and assigns it to window.electronAPI.
 * This is a convenience wrapper around createMockElectronAPI.
 *
 * @param overrides - Optional partial ElectronAPI to override default mocks
 * @returns The mock ElectronAPI that was assigned to window.electronAPI
 */
export function setupMockElectronAPI(overrides: MockElectronAPIOverrides = {}): ElectronAPI {
  const mockAPI = createMockElectronAPI(overrides);
  (window as any).electronAPI = mockAPI;
  return mockAPI;
}

/**
 * Clears the window.electronAPI mock.
 * Useful in afterEach hooks to ensure test isolation.
 */
export function clearMockElectronAPI(): void {
  (window as any).electronAPI = undefined;
}

/**
 * Type helper for accessing mock functions on the ElectronAPI.
 * Use this when you need to access mock-specific methods like mockResolvedValue.
 *
 * @example
 * ```typescript
 * const api = setupMockElectronAPI();
 * (api.getTheme as MockedFunction<typeof api.getTheme>).mockResolvedValue({
 *   preference: 'dark',
 *   effectiveTheme: 'dark',
 * });
 * ```
 */
export type MockedElectronAPI = {
  [K in keyof ElectronAPI]: ElectronAPI[K] extends (...args: infer Args) => infer R
    ? ReturnType<typeof vi.fn<(...args: Args) => R>>
    : ElectronAPI[K];
};
