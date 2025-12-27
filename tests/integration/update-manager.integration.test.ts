import { browser, expect } from '@wdio/globals';

describe('Update Manager Integration', () => {
  before(async () => {
    await browser.waitUntil(async () => (await browser.getWindowHandles()).length > 0);
  });

  it('should mask detailed error messages in the renderer', async () => {
    // 1. Setup listener for error in renderer
    await browser.execute(() => {
      (window as any)._updateErrorPromise = new Promise<string>((resolve) => {
        (window as any).electronAPI.onUpdateError((msg: string) => resolve(msg));
      });
    });

    // 2. Trigger a detailed error via Dev IPC
    // This goes Main -> IpcManager -> UpdateManager.devEmitUpdateEvent -> broadcast masked error
    const rawError = '<div>Massive HTML Error</div> with stack trace details...';
    await browser.execute((err) => {
      window.electronAPI.devEmitUpdateEvent('error', new Error(err));
    }, rawError);

    // 3. Verify result in renderer
    const errorMsg = await browser.execute(async () => {
      const timeout = new Promise<string>((_, reject) =>
        setTimeout(() => reject('Timeout waiting for update error'), 5000)
      );
      return await Promise.race([(window as any)._updateErrorPromise, timeout]);
    });

    // 4. Expectation: The message should be the generic one, NOT the raw one.
    expect(errorMsg).toBe('The auto-update service encountered an error. Please try again later.');
    expect(errorMsg).not.toContain('Massive HTML Error');
  });
});
