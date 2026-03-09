import { beforeEach, describe, expect, it, vi } from 'vitest';

const { ipcRendererMock } = vi.hoisted(() => ({
    ipcRendererMock: {
        on: vi.fn(),
        removeListener: vi.fn(),
    },
}));

vi.mock('electron', () => ({
    ipcRenderer: ipcRendererMock,
}));

import { createSignalSubscription, createSubscription } from '../../../src/preload/createSubscription';

describe('createSubscription', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should register a listener on the specified channel', () => {
        const subscribe = createSubscription<string>('test:channel');

        subscribe(() => {});

        expect(ipcRendererMock.on).toHaveBeenCalledWith('test:channel', expect.any(Function));
    });

    it('should return a cleanup function that removes the listener', () => {
        const subscribe = createSubscription<string>('test:channel');
        const cleanup = subscribe(() => {});

        cleanup();

        expect(ipcRendererMock.removeListener).toHaveBeenCalledWith('test:channel', expect.any(Function));
    });

    it('should forward data to the callback, stripping the event', () => {
        const subscribe = createSubscription<{ name: string }>('test:channel');
        const callback = vi.fn();

        subscribe(callback);

        const handler = ipcRendererMock.on.mock.calls[0][1] as (event: unknown, data: { name: string }) => void;
        handler({}, { name: 'test' });

        expect(callback).toHaveBeenCalledWith({ name: 'test' });
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should use the same handler reference for on and removeListener', () => {
        const subscribe = createSubscription<number>('test:channel');
        const cleanup = subscribe(() => {});

        cleanup();

        const onHandler = ipcRendererMock.on.mock.calls[0][1];
        const removeHandler = ipcRendererMock.removeListener.mock.calls[0][1];
        expect(onHandler).toBe(removeHandler);
    });
});

describe('createSignalSubscription', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should register and call a no-arg callback', () => {
        const subscribe = createSignalSubscription('test:signal');
        const callback = vi.fn();

        subscribe(callback);

        const handler = ipcRendererMock.on.mock.calls[0][1] as () => void;
        handler();

        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith();
    });

    it('should return proper cleanup', () => {
        const subscribe = createSignalSubscription('test:signal');
        const cleanup = subscribe(() => {});

        cleanup();

        expect(ipcRendererMock.removeListener).toHaveBeenCalledWith('test:signal', expect.any(Function));
    });
});
