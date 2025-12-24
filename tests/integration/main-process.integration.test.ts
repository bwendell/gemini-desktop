import { browser, expect } from '@wdio/globals';

describe('Main Process Execution', () => {
    it('should execute code in the main process', async () => {
        const processType = await browser.electron.execute(() => process.type);
        expect(processType).toBe('browser');
    });
});
