/**
 * Security utilities for the Electron main process.
 * 
 * @module SecurityManager
 */

import type { Session } from 'electron';
import { createLogger } from './logger';

const logger = createLogger('[SecurityManager]');

/**
 * Strip security headers that prevent iframe embedding.
 * This is the key to making custom HTML menus work over external content.
 * 
 * SECURITY: Only strips headers for Gemini domains to minimize attack surface.
 * 
 * @param session - The default session
 */
export function setupHeaderStripping(session: Session): void {
    // Only modify headers for Gemini-related domains
    const allowedUrls = [
        '*://gemini.google.com/*',
        '*://*.gemini.google.com/*',
        '*://aistudio.google.com/*',
        '*://*.google.com/gemini/*'
    ];

    session.webRequest.onHeadersReceived(
        { urls: allowedUrls },
        (details, callback) => {
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
        }
    );

    logger.log('Header stripping enabled for Gemini domains only');
}
