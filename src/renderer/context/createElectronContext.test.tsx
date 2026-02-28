import { render, screen, act, cleanup, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createElectronContext } from './createElectronContext';

type ChannelA = { count: number };
type ChannelB = { label: string };

const defaultA: ChannelA = { count: 0 };
const defaultB: ChannelB = { label: 'default' };

const windowApi = window as unknown as { electronAPI?: unknown };

const baseLogger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
};

vi.mock('../utils', () => ({
    createRendererLogger: () => baseLogger,
}));

const createTestContext = () => {
    const getA = vi.fn();
    const getB = vi.fn();
    const onAChanged = vi.fn();
    const onBChanged = vi.fn();
    const onStateChange = vi.fn();

    const { Provider, useContextHook } = createElectronContext({
        displayName: 'Test',
        channels: {
            a: {
                defaultValue: defaultA,
                getter: () => getA,
                onChange: () => onAChanged,
                validate: (data: unknown): data is ChannelA =>
                    typeof data === 'object' && data !== null && 'count' in data,
            },
            b: {
                defaultValue: defaultB,
                getter: () => getB,
                onChange: () => onBChanged,
                validate: (data: unknown): data is ChannelB =>
                    typeof data === 'object' && data !== null && 'label' in data,
            },
        } as const,
        buildContextValue: (state, setters) => ({
            valueA: state.a.count,
            valueB: state.b.label,
            setCount: (value: number) => setters.a({ count: value }),
            setLabel: (value: string) => setters.b({ label: value }),
        }),
        onStateChange,
    });

    return {
        Provider,
        useContextHook,
        getA,
        getB,
        onAChanged,
        onBChanged,
        onStateChange,
    };
};

const Consumer = ({ useContextHook }: { useContextHook: () => any }) => {
    const { valueA, valueB, setCount, setLabel } = useContextHook();
    return (
        <div>
            <span data-testid="a">{valueA}</span>
            <span data-testid="b">{valueB}</span>
            <button type="button" onClick={() => setCount(10)}>
                Set A
            </button>
            <button type="button" onClick={() => setLabel('updated')}>
                Set B
            </button>
        </div>
    );
};

