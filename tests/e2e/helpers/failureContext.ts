import * as path from 'path';

import { browser } from '@wdio/globals';

import { testLogger } from './testLogger';

declare global {
    interface Window {
        __consoleErrors?: ConsoleErrorEntry[];
        __consoleErrorHookInstalled?: boolean;
    }
}

type WdioTest = {
    title?: string;
    parent?: string;
    fullTitle?: string;
    fullName?: string;
    file?: string;
};

type WdioRetries = number | { attempts?: number; limit?: number };

type WdioResult = {
    error?: unknown;
    duration?: number;
    passed?: boolean;
    retries?: WdioRetries;
};

type ElectronModule = {
    app: {
        getVersion(): string;
    };
    BrowserWindow: {
        getAllWindows(): ElectronBrowserWindow[];
        getFocusedWindow?(): ElectronBrowserWindow | null;
    };
};

type ElectronBrowserWindow = {
    getTitle(): string;
    getBounds(): { x: number; y: number; width: number; height: number };
    isVisible(): boolean;
    isFocused(): boolean;
    isMaximized(): boolean;
    isMinimized(): boolean;
    isFullScreen(): boolean;
    webContents?: { getURL?(): string };
};

export interface FailureContextArtifacts {
    screenshotPath: string;
    domSnapshotPath: string;
    failureContextPath?: string;
}

export interface FailureContext {
    schemaVersion: '1.0.0';
    captureStatus: 'complete' | 'partial';
    captureFailures: Array<{ section: string; message: string }>;
    testIdentity: {
        testName: string;
        testParent: string;
        fullTitle: string;
        specFile: string | null;
        timestamp: string;
        durationMs: number;
    };
    retries: {
        testAttempt: number;
        testMaxRetries: number;
        specFileMaxRetries: number;
        workerId: string | null;
    };
    environment: {
        platform: string;
        arch: string;
        nodeVersion: string;
        appVersion: string | null;
        electronVersion: string | null;
        ci: boolean;
        sessionId: string | null;
        display: {
            DISPLAY: string | null;
            XDG_SESSION_TYPE: string | null;
            WAYLAND_DISPLAY: string | null;
            inferredServer: 'x11' | 'wayland' | 'headless' | 'unknown';
        };
    };
    truncation: {
        didTruncate: boolean;
        droppedBreadcrumbs: number;
        droppedConsoleErrors: number;
    };
    error: {
        message: string;
        type: string;
        stack: string;
        expected?: string;
        actual?: string;
        operator?: string;
        locator?: string;
    };
    appState: {
        windowCount: number;
        windowDetails: Array<{
            title: string;
            url: string;
            bounds: { x: number; y: number; width: number; height: number };
            isVisible: boolean;
            isFocused: boolean;
            isMaximized: boolean;
            isMinimized: boolean;
            isFullScreen: boolean;
        }>;
        focusedWindowTitle: string | null;
        activeWindowHandle: string | null;
        allWindowHandles: string[];
    };
    rendererState: {
        url: string;
        title: string;
        readyState: string;
        theme: string | null;
        visibleDialogs: {
            count: number;
            labels: string[];
        };
    };
    consoleErrors: Array<{
        channel: 'console' | 'onerror' | 'unhandledrejection';
        message: string;
        stack?: string;
        timestamp: number;
    }>;
    breadcrumbs: BreadcrumbEntry[];
    artifacts: {
        screenshotPath: string;
        domSnapshotPath: string;
        failureContextPath: string;
    };
}

interface BreadcrumbEntry {
    timestamp: number;
    scope: string;
    message: string;
    deltaMs: number;
}

interface ConsoleErrorEntry {
    channel: 'console' | 'onerror' | 'unhandledrejection';
    message: string;
    stack?: string;
    timestamp: number;
}

const MAX_BREADCRUMBS = 200;
const MAX_CONSOLE_ERRORS = 50;
const MAX_STRING_LENGTH = 2000;
const MAX_SERIALIZE_DEPTH = 3;
type FailureContextMode = 'compact' | 'full';

const getFailureContextMode = (): FailureContextMode => {
    return process.env.FAILURE_CONTEXT_MODE === 'full' ? 'full' : 'compact';
};

