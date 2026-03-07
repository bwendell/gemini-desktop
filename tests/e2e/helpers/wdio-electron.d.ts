/**
 * Type declarations for WebdriverIO and Electron service.
 *
 * The `wdio-electron-service` and WebdriverIO extend the Browser interface at runtime
 * with additional methods. This file provides type declarations so TypeScript can
 * understand these extensions.
 *
 * Note: These runtime-injected methods work correctly in test execution.
 * The TypeScript errors are IDE-only and don't affect test runs.
 */

/**
 * WebdriverIO Cookie interface.
 */
export interface WdioCookie {
    name: string;
    value: string;
    domain?: string;
    path?: string;
    secure?: boolean;
    httpOnly?: boolean;
    expiry?: number;
    sameSite?: 'Lax' | 'Strict' | 'None';
}

export type WdioElement = WebdriverIO.Element & {
    waitForDisplayed(options?: { timeout?: number; reverse?: boolean; timeoutMsg?: string }): Promise<boolean>;
    waitForExist(options?: { timeout?: number; reverse?: boolean; timeoutMsg?: string }): Promise<boolean>;
    waitForClickable(options?: { timeout?: number; reverse?: boolean; timeoutMsg?: string }): Promise<boolean>;
    waitForEnabled(options?: { timeout?: number; reverse?: boolean; timeoutMsg?: string }): Promise<boolean>;
    click(): Promise<void>;
    setValue(value: string): Promise<void>;
    clearValue(): Promise<void>;
    getText(): Promise<string>;
    getValue(): Promise<string>;
    getAttribute(attribute: string): Promise<string | null>;
    isDisplayed(): Promise<boolean>;
    isExisting(): Promise<boolean>;
    isEnabled(): Promise<boolean>;
    isClickable(): Promise<boolean>;
    isSelected(): Promise<boolean>;
    getTagName(): Promise<string>;
    $(selector: string): Promise<WdioElement>;
    $$(selector: string): Promise<WdioElement[]>;
    getCSSProperty(propertyName: string): Promise<{ property: string; value: string } | { value: string }>;
    moveTo(): Promise<void>;
    parentElement(): Promise<WdioElement>;
    getLocation(): Promise<{ x: number; y: number }>;
    getSize(): Promise<{ width: number; height: number }>;
};

declare namespace WebdriverIO {
    interface Element {
        getCSSProperty(propertyName: string): Promise<{ property: string; value: string } | { value: string }>;
        moveTo(): Promise<void>;
        parentElement(): Promise<Element>;
    }
}

declare global {
    const describe: (title: string, fn: () => void) => void;
    const it: (title: string, fn?: () => void | Promise<void>) => void;
    const before: (fn: () => void | Promise<void>) => void;
    const beforeEach: (fn: () => void | Promise<void>) => void;
    const after: (fn: () => void | Promise<void>) => void;
    const afterEach: (fn: () => void | Promise<void>) => void;
}

declare global {
    namespace WebdriverIO {
        interface Browser {
            electron: {
                execute<R, T extends unknown[]>(
                    fn: (electron: typeof import('electron'), ...args: T) => R,
                    ...args: T
                ): Promise<R>;
            };
            pause(ms: number): Promise<void>;
            waitUntil<T>(
                condition: () => Promise<T> | T,
                options?: {
                    timeout?: number;
                    timeoutMsg?: string;
                    interval?: number;
                }
            ): Promise<T>;
            getWindowHandles(): Promise<string[]>;
            getWindowHandle(): Promise<string>;
            sessionId?: string;
            switchToWindow(handle: string): Promise<void>;
            getUrl(): Promise<string>;
            execute<T>(script: string | ((...args: any[]) => T), ...args: any[]): Promise<T>;
            getTitle(): Promise<string>;
            closeWindow(): Promise<void>;
            url(path: string): Promise<void>;
            keys(keys: string | string[]): Promise<void>;
            $(selector: string): Promise<WdioElement>;
            setCookies(cookies: WdioCookie[]): Promise<void>;
            getCookies(names?: string[]): Promise<WdioCookie[]>;
            reloadSession(): Promise<void>;
            saveScreenshot(filepath: string): Promise<string>;
        }
    }
}

declare module '@wdio/globals' {
    type WdioElement = import('./wdio-electron').WdioElement;

    interface Browser {
        /**
         * Extended methods provided by wdio-electron-service.
         */
        electron: {
            /**
             * Execute a function in the Electron main process.
             * @param fn Function to execute with access to Electron APIs
             * @param args Arguments to pass to the function
             */
            execute<R, T extends unknown[]>(
                fn: (electron: typeof import('electron'), ...args: T) => R,
                ...args: T
            ): Promise<R>;
        };

