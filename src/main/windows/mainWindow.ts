/**
 * Main Window class for the primary application window.
 *
 * Handles:
 * - Main window creation with custom titlebar
 * - Close-to-tray behavior
 * - Navigation security (blocking external URLs)
 * - Window open handler (OAuth interception, external links)
 *
 * @module MainWindow
 */

import { BrowserWindow, session, shell, webFrameMain, type BrowserWindowConstructorOptions } from 'electron';
import BaseWindow from './baseWindow';
import {
    MAIN_WINDOW_CONFIG,
    getTitleBarStyle,
    isInternalDomain,
    isOAuthDomain,
    getDevUrl,
    READY_TO_SHOW_FALLBACK_MS,
    GEMINI_RESPONSE_API_PATTERN,
    IPC_CHANNELS,
    isGeminiDomain,
} from '../utils/constants';
import SettingsStore from '../store';
import { getIconPath, getDistHtmlPath } from '../utils/paths';
import type { PlatformAdapter } from '../platform/PlatformAdapter';
import { getPlatformAdapter } from '../platform/platformAdapterFactory';
import type { TabShortcutPayload } from '../../shared/types/tabs';

/**
 * Main application window.
 * Extends BaseWindow with main window specific behavior.
 */
export default class MainWindow extends BaseWindow {
    protected readonly windowConfig: BrowserWindowConstructorOptions;
    protected readonly htmlFile = 'index.html';

    /** Whether the app is quitting (vs closing to tray) */
    private isQuitting = false;

    /** Callback to create auth window for OAuth flows */
    private createAuthWindowCallback?: (url: string) => void;

    /** Callback to close options window when closing main window */
    private closeOptionsWindowCallback?: () => void;

    /** Callback to close auth window when closing main window */
    private closeAuthWindowCallback?: () => void;

    /** Debounce cooldown in milliseconds for response-complete events */
    private static readonly RESPONSE_DEBOUNCE_MS = 1000;

    /** Timestamp of the last response-complete event (for debouncing) */
    private lastResponseCompleteTime = 0;

    /** Stored webRequest listener for cleanup (Task 12.8) */
    private responseDetectionListener?: (details: Electron.OnCompletedListenerDetails) => void;

    /** Stored webRequest filter for cleanup */
    private responseDetectionFilter?: Electron.WebRequestFilter;

    /** Platform adapter for platform-specific window behavior */
    private readonly adapter: PlatformAdapter;

    /**
     * Creates a new MainWindow instance.
     * @param isDev - Whether running in development mode
     * @param adapter - Optional platform adapter (defaults to getPlatformAdapter())
     */
    constructor(isDev: boolean, adapter?: PlatformAdapter) {
        super(isDev, '[MainWindow]');
        this.adapter = adapter ?? getPlatformAdapter();

        const platformConfig = this.adapter.getMainWindowPlatformConfig();
        this.windowConfig = {
            ...MAIN_WINDOW_CONFIG,
            title: 'Gemini Desktop',
            ...(platformConfig.wmClass ? { wmClass: platformConfig.wmClass } : {}),
            titleBarStyle: getTitleBarStyle(),
            icon: getIconPath(),
        };
    }

    /**
     * Set callback for creating auth windows (OAuth flow).
     * @param callback - Function to create auth window with URL
     */
    setAuthWindowCallback(callback: (url: string) => void): void {
        this.createAuthWindowCallback = callback;
    }

    /**
     * Set callback for closing options window when main window closes.
     * @param callback - Function to close options window
     */
    setCloseOptionsCallback(callback: () => void): void {
        this.closeOptionsWindowCallback = callback;
    }

    /**
     * Set callback for closing auth window when main window closes.
     * @param callback - Function to close auth window
     */
    setCloseAuthCallback(callback: () => void): void {
        this.closeAuthWindowCallback = callback;
    }

