import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRendererLogger } from './logger';

describe('createRendererLogger', () => {
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('creates a logger with correct prefix', () => {
        const logger = createRendererLogger('[TestComponent]');

        logger.log('test message');

        expect(consoleLogSpy).toHaveBeenCalledWith('[TestComponent] test message');
    });

    it('logs error messages with prefix', () => {
        const logger = createRendererLogger('[TestComponent]');

        logger.error('error message');

        expect(consoleErrorSpy).toHaveBeenCalledWith('[TestComponent] error message');
    });

    it('logs warning messages with prefix', () => {
        const logger = createRendererLogger('[TestComponent]');

        logger.warn('warning message');

        expect(consoleWarnSpy).toHaveBeenCalledWith('[TestComponent] warning message');
    });

    it('supports additional arguments', () => {
        const logger = createRendererLogger('[TestComponent]');
        const obj = { key: 'value' };

        logger.log('message with data', obj, 123);

        expect(consoleLogSpy).toHaveBeenCalledWith('[TestComponent] message with data', obj, 123);
    });

    it('always logs errors regardless of environment', () => {
        const logger = createRendererLogger('[TestComponent]');

        logger.error('critical error');

        // Errors should always be logged
        expect(consoleErrorSpy).toHaveBeenCalledWith('[TestComponent] critical error');
    });
});