export async function installRendererErrorInterceptor(): Promise<void> {
    await browser.execute((maxConsoleErrors: number) => {
        if (window.__consoleErrors && window.__consoleErrorHookInstalled) {
            window.__consoleErrors = [];
            return;
        }

        window.__consoleErrors = [];
        window.__consoleErrorHookInstalled = true;

        const originalError = console.error.bind(console);

        const pushEntry = (channel: ConsoleErrorEntry['channel'], message: string, stack?: string) => {
            window.__consoleErrors?.push({
                channel,
                message,
                stack,
                timestamp: Date.now(),
            });

            if (
                window.__consoleErrors &&
                window.__consoleErrors.length > (typeof maxConsoleErrors === 'number' ? maxConsoleErrors : 0)
            ) {
                window.__consoleErrors.shift();
            }
        };

        console.error = (...args: unknown[]) => {
            const message = args
                .map((arg) => {
                    if (typeof arg === 'string') {
                        return arg;
                    }
                    try {
                        return JSON.stringify(arg);
                    } catch {
                        return String(arg);
                    }
                })
                .join(' ');

            const stack = new Error().stack ?? '';
            pushEntry('console', message, stack);
            originalError(...args);
        };

        window.addEventListener('error', (event) => {
            const message = event.message || 'Unhandled error';
            const stack = (event.error as Error | undefined)?.stack ?? '';
            pushEntry('onerror', message, stack);
        });

        window.addEventListener('unhandledrejection', (event) => {
            const reason = event.reason;
            const message = typeof reason === 'string' ? reason : String(reason);
            const stack = typeof reason === 'object' && reason && 'stack' in reason ? String(reason.stack) : '';
            pushEntry('unhandledrejection', message, stack);
        });
    }, MAX_CONSOLE_ERRORS);
}

export async function captureFailureContext(
    test: WdioTest,
    context: Record<string, unknown>,
    result: WdioResult,
    artifacts: FailureContextArtifacts
): Promise<FailureContext> {
    const mode = getFailureContextMode();
    const captureFailures: Array<{ section: string; message: string }> = [];
    const recordFailure = (section: string, error: unknown) => {
        captureFailures.push({
            section,
            message: error instanceof Error ? error.message : String(error),
        });
    };

    const timestamp = new Date().toISOString();
    const durationMs = typeof result.duration === 'number' ? result.duration : 0;
    const retryAttempt = getRetryAttempt(result.retries);

    const testIdentity = {
        testName: test.title ?? 'unknown-test',
        testParent: test.parent ?? 'unknown-spec',
        fullTitle: getFullTitle(test),
        specFile: test.file ?? null,
        timestamp,
        durationMs,
    };

    const retries = {
        testAttempt: retryAttempt + 1,
        testMaxRetries: Number(process.env.WDIO_TEST_RETRIES ?? 0),
        specFileMaxRetries: Number(process.env.WDIO_SPEC_FILE_RETRIES ?? 0),
        workerId: typeof context.workerId === 'string' ? context.workerId : (process.env.WDIO_WORKER_ID ?? null),
    };

    const environment = await captureEnvironment(recordFailure);
    const error = captureErrorDetails(result.error, recordFailure);
    const appState = await captureAppState(mode, recordFailure);
    const rendererState = await captureRendererState(mode, recordFailure);
    const consoleErrors = await captureConsoleErrors(recordFailure);
    const breadcrumbs = captureBreadcrumbs(recordFailure);

    const droppedBreadcrumbs = Math.max(0, breadcrumbs.total - breadcrumbs.items.length);
    const droppedConsoleErrors = Math.max(0, consoleErrors.total - consoleErrors.items.length);
    const didTruncate =
        droppedBreadcrumbs > 0 || droppedConsoleErrors > 0 || consoleErrors.truncated || error.truncated;

    const artifactsPayload = {
        screenshotPath: toRelativePath(artifacts.screenshotPath),
        domSnapshotPath: toRelativePath(artifacts.domSnapshotPath),
        failureContextPath: toRelativePath(
            artifacts.failureContextPath ?? artifacts.screenshotPath.replace('.png', '.failure-context.json')
        ),
    };

    return {
        schemaVersion: '1.0.0',
        captureStatus: captureFailures.length > 0 ? 'partial' : 'complete',
        captureFailures,
        testIdentity,
        retries,
        environment,
        truncation: {
            didTruncate,
            droppedBreadcrumbs,
            droppedConsoleErrors,
        },
        error: error.details,
        appState,
        rendererState,
        consoleErrors: consoleErrors.items,
        breadcrumbs: breadcrumbs.items,
        artifacts: artifactsPayload,
    };
}

