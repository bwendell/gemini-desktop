/**
 * Unit tests for logger utility.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLogger } from '../utils/logger';

describe('createLogger', () => {
    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    it('creates logger with prefix', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const logger = createLogger('[Test]') as any;
        expect(logger).toHaveProperty('log');
        expect(logger).toHaveProperty('error');
        expect(logger).toHaveProperty('warn');
    });

    describe('log', () => {
        it('logs message with prefix', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const logger = createLogger('[TestModule]') as any;
            logger.log('Hello world');

            expect(console.log).toHaveBeenCalledWith('[TestModule] Hello world');
        });

        it('logs message with additional arguments', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const logger = createLogger('[Test]') as any;
            logger.log('Value:', 42, { key: 'value' });

            expect(console.log).toHaveBeenCalledWith('[Test] Value:', 42, { key: 'value' });
        });
    });

    describe('error', () => {
        it('logs error with prefix', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const logger = createLogger('[ErrorTest]') as any;
            logger.error('Something went wrong');

            expect(console.error).toHaveBeenCalledWith('[ErrorTest] Something went wrong');
        });

        it('logs error with error object', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const logger = createLogger('[Test]') as any;
            const error = new Error('Test error');
            logger.error('Failed:', error);

            expect(console.error).toHaveBeenCalledWith('[Test] Failed:', error);
        });
    });

    describe('warn', () => {
        it('logs warning with prefix', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const logger = createLogger('[WarnTest]') as any;
            logger.warn('This is a warning');

            expect(console.warn).toHaveBeenCalledWith('[WarnTest] This is a warning');
        });

        it('logs warning with additional arguments', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const logger = createLogger('[Test]') as any;
            logger.warn('Deprecated:', 'oldMethod');

            expect(console.warn).toHaveBeenCalledWith('[Test] Deprecated:', 'oldMethod');
        });
    });
});
