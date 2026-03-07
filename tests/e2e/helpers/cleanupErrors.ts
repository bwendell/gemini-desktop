const TRANSIENT_SESSION_ERROR_SUBSTRINGS = [
    'websocket is not connected',
    'cdp bridge is not available',
    'cdp bridge is not yet initialised',
    'timeout exceeded to get the contextid',
    'invalid session id',
    'session deleted as the browser has closed the connection',
    'not connected to devtools',
    'promise was collected',
    'failed to fetch browser websocket url',
    'unable to receive message from renderer',
];

export function isTransientSessionError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error && error.stack ? error.stack : '';
    const combined = `${message}\n${stack}`.toLowerCase();

    return TRANSIENT_SESSION_ERROR_SUBSTRINGS.some((snippet) => combined.includes(snippet));
}