export function parseLocatorFromError(error: unknown): string | undefined {
    const message = getErrorMessage(error);
    if (!message) {
        return undefined;
    }

    const patterns = [
        /Element '(.+?)' was not displayed within/i,
        /Element '(.+?)' did not exist within/i,
        /Element "(.+?)" not displayed within/i,
        /Expected (.+?) to be displayed/i,
    ];

    for (const pattern of patterns) {
        const match = message.match(pattern);
        if (match?.[1]) {
            return match[1];
        }
    }

    return undefined;
}

export function parseAssertionDetails(error: unknown): {
    expected?: string;
    actual?: string;
    operator?: string;
} {
    if (!isRecord(error)) {
        return {};
    }

    const expected = 'expected' in error ? safeSerialize(error.expected).text : undefined;
    const actual = 'actual' in error ? safeSerialize(error.actual).text : undefined;
    const operator = typeof error.operator === 'string' ? error.operator : undefined;

    return {
        expected,
        actual,
        operator,
    };
}

export function safeSerialize(value: unknown): { text: string; truncated: boolean } {
    const seen = new WeakSet<object>();
    const state = { truncated: false };

    const toSerializable = (input: unknown, depth: number): unknown => {
        if (depth > MAX_SERIALIZE_DEPTH) {
            state.truncated = true;
            return '[Truncated]';
        }

        if (input instanceof Error) {
            return {
                name: input.name,
                message: input.message,
                stack: input.stack,
            };
        }

        if (typeof input === 'string') {
            if (input.length > MAX_STRING_LENGTH) {
                state.truncated = true;
                return `${input.slice(0, MAX_STRING_LENGTH)}…`;
            }
            return input;
        }

        if (typeof input === 'bigint') {
            return input.toString();
        }

        if (typeof input !== 'object' || input === null) {
            return input;
        }

        if (seen.has(input)) {
            state.truncated = true;
            return '[Circular]';
        }

        seen.add(input);

        if (Array.isArray(input)) {
            return input.map((item) => toSerializable(item, depth + 1));
        }

        const output: Record<string, unknown> = {};
        for (const key of Object.keys(input)) {
            output[key] = toSerializable((input as Record<string, unknown>)[key], depth + 1);
        }

        return output;
    };

    try {
        const serializable = toSerializable(value, 0);
        const json = JSON.stringify(serializable);
        if (json && json.length > MAX_STRING_LENGTH) {
            state.truncated = true;
            return { text: `${json.slice(0, MAX_STRING_LENGTH)}…`, truncated: true };
        }
        return { text: json ?? String(value), truncated: state.truncated };
    } catch (error) {
        return { text: error instanceof Error ? error.message : String(value), truncated: true };
    }
}

const captureEnvironment = async (recordFailure: (section: string, error: unknown) => void) => {
    const display = {
        DISPLAY: process.env.DISPLAY ?? null,
        XDG_SESSION_TYPE: process.env.XDG_SESSION_TYPE ?? null,
        WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY ?? null,
        inferredServer: inferDisplayServer(process.platform),
    };
    try {
        const appInfo = await browser.electron.execute((electron: ElectronModule) => {
            return {
                appVersion: typeof electron.app?.getVersion === 'function' ? electron.app.getVersion() : null,
                electronVersion: typeof process.versions?.electron === 'string' ? process.versions.electron : null,
            };
        });

        return {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            appVersion: appInfo?.appVersion ?? null,
            electronVersion: appInfo?.electronVersion ?? null,
            ci: Boolean(process.env.CI),
            sessionId: typeof browser.sessionId === 'string' ? browser.sessionId : null,
            display: {
                DISPLAY: display.DISPLAY,
                XDG_SESSION_TYPE: display.XDG_SESSION_TYPE,
                WAYLAND_DISPLAY: display.WAYLAND_DISPLAY,
                inferredServer: display.inferredServer,
            },
        };
    } catch (error) {
        recordFailure('environment', error);
        return {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            appVersion: null,
            electronVersion: null,
            ci: Boolean(process.env.CI),
            sessionId: typeof browser.sessionId === 'string' ? browser.sessionId : null,
            display: {
                DISPLAY: display.DISPLAY,
                XDG_SESSION_TYPE: display.XDG_SESSION_TYPE,
                WAYLAND_DISPLAY: display.WAYLAND_DISPLAY,
                inferredServer: display.inferredServer,
            },
        };
    }
};

