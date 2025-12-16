/// <reference types="vitest/globals" />
/**
 * Test setup file for Vitest.
 * 
 * Configures Jest-DOM matchers and comprehensive mocks for all Tauri APIs
 * to enable unit testing of React components that depend on native functionality.
 */

import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// ============================================================================
// Mock: @tauri-apps/plugin-os
// ============================================================================
// Default to Windows for tests; individual tests can override via vi.mocked()
let mockOsType: string = 'windows';

vi.mock('@tauri-apps/plugin-os', () => ({
    type: vi.fn(() => mockOsType),
}));

// Helper to change OS type in tests
export function setMockOsType(osType: 'windows' | 'linux' | 'macos'): void {
    mockOsType = osType;
}

// ============================================================================
// Mock: @tauri-apps/api/core
// ============================================================================
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn().mockResolvedValue(undefined),
}));

// ============================================================================
// Mock: @tauri-apps/api/window
// ============================================================================
const mockWindow = {
    minimize: vi.fn().mockResolvedValue(undefined),
    maximize: vi.fn().mockResolvedValue(undefined),
    unmaximize: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    isMaximized: vi.fn().mockResolvedValue(false),
    isFullscreen: vi.fn().mockResolvedValue(false),
    setFullscreen: vi.fn().mockResolvedValue(undefined),
};

vi.mock('@tauri-apps/api/window', () => ({
    Window: {
        getCurrent: vi.fn(() => mockWindow),
    },
}));

export { mockWindow };

// ============================================================================
// Mock: @tauri-apps/api/menu
// ============================================================================
const mockMenuInstance = {
    popup: vi.fn().mockResolvedValue(undefined),
};

vi.mock('@tauri-apps/api/menu', () => ({
    Menu: {
        new: vi.fn().mockResolvedValue(mockMenuInstance),
    },
    MenuItem: {
        new: vi.fn().mockImplementation(async (opts) => ({ ...opts, type: 'menuitem' })),
    },
    PredefinedMenuItem: {
        new: vi.fn().mockImplementation(async (opts) => ({ ...opts, type: 'predefined' })),
    },
}));

export { mockMenuInstance };

// ============================================================================
// Mock: @tauri-apps/plugin-process
// ============================================================================
vi.mock('@tauri-apps/plugin-process', () => ({
    exit: vi.fn().mockResolvedValue(undefined),
}));

// ============================================================================
// Mock: @tauri-apps/plugin-dialog
// ============================================================================
vi.mock('@tauri-apps/plugin-dialog', () => ({
    message: vi.fn().mockResolvedValue(undefined),
}));

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
    mockOsType = 'windows';
});
