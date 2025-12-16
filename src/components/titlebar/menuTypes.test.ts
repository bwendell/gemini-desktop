/**
 * Unit tests for menuTypes utilities.
 */

import { describe, it, expect } from 'vitest';
import { isSeparator, type MenuItem } from './menuTypes';

describe('menuTypes', () => {
    describe('isSeparator', () => {
        it('returns true for separator items', () => {
            const separatorItem: MenuItem = { separator: true };
            expect(isSeparator(separatorItem)).toBe(true);
        });

        it('returns false for regular menu items', () => {
            const regularItem: MenuItem = {
                label: 'Test',
                action: () => { },
                shortcut: 'Ctrl+T',
            };
            expect(isSeparator(regularItem)).toBe(false);
        });

        it('returns false for menu items without separator property', () => {
            const itemWithoutSeparator: MenuItem = {
                label: 'Just Label',
            };
            expect(isSeparator(itemWithoutSeparator)).toBe(false);
        });

        it('returns false for disabled menu items', () => {
            const disabledItem: MenuItem = {
                label: 'Disabled',
                disabled: true,
            };
            expect(isSeparator(disabledItem)).toBe(false);
        });

        it('returns false for menu items with action only', () => {
            const actionOnlyItem: MenuItem = {
                label: 'Action Only',
                action: () => console.log('action'),
            };
            expect(isSeparator(actionOnlyItem)).toBe(false);
        });
    });
});
