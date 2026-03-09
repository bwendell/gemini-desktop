/**
 * WDIO Browser/Element type augmentations for tests/shared context.
 *
 * The @wdio/globals package declares empty WebdriverIO.Browser and
 * WebdriverIO.Element interfaces. The actual browser command methods
 * (pause, $, execute, getWindowHandles, etc.) are added by webdriverio's
 * own module augmentation, but only when webdriverio is in the TypeScript
 * type resolution path.
 *
 * In the shared module context, we declare the specific subset of methods
 * used by wait-utilities.ts here, mirroring the e2e helper's wdio-electron.d.ts
 * pattern but without any e2e-specific imports.
 *
 * Source reference: tests/e2e/helpers/wdio-electron.d.ts
 */

declare namespace WebdriverIO {
    interface Browser {
        /** Pause execution for specified milliseconds. */
        pause(ms: number): Promise<void>;
        /** Select a single element. */
        $(selector: string): Promise<WebdriverIO.Element>;
        /** Execute a script in the browser context. */
        execute<T>(script: string | ((...args: any[]) => T), ...args: any[]): Promise<T>;
        /** Get all window handles. */
        getWindowHandles(): Promise<string[]>;
    }

    interface Element {
        /** Check if element exists in DOM. */
        isExisting(): Promise<boolean>;
        /** Get CSS property value for an element. */
        getCSSProperty(propertyName: string): Promise<{ property: string; value: string } | { value: string }>;
    }
}
