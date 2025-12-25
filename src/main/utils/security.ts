/**
 * Security utilities for the Electron main process.
 *
 * @module SecurityManager
 */

import type { Session, App } from 'electron';
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
    '*://*.google.com/gemini/*',
    '*://accounts.google.com/*',
    '*://ogs.google.com/*',
    // Allow localhost for integration testing
    '*://localhost:*/*',
    '*://127.0.0.1:*/*',
  ];

  session.webRequest.onHeadersReceived({ urls: allowedUrls }, (details, callback) => {
    const responseHeaders = { ...details.responseHeaders };

    // Remove X-Frame-Options header (case-insensitive)
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['X-Frame-Options'];

    // Remove frame-ancestors from CSP if present
    if (responseHeaders['content-security-policy']) {
      responseHeaders['content-security-policy'] = responseHeaders['content-security-policy'].map(
        (csp) => csp.replace(/frame-ancestors[^;]*(;|$)/gi, '')
      );
    }
    if (responseHeaders['Content-Security-Policy']) {
      responseHeaders['Content-Security-Policy'] = responseHeaders['Content-Security-Policy'].map(
        (csp) => csp.replace(/frame-ancestors[^;]*(;|$)/gi, '')
      );
    }

    callback({ responseHeaders });
  });

  logger.log('Header stripping enabled for Gemini domains only');
}

/**
 * Block the creation of secure webviews to prevent unauthorized content embedding
 * or potential security bypasses within the renderer.
 *
 * @param app - The Electron app instance
 */
export function setupWebviewSecurity(app: App): void {
  app.on('web-contents-created', (_, contents) => {
    contents.on('will-attach-webview', (event) => {
      event.preventDefault();
      logger.warn('Blocked webview creation attempt in renderer');
    });
  });
  logger.log('Webview creation blocking enabled');
}

/**
 * Setup media permission handler for microphone/camera access.
 * Allows media requests from trusted Gemini/Google domains.
 *
 * SECURITY: Only approves media permissions for Google domains.
 * All other permission requests are denied.
 *
 * @param session - The default session
 */
export function setupMediaPermissions(session: Session): void {
  session.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const url = details.requestingUrl || '';

    // Allow media requests from Gemini/Google domains
    if (permission === 'media') {
      if (url.includes('gemini.google.com') || url.includes('google.com')) {
        logger.log(`Granting media permission to: ${url}`);
        callback(true);
        return;
      }
    }

    // Deny all other permission requests
    logger.log(`Denying ${permission} permission request from: ${url}`);
    callback(false);
  });

  // macOS: Proactively request microphone access
  if (process.platform === 'darwin') {
    // Dynamic import to avoid bundling issues on non-macOS
    import('electron').then(({ systemPreferences }) => {
      if (systemPreferences.askForMediaAccess) {
        systemPreferences.askForMediaAccess('microphone').then((granted) => {
          logger.log(`macOS microphone access: ${granted ? 'granted' : 'denied'}`);
        });
      }
    });
  }

  logger.log('Media permission handler configured for Gemini domains');
}
