/// <reference types="vitest/globals" />
/**
 * Test setup file for Vitest.
 * 
 * Configures Jest-DOM matchers and mocks for Electron API.
 */

import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// ============================================================================
// Mock: Electron API
// ============================================================================

// Default mock implementation
const mockElectronAPI = {
    minimizeWindow: vi.fn(),
    maximizeWindow: vi.fn(),
    closeWindow: vi.fn(),
    openOptions: vi.fn(), // Added for tests
    isMaximized: vi.fn().mockResolvedValue(false),
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
        window.electronAPI.platform = platform;
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
        window.electronAPI.platform = 'win32';
    }
});
