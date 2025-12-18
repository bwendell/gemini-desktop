import { describe, it, expect } from 'vitest';
import * as utils from './index';

describe('utils barrel export', () => {
    it('exports all utility modules', () => {
        expect(utils.createLogger).toBeDefined();
        expect(utils.getPreloadPath).toBeDefined();
        expect(utils.getDistHtmlPath).toBeDefined();
        expect(utils.getIconPath).toBeDefined();
        expect(utils.setupHeaderStripping).toBeDefined();

        // Constants are exported as *
        expect(utils.isDev).toBeDefined();
        expect(utils.isMacOS).toBeDefined();
    });
});