const captureErrorDetails = (
    error: unknown,
    recordFailure: (section: string, error: unknown) => void
): { details: FailureContext['error']; truncated: boolean } => {
    try {
        const message = getErrorMessage(error) ?? '';
        const type = error instanceof Error ? error.name : 'Error';
        const stack = error instanceof Error ? (error.stack ?? '') : '';
        const locator = parseLocatorFromError(error);
        const assertion = parseAssertionDetails(error);
        const expected = assertion.expected;
        const actual = assertion.actual;
        const operator = assertion.operator;
        const serializedMessage = safeSerialize(message);

        return {
            details: {
                message: serializedMessage.text,
                type,
                stack,
                expected,
                actual,
                operator,
                locator,
            },
            truncated: serializedMessage.truncated,
        };
    } catch (captureError) {
        recordFailure('error', captureError);
        return {
            details: {
                message: '',
                type: 'Error',
                stack: '',
            },
            truncated: false,
        };
    }
};

const captureAppState = async (mode: FailureContextMode, recordFailure: (section: string, error: unknown) => void) => {
    try {
        const appState = await browser.electron.execute((electron: ElectronModule) => {
            const wins = electron.BrowserWindow.getAllWindows();
            const details = wins.map((win) => {
                const bounds = win.getBounds();
                const url = win.webContents?.getURL?.() ?? '';
                return {
                    title: win.getTitle(),
                    url,
                    bounds,
                    isVisible: win.isVisible(),
                    isFocused: win.isFocused(),
                    isMaximized: win.isMaximized(),
                    isMinimized: win.isMinimized(),
                    isFullScreen: win.isFullScreen(),
                };
            });

            const focused = electron.BrowserWindow.getFocusedWindow?.() ?? wins.find((win) => win.isFocused());

            return {
                windowCount: wins.length,
                windowDetails: details,
                focusedWindowTitle: focused ? focused.getTitle() : null,
            };
        });

        const allWindowHandles = await browser.getWindowHandles();
        const activeWindowHandle = await browser.getWindowHandle();

        const windowDetails = (appState?.windowDetails ?? []).map(
            (detail: FailureContext['appState']['windowDetails'][number]) => ({
                ...detail,
                url: redactUrl(detail.url),
            })
        );

        const compactWindowDetails = mode === 'compact' ? windowDetails.slice(0, 3) : windowDetails;
        const compactHandles = mode === 'compact' ? allWindowHandles.slice(0, 5) : allWindowHandles;

        return {
            windowCount: appState?.windowCount ?? 0,
            windowDetails: compactWindowDetails,
            focusedWindowTitle: appState?.focusedWindowTitle ?? null,
            activeWindowHandle: typeof activeWindowHandle === 'string' ? activeWindowHandle : null,
            allWindowHandles: compactHandles,
        };
    } catch (error) {
        recordFailure('appState', error);
        return {
            windowCount: 0,
            windowDetails: [],
            focusedWindowTitle: null,
            activeWindowHandle: null,
            allWindowHandles: [],
        };
    }
};

