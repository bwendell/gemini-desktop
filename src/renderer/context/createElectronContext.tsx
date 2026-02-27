import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { createRendererLogger } from '../utils';

type ElectronApi = NonNullable<typeof window.electronAPI>;

export interface ElectronChannel<TValue> {
    defaultValue: TValue;
    getter: (api: ElectronApi) => (() => Promise<TValue>) | undefined;
    onChange: (api: ElectronApi) => ((cb: (value: TValue) => void) => () => void) | undefined;
    validate?: (data: unknown) => data is TValue;
    adapter?: (data: unknown) => unknown;
}

type ElectronChannels = Record<string, ElectronChannel<unknown>>;

type ChannelValue<TChannel> = TChannel extends ElectronChannel<infer TValue> ? TValue : never;
type ChannelState<TChannels extends ElectronChannels> = {
    [K in keyof TChannels]: ChannelValue<TChannels[K]>;
};
type ChannelSetters<TChannels extends ElectronChannels> = {
    [K in keyof TChannels]: React.Dispatch<React.SetStateAction<ChannelState<TChannels>[K]>>;
};

export interface CreateElectronContextConfig<TChannels extends ElectronChannels, TContextValue> {
    displayName: string;
    channels: TChannels;
    buildContextValue: (state: ChannelState<TChannels>, setters: ChannelSetters<TChannels>) => TContextValue;
    onStateChange?: <K extends keyof TChannels>(channelName: K, value: ChannelState<TChannels>[K]) => void;
}

export interface ElectronContextResult<TContextValue> {
    Provider: React.FC<{ children: ReactNode }>;
    useContextHook: () => TContextValue;
}

export function createElectronContext<TChannels extends ElectronChannels, TContextValue>(
    config: CreateElectronContextConfig<TChannels, TContextValue>
): ElectronContextResult<TContextValue> {
    const logger = createRendererLogger(`[${config.displayName}Context]`);
    const Context = createContext<TContextValue | undefined>(undefined);
    Context.displayName = `${config.displayName}Context`;
    const channelEntries = Object.entries(config.channels) as [keyof TChannels, TChannels[keyof TChannels]][];
    const onStateChange = config.onStateChange;

    function Provider({ children }: { children: ReactNode }) {
        const [stateMap, setStateMap] = useState<ChannelState<TChannels>>(() => {
            const initialState = {} as ChannelState<TChannels>;
            for (const [name, channel] of channelEntries) {
                initialState[name] = channel.defaultValue as ChannelState<TChannels>[typeof name];
            }
            return initialState;
        });

        const setChannelValue = <K extends keyof TChannels>(
            key: K,
            value: React.SetStateAction<ChannelState<TChannels>[K]>
        ) => {
            setStateMap((prev) => {
                const nextValue =
                    typeof value === 'function'
                        ? (value as (prevValue: ChannelState<TChannels>[K]) => ChannelState<TChannels>[K])(prev[key])
                        : value;

                if (Object.is(prev[key], nextValue)) {
                    return prev;
                }

                return {
                    ...prev,
                    [key]: nextValue,
                };
            });
        };

        const setterMapRef = useRef<ChannelSetters<TChannels> | null>(null);
        if (!setterMapRef.current) {
            const setters = {} as ChannelSetters<TChannels>;
            for (const [name] of channelEntries) {
                setters[name] = (value) => {
                    setChannelValue(name, value as ChannelState<TChannels>[typeof name]);
                };
            }
            setterMapRef.current = setters;
        }

        useEffect(() => {
            const abortController = new AbortController();
            const { signal } = abortController;
            const cleanups: (() => void)[] = [];

            const resolveValue = <K extends keyof TChannels>(
                channel: TChannels[K],
                value: unknown
            ): ChannelState<TChannels>[K] | null => {
                const adaptedValue = channel.adapter ? channel.adapter(value) : value;
                if (!channel.validate || channel.validate(adaptedValue)) {
                    return adaptedValue as ChannelState<TChannels>[K];
                }
                return null;
            };

            const init = async () => {
                const api = window.electronAPI;
                if (!api) {
                    for (const [name, channel] of channelEntries) {
                        const resolvedValue = resolveValue(channel, channel.defaultValue);
                        if (resolvedValue !== null) {
                            setterMapRef.current?.[name](resolvedValue);
                            onStateChange?.(name, resolvedValue);
                        }
                    }
                    logger.log('No Electron API, using defaults');
                    return;
                }

                for (const [name, channel] of channelEntries) {
                    const getterFn = channel.getter(api);
                    if (getterFn) {
                        try {
                            const result = await getterFn();
                            if (signal.aborted) return;

                            const resolvedValue = resolveValue(channel, result);
                            if (resolvedValue !== null) {
                                setterMapRef.current?.[name](resolvedValue);
                                onStateChange?.(name, resolvedValue);
                                logger.log(`${String(name)} initialized:`, resolvedValue);
                            } else {
                                logger.warn(`Invalid ${String(name)} data:`, result);
                            }
                        } catch (error) {
                            logger.error(`Failed to initialize ${String(name)}:`, error);
                        }
                    }

                    const onChangeFn = channel.onChange(api);
                    if (onChangeFn) {
                        const cleanup = onChangeFn((data) => {
                            if (signal.aborted) return;

                            const resolvedValue = resolveValue(channel, data);
                            if (resolvedValue !== null) {
                                setterMapRef.current?.[name](resolvedValue);
                                onStateChange?.(name, resolvedValue);
                                logger.log(`${String(name)} updated from external source:`, resolvedValue);
                            }
                        });
                        if (typeof cleanup === 'function') {
                            cleanups.push(cleanup);
                        }
                    }
                }
            };

            void init();

            return () => {
                abortController.abort();
                for (const cleanup of cleanups) {
                    cleanup();
                }
            };
        }, []); // eslint-disable-line react-hooks/exhaustive-deps -- channel config is static per factory instance

        const contextValue = config.buildContextValue(
            stateMap,
            setterMapRef.current ?? ({} as ChannelSetters<TChannels>)
        );

        return <Context.Provider value={contextValue}>{children}</Context.Provider>;
    }

    Provider.displayName = `${config.displayName}Provider`;

    function useContextHook(): TContextValue {
        const context = useContext(Context);
        if (context === undefined) {
            throw new Error(`use${config.displayName} must be used within a ${config.displayName}Provider`);
        }
        return context;
    }

    return { Provider, useContextHook };
}
