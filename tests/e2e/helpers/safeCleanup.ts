import { E2ELogger } from './logger';
import { isTransientSessionError } from './cleanupErrors';

type SessionAwareBrowser = {
    sessionId?: string;
};

export interface SafeCleanupOptions {
    retries?: number;
    backoffMs?: number;
    context?: string;
}

function hasActiveSession(): boolean {
    const maybeBrowser = (globalThis as { browser?: SessionAwareBrowser }).browser;
    return typeof maybeBrowser?.sessionId === 'string' && maybeBrowser.sessionId.length > 0;
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export async function runSafeCleanup(action: () => Promise<void>, options: SafeCleanupOptions = {}): Promise<void> {
    const retries = options.retries ?? 2;
    const backoffMs = options.backoffMs ?? 120;
    const context = options.context ?? 'e2e-cleanup';

    if (!hasActiveSession()) {
        E2ELogger.info(context, 'Skipping cleanup because WDIO session is unavailable');
        return;
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            await action();
            return;
        } catch (error) {
            if (!isTransientSessionError(error)) {
                throw error;
            }

            if (attempt === retries) {
                E2ELogger.warn(context, 'Ignoring transient cleanup failure after retries', error);
                return;
            }

            await delay(backoffMs * (attempt + 1));

            if (!hasActiveSession()) {
                E2ELogger.info(context, 'Stopping cleanup retries because WDIO session is unavailable');
                return;
            }
        }
    }
}