    /**
     * Create the main window.
     * @param options - Optional creation options
     * @param options.startHidden - When true, skips initial show-on-ready behavior for hidden startup flows
     * @returns The created BrowserWindow
     */
    create(options?: { startHidden?: boolean }): BrowserWindow {
        this.logger.debug('MainWindow.create() called');
        const win = this.createWindow();
        this.logger.debug('createWindow() returned');

        if (this.isDev && this.window) {
            this.logger.debug('Opening dev tools');
            this.window.webContents.openDevTools();
        }

        if (!options?.startHidden) {
            this.window?.once('ready-to-show', () => {
                this.logger.debug('ready-to-show event fired, calling show()');
                this.window?.show();
            });

            setTimeout(() => {
                if (this.window && !this.window.isVisible()) {
                    this.logger.warn('ready-to-show timeout - showing window via fallback');
                    this.window.show();
                }
            }, READY_TO_SHOW_FALLBACK_MS);
        }

        this.setupWindowOpenHandler();
        this.setupNavigationHandler();
        this.setupCloseHandler();
        this.setupCrashHandlers();
        this.setupResponseDetection();
        this.setupTabShortcutForwarding();
        this.setupFrameLoadHandler();

        return win;
    }

    /**
     * Set up crash and error handlers for the main window.
     * These prevent OS crash dialogs and handle errors gracefully.
     */
    private setupCrashHandlers(): void {
        if (!this.window) return;

        // Handle renderer process crash
        this.window.webContents.on('render-process-gone', (_event, details) => {
            this.logger.error('Main window renderer process gone:', {
                reason: details.reason,
                exitCode: details.exitCode,
            });

            // If not killed intentionally, try to recover by reloading
            if (details.reason !== 'killed' && this.window && !this.window.isDestroyed()) {
                this.logger.log('Attempting to reload crashed main window renderer...');
                this.window.reload();
            }
        });

        // Handle page load failures (network errors, DNS failures, etc.)
        this.window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
            this.logger.error('Main window failed to load:', {
                errorCode,
                errorDescription,
                url: validatedURL,
            });
        });

        // Handle unresponsive renderer
        this.window.on('unresponsive', () => {
            this.logger.warn('Main window became unresponsive');
        });

        this.window.on('responsive', () => {
            this.logger.log('Main window became responsive again');
        });
    }

    /**
     * Override loadContent to use base dev URL for main window.
     * Main window loads from root, not /index.html.
     */
    protected override loadContent(): void {
        if (!this.window) return;

        if (this.isDev) {
            // Main window uses base URL in dev mode
            this.window.loadURL(getDevUrl());
        } else {
            this.window.loadFile(getDistHtmlPath(this.htmlFile));
        }
    }

    /**
     * Set up navigation handler to prevent navigation hijacking.
     * Blocks attempts to navigate the main window to external URLs.
     */
    private setupNavigationHandler(): void {
        if (!this.window) return;

        this.window.webContents.on('will-navigate', (event, url) => {
            try {
                const urlObj = new URL(url);
                const hostname = urlObj.hostname;
                const protocol = urlObj.protocol;

                // Allow navigation to local application files (needed for reload)
                if (protocol === 'file:') {
                    this.logger.log('Allowing navigation to local file:', url);
                    return;
                }

                // Allow navigation to localhost (needed for dev mode reload/retry)
                if (hostname === 'localhost' || hostname === '127.0.0.1') {
                    this.logger.log('Allowing navigation to localhost:', url);
                    return;
                }

                // Allow navigation to internal domains
                if (isInternalDomain(hostname)) {
                    this.logger.log('Allowing navigation to internal URL:', url);
                    return;
                }

                // Allow navigation to OAuth domains (for sign-in flows)
                if (isOAuthDomain(hostname)) {
                    this.logger.log('Allowing navigation to OAuth URL:', url);
                    return;
                }

                // Block navigation to external URLs
                this.logger.warn('Blocked navigation to external URL:', url);
                event.preventDefault();
            } catch {
                this.logger.error('Invalid navigation URL, blocking:', url);
                event.preventDefault();
            }
        });
    }

    /**
     * Set up handler for window.open() calls from the renderer.
     * Routes URLs to appropriate destinations (auth window, internal, or external).
     */
    private setupWindowOpenHandler(): void {
        if (!this.window) return;

        this.window.webContents.setWindowOpenHandler(({ url }) => {
            let hostname: string;
            try {
                const urlObj = new URL(url);
                hostname = urlObj.hostname;
            } catch (error) {
                this.logger.error('Invalid URL in window open handler:', { url, error });
                return { action: 'deny' };
            }

            try {
                // OAuth domains: open in dedicated auth window
                if (isOAuthDomain(hostname)) {
                    this.logger.log('Intercepting OAuth popup:', url);
                    if (this.createAuthWindowCallback) {
                        this.createAuthWindowCallback(url);
                    } else {
                        this.logger.error('Auth window callback not set');
                    }
                    return { action: 'deny' };
                }

                // Internal domains: allow in new Electron window
                if (isInternalDomain(hostname)) {
                    return { action: 'allow' };
                }
            } catch (error) {
                this.logger.error('Error handling window open:', error);
                return { action: 'deny' };
            }

            // External links: open in system browser
            if (url.startsWith('http:') || url.startsWith('https:')) {
                shell.openExternal(url);
            }
            return { action: 'deny' };
        });
    }

    /**
     * Set up close handler for close-to-tray behavior.
     */
    private setupCloseHandler(): void {
        if (!this.window) return;

        this.window.on('closed', () => {
            // Close auxiliary windows if they exist
            this.closeOptionsWindowCallback?.();
            this.closeAuthWindowCallback?.();

            // Task 12.8: Clean up webRequest listener to prevent memory leaks
            if (this.responseDetectionListener && this.responseDetectionFilter) {
                try {
                    // Properly clear the session listener by calling onCompleted with null
                    session.defaultSession.webRequest.onCompleted(this.responseDetectionFilter, null);
                    this.responseDetectionListener = undefined;
                    this.responseDetectionFilter = undefined;
                    this.logger.log('Response detection listener cleaned up');
                } catch (error) {
                    this.logger.error('Failed to clean up response detection:', error);
                }
            }

            this.window = null;
        });

        // Close to tray behavior
        this.window.on('close', (event) => {
            if (!this.isQuitting) {
                event.preventDefault();
                this.hideToTray();
            }
        });
    }

    /**
     * Hide the main window to tray.
     */
    hideToTray(): void {
        try {
            if (!this.window) {
                this.logger.warn('Cannot hide to tray: no main window');
                return;
            }

            // Close auxiliary windows when hiding main window
            this.closeOptionsWindowCallback?.();
            this.closeAuthWindowCallback?.();

            this.adapter.hideToTray(this.window);
            this.logger.log('Main window hidden to tray');
        } catch (error) {
            this.logger.error('Failed to hide window to tray:', error);
        }
    }

    /**
     * Restore the main window from tray.
     */
    restoreFromTray(): void {
        try {
            if (!this.window) {
                this.logger.warn('Cannot restore from tray: no main window');
                return;
            }

            this.adapter.restoreFromTray(this.window);
            this.logger.log('Main window restored from tray');
        } catch (error) {
            this.logger.error('Failed to restore window from tray:', error);
        }
    }

    /**
     * Set the quitting state.
     * @param state - Whether the app is quitting
     */
    setQuitting(state: boolean): void {
        this.isQuitting = state;
    }

    /**
     * Minimize the main window.
     */
    minimize(): void {
        if (this.window && !this.window.isDestroyed()) {
            this.window.minimize();
        }
    }

    /**
     * Set the always-on-top state for the main window.
     * @param enabled - Whether to enable always-on-top
     */
    setAlwaysOnTop(enabled: boolean): void {
        if (this.window && !this.window.isDestroyed()) {
            this.window.setAlwaysOnTop(enabled);
            this.emit('always-on-top-changed', enabled);
            this.logger.log(`Always on top ${enabled ? 'enabled' : 'disabled'}`);
        }
    }

    /**
     * Get the current always-on-top state.
     * @returns True if always-on-top is enabled
     */
    isAlwaysOnTop(): boolean {
        return this.window?.isAlwaysOnTop() ?? false;
    }

    /** Delay in milliseconds before enabling response detection after page load */
    private static readonly RESPONSE_DETECTION_STARTUP_DELAY_MS = 10000;

    /** Whether response detection is active (disabled during startup) */
    private responseDetectionActive = false;

    /**
     * Set up response detection to monitor when Gemini finishes generating a response.
     * Uses network request monitoring to detect streaming completion.
     * Emits 'response-complete' event with debouncing to prevent rapid-fire notifications.
     *
     * Note: Detection is delayed until after page load + startup delay to avoid
     * false positives from initial page load network requests.
     */
    private setupResponseDetection(): void {
        if (!this.window) return;

        // Wait for page to finish loading before enabling response detection
        // This prevents false positives from initial page load network requests
        this.window.webContents.once('did-finish-load', () => {
            this.logger.log(
                `Response detection will activate in ${MainWindow.RESPONSE_DETECTION_STARTUP_DELAY_MS / 1000}s`
            );

            setTimeout(() => {
                this.responseDetectionActive = true;
                this.logger.log('Response detection now active');
            }, MainWindow.RESPONSE_DETECTION_STARTUP_DELAY_MS);
        });

        // Monitor Gemini's streaming API endpoints for response completion
        // The BardChatUi endpoint handles chat streaming responses
        const geminiApiFilter = {
            urls: [GEMINI_RESPONSE_API_PATTERN],
        };
        // Store filter for cleanup (Task 12.8)
        this.responseDetectionFilter = geminiApiFilter;

        // Task 12.8: Store listener reference for potential cleanup
        // Task 12.9: Wrap registration in try/catch for robustness
        try {
            this.responseDetectionListener = (details: Electron.OnCompletedListenerDetails) => {
                // Skip if response detection is not yet active (during startup)
                if (!this.responseDetectionActive) {
                    return;
                }

                // Only process successful streaming response completions
                if (details.statusCode !== 200) {
                    return;
                }

                // Apply debouncing to prevent rapid notifications
                const now = Date.now();
                if (now - this.lastResponseCompleteTime < MainWindow.RESPONSE_DEBOUNCE_MS) {
                    // Only log in dev/CI mode to avoid main thread overhead in production
                    if (this.isDev || process.env.CI) {
                        this.logger.debug('Response-complete debounced');
                    }
                    return;
                }

                this.lastResponseCompleteTime = now;
                this.logger.debug('Response complete detected, emitting event');
                // Task 12.3: wrap emit in try/catch to prevent listener exceptions from crashing
                try {
                    this.emit('response-complete');
                } catch (error) {
                    this.logger.error('Error in response-complete listener:', error);
                }
            };

            session.defaultSession.webRequest.onCompleted(geminiApiFilter, this.responseDetectionListener);
        } catch (error) {
            this.logger.error('Failed to set up response detection:', error);
        }

        this.logger.log('Response detection initialized (will activate after page load + delay)');
    }

    private resolveTabShortcutPayload(input: Electron.Input): TabShortcutPayload | null {
        if (input.isAutoRepeat) {
            return null;
        }

        const modifierPressed = process.platform === 'darwin' ? input.meta : input.control;
        if (!modifierPressed) {
            return null;
        }

        const key = input.key;
        if (key === 't' || key === 'T') {
            return { command: 'new' };
        }

        if (key === 'w' || key === 'W') {
            if (process.platform === 'darwin') {
                return null;
            }
            return { command: 'close' };
        }

        if (key === 'Tab') {
            return { command: input.shift ? 'previous' : 'next' };
        }

        if (/^[1-9]$/.test(key)) {
            return { command: 'jump', index: Number(key) - 1 };
        }

        return null;
    }

    private setupTabShortcutForwarding(): void {
        if (!this.window) {
            return;
        }

        this.window.webContents.on('before-input-event', (event, input) => {
            const shortcutPayload = this.resolveTabShortcutPayload(input);
            if (!shortcutPayload) {
                return;
            }

            event.preventDefault();
            this.window?.webContents.send(IPC_CHANNELS.TABS_SHORTCUT_TRIGGERED, shortcutPayload);
        });
    }

    /**
     * Set up frame loading handler to inject Smart Enter and Scroll-to-Bottom scripts.
     */
    private setupFrameLoadHandler(): void {
        if (!this.window) return;

        // Pipe subframe console messages to Electron main process terminal
        this.window.webContents.on('console-message', (_event, _level, message, line, _sourceId) => {
            if (message.includes('[GeminiDesktop]') || message.includes('[GeminiEnter]')) {
                this.logger.log(`[Iframe Console] ${message} (line ${line})`);
            }
        });

        this.window.webContents.on('did-frame-finish-load', (_event, isMainFrame, frameProcessId, frameRoutingId) => {
            try {
                if (isMainFrame) return;

                const frame = webFrameMain.fromId(frameProcessId, frameRoutingId);
                if (!frame || frame.isDestroyed()) return;

                const url = frame.url;
                if (!url) return;

                if (isGeminiDomain(url)) {
                    this.logger.log(`Gemini frame loaded, checking script injection status for: ${url}`);
                    this.injectGeminiScripts(frame);
                }
            } catch (error) {
                this.logger.error('Error in did-frame-finish-load handler:', error);
            }
        });
    }

    /**
     * Inject custom client side scripts (Smart Enter / Scroll-to-Bottom button) into the Gemini subframe.
     * Checks user preferences from store before injecting.
     */
    private injectGeminiScripts(frame: Electron.WebFrameMain): void {
        try {
            const preferencesStore = new SettingsStore<Record<string, unknown>>({
                configName: 'user-preferences',
            });

            const smartEnterEnabled = preferencesStore.get('smartEnterEnabled') !== false;
            const scrollToBottomButtonEnabled = preferencesStore.get('scrollToBottomButtonEnabled') !== false;

            this.logger.log('Injecting scripts into Gemini frame. Preferences:', {
                smartEnterEnabled,
                scrollToBottomButtonEnabled,
            });

            const injectionScript = `
(function() {
    'use strict';
    
    // Prevent duplicate injections
    if (window.__geminiDesktopInjected) {
        console.log('[GeminiDesktop] Scripts already injected.');
        return;
    }
    window.__geminiDesktopInjected = true;

    const smartEnterEnabled = ${smartEnterEnabled};
    const scrollToBottomButtonEnabled = ${scrollToBottomButtonEnabled};

    console.log('[GeminiDesktop] Smart Enter enabled:', smartEnterEnabled);
    console.log('[GeminiDesktop] Scroll to Bottom button enabled:', scrollToBottomButtonEnabled);

    // ==========================================
    // Helper Functions (Shadow DOM Support)
    // ==========================================
    function querySelectorDeep(selector, root = document) {
        const el = root.querySelector(selector);
        if (el) return el;
        
        const queue = [root];
        while (queue.length > 0) {
            const node = queue.shift();
            if (!node) continue;
            
            const found = node.querySelector(selector);
            if (found) return found;
            
            if (node.children) {
                for (let i = 0; i < node.children.length; i++) {
                    queue.push(node.children[i]);
                }
            }
            if (node.shadowRoot) {
                queue.push(node.shadowRoot);
            }
        }
        return null;
    }

    function getActiveElementDeep(root = document) {
        let activeEl = root.activeElement;
        if (!activeEl) return null;
        while (activeEl.shadowRoot && activeEl.shadowRoot.activeElement) {
            activeEl = activeEl.shadowRoot.activeElement;
        }
        return activeEl;
    }

    function isElementEditable(el) {
        if (!el) return false;
        const tagName = el.tagName;
        if (tagName === 'TEXTAREA' || tagName === 'INPUT') return true;
        if (el.isContentEditable) return true;
        
        let current = el;
        while (current) {
            if (current.isContentEditable) return true;
            if (current.getAttribute && current.getAttribute('contenteditable')) return true;
            if (current.tagName === 'GEM-MEDIA-ATTACHMENT' || current.tagName === 'G-ATTACHMENT') {
                return true;
            }
            if (current.classList && (
                current.classList.contains('xap-uploader-dropzone') ||
                current.classList.contains('gem-media-attachment') ||
                current.classList.contains('uploader-preview') ||
                (typeof current.className === 'string' && (
                    current.className.indexOf('uploader') !== -1 ||
                    current.className.indexOf('attachment') !== -1
                ))
            )) {
                return true;
            }
            if (current.parentNode) {
                current = current.parentNode;
            } else if (current.host) {
                current = current.host;
            } else {
                break;
            }
        }
        return false;
    }

    function isInputEmpty(container = document) {
        const textarea = querySelectorDeep('.ql-editor', container) || 
                         querySelectorDeep('textarea', container) || 
                         querySelectorDeep('[contenteditable="true"][role="textbox"]', container) ||
                         querySelectorDeep('[contenteditable]', container);
        if (!textarea) return true;
        if (textarea.value !== undefined) {
            return textarea.value.trim() === '';
        }
        const text = textarea.textContent || '';
        const hasImg = textarea.querySelector && textarea.querySelector('img');
        return text.trim() === '' && !hasImg;
    }

    function findInputContainer(activeEl) {
        if (!activeEl) return document;
        
        let current = activeEl;
        while (current) {
            const hasSend = querySelectorDeep('button[aria-label="Send message"]', current) ||
                            querySelectorDeep('button.send-button', current) ||
                            querySelectorDeep('.send-button-container button', current) ||
                            querySelectorDeep('button[aria-label*="Send"]', current) ||
                            querySelectorDeep('button[aria-label*="send"]', current);
            if (hasSend) {
                return current;
            }
            
            if (current.parentNode) {
                current = current.parentNode;
            } else if (current.host) {
                current = current.host;
            } else {
                break;
            }
        }
        return activeEl.parentElement || document;
    }

    // ==========================================
    // 1. Smart Enter Feature
    // ==========================================
    if (smartEnterEnabled) {
        let enterQueued = false;

        function findSubmitButton(container = document) {
            const btn = querySelectorDeep('button[aria-label="Send message"]', container) ||
                        querySelectorDeep('button.send-button', container) ||
                        querySelectorDeep('.send-button-container button', container) ||
                        querySelectorDeep('button[aria-label*="Send"]', container) ||
                        querySelectorDeep('button[aria-label*="send"]', container);
            return btn;
        }

        function hasAttachment(container = document) {
            if (querySelectorDeep('gem-media-attachment', container)) return true;
            if (querySelectorDeep('g-attachment', container)) return true;
            if (querySelectorDeep('.gem-attachment-content', container)) return true;
            if (querySelectorDeep('img[class*="attachment"]', container)) return true;
            if (querySelectorDeep('[class*="attachment-style"]', container)) return true;
            if (querySelectorDeep('.uploader-preview', container)) return true;
            if (querySelectorDeep('[class*="input-area"] img', container) || querySelectorDeep('[class*="prompt"] img', container)) return true;
            if (querySelectorDeep('.ql-editor img', container)) return true;
            return false;
        }

        function isUploading(container = document) {
            // Check for progress/spinner elements
            if (querySelectorDeep('.mdc-circular-progress--indeterminate', container)) return true;
            if (querySelectorDeep('mat-progress-spinner', container)) return true;
            if (querySelectorDeep('mat-spinner', container)) return true;
            if (querySelectorDeep('[role="progressbar"]', container)) return true;
            if (querySelectorDeep('.loading-spinner', container)) return true;
            if (querySelectorDeep('progress', container)) return true;
            if (querySelectorDeep('.xap-uploader-dropzone', container)?.querySelector('.mdc-circular-progress--indeterminate')) return true;
            
            // Check for un-loaded images
            const img = querySelectorDeep('img', container);
            if (img && img.naturalWidth === 0) return true;
            
            // Check loading classes
            if (querySelectorDeep('.loading', container)) return true;
            if (querySelectorDeep('[class*="loading"]', container)) return true;
            
            // If button is disabled and there is an attachment/text, it is likely uploading
            const btn = findSubmitButton(container);
            if (btn && (btn.disabled || btn.getAttribute('aria-disabled') === 'true')) {
                return true;
            }
            
            return false;
        }

        function retrySubmit(container) {
            let attempts = 0;
            const retry = setInterval(() => {
                attempts++;
                if (!enterQueued) { clearInterval(retry); return; }
                const btn = findSubmitButton(container);
                if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') {
                    btn.click();
                    enterQueued = false;
                    clearInterval(retry);
                    console.log('[GeminiDesktop] Submitted queued message.');
                    return;
                }
                if (attempts > 30) {
                    enterQueued = false;
                    clearInterval(retry);
                    console.warn('[GeminiDesktop] Button stayed disabled after 30 attempts.');
                }
            }, 150);
        }

        function pollForUploadDone(container) {
            let elapsed = 0;
            const poll = setInterval(() => {
                elapsed += 100;
                if (!enterQueued) { clearInterval(poll); return; }
                if (!isUploading(container)) {
                    clearInterval(poll);
                    console.log('[GeminiDesktop] Upload complete, triggering submission.');
                    retrySubmit(container);
                    return;
                }
                if (elapsed > 30000) { // 30s timeout
                    enterQueued = false;
                    clearInterval(poll);
                    console.warn('[GeminiDesktop] Upload timed out.');
                }
            }, 100);
        }

        document.addEventListener('keydown', function(e) {
            if (e.key !== 'Enter') return;

            const active = getActiveElementDeep();
            const target = e.target;
            
            const excludeTags = ['BUTTON', 'A', 'SELECT', 'OPTION'];
            const excludeRoles = ['button', 'link', 'menuitem', 'tab', 'checkbox', 'radio', 'switch'];
            const isExcluded = (el) => {
                if (!el) return false;
                if (excludeTags.includes(el.tagName)) return true;
                if (el.getAttribute) {
                    const role = el.getAttribute('role');
                    if (role && excludeRoles.includes(role)) return true;
                }
                
                // Cross Shadow DOM boundary when checking closest role="dialog"
                let current = el;
                while (current) {
                    if (current.getAttribute && current.getAttribute('role') === 'dialog') {
                        return true;
                    }
                    if (current.parentNode) {
                        current = current.parentNode;
                    } else if (current.host) {
                        current = current.host;
                    } else {
                        break;
                    }
                }
                return false;
            };

            const ignored = isExcluded(active) || isExcluded(target);

            console.log('[GeminiDesktop] Enter KeyDown event. ' + 
                        'Target: ' + (target ? target.tagName : 'null') + 
                        ' (class="' + (target ? target.className : '') + '"' +
                        ' contenteditable="' + (target ? target.getAttribute('contenteditable') : '') + '"' +
                        ' isContentEditable=' + (target ? target.isContentEditable : 'false') + '), ' +
                        'Active: ' + (active ? active.tagName : 'null') + 
                        ' (class="' + (active ? active.className : '') + '"' +
                        ' contenteditable="' + (active ? active.getAttribute('contenteditable') : '') + '"' +
                        ' isContentEditable=' + (active ? active.isContentEditable : 'false') + '), ' +
                        'ignored: ' + ignored);

            if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) {
                console.log('[GeminiDesktop] Modifier key pressed, ignoring.');
                return;
            }

            if (ignored) return;

            // If active element is a different editable input/textarea, ignore
            const isPromptEditor = (el) => {
                if (!el) return false;
                if (el.classList && el.classList.contains('ql-editor')) return true;
                if (el.closest && el.closest('.ql-editor')) return true;
                return false;
            };

            const isEditable = (el) => {
                if (!el) return false;
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return true;
                if (el.isContentEditable) return true;
                return false;
            };

            if (active && isEditable(active) && !isPromptEditor(active)) {
                console.log('[GeminiDesktop] Enter pressed in another input element, ignoring.');
                return;
            }

            // Always try to find the actual prompt editor to locate the scoped input container
            const editor = querySelectorDeep('.ql-editor') || 
                           querySelectorDeep('textarea') || 
                           querySelectorDeep('[contenteditable="true"][role="textbox"]');
            const container = (editor ? findInputContainer(editor) : null) || 
                              findInputContainer(target) || 
                              findInputContainer(active);
            const empty = isInputEmpty(container);
            const attached = hasAttachment(container);
            const uploading = isUploading(container);

            console.log('[GeminiDesktop] Queue checks:', {
                empty,
                attached,
                uploading,
                containerTagName: container ? container.tagName : 'null'
            });

            if ((!empty || attached) && uploading) {
                console.log('[GeminiDesktop] Submission intercepted & queued.');
                e.preventDefault();
                e.stopPropagation();
                if (!enterQueued) {
                    enterQueued = true;
                    pollForUploadDone(container);
                }
            } else {
                console.log('[GeminiDesktop] Not queued. (Not uploading or input completely empty with no attachments)');
            }
        }, true);
    }

    // ==========================================
    // 2. Scroll to Bottom Button Feature
    // ==========================================
    if (scrollToBottomButtonEnabled) {
        function addScrollButton() {
            if (document.getElementById('gem-scroll-btn')) return;
            const btn = document.createElement('button');
            btn.id = 'gem-scroll-btn';
            btn.textContent = '▼';
            btn.title = 'Scroll to bottom';
            Object.assign(btn.style, {
                position: 'fixed', bottom: '90px', right: '20px', zIndex: '999999',
                width: '40px', height: '40px', borderRadius: '50%',
                background: '#1a73e8', color: '#fff', border: 'none',
                fontSize: '18px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: '1', transition: 'opacity 0.2s'
            });
            
            btn.addEventListener('click', () => {
                const containers = document.querySelectorAll('*');
                for (const el of containers) {
                    if (el.scrollHeight > el.clientHeight + 10) {
                        el.scrollTop = el.scrollHeight;
                    }
                }
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            });
            document.body.appendChild(btn);
            console.log('[GeminiDesktop] Scroll button added.');
        }

        const observer = new MutationObserver(() => {
            if (document.body && !document.getElementById('gem-scroll-btn')) {
                addScrollButton();
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
        addScrollButton();
    }
})();
            `;

            frame.executeJavaScript(injectionScript).catch((error) => {
                this.logger.error('Failed to execute injection script in Gemini frame:', error);
            });
        } catch (error) {
            this.logger.error('Error during Gemini script injection:', error);
        }
    }
}
