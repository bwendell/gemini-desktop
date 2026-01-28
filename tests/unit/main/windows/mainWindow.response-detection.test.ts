/**
 * Unit tests for MainWindow response detection.
 * Tests the network monitoring that detects Gemini response completion.
 *
 * @module mainWindow.response-detection.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserWindow, session } from 'electron';
import MainWindow from '../../../../src/main/windows/mainWindow';

const mocks = vi.hoisted(() => ({
    isMacOS: false,
}));

vi.mock('../../../../src/main/utils/constants', async (importOriginal) => {
    type ConstantsModule = typeof import('../../../../src/main/utils/constants');
    const actual = await importOriginal<ConstantsModule>();
    return {
        ...actual,
        get isMacOS() {
            return mocks.isMacOS;
        },
    };
});

vi.mock('../../../../src/main/utils/paths', async (importOriginal) => {
    type PathsModule = typeof import('../../../../src/main/utils/paths');
    const actual = await importOriginal<PathsModule>();
    return {
        ...actual,
        getIconPath: vi.fn().mockReturnValue('/mock/icon/path.png'),
    };
});

describe('MainWindow Response Detection (Task 6.6)', () => {
    let mainWindow: MainWindow;

    beforeEach(() => {
        vi.clearAllMocks();
        (BrowserWindow as any)._reset();
        mainWindow = new MainWindow(false);
    });

    describe('response detection setup', () => {
        it('sets up webRequest.onCompleted with Gemini API filter on create', () => {
            mainWindow.create();

            expect(session.defaultSession.webRequest.onCompleted).toHaveBeenCalledWith(
                { urls: ['*://gemini.google.com/*StreamGenerate*'] },
                expect.any(Function)
            );
        });

        it('initializes with response detection inactive', () => {
            mainWindow.create();

            // Response detection is inactive until after startup delay
            expect((mainWindow as any).responseDetectionActive).toBe(false);
        });
    });

    describe('response-complete event emission', () => {
        beforeEach(() => {
            mainWindow.create();
            // Manually activate response detection (simulates after startup delay)
            (mainWindow as any).responseDetectionActive = true;
        });

        it('emits response-complete when StreamGenerate API completes with status 200', () => {
            const emitSpy = vi.spyOn(mainWindow, 'emit');

            // Get the onCompleted callback
            const onCompletedCall = (session.defaultSession.webRequest.onCompleted as any).mock.calls[0];
            const callback = onCompletedCall[1];

            callback({
                statusCode: 200,
                url: 'https://gemini.google.com/u/0/_/BardChatUi/data/StreamGenerate',
            });

            expect(emitSpy).toHaveBeenCalledWith('response-complete');
        });

        it('does NOT emit response-complete for non-200 status codes', () => {
            const emitSpy = vi.spyOn(mainWindow, 'emit');

            const onCompletedCall = (session.defaultSession.webRequest.onCompleted as any).mock.calls[0];
            const callback = onCompletedCall[1];

            // Test various non-200 status codes
            for (const statusCode of [400, 401, 403, 404, 500, 502, 503]) {
                emitSpy.mockClear();
                callback({
                    statusCode,
                    url: 'https://gemini.google.com/u/0/_/BardChatUi/data/StreamGenerate',
                });

                const calls = emitSpy.mock.calls.filter((c) => c[0] === 'response-complete');
                expect(calls.length).toBe(0);
            }
        });

        it('debounces rapid completions (second call within 1s is ignored)', () => {
            const emitSpy = vi.spyOn(mainWindow, 'emit');

            const onCompletedCall = (session.defaultSession.webRequest.onCompleted as any).mock.calls[0];
            const callback = onCompletedCall[1];

            // First call should emit
            callback({ statusCode: 200, url: 'https://gemini.google.com/u/0/_/BardChatUi/data/StreamGenerate' });
            const firstEmitCalls = emitSpy.mock.calls.filter((c) => c[0] === 'response-complete');
            expect(firstEmitCalls.length).toBe(1);

            // Immediate second call should be debounced
            callback({ statusCode: 200, url: 'https://gemini.google.com/u/0/_/BardChatUi/data/StreamGenerate' });
            const secondEmitCalls = emitSpy.mock.calls.filter((c) => c[0] === 'response-complete');
            expect(secondEmitCalls.length).toBe(1); // Still 1, not 2
        });

        it('allows emission after debounce cooldown (1000ms)', () => {
            vi.useFakeTimers();
            const emitSpy = vi.spyOn(mainWindow, 'emit');

            const onCompletedCall = (session.defaultSession.webRequest.onCompleted as any).mock.calls[0];
            const callback = onCompletedCall[1];

            // First call
            callback({ statusCode: 200, url: 'https://gemini.google.com/u/0/_/BardChatUi/data/StreamGenerate' });
            expect(emitSpy.mock.calls.filter((c) => c[0] === 'response-complete').length).toBe(1);

            // Advance time past debounce period (1000ms)
            vi.advanceTimersByTime(1001);

            // Second call after cooldown should emit
            callback({ statusCode: 200, url: 'https://gemini.google.com/u/0/_/BardChatUi/data/StreamGenerate' });
            expect(emitSpy.mock.calls.filter((c) => c[0] === 'response-complete').length).toBe(2);

            vi.useRealTimers();
        });
    });

    describe('startup delay behavior', () => {
        it('does not emit response-complete when detection is inactive', () => {
            mainWindow.create();
            // Detection is NOT active (default state)

            const emitSpy = vi.spyOn(mainWindow, 'emit');
            const onCompletedCall = (session.defaultSession.webRequest.onCompleted as any).mock.calls[0];
            const callback = onCompletedCall[1];

            callback({ statusCode: 200, url: 'https://gemini.google.com/u/0/_/BardChatUi/data/StreamGenerate' });

            const calls = emitSpy.mock.calls.filter((c) => c[0] === 'response-complete');
            expect(calls.length).toBe(0);
        });
    });

    describe('URL pattern filtering', () => {
        /**
         * The URL pattern is registered with Electron's webRequest.onCompleted.
         * Electron filters URLs based on this pattern before calling our callback.
         * These tests verify the pattern correctly matches/excludes expected URLs.
         */

        // Helper to test if a URL matches the glob pattern
        const urlMatchesPattern = (url: string, pattern: string): boolean => {
            // Convert glob pattern to regex
            const regexPattern = pattern
                .replace(/\*/g, '.*') // * -> .*
                .replace(/\?/g, '.'); // ? -> .
            return new RegExp(`^${regexPattern}$`).test(url);
        };

        const PATTERN = '*://gemini.google.com/*StreamGenerate*';

        it('pattern matches StreamGenerate URLs with query params', () => {
            const url = 'https://gemini.google.com/u/0/_/BardChatUi/data/StreamGenerate?bl=boq_assistant';
            expect(urlMatchesPattern(url, PATTERN)).toBe(true);
        });

        it('pattern matches StreamGenerate URLs without query params', () => {
            const url = 'https://gemini.google.com/u/0/_/BardChatUi/data/StreamGenerate';
            expect(urlMatchesPattern(url, PATTERN)).toBe(true);
        });

        it('pattern does NOT match log API requests', () => {
            const url = 'https://gemini.google.com/u/0/_/BardChatUi/data/log?format=json';
            expect(urlMatchesPattern(url, PATTERN)).toBe(false);
        });

        it('pattern does NOT match batchexecute API requests', () => {
            const url = 'https://gemini.google.com/u/0/_/BardChatUi/data/batchexecute?rpcids=PCk7e';
            expect(urlMatchesPattern(url, PATTERN)).toBe(false);
        });

        it('pattern does NOT match other BardChatUi endpoints', () => {
            const nonMatchingUrls = [
                'https://gemini.google.com/u/0/_/BardChatUi/data/log?format=json&hasfast=true',
                'https://gemini.google.com/u/0/_/BardChatUi/data/batchexecute?rpcids=L5adhe',
                'https://gemini.google.com/u/0/_/BardChatUi/script.js',
                'https://gemini.google.com/u/0/_/BardChatUi/RotateCookies',
            ];

            for (const url of nonMatchingUrls) {
                expect(urlMatchesPattern(url, PATTERN)).toBe(false);
            }
        });

        it('verifies the correct pattern is registered with webRequest', () => {
            mainWindow.create();

            expect(session.defaultSession.webRequest.onCompleted).toHaveBeenCalledWith(
                { urls: [PATTERN] },
                expect.any(Function)
            );
        });
    });
});