describe('createElectronContext', () => {
    const originalElectronApi = windowApi.electronAPI;

    beforeEach(() => {
        vi.clearAllMocks();
        windowApi.electronAPI = originalElectronApi;
        cleanup();
    });

    it('renders children with default values when no electronAPI', async () => {
        windowApi.electronAPI = undefined;
        const { Provider, useContextHook } = createTestContext();

        await act(async () => {
            render(
                <Provider>
                    <Consumer useContextHook={useContextHook} />
                </Provider>
            );
        });

        await act(async () => {});

        expect(screen.getByTestId('a').textContent).toBe('0');
        expect(screen.getByTestId('b').textContent).toBe('default');
    });

    it('initializes state from getter on mount', async () => {
        const { Provider, useContextHook, getA, getB } = createTestContext();
        windowApi.electronAPI = {};
        getA.mockResolvedValue({ count: 5 });
        getB.mockResolvedValue({ label: 'loaded' });

        await act(async () => {
            render(
                <Provider>
                    <Consumer useContextHook={useContextHook} />
                </Provider>
            );
        });

        await act(async () => {});

        expect(screen.getByTestId('a').textContent).toBe('5');
        expect(screen.getByTestId('b').textContent).toBe('loaded');
    });

    it('subscribes to onChange and updates state', async () => {
        let onChangeA: ((value: ChannelA) => void) | undefined;
        let onChangeB: ((value: ChannelB) => void) | undefined;
        const { Provider, useContextHook, onAChanged, onBChanged } = createTestContext();
        windowApi.electronAPI = {};
        onAChanged.mockImplementation((cb: (value: ChannelA) => void) => {
            onChangeA = cb;
            return vi.fn();
        });
        onBChanged.mockImplementation((cb: (value: ChannelB) => void) => {
            onChangeB = cb;
            return vi.fn();
        });

        await act(async () => {
            render(
                <Provider>
                    <Consumer useContextHook={useContextHook} />
                </Provider>
            );
        });

        await waitFor(() => {
            expect(onChangeA).toBeDefined();
            expect(onChangeB).toBeDefined();
        });

        await act(async () => {
            onChangeA?.({ count: 12 });
            onChangeB?.({ label: 'changed' });
        });

        await waitFor(() => {
            expect(onAChanged).toHaveBeenCalled();
            expect(onBChanged).toHaveBeenCalled();
        });

        expect(screen.getByTestId('a').textContent).toBe('12');
        expect(screen.getByTestId('b').textContent).toBe('changed');
    });

    it('ignores invalid data and skips onStateChange', async () => {
        const { Provider, useContextHook, getA, onAChanged, onStateChange } = createTestContext();
        windowApi.electronAPI = {};
        getA.mockResolvedValue({ invalid: true });
        onAChanged.mockImplementation((cb: (value: ChannelA) => void) => {
            cb({ invalid: true } as unknown as ChannelA);
            return vi.fn();
        });

        await act(async () => {
            render(
                <Provider>
                    <Consumer useContextHook={useContextHook} />
                </Provider>
            );
        });

        await act(async () => {});

        expect(screen.getByTestId('a').textContent).toBe('0');
        expect(onStateChange).not.toHaveBeenCalled();
    });

    it('skips onStateChange when validate fails after initialization', async () => {
        const { Provider, useContextHook, getA, onStateChange } = createTestContext();
        windowApi.electronAPI = {};
        getA.mockResolvedValue({ invalid: true });

        await act(async () => {
            render(
                <Provider>
                    <Consumer useContextHook={useContextHook} />
                </Provider>
            );
        });

        await act(async () => {});

        expect(onStateChange).not.toHaveBeenCalled();
    });

    it('continues initializing other channels if one getter throws', async () => {
        const { Provider, useContextHook, getA, getB } = createTestContext();
        windowApi.electronAPI = {};
        getA.mockRejectedValue(new Error('fail A'));
        getB.mockResolvedValue({ label: 'ok' });

        await act(async () => {
            render(
                <Provider>
                    <Consumer useContextHook={useContextHook} />
                </Provider>
            );
        });

        expect(screen.getByTestId('b').textContent).toBe('ok');
    });

    it('does not update state after unmount when getter resolves late', async () => {
        let resolvePromise: (value: ChannelA) => void;
        const pending = new Promise<ChannelA>((resolve) => {
            resolvePromise = resolve;
        });

        const { Provider, useContextHook, getA } = createTestContext();
        windowApi.electronAPI = {};
        getA.mockReturnValue(pending);

        const { unmount } = render(
            <Provider>
                <Consumer useContextHook={useContextHook} />
            </Provider>
        );

        await act(async () => {});

        unmount();

        await act(async () => {
            resolvePromise({ count: 99 });
        });

        expect(screen.queryByTestId('a')).toBeNull();
    });

    it('cleans up subscriptions on unmount', async () => {
        const cleanupA = vi.fn();
        const cleanupB = vi.fn();
        const onAChanged = vi.fn().mockReturnValue(cleanupA);
        const onBChanged = vi.fn().mockReturnValue(cleanupB);

        const { Provider, useContextHook } = createElectronContext({
            displayName: 'Cleanup',
            channels: {
                a: {
                    defaultValue: defaultA,
                    getter: () => undefined,
                    onChange: () => onAChanged,
                    validate: (data: unknown): data is ChannelA =>
                        typeof data === 'object' && data !== null && 'count' in data,
                },
                b: {
                    defaultValue: defaultB,
                    getter: () => undefined,
                    onChange: () => onBChanged,
                    validate: (data: unknown): data is ChannelB =>
                        typeof data === 'object' && data !== null && 'label' in data,
                },
            } as const,
            buildContextValue: (state) => ({
                valueA: state.a.count,
                valueB: state.b.label,
                setCount: () => {},
                setLabel: () => {},
            }),
        });
        windowApi.electronAPI = {};

        const { unmount } = render(
            <Provider>
                <Consumer useContextHook={useContextHook} />
            </Provider>
        );

        await waitFor(() => {
            expect(onAChanged).toHaveBeenCalled();
            expect(onBChanged).toHaveBeenCalled();
        });

        await act(async () => {
            unmount();
        });

        await act(async () => {});

        expect(cleanupA).toHaveBeenCalled();
        expect(cleanupB).toHaveBeenCalled();
    });

    it('throws when hook used outside provider', () => {
        const { useContextHook } = createTestContext();
        const Broken = () => {
            useContextHook();
            return null;
        };

        expect(() => render(<Broken />)).toThrow('useTest must be used within a TestProvider');
    });

    it('handles getter rejection gracefully', async () => {
        const { Provider, useContextHook, getA } = createTestContext();
        windowApi.electronAPI = {};
        getA.mockRejectedValue(new Error('failed'));

        await act(async () => {
            render(
                <Provider>
                    <Consumer useContextHook={useContextHook} />
                </Provider>
            );
        });

        await act(async () => {});

        expect(screen.getByTestId('a').textContent).toBe('0');
    });

    it('uses defaultValue when getter resolves to undefined', async () => {
        const { Provider, useContextHook, getA } = createTestContext();
        windowApi.electronAPI = {};
        getA.mockResolvedValue(undefined);

        await act(async () => {
            render(
                <Provider>
                    <Consumer useContextHook={useContextHook} />
                </Provider>
            );
        });

        await act(async () => {});

        expect(screen.getByTestId('a').textContent).toBe('0');
    });

    it('does not register cleanup when onChange returns undefined', async () => {
        const cleanupB = vi.fn();
        const onAChanged = vi.fn().mockReturnValue(undefined);
        const onBChanged = vi.fn().mockReturnValue(cleanupB);

        const { Provider, useContextHook } = createElectronContext({
            displayName: 'Cleanup',
            channels: {
                a: {
                    defaultValue: defaultA,
                    getter: () => undefined,
                    onChange: () => onAChanged,
                    validate: (data: unknown): data is ChannelA =>
                        typeof data === 'object' && data !== null && 'count' in data,
                },
                b: {
                    defaultValue: defaultB,
                    getter: () => undefined,
                    onChange: () => onBChanged,
                    validate: (data: unknown): data is ChannelB =>
                        typeof data === 'object' && data !== null && 'label' in data,
                },
            } as const,
            buildContextValue: (state) => ({
                valueA: state.a.count,
                valueB: state.b.label,
                setCount: () => {},
                setLabel: () => {},
            }),
        });

        windowApi.electronAPI = {};

        const { unmount } = render(
            <Provider>
                <Consumer useContextHook={useContextHook} />
            </Provider>
        );

        await act(async () => {});
        unmount();

        expect(onAChanged).toHaveBeenCalled();
        expect(onBChanged).toHaveBeenCalled();
        expect(cleanupB).toHaveBeenCalled();
    });

    it('supports mixed channels where some getters/onChange return undefined', async () => {
        const getB = vi.fn().mockResolvedValue({ label: 'loaded' });

        const { Provider, useContextHook } = createElectronContext({
            displayName: 'Mixed',
            channels: {
                a: {
                    defaultValue: defaultA,
                    getter: () => undefined,
                    onChange: () => undefined,
                    validate: (data: unknown): data is ChannelA =>
                        typeof data === 'object' && data !== null && 'count' in data,
                },
                b: {
                    defaultValue: defaultB,
                    getter: () => getB,
                    onChange: () => undefined,
                    validate: (data: unknown): data is ChannelB =>
                        typeof data === 'object' && data !== null && 'label' in data,
                },
            } as const,
            buildContextValue: (state) => ({
                valueA: state.a.count,
                valueB: state.b.label,
                setCount: () => {},
                setLabel: () => {},
            }),
        });

        windowApi.electronAPI = {};

        await act(async () => {
            render(
                <Provider>
                    <Consumer useContextHook={useContextHook} />
                </Provider>
            );
        });

        await act(async () => {});

        expect(screen.getByTestId('a').textContent).toBe('0');
        expect(screen.getByTestId('b').textContent).toBe('loaded');
    });

    it('applies adapter before validation on getter', async () => {
        const adapter = vi.fn((data: unknown) => ({ count: Number((data as { raw: string }).raw) }));
        const validate = (data: unknown): data is ChannelA =>
            typeof data === 'object' && data !== null && 'count' in data;
        const getA = vi.fn().mockResolvedValue({ raw: '7' });

        const { Provider, useContextHook } = createElectronContext({
            displayName: 'AdapterGetter',
            channels: {
                a: {
                    defaultValue: defaultA,
                    getter: () => getA,
                    onChange: () => undefined,
                    validate,
                    adapter,
                },
            } as const,
            buildContextValue: (state) => ({
                valueA: (state.a as ChannelA).count,
                setCount: () => {},
                setLabel: () => {},
            }),
        });

        windowApi.electronAPI = {};

        await act(async () => {
            render(
                <Provider>
                    <Consumer useContextHook={useContextHook} />
                </Provider>
            );
        });

        await act(async () => {});

        expect(adapter).toHaveBeenCalledWith({ raw: '7' });
        expect(validate({ count: 7 })).toBe(true);
        expect(screen.getByTestId('a').textContent).toBe('7');
    });

    it('applies adapter before validation on onChange', async () => {
        const adapter = vi.fn((data: unknown) => ({ count: Number((data as { raw: string }).raw) }));
        const validate = (data: unknown): data is ChannelA =>
            typeof data === 'object' && data !== null && 'count' in data;
        let onChangeA: ((value: unknown) => void) | undefined;
        const onAChanged = vi.fn((cb: (value: unknown) => void) => {
            onChangeA = cb;
            return vi.fn();
        });

        const { Provider, useContextHook } = createElectronContext({
            displayName: 'AdapterChange',
            channels: {
                a: {
                    defaultValue: defaultA,
                    getter: () => undefined,
                    onChange: () => onAChanged,
                    validate,
                    adapter,
                },
            } as const,
            buildContextValue: (state) => ({
                valueA: (state.a as ChannelA).count,
                setCount: () => {},
                setLabel: () => {},
            }),
        });

        windowApi.electronAPI = {};

        await act(async () => {
            render(
                <Provider>
                    <Consumer useContextHook={useContextHook} />
                </Provider>
            );
        });

        await act(async () => {
            onChangeA?.({ raw: '11' });
        });

        expect(adapter).toHaveBeenCalledWith({ raw: '11' });
        expect(validate({ count: 11 })).toBe(true);
        expect(screen.getByTestId('a').textContent).toBe('11');
    });
});
