/**
 * Security utilities for the Electron main process.
 */

/**
 * Strip security headers that prevent iframe embedding.
 * This is the key to making custom HTML menus work over external content.
 * 
 * @param {Electron.Session} session - The default session
 */
function setupHeaderStripping(session) {
    session.webRequest.onHeadersReceived((details, callback) => {
        const responseHeaders = { ...details.responseHeaders };

        // Remove X-Frame-Options header (case-insensitive)
        delete responseHeaders['x-frame-options'];
        delete responseHeaders['X-Frame-Options'];

        // Remove frame-ancestors from CSP if present
        if (responseHeaders['content-security-policy']) {
            responseHeaders['content-security-policy'] = responseHeaders['content-security-policy']
                .map(csp => csp.replace(/frame-ancestors[^;]*(;|$)/gi, ''));
        }
        if (responseHeaders['Content-Security-Policy']) {
            responseHeaders['Content-Security-Policy'] = responseHeaders['Content-Security-Policy']
                .map(csp => csp.replace(/frame-ancestors[^;]*(;|$)/gi, ''));
        }

        callback({ responseHeaders });
    });
}

module.exports = {
    setupHeaderStripping
};
