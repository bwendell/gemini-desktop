/// <reference types="vitest/globals" />
/**
 * Test setup file for Vitest.
 *
 * Configures Jest-DOM matchers and mocks for Electron API.
 */

import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import React from 'react';

// ============================================================================
// Mock: framer-motion (animations don't work well in JSDOM)
// ============================================================================
vi.mock('framer-motion', () => ({
    motion: {
        div: React.forwardRef<HTMLDivElement, any>(({ children, ...props }, ref) => {
            // Filter out framer-motion specific props to avoid warnings
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { variants, initial, whileHover, whileTap, animate, exit, transition, ...domProps } = props;
            return React.createElement('div', { ...domProps, ref }, children);
        }),
    },
    AnimatePresence: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, {}, children),
}));

// ============================================================================
// Mock: window.matchMedia (JSDOM doesn't have this)
// ============================================================================
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true, // Allow tests to redefine it
    value: vi.fn().mockImplementation((query) => ({
        matches: false, // Default to light mode for consistent tests
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// ============================================================================
// Mock: Electron API
// ============================================================================

// Default mock implementation
const mockElectronAPI = {
    minimizeWindow: vi.fn(),
    maximizeWindow: vi.fn(),
    closeWindow: vi.fn(),
    openOptions: vi.fn(),
    openGoogleSignIn: vi.fn().mockResolvedValue(undefined),
    isMaximized: vi.fn().mockResolvedValue(false),

    // Theme API - returns object with preference and effectiveTheme
    getTheme: vi.fn().mockResolvedValue({ preference: 'system', effectiveTheme: 'dark' }),
    setTheme: vi.fn(),
    onThemeChanged: vi.fn().mockReturnValue(() => {}),

    // Individual Hotkeys API
    getIndividualHotkeys: vi.fn().mockResolvedValue({
        alwaysOnTop: true,
        bossKey: true,
        quickChat: true,
        printToPdf: true,
    }),
    setIndividualHotkey: vi.fn(),
    onIndividualHotkeysChanged: vi.fn().mockReturnValue(() => {}),

    // Hotkey Accelerators API
    getHotkeyAccelerators: vi.fn().mockResolvedValue({
        alwaysOnTop: 'Control+Alt+T',
        bossKey: 'Control+Alt+B',
        quickChat: 'Control+Alt+X',
        printToPdf: 'Control+Alt+P',
    }),
    setHotkeyAccelerator: vi.fn(),
    onHotkeyAcceleratorsChanged: vi.fn().mockReturnValue(() => {}),
    getFullHotkeySettings: vi.fn().mockResolvedValue({
        enabled: { alwaysOnTop: true, bossKey: true, quickChat: true, printToPdf: true },
        accelerators: {
            alwaysOnTop: 'Control+Alt+T',
            bossKey: 'Control+Alt+B',
            quickChat: 'Control+Alt+X',
            printToPdf: 'Control+Alt+P',
        },
    }),

    // Always On Top API - returns object with enabled state
    getAlwaysOnTop: vi.fn().mockResolvedValue({ enabled: false }),
    setAlwaysOnTop: vi.fn(),
    onAlwaysOnTopChanged: vi.fn().mockReturnValue(() => {}),

    // Zoom API
    getZoomLevel: vi.fn().mockResolvedValue(100),
    zoomIn: vi.fn().mockResolvedValue(110),
    zoomOut: vi.fn().mockResolvedValue(90),
    onZoomLevelChanged: vi.fn().mockReturnValue(() => {}),

    // Quick Chat API
    submitQuickChat: vi.fn(),
    hideQuickChat: vi.fn(),
    cancelQuickChat: vi.fn(),
    onQuickChatExecute: vi.fn().mockReturnValue(() => {}),

    // Gemini Iframe Navigation API
    onGeminiNavigate: vi.fn().mockReturnValue(() => {}),
    signalGeminiReady: vi.fn(),

    // Print to PDF API
    printToPdf: vi.fn(),
    onPrintToPdfSuccess: vi.fn().mockReturnValue(() => {}),
    onPrintToPdfError: vi.fn().mockReturnValue(() => {}),

    // Print Progress API (for scrolling screenshot capture)
    cancelPrint: vi.fn(),
    onPrintProgressStart: vi.fn().mockReturnValue(() => {}),
    onPrintProgressUpdate: vi.fn().mockReturnValue(() => {}),
    onPrintProgressEnd: vi.fn().mockReturnValue(() => {}),
    onPrintOverlayHide: vi.fn().mockReturnValue(() => {}),
    onPrintOverlayShow: vi.fn().mockReturnValue(() => {}),

    // Toast API
    onToastShow: vi.fn().mockReturnValue(() => {}),

    // Auto-Update API
    checkForUpdates: vi.fn(),
    installUpdate: vi.fn(),
    getAutoUpdateEnabled: vi.fn().mockResolvedValue(true),
    setAutoUpdateEnabled: vi.fn(),
    onUpdateAvailable: vi.fn().mockReturnValue(() => {}),
    onUpdateDownloaded: vi.fn().mockReturnValue(() => {}),
    onUpdateError: vi.fn().mockReturnValue(() => {}),
    onUpdateNotAvailable: vi.fn().mockReturnValue(() => {}),
    onDownloadProgress: vi.fn().mockReturnValue(() => {}),
    onCheckingForUpdate: vi.fn().mockReturnValue(() => {}),
    getLastUpdateCheckTime: vi.fn().mockResolvedValue(Date.now()),

    // Tray API
    getTrayTooltip: vi.fn().mockResolvedValue('Gemini'),

    // Text Prediction API
    getTextPredictionEnabled: vi.fn().mockResolvedValue(false),
    setTextPredictionEnabled: vi.fn().mockResolvedValue(undefined),
    getTextPredictionGpuEnabled: vi.fn().mockResolvedValue(false),
    setTextPredictionGpuEnabled: vi.fn().mockResolvedValue(undefined),
    getTextPredictionStatus: vi.fn().mockResolvedValue({
        enabled: false,
        gpuEnabled: false,
        status: 'disabled',
    }),
    onTextPredictionStatusChanged: vi.fn().mockReturnValue(() => {}),
    onTextPredictionDownloadProgress: vi.fn().mockReturnValue(() => {}),
    predictText: vi.fn().mockResolvedValue(null),

    // Dev Testing API
    devShowBadge: vi.fn(),
    devClearBadge: vi.fn(),
    devSetUpdateEnabled: vi.fn(),
    devEmitUpdateEvent: vi.fn(),
    devMockPlatform: vi.fn(),
    onDebugTriggerError: vi.fn().mockReturnValue(() => {}),

    platform: 'win32', // Default to Windows
    isElectron: true,
};

// Add to window object
Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true,
    configurable: true,
});

// Helper to change platform in tests
export function setMockPlatform(platform: string): void {
    if (window.electronAPI) {
        (window.electronAPI as any).platform = platform;
    }
}

export { mockElectronAPI };

// ============================================================================
// Mock: document.execCommand (deprecated but used in menus)
// ============================================================================
// JSDOM doesn't implement execCommand, so we need to add it for testing
Object.defineProperty(document, 'execCommand', {
    value: vi.fn().mockReturnValue(true),
    writable: true,
});

// ============================================================================
// Mock: Performance API (for startup time measurement)
// ============================================================================
const mockPerformanceEntries = [{ duration: 150.5, startTime: 0 }];

Object.defineProperty(globalThis, 'performance', {
    value: {
        mark: vi.fn(),
        measure: vi.fn(),
        getEntriesByName: vi.fn().mockReturnValue(mockPerformanceEntries),
        now: vi.fn().mockReturnValue(Date.now()),
    },
    writable: true,
});

// ============================================================================
// Reset all mocks before each test
// ============================================================================
beforeEach(() => {
    vi.clearAllMocks();
    if (window.electronAPI) {
        (window.electronAPI as any).platform = 'win32';
    }
});
