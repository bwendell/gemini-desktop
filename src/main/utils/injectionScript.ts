/**
 * Injection Script Builder for Quick Chat.
 * 
 * Provides a modular, configurable system for building JavaScript injection
 * scripts that run inside the Gemini iframe. Features include:
 * - Builder pattern for flexible configuration
 * - Structured logging with configurable levels
 * - Defensive programming with safe DOM operations
 * - Proper text escaping for injection safety
 * 
 * @module InjectionScript
 */

import {
    GEMINI_EDITOR_SELECTORS,
    GEMINI_SUBMIT_BUTTON_SELECTORS,
    GEMINI_EDITOR_BLANK_CLASS,
    GEMINI_SUBMIT_DELAY_MS
} from './constants';

// =============================================================================
// Types
// =============================================================================

/**
 * Log level for the injected script's console output.
 */
export type InjectionLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

/**
 * Configuration for the injection script.
 */
export interface InjectionConfig {
    /** CSS selectors to find the editor element (tried in order) */
    editorSelectors: readonly string[];
    /** CSS selectors to find the submit button (tried in order) */
    submitButtonSelectors: readonly string[];
    /** CSS class that indicates the editor is empty/blank */
    editorBlankClass: string;
    /** Delay in ms before clicking submit button */
    submitDelayMs: number;
    /** Minimum log level to output */
    logLevel: InjectionLogLevel;
}

/**
 * Result returned by the injection script.
 */
export interface InjectionResult {
    success: boolean;
    error?: string;
    details?: {
        editorFound: boolean;
        textInjected: boolean;
        submitScheduled: boolean;
    };
}

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Default injection configuration using constants.
 */
export const DEFAULT_INJECTION_CONFIG: InjectionConfig = {
    editorSelectors: GEMINI_EDITOR_SELECTORS,
    submitButtonSelectors: GEMINI_SUBMIT_BUTTON_SELECTORS,
    editorBlankClass: GEMINI_EDITOR_BLANK_CLASS,
    submitDelayMs: GEMINI_SUBMIT_DELAY_MS,
    logLevel: 'info',
} as const;

// =============================================================================
// Text Escaping Utility
// =============================================================================

/**
 * Escape text for safe inclusion in JavaScript string literals.
 * Handles backslashes, quotes, and newlines to prevent injection issues.
 * 
 * @param text - Raw text to escape
 * @returns Escaped text safe for JS string interpolation
 */
