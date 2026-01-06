/**
 * Unified mock factory for Electron WebContents.
 *
 * This factory consolidates three existing implementations:
 * - tests/unit/main/test/setup.ts: Basic webContents mock
 * - tests/unit/main/test/electron-mock.ts: Full webContents with scroll capture
 * - tests/coordinated/print-manager.coordinated.test.ts: Configurable scroll capture
 *
 * Usage:
 * ```typescript
 * import { createMockWebContents } from 'tests/helpers/mocks';
 *
 * // Basic webContents
 * const wc = createMockWebContents();
 *
 * // With scroll capture support for print tests
 * const wc = createMockWebContents({ withScrollCapture: true });
 *
 * // With custom scroll dimensions
 * const wc = createMockWebContents({
 *   withScrollCapture: true,
 *   scrollHeight: 2000,
 *   clientHeight: 1000,
 * });
 * ```
 *
 * @module tests/helpers/mocks/main/webContents
 */
import { vi } from 'vitest';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for creating mock WebContents.
 */
export interface MockWebContentsOptions {
    /**
     * Include scroll capture mocks (capturePage, mainFrame, scrolling support).
     * Required for print-to-PDF tests.
     * @default false
     */
    withScrollCapture?: boolean;

    /**
     * Mock scroll height for the gemini iframe.
     * Only used when withScrollCapture is true.
     * @default 800
     */
    scrollHeight?: number;

    /**
     * Mock client height (viewport height) for the gemini iframe.
     * Only used when withScrollCapture is true.
     * @default 1000
     */
    clientHeight?: number;

    /**
     * Custom isDestroyed behavior.
     * If not provided, defaults to returning false.
     */
    isDestroyed?: () => boolean;

    /**
     * Custom URL to return from getURL().
     * @default 'https://gemini.google.com/app'
     */
    url?: string;
}

/**
 * Type for a mock WebContents with all common methods.
 */
export interface MockWebContents {
    send: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    once: ReturnType<typeof vi.fn>;
    openDevTools: ReturnType<typeof vi.fn>;
    setWindowOpenHandler: ReturnType<typeof vi.fn>;
    getURL: ReturnType<typeof vi.fn>;
    isDestroyed: ReturnType<typeof vi.fn>;
    setZoomFactor: ReturnType<typeof vi.fn>;

    // Optional scroll capture methods
    capturePage?: ReturnType<typeof vi.fn>;
    printToPDF?: ReturnType<typeof vi.fn>;
    mainFrame?: {
        frames: Array<{
            url: string;
            executeJavaScript: ReturnType<typeof vi.fn>;
        }>;
    };

    // Reset method for test cleanup
    _reset: () => void;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a mock WebContents with configurable capabilities.
 *
 * @param options - Configuration options for the mock
 * @returns A mock WebContents instance
 *
 * @example
 * ```typescript
 * // Basic webContents for simple tests
 * const wc = createMockWebContents();
 * expect(wc.send).toBeDefined();
 *
 * // With scroll capture for print tests (single capture, fast tests)
 * const wc = createMockWebContents({ withScrollCapture: true });
 * expect(wc.capturePage).toBeDefined();
 *
 * // With multiple captures (scrollHeight > clientHeight * 0.9)
 * const wc = createMockWebContents({
 *   withScrollCapture: true,
 *   scrollHeight: 2000,   // 3 captures: ceil(2000 / (1000 * 0.9)) = 3
 *   clientHeight: 1000,
 * });
 * ```
 */
export function createMockWebContents(options: MockWebContentsOptions = {}): MockWebContents {
    const {
        withScrollCapture = false,
        scrollHeight = 800,
        clientHeight = 1000,
        isDestroyed,
        url = 'https://gemini.google.com/app',
    } = options;

    // Base mock with common methods
    const mock: MockWebContents = {
        send: vi.fn(),
        on: vi.fn(),
        once: vi.fn(),
        openDevTools: vi.fn(),
        setWindowOpenHandler: vi.fn(),
        getURL: vi.fn().mockReturnValue(url),
        isDestroyed: isDestroyed ? vi.fn(isDestroyed) : vi.fn().mockReturnValue(false),
        setZoomFactor: vi.fn(),
        _reset() {
            mock.send.mockClear();
            mock.on.mockClear();
            mock.once.mockClear();
            mock.openDevTools.mockClear();
            mock.setWindowOpenHandler.mockClear();
            mock.getURL.mockClear();
            mock.isDestroyed.mockClear();
            mock.setZoomFactor.mockClear();
            if (mock.capturePage) mock.capturePage.mockClear();
            if (mock.printToPDF) mock.printToPDF.mockClear();
            if (mock.mainFrame) {
                mock.mainFrame.frames[0].executeJavaScript.mockClear();
            }
        },
    };

    // Add scroll capture support if requested
    if (withScrollCapture) {
        // Create mock image for capturePage
        const mockImage = {
            toPNG: vi.fn().mockReturnValue(Buffer.from('mock-png-data')),
            getSize: vi.fn().mockReturnValue({ width: 1920, height: clientHeight }),
        };

        // Create mock frame for iframe scroll info
        const mockGeminiFrame = {
            url: 'https://gemini.google.com/app',
            executeJavaScript: vi.fn().mockResolvedValue({
                scrollHeight,
                scrollTop: 0,
                clientHeight,
            }),
        };

        mock.capturePage = vi.fn().mockResolvedValue(mockImage);
        mock.printToPDF = vi.fn().mockResolvedValue(Buffer.from('mock-pdf'));
        mock.mainFrame = {
            frames: [mockGeminiFrame],
        };
    }

    return mock;
}
