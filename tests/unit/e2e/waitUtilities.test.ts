/**
 * Unit tests for waitUtilities.ts
 *
 * These tests verify the wait utility functions work correctly
 * by mocking the browser object and testing the polling logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the dependencies before importing the module
const mockPause = vi.fn();
const mockExecute = vi.fn();
const mockGetWindowHandles = vi.fn();
const mockLoggerInfo = vi.fn();

vi.mock('@wdio/globals', () => ({
    browser: {
        pause: mockPause,
        execute: mockExecute,
        getWindowHandles: mockGetWindowHandles,
    },
}));

vi.mock('./logger', () => ({
    E2ELogger: {
        info: mockLoggerInfo,
    },
}));

// Import the module after mocking
import {
    waitForUIState,
    waitForIPCRoundTrip,
    waitForWindowTransition,
    waitForDuration,
    waitForWindowCount,
} from '../../../tests/e2e/helpers/waitUtilities';

describe('waitUtilities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPause.mockResolvedValue(undefined);
    });

    describe('waitForUIState', () => {
        it('should return true when condition is met immediately', async () => {
            const condition = vi.fn().mockResolvedValue(true);

            const result = await waitForUIState(condition, {
                timeout: 1000,
                interval: 50,
            });

            expect(result).toBe(true);
            expect(condition).toHaveBeenCalledTimes(1);
            expect(mockPause).not.toHaveBeenCalled();
        });

        it('should poll until condition is met', async () => {
            const condition = vi
                .fn()
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(true);

            const result = await waitForUIState(condition, {
                timeout: 1000,
                interval: 10,
            });

            expect(result).toBe(true);
            expect(condition).toHaveBeenCalledTimes(3);
            expect(mockPause).toHaveBeenCalledTimes(2);
            expect(mockPause).toHaveBeenCalledWith(10);
        });

        it('should return false when timeout is reached', async () => {
            const condition = vi.fn().mockResolvedValue(false);

            const result = await waitForUIState(condition, {
                timeout: 100,
                interval: 50,
            });

            expect(result).toBe(false);
            expect(condition).toHaveBeenCalledTimes(2); // Initial + one retry before timeout
        });

        it('should handle condition errors gracefully', async () => {
            const condition = vi.fn().mockRejectedValueOnce(new Error('Test error')).mockResolvedValueOnce(true);

            const result = await waitForUIState(condition, {
                timeout: 1000,
                interval: 10,
            });

            expect(result).toBe(true);
            expect(condition).toHaveBeenCalledTimes(2);
        });

        it('should use description in logs', async () => {
            const condition = vi.fn().mockResolvedValue(true);

            await waitForUIState(condition, {
                description: 'Test condition',
            });

            expect(mockLoggerInfo).toHaveBeenCalledWith('waitUtilities', expect.stringContaining('[Test condition]'));
        });
    });

    describe('waitForIPCRoundTrip', () => {
        it('should execute action and return when no verification', async () => {
            const action = vi.fn().mockResolvedValue(undefined);

            await waitForIPCRoundTrip(action, { timeout: 1000 });

            expect(action).toHaveBeenCalledTimes(1);
            expect(mockPause).toHaveBeenCalledWith(100); // Brief safety delay
        });

        it('should wait for verification to pass', async () => {
            const action = vi.fn().mockResolvedValue(undefined);
            const verification = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);

            await waitForIPCRoundTrip(action, {
                timeout: 1000,
                verification,
            });

            expect(action).toHaveBeenCalledTimes(1);
            expect(verification).toHaveBeenCalledTimes(2);
        });

        it('should throw when verification times out', async () => {
            const action = vi.fn().mockResolvedValue(undefined);
            const verification = vi.fn().mockResolvedValue(false);

            await expect(
                waitForIPCRoundTrip(action, {
                    timeout: 100,
                    verification,
                })
            ).rejects.toThrow('IPC round-trip verification failed');
        });
    });

    describe('waitForWindowTransition', () => {
        it('should return true when condition is met and stable', async () => {
            const condition = vi.fn().mockResolvedValue(true);

            const result = await waitForWindowTransition(condition, {
                timeout: 1000,
                stableDuration: 50,
                interval: 10,
            });

            expect(result).toBe(true);
        });

        it('should require stability period before returning true', async () => {
            const condition = vi
                .fn()
                .mockResolvedValueOnce(true) // Met but not stable
                .mockResolvedValueOnce(false) // Became unstable
                .mockResolvedValueOnce(true) // Met again
                .mockResolvedValueOnce(true); // Stable

            const result = await waitForWindowTransition(condition, {
                timeout: 1000,
                stableDuration: 20,
                interval: 10,
            });

            expect(result).toBe(true);
            expect(condition).toHaveBeenCalledTimes(4);
        });

        it('should return false when timeout reached', async () => {
            const condition = vi.fn().mockResolvedValue(false);

            const result = await waitForWindowTransition(condition, {
                timeout: 100,
                interval: 50,
            });

            expect(result).toBe(false);
        });

        it('should use description in logs', async () => {
            const condition = vi.fn().mockResolvedValue(true);

            await waitForWindowTransition(condition, {
                description: 'Window minimize',
            });

            expect(mockLoggerInfo).toHaveBeenCalledWith('waitUtilities', expect.stringContaining('[Window minimize]'));
        });
    });

    describe('waitForDuration', () => {
        it('should pause for specified duration', async () => {
            await waitForDuration(1000, 'Test wait');

            expect(mockPause).toHaveBeenCalledTimes(1);
            expect(mockPause).toHaveBeenCalledWith(1000);
        });

        it('should log description when provided', async () => {
            await waitForDuration(500, 'Auto-dismiss wait');

            expect(mockLoggerInfo).toHaveBeenCalledWith(
                'waitUtilities',
                expect.stringContaining('[Auto-dismiss wait]')
            );
        });
    });

    describe('waitForWindowCount', () => {
        it('should return true when window count matches', async () => {
            mockGetWindowHandles.mockResolvedValue(['window1', 'window2']);

            const result = await waitForWindowCount(2, 1000);

            expect(result).toBe(true);
            expect(mockGetWindowHandles).toHaveBeenCalledTimes(1);
        });

        it('should poll until count matches', async () => {
            mockGetWindowHandles
                .mockResolvedValueOnce(['window1'])
                .mockResolvedValueOnce(['window1'])
                .mockResolvedValueOnce(['window1', 'window2']);

            const result = await waitForWindowCount(2, 1000);

            expect(result).toBe(true);
            expect(mockGetWindowHandles).toHaveBeenCalledTimes(3);
            expect(mockPause).toHaveBeenCalledTimes(2);
        });

        it('should return false when timeout reached', async () => {
            mockGetWindowHandles.mockResolvedValue(['window1']);

            const result = await waitForWindowCount(2, 100);

            expect(result).toBe(false);
        });
    });
});
