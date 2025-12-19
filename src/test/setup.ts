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
            const {
                variants, initial, whileHover, whileTap, animate, exit, transition,
                ...domProps
            } = props;
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
    value: vi.fn().mockImplementation(query => ({
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
    onThemeChanged: vi.fn().mockReturnValue(() => { }),

    // Hotkeys API - returns object with enabled state
    getHotkeysEnabled: vi.fn().mockResolvedValue({ enabled: true }),
    setHotkeysEnabled: vi.fn(),
    onHotkeysChanged: vi.fn().mockReturnValue(() => { }),

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