export function escapeForInjection(text: string): string {
    return text
        .replace(/\\/g, '\\\\')   // Escape backslashes first
        .replace(/'/g, "\\'")     // Escape single quotes
        .replace(/"/g, '\\"')     // Escape double quotes
        .replace(/\n/g, '\\n')    // Escape newlines
        .replace(/\r/g, '\\r')    // Escape carriage returns
        .replace(/\t/g, '\\t')    // Escape tabs
        .replace(/\0/g, '\\0');   // Escape null bytes
}

// =============================================================================
// Log Level Utilities
// =============================================================================

/**
 * Get numeric priority for log level comparison.
 */
function getLogLevelPriority(level: InjectionLogLevel): number {
    const priorities: Record<InjectionLogLevel, number> = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3,
        none: 4,
    };
    return priorities[level];
}

// =============================================================================
// Injection Script Builder
// =============================================================================

/**
 * Builder class for constructing injection scripts.
 * 
 * Uses the builder pattern to allow flexible configuration of the
 * injection script before generating the final JavaScript code.
 * 
 * @example
 * ```typescript
 * const script = new InjectionScriptBuilder()
 *     .withText('Hello, Gemini!')
 *     .withLogLevel('debug')
 *     .build();
 * ```
 */
export class InjectionScriptBuilder {
    private text: string = '';
    private config: InjectionConfig = DEFAULT_INJECTION_CONFIG;
    private autoSubmit: boolean = true;

    /**
     * Set the text to inject into the editor.
     * 
     * @param text - The text to inject (will be escaped automatically)
     * @returns this (for chaining)
     */
    withText(text: string): this {
        this.text = text;
        return this;
    }

    /**
     * Set the injection configuration.
     * Merges with default config, so partial configs are supported.
     * 
     * @param config - Partial or full injection configuration
     * @returns this (for chaining)
     */
    withConfig(config: Partial<InjectionConfig>): this {
        this.config = { ...DEFAULT_INJECTION_CONFIG, ...config };
        return this;
    }

    /**
     * Set the log level for the injected script.
     * 
     * @param level - Minimum log level to output
     * @returns this (for chaining)
     */
    withLogLevel(level: InjectionLogLevel): this {
        this.config = { ...this.config, logLevel: level };
        return this;
    }

    /**
     * Set whether to automatically submit after injection.
     * 
     * @param autoSubmit - If true, clicks submit button after injection
     * @returns this (for chaining)
     */
    withAutoSubmit(autoSubmit: boolean): this {
        this.autoSubmit = autoSubmit;
        return this;
    }

    /**
     * Set custom editor selectors.
     * 
     * @param selectors - Array of CSS selectors to try (in order)
     * @returns this (for chaining)
     */
    withEditorSelectors(selectors: readonly string[]): this {
        this.config = { ...this.config, editorSelectors: selectors };
        return this;
    }

    /**
     * Set custom submit button selectors.
     * 
     * @param selectors - Array of CSS selectors to try (in order)
     * @returns this (for chaining)
     */
    withSubmitButtonSelectors(selectors: readonly string[]): this {
        this.config = { ...this.config, submitButtonSelectors: selectors };
        return this;
    }

    /**
     * Set the submit delay.
     * 
     * @param delayMs - Delay in milliseconds before clicking submit
     * @returns this (for chaining)
     */
    withSubmitDelay(delayMs: number): this {
        this.config = { ...this.config, submitDelayMs: delayMs };
        return this;
    }

    /**
     * Build the injection script.
     * 
     * @returns JavaScript code string ready for execution in an iframe
     */
    build(): string {
        const escapedText = escapeForInjection(this.text);
        const editorSelectorsJson = JSON.stringify(this.config.editorSelectors);
        const buttonSelectorsJson = JSON.stringify(this.config.submitButtonSelectors);
        const blankClass = this.config.editorBlankClass;
        const submitDelay = this.config.submitDelayMs;
        const logLevelPriority = getLogLevelPriority(this.config.logLevel);
        const autoSubmit = this.autoSubmit;

        return `
(function() {
    'use strict';

    // =========================================================================
    // Logging Utilities
    // =========================================================================
    
    const LOG_PREFIX = '[QuickChat]';
    const LOG_LEVEL_PRIORITY = ${logLevelPriority};
    
    const LogLevel = { debug: 0, info: 1, warn: 2, error: 3 };
    
    /**
     * Log a message if the level meets the minimum threshold.
     */
    function log(level, message, ...args) {
        if (LogLevel[level] >= LOG_LEVEL_PRIORITY) {
            const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
            const prefix = LOG_PREFIX + ' [' + level.toUpperCase() + ']';
            console[method](prefix, message, ...args);
        }
    }
    
    const logger = {
        debug: (msg, ...args) => log('debug', msg, ...args),
        info: (msg, ...args) => log('info', msg, ...args),
        warn: (msg, ...args) => log('warn', msg, ...args),
        error: (msg, ...args) => log('error', msg, ...args),
    };

    // =========================================================================
    // Defensive Utilities
    // =========================================================================
    
    /**
     * Safely query for an element using multiple selectors.
     * Returns the first match found.
     */
    function safeQuerySelector(selectors) {
        if (!Array.isArray(selectors) || selectors.length === 0) {
            logger.error('safeQuerySelector: Invalid selectors array');
            return null;
        }
        
        for (const selector of selectors) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    logger.debug('Found element with selector:', selector);
                    return element;
                }
            } catch (e) {
                logger.warn('Selector query failed:', selector, e.message);
            }
        }
        
        logger.debug('No element found for selectors:', selectors);
        return null;
    }
    
    /**
     * Safely dispatch an event on an element.
     */
    function safeDispatchEvent(element, event) {
        if (!element) {
            logger.warn('safeDispatchEvent: No element provided');
            return false;
        }
        
        try {
            element.dispatchEvent(event);
            return true;
        } catch (e) {
            logger.warn('Failed to dispatch event:', event.type, e.message);
            return false;
        }
    }
    
    /**
     * Safely focus an element.
     */
    function safeFocus(element) {
        if (!element) {
            logger.warn('safeFocus: No element provided');
            return false;
        }
        
        try {
            element.focus();
            return true;
        } catch (e) {
            logger.warn('Failed to focus element:', e.message);
            return false;
        }
    }
    
    /**
     * Safely click an element.
     */
    function safeClick(element) {
        if (!element) {
            logger.warn('safeClick: No element provided');
            return false;
        }
        
        try {
            element.click();
            return true;
        } catch (e) {
            logger.warn('Failed to click element:', e.message);
            return false;
        }
    }

    // =========================================================================
    // Text Injection Logic
    // =========================================================================
    
    /**
     * Insert text into a contenteditable element using Selection API.
     * This method is Trusted Types compliant.
     */
    function insertTextWithSelectionAPI(editor, text) {
        logger.debug('Inserting text using Selection API');
        
        try {
            // Clear using textContent (Trusted Types safe)
            editor.textContent = '';
            
            // Create text node and insert using Selection API
            const textNode = document.createTextNode(text);
            const selection = window.getSelection();
            
            if (!selection) {
                logger.error('window.getSelection() returned null');
                return false;
            }
            
            const range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
            range.insertNode(textNode);
            
            // Move cursor to end
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
            
            logger.debug('Text inserted successfully');
            return true;
        } catch (e) {
            logger.error('Failed to insert text:', e.message);
            return false;
        }
    }
    
    /**
     * Notify the editor framework (Angular/Quill) of text changes.
     */
    function notifyEditorOfChanges(editor, text) {
        logger.debug('Dispatching editor change events');
        
        // InputEvent for modern frameworks
        safeDispatchEvent(editor, new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: text
        }));
        
        // Quill-specific event
        safeDispatchEvent(editor, new Event('text-change', { bubbles: true }));
        
        // Generic input event fallback
        safeDispatchEvent(editor, new Event('input', { bubbles: true }));
    }

    // =========================================================================
    // Main Injection Logic
    // =========================================================================
    
    const result = {
        success: false,
        error: null,
        details: {
            editorFound: false,
            textInjected: false,
            submitScheduled: false
        }
    };
    
    try {
        logger.info('Starting text injection');
        
        // Configuration
        const editorSelectors = ${editorSelectorsJson};
        const buttonSelectors = ${buttonSelectorsJson};
        const blankClass = '${blankClass}';
        const textToInject = '${escapedText}';
        const shouldAutoSubmit = ${autoSubmit};
        
        logger.debug('Config:', { 
            editorSelectors, 
            buttonSelectors, 
            blankClass,
            textLength: textToInject.length,
            autoSubmit: shouldAutoSubmit
        });
        
        // Step 1: Find the editor
        const editor = safeQuerySelector(editorSelectors);
        if (!editor) {
            result.error = 'editor_not_found';
            logger.error('Editor element not found. Tried selectors:', editorSelectors);
            return result;
        }
        result.details.editorFound = true;
        logger.info('Editor found');
        
        // Step 2: Focus the editor
        if (!safeFocus(editor)) {
            logger.warn('Could not focus editor, continuing anyway');
        }
        
        // Step 3: Insert text
        if (!insertTextWithSelectionAPI(editor, textToInject)) {
            result.error = 'text_insertion_failed';
            logger.error('Failed to insert text into editor');
            return result;
        }
        result.details.textInjected = true;
        logger.info('Text injected successfully');
        
        // Step 4: Update editor state
        try {
            editor.classList.remove(blankClass);
            logger.debug('Removed blank class from editor');
        } catch (e) {
            logger.warn('Could not remove blank class:', e.message);
        }
        
        // Step 5: Notify editor of changes
        notifyEditorOfChanges(editor, textToInject);
        
        // Step 6: Schedule submit button click (if auto-submit enabled)
        if (shouldAutoSubmit) {
            logger.debug('Scheduling submit button click in ${submitDelay}ms');
            
            setTimeout(() => {
                logger.debug('Looking for submit button');
                
                const submitButton = safeQuerySelector(buttonSelectors);
                
                if (!submitButton) {
                    logger.error('Submit button not found. Tried selectors:', buttonSelectors);
                    return;
                }
                
                if (submitButton.disabled) {
                    logger.warn('Submit button is disabled');
                    return;
                }
                
                if (safeClick(submitButton)) {
                    logger.info('Submit button clicked');
                } else {
                    logger.error('Failed to click submit button');
                }
            }, ${submitDelay});
            
            result.details.submitScheduled = true;
        } else {
            logger.info('Auto-submit disabled, skipping submit button click');
        }
        
        result.success = true;
        logger.info('Injection completed successfully');
        
    } catch (e) {
        result.error = e.message || 'unknown_error';
        logger.error('Injection failed with error:', e);
    }
    
    return result;
})();
        `.trim();
    }
}
