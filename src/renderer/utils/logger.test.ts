import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRendererLogger } from './logger';

describe('createRendererLogger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  let originalLocation: Location;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock window.location to ensure we don't accidentally trigger dev mode via localhost
    originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        hostname: 'example.com',
        protocol: 'https:',
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore location
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
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
    const logger = createRendererLogger('[TestComponent]', { DEV: false, MODE: 'production' });

    logger.error('critical error');

    // Errors should always be logged even in production-like env
    expect(consoleErrorSpy).toHaveBeenCalledWith('[TestComponent] critical error');
  });

  it('does not log in production environment', () => {
    const logger = createRendererLogger('[TestComponent]', { DEV: false, MODE: 'production' });

    logger.log('test log');
    logger.warn('test warn');

    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('uses import.meta.env.DEV by default', () => {
    const logger = createRendererLogger('[TestComponent]');

    logger.log('test log');

    // In Vitest, DEV is typically true by default
    expect(consoleLogSpy).toHaveBeenCalledWith('[TestComponent] test log');
  });
});
