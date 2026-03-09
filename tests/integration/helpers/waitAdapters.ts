import { browser } from '@wdio/globals';

type WaitOptions = {
    timeout?: number;
    interval?: number;
    timeoutMsg?: string;
};

export async function waitForRendererState(
    condition: () => Promise<boolean>,
    options: WaitOptions = {}
): Promise<void> {
    const { timeout = 5000, interval = 100, timeoutMsg = 'Renderer state did not converge in time' } = options;

    await browser.waitUntil(condition, { timeout, interval, timeoutMsg });
}

export async function waitForElectronState(
    condition: () => Promise<boolean> | boolean,
    options: WaitOptions = {}
): Promise<void> {
    const { timeout = 5000, interval = 100, timeoutMsg = 'Electron state did not converge in time' } = options;

    await browser.waitUntil(async () => browser.electron.execute(condition), { timeout, interval, timeoutMsg });
}

export async function waitForWindowCount(expectedCount: number, options: WaitOptions = {}): Promise<void> {
    const { timeout = 5000, interval = 100 } = options;

    await browser.waitUntil(async () => (await browser.getWindowHandles()).length === expectedCount, {
        timeout,
        interval,
        timeoutMsg: options.timeoutMsg ?? `Window count did not become ${expectedCount}`,
    });
}

export async function waitForIPCRoundTrip(
    action: () => Promise<void>,
    verification: () => Promise<boolean>,
    options: WaitOptions = {}
): Promise<void> {
    const { timeout = 3000, interval = 100, timeoutMsg = 'IPC round trip did not converge in time' } = options;

    await action();
    await browser.waitUntil(verification, { timeout, interval, timeoutMsg });
}

export async function waitForDuration(durationMs: number): Promise<void> {
    await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), durationMs);
    });
}