        /**
         * Pause execution for specified milliseconds.
         */
        pause(ms: number): Promise<void>;

        /**
         * Wait until condition is true.
         */
        waitUntil<T>(
            condition: () => Promise<T> | T,
            options?: {
                timeout?: number;
                timeoutMsg?: string;
                interval?: number;
            }
        ): Promise<T>;

        /**
         * Get window handles.
         */
        getWindowHandles(): Promise<string[]>;

        /**
         * Switch to a specific window.
         */
        switchToWindow(handle: string): Promise<void>;

        /**
         * Get the current URL.
         */
        getUrl(): Promise<string>;

        /**
         * Execute script in browser context.
         */
        execute<T>(script: string | ((...args: any[]) => T), ...args: any[]): Promise<T>;

        /**
         * Get window title.
         */
        getTitle(): Promise<string>;

        /**
         * Close current window.
         */
        closeWindow(): Promise<void>;

        /**
         * Navigate to URL.
         */
        url(path: string): Promise<void>;

        /**
         * Send keyboard keys.
         */
        keys(keys: string | string[]): Promise<void>;

        /**
         * Select single element.
         */
        $(selector: string): Promise<WdioElement>;

        /**
         * Set cookies.
         */
        setCookies(cookies: WdioCookie[]): Promise<void>;

        /**
         * Get cookies by name.
         */
        getCookies(names?: string[]): Promise<WdioCookie[]>;
    }

    interface BrowserRunner {
        /**
         * Extended methods provided by wdio-electron-service.
         */
        electron: {
            /**
             * Execute a function in the Electron main process.
             * @param fn Function to execute with access to Electron APIs
             * @param args Arguments to pass to the function
             */
            execute<R, T extends unknown[]>(
                fn: (electron: typeof import('electron'), ...args: T) => R,
                ...args: T
            ): Promise<R>;
        };

        /**
         * Pause execution for specified milliseconds.
         */
        pause(ms: number): Promise<void>;

        /**
         * Wait until condition is true.
         */
        waitUntil<T>(
            condition: () => Promise<T> | T,
            options?: {
                timeout?: number;
                timeoutMsg?: string;
                interval?: number;
            }
        ): Promise<T>;

        /**
         * Get window handles.
         */
        getWindowHandles(): Promise<string[]>;

        /**
         * Switch to a specific window.
         */
        switchToWindow(handle: string): Promise<void>;

        /**
         * Get the current URL.
         */
        getUrl(): Promise<string>;

        /**
         * Execute script in browser context.
         */
        execute<T>(script: string | ((...args: any[]) => T), ...args: any[]): Promise<T>;

        /**
         * Get window title.
         */
        getTitle(): Promise<string>;

        /**
         * Close current window.
         */
        closeWindow(): Promise<void>;

        /**
         * Navigate to URL.
         */
        url(path: string): Promise<void>;

        /**
         * Send keyboard keys.
         */
        keys(keys: string | string[]): Promise<void>;

        /**
         * Select single element.
         */
        $(selector: string): Promise<WdioElement>;

        /**
         * Set cookies.
         */
        setCookies(cookies: WdioCookie[]): Promise<void>;

        /**
         * Get cookies by name.
         */
        getCookies(names?: string[]): Promise<WdioCookie[]>;
    }
}

declare namespace WebdriverIO {
    interface Element {
        waitForDisplayed(options?: { timeout?: number; reverse?: boolean; timeoutMsg?: string }): Promise<boolean>;
        waitForExist(options?: { timeout?: number; reverse?: boolean; timeoutMsg?: string }): Promise<boolean>;
        click(): Promise<void>;
        setValue(value: string): Promise<void>;
        clearValue(): Promise<void>;
        getText(): Promise<string>;
        getValue(): Promise<string>;
        getAttribute(attribute: string): Promise<string | null>;
        isDisplayed(): Promise<boolean>;
        isExisting(): Promise<boolean>;
        isEnabled(): Promise<boolean>;
        $$(selector: string): Promise<WebdriverIO.Element[]>;
        $(selector: string): Promise<WebdriverIO.Element>;
        getCSSProperty(propertyName: string): Promise<{ property: string; value: string } | { value: string }>;
        moveTo(): Promise<void>;
        parentElement(): Promise<WebdriverIO.Element>;
        getLocation(): Promise<{ x: number; y: number }>;
        getSize(): Promise<{ width: number; height: number }>;
    }
}
