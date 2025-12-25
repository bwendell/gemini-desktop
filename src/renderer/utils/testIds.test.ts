/**
 * Tests for testIds utility functions.
 * 
 * @module testIds.test
 */

import { describe, it, expect } from 'vitest';
import {
    TITLEBAR_TEST_IDS,
    OPTIONS_TEST_IDS,
    TEST_IDS,
} from './testIds';

describe('testIds', () => {
    describe('TITLEBAR_TEST_IDS', () => {
        it('menuButton generates correct test id', () => {
            expect(TITLEBAR_TEST_IDS.menuButton('File')).toBe('menu-button-File');
            expect(TITLEBAR_TEST_IDS.menuButton('Edit')).toBe('menu-button-Edit');
            expect(TITLEBAR_TEST_IDS.menuButton('View')).toBe('menu-button-View');
        });

        it('menuItem generates correct test id', () => {
            expect(TITLEBAR_TEST_IDS.menuItem('Options')).toBe('menu-item-Options');
            expect(TITLEBAR_TEST_IDS.menuItem('About')).toBe('menu-item-About');
            expect(TITLEBAR_TEST_IDS.menuItem('Reload')).toBe('menu-item-Reload');
        });
    });

    describe('OPTIONS_TEST_IDS', () => {
        it('optionsTab generates correct test id', () => {
            expect(OPTIONS_TEST_IDS.optionsTab('settings')).toBe('options-tab-settings');
            expect(OPTIONS_TEST_IDS.optionsTab('about')).toBe('options-tab-about');
        });

        it('themeCard generates correct test id', () => {
            expect(OPTIONS_TEST_IDS.themeCard('light')).toBe('theme-card-light');
            expect(OPTIONS_TEST_IDS.themeCard('dark')).toBe('theme-card-dark');
            expect(OPTIONS_TEST_IDS.themeCard('system')).toBe('theme-card-system');
        });

        it('themeCheckmark generates correct test id', () => {
            expect(OPTIONS_TEST_IDS.themeCheckmark('light')).toBe('theme-checkmark-light');
            expect(OPTIONS_TEST_IDS.themeCheckmark('dark')).toBe('theme-checkmark-dark');
            expect(OPTIONS_TEST_IDS.themeCheckmark('system')).toBe('theme-checkmark-system');
        });
    });

    describe('TEST_IDS combined export', () => {
        it('contains all static test ids from TITLEBAR_TEST_IDS', () => {
            expect(TEST_IDS.TITLEBAR).toBe('titlebar');
            expect(TEST_IDS.MENU_BAR).toBe('titlebar-menu-bar');
            expect(TEST_IDS.MINIMIZE_BUTTON).toBe('minimize-button');
        });

        it('contains all static test ids from OPTIONS_TEST_IDS', () => {
            expect(TEST_IDS.OPTIONS_WINDOW).toBe('options-window');
            expect(TEST_IDS.THEME_SELECTOR).toBe('theme-selector');
        });

        it('contains dynamic function from TITLEBAR_TEST_IDS', () => {
            expect(typeof TEST_IDS.menuButton).toBe('function');
            expect(TEST_IDS.menuButton('Help')).toBe('menu-button-Help');
        });

        it('contains dynamic functions from OPTIONS_TEST_IDS', () => {
            expect(typeof TEST_IDS.optionsTab).toBe('function');
            expect(typeof TEST_IDS.themeCard).toBe('function');
            expect(typeof TEST_IDS.themeCheckmark).toBe('function');
        });
    });
});
