import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockExecute = vi.hoisted(() => vi.fn());
const mockGetWindowHandles = vi.hoisted(() => vi.fn());
const mockGetWindowHandle = vi.hoisted(() => vi.fn());
const mockElectronExecute = vi.hoisted(() => vi.fn());
const mockGetAll = vi.hoisted(() => vi.fn());

vi.mock('@wdio/globals', () => ({
    browser: {
        execute: mockExecute,
        getWindowHandles: mockGetWindowHandles,
        getWindowHandle: mockGetWindowHandle,
        electron: {
            execute: mockElectronExecute,
        },
        sessionId: 'session-123',
    },
}));

vi.mock('../../../tests/e2e/helpers/testLogger', () => ({
    testLogger: {
        getAll: mockGetAll,
    },
}));

import {
    captureFailureContext,
    parseAssertionDetails,
    parseLocatorFromError,
    safeSerialize,
} from '../../../tests/e2e/helpers/failureContext';

describe('failureContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockExecute.mockResolvedValue({});
        mockElectronExecute.mockResolvedValue({
            appVersion: '1.0.0',
            electronVersion: '30.0.0',
        });
        mockGetWindowHandles.mockResolvedValue(['handle-1']);
        mockGetWindowHandle.mockResolvedValue('handle-1');
        mockGetAll.mockReturnValue([{ timestamp: 1, scope: 'workflow', message: 'step', deltaMs: 0 }]);
    });

    it('parses locator from common error messages', () => {
        const error = new Error("Element '#app' was not displayed within 5000ms");
        expect(parseLocatorFromError(error)).toBe('#app');
    });

    it('extracts assertion details when present', () => {
        const error = { expected: 'a', actual: 'b', operator: 'toBe' };
        expect(parseAssertionDetails(error)).toEqual({ expected: '"a"', actual: '"b"', operator: 'toBe' });
    });

    it('captures failure context with defaults when sections throw', async () => {
        mockElectronExecute.mockRejectedValueOnce(new Error('electron failure'));
        mockExecute.mockRejectedValueOnce(new Error('renderer failure'));
        mockExecute.mockRejectedValueOnce(new Error('console failure'));

        const context = await captureFailureContext(
            { title: 'Test A', parent: 'Suite A', file: 'tests/e2e/test.spec.ts' },
            {},
            { error: new Error('Boom'), duration: 1200, retries: { attempts: 0 } },
            {
                screenshotPath: '/tmp/test.png',
                domSnapshotPath: '/tmp/test.html',
            }
        );

        expect(context.captureStatus).toBe('partial');
        expect(context.captureFailures.length).toBeGreaterThan(0);
        expect(context.error.message).toContain('Boom');
        expect(context.artifacts.screenshotPath).toContain('test.png');
    });

    it('safeSerialize handles circular values', () => {
        const obj: Record<string, unknown> = { a: 1 };
        obj.self = obj;
        const result = safeSerialize(obj);
        expect(result.text).toContain('Circular');
        expect(result.truncated).toBe(true);
    });
});