const captureRendererState = async (
    mode: FailureContextMode,
    recordFailure: (section: string, error: unknown) => void
) => {
    try {
        const rendererState = await browser.execute(
            (currentMode: FailureContextMode, maxBreadcrumbs: number) => {
                const isVisible = (element: Element | null) => {
                    if (!element || !(element instanceof HTMLElement)) {
                        return false;
                    }
                    const style = window.getComputedStyle(element);
                    return style.display !== 'none' && style.visibility !== 'hidden' && element.offsetParent !== null;
                };

                const collectText = (selector: string) =>
                    Array.from(document.querySelectorAll(selector))
                        .filter((element) => isVisible(element))
                        .map((element) => (element.textContent ?? '').trim())
                        .filter(Boolean);
                const visibleDialogs = collectText('[role="dialog"]');
                const dialogLabels =
                    currentMode === 'compact' ? visibleDialogs.slice(0, 3) : visibleDialogs.slice(0, maxBreadcrumbs);

                return {
                    url: window.location.href,
                    title: document.title,
                    readyState: document.readyState,
                    theme: document.documentElement.getAttribute('data-theme'),
                    visibleDialogs: {
                        count: visibleDialogs.length,
                        labels: dialogLabels,
                    },
                };
            },
            mode,
            MAX_BREADCRUMBS
        );

        return {
            ...rendererState,
            url: redactUrl(rendererState.url ?? ''),
        };
    } catch (error) {
        recordFailure('rendererState', error);
        return {
            url: '',
            title: '',
            readyState: '',
            theme: null,
            visibleDialogs: {
                count: 0,
                labels: [],
            },
        };
    }
};

const captureConsoleErrors = async (recordFailure: (section: string, error: unknown) => void) => {
    try {
        const errors = await browser.execute(() => {
            const entries = window.__consoleErrors ?? [];
            window.__consoleErrors = [];
            return entries;
        });

        const total = errors.length;
        const items = errors.slice(0, MAX_CONSOLE_ERRORS).map((entry: ConsoleErrorEntry) => ({
            channel: entry.channel,
            message: entry.message,
            stack: entry.stack,
            timestamp: entry.timestamp,
        }));

        return {
            items,
            total,
            truncated: total > MAX_CONSOLE_ERRORS,
        };
    } catch (error) {
        recordFailure('consoleErrors', error);
        return { items: [], total: 0, truncated: false };
    }
};

const captureBreadcrumbs = (recordFailure: (section: string, error: unknown) => void) => {
    try {
        const breadcrumbs = testLogger.getAll();
        const total = breadcrumbs.length;
        const items = breadcrumbs.slice(0, MAX_BREADCRUMBS);

        return { items, total };
    } catch (error) {
        recordFailure('breadcrumbs', error);
        return { items: [], total: 0 };
    }
};

const toRelativePath = (absolutePath: string) => {
    try {
        return path.relative(process.cwd(), absolutePath);
    } catch {
        return absolutePath;
    }
};

const getRetryAttempt = (retries: WdioRetries | undefined) => {
    if (typeof retries === 'number') {
        return retries;
    }
    if (isRecord(retries) && typeof retries.attempts === 'number') {
        return retries.attempts;
    }
    return 0;
};

const getFullTitle = (test: WdioTest) => {
    if (test.fullTitle) {
        return test.fullTitle;
    }
    if (test.fullName) {
        return test.fullName;
    }
    const parent = test.parent ?? 'unknown-spec';
    const title = test.title ?? 'unknown-test';
    return `${parent} > ${title}`;
};

const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return undefined;
};

const inferDisplayServer = (platform: string): FailureContext['environment']['display']['inferredServer'] => {
    if (platform !== 'linux') {
        return 'unknown';
    }

    const sessionType = (process.env.XDG_SESSION_TYPE ?? '').toLowerCase();
    if (sessionType === 'wayland' || process.env.WAYLAND_DISPLAY) {
        return 'wayland';
    }
    if (sessionType === 'x11') {
        return 'x11';
    }

    if (process.env.DISPLAY) {
        return 'x11';
    }

    return 'headless';
};

const redactUrl = (input: string) => {
    try {
        const url = new URL(input);
        const redactedKeys = new Set([
            'code',
            'token',
            'state',
            'session',
            'access_token',
            'id_token',
            'refresh_token',
        ]);
        for (const [key, value] of url.searchParams.entries()) {
            if (redactedKeys.has(key.toLowerCase())) {
                url.searchParams.set(key, value ? 'REDACTED' : '');
            }
        }
        url.hash = '';
        if (url.username || url.password) {
            url.username = '';
            url.password = '';
        }
        return url.toString();
    } catch {
        return input;
    }
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null;
};
