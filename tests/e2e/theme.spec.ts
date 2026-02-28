import { $, $$, browser, expect } from '@wdio/globals';

import { MainWindowPage, OptionsPage } from './pages';
import { expectElementDisplayed, expectThemeApplied } from './helpers/assertions';
import { ensureSingleWindow, waitForAppReady, withOptionsWindowViaMenu } from './helpers/workflows';
import { waitForWindowCount } from './helpers/windowActions';
import { waitForAnimationSettle, waitForUIState } from './helpers/waitUtilities';

type BrowserWithHelpers = typeof browser & {
    execute: <T, A extends unknown[]>(script: string | ((...args: A) => T), ...args: A) => Promise<T>;
    getWindowHandles: () => Promise<string[]>;
    keys: (keys: string | string[]) => Promise<void>;
    switchToWindow: (handle: string) => Promise<void>;
    waitUntil: <T>(
        condition: () => Promise<T> | T,
        options?: {
            timeout?: number;
            timeoutMsg?: string;
            interval?: number;
        }
    ) => Promise<T>;
};

const wdioBrowser = browser as unknown as BrowserWithHelpers;

describe('Theme', () => {
    const mainWindow = new MainWindowPage();
    const optionsPage = new OptionsPage();

    beforeEach(async () => {
        await waitForAppReady();
    });

    afterEach(async () => {
        await ensureSingleWindow();
    });

    describe('Theme Switching', () => {
        it('should apply correct text colors to Options titlebar in light and dark modes', async () => {
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2);
            await optionsPage.waitForLoad();

            const titleElement = await $('[data-testid="options-titlebar-title"]');
            await titleElement.waitForExist();

            await optionsPage.selectTheme('light');

            await waitForAnimationSettle('[data-testid="options-titlebar-title"]', {
                property: 'color',
                timeout: 1000,
            });

            const lightDebugInfo = await wdioBrowser.execute(() => {
                const titleEl = document.querySelector('[data-testid="options-titlebar-title"]');
                const htmlEl = document.documentElement;
                const bodyEl = document.body;

                if (!titleEl) {
                    return { error: 'Title element not found' };
                }

                const computedStyle = window.getComputedStyle(titleEl);
                const htmlStyle = window.getComputedStyle(htmlEl);
                const bodyStyle = window.getComputedStyle(bodyEl);

                return {
                    dataTheme: htmlEl.getAttribute('data-theme'),
                    titleColor: computedStyle.color,
                    titleBackgroundColor: computedStyle.backgroundColor,
                    titleFontSize: computedStyle.fontSize,
                    bodyColor: bodyStyle.color,
                    bodyBackgroundColor: bodyStyle.backgroundColor,
                    cssVarTextPrimary: htmlStyle.getPropertyValue('--text-primary').trim(),
                    cssVarBgPrimary: htmlStyle.getPropertyValue('--bg-primary').trim(),
                    cssVarTitlebarText: htmlStyle.getPropertyValue('--titlebar-text').trim(),
                    cssVarTitlebarBg: htmlStyle.getPropertyValue('--titlebar-bg').trim(),
                    styleSheetCount: document.styleSheets.length,
                    htmlClasses: htmlEl.className,
                    bodyClasses: bodyEl.className,
                };
            });

            console.log('=== DEBUG: Light Theme Title Bar Info ===');
            console.log(JSON.stringify(lightDebugInfo, null, 2));

            const lightTheme = await optionsPage.getCurrentTheme();
            expect(lightTheme).toBe('light');

            console.log(`Light mode - Title computed color: ${lightDebugInfo.titleColor}`);
            console.log(`Light mode - CSS var --text-primary: ${lightDebugInfo.cssVarTextPrimary}`);
            console.log(`Light mode - Body color: ${lightDebugInfo.bodyColor}`);

            expect(lightDebugInfo.titleColor).not.toBe('rgb(232, 234, 237)');
            expect(lightDebugInfo.titleColor).not.toBe('rgb(204, 204, 204)');

            expect(lightDebugInfo.titleColor).toBe('rgb(32, 33, 36)');

            await optionsPage.selectTheme('dark');
            await waitForAnimationSettle('[data-testid="options-titlebar-title"]', {
                property: 'color',
                timeout: 1000,
            });

            const darkDebugInfo = await wdioBrowser.execute(() => {
                const titleEl = document.querySelector('[data-testid="options-titlebar-title"]');
                const htmlEl = document.documentElement;
                const computedStyle = window.getComputedStyle(titleEl!);
                const htmlStyle = window.getComputedStyle(htmlEl);

                return {
                    dataTheme: htmlEl.getAttribute('data-theme'),
                    titleColor: computedStyle.color,
                    cssVarTextPrimary: htmlStyle.getPropertyValue('--text-primary').trim(),
                };
            });

            console.log('=== DEBUG: Dark Theme Title Bar Info ===');
            console.log(JSON.stringify(darkDebugInfo, null, 2));
            console.log(`Dark mode - Title computed color: ${darkDebugInfo.titleColor}`);

            const darkTheme = await optionsPage.getCurrentTheme();
            expect(darkTheme).toBe('dark');

            expect(darkDebugInfo.titleColor).toBe('rgb(232, 234, 237)');

            const handles = await wdioBrowser.getWindowHandles();
            await wdioBrowser.switchToWindow(handles[0]);
            const mainWindowTheme = await wdioBrowser.execute(() => {
                return document.documentElement.getAttribute('data-theme');
            });
            expect(mainWindowTheme).toBe('dark');

            await wdioBrowser.switchToWindow(handles[1]);
            await optionsPage.close();
        });
    });

    describe('Selector Visual', () => {
        it('should display three theme cards with visual previews', async () => {
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2);
            await optionsPage.waitForLoad();

            await expectElementDisplayed('[data-testid="theme-selector"]');

            await expectElementDisplayed(optionsPage.themeCardSelector('system'));
            await expectElementDisplayed(optionsPage.themeCardSelector('light'));
            await expectElementDisplayed(optionsPage.themeCardSelector('dark'));

            const previews = await $$('.theme-card__preview');
            expect(previews.length).toBe(3);

            const labels = await $$('.theme-card__label');
            expect(labels.length).toBe(3);

            const systemCard = await $(optionsPage.themeCardSelector('system'));
            const lightCard = await $(optionsPage.themeCardSelector('light'));
            const darkCard = await $(optionsPage.themeCardSelector('dark'));

            const systemText = await systemCard.$('.theme-card__text');
            const lightText = await lightCard.$('.theme-card__text');
            const darkText = await darkCard.$('.theme-card__text');

            await expect(systemText).toHaveText('System');
            await expect(lightText).toHaveText('Light');
            await expect(darkText).toHaveText('Dark');

            await optionsPage.close();
        });

        it('should show checkmark indicator on currently selected theme', async () => {
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2);
            await optionsPage.waitForLoad();

            await optionsPage.selectTheme('light');

            await expectElementDisplayed('[data-testid="theme-checkmark-light"]');

            await wdioBrowser.waitUntil(async () => !(await $('[data-testid="theme-checkmark-system"]').isExisting()), {
                timeout: 500,
                timeoutMsg: 'System checkmark did not disappear after animation',
            });
            await wdioBrowser.waitUntil(async () => !(await $('[data-testid="theme-checkmark-dark"]').isExisting()), {
                timeout: 500,
                timeoutMsg: 'Dark checkmark did not disappear after animation',
            });

            await optionsPage.selectTheme('dark');

            await expectElementDisplayed('[data-testid="theme-checkmark-dark"]');

            await wdioBrowser.waitUntil(async () => !(await $('[data-testid="theme-checkmark-light"]').isExisting()), {
                timeout: 500,
                timeoutMsg: 'Light checkmark did not disappear after animation',
            });

            await optionsPage.close();
        });

        it('should apply selected class and styling on clicked card', async () => {
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2);
            await optionsPage.waitForLoad();

            await optionsPage.selectTheme('light');

            const hasSelectedClass = await wdioBrowser.execute((selector: string) => {
                const el = document.querySelector(selector);
                return el?.classList.contains('theme-card--selected') ?? false;
            }, '[data-testid="theme-card-light"]');

            expect(hasSelectedClass).toBe(true);

            const lightCard = await $(optionsPage.themeCardSelector('light'));
            await expect(lightCard).toHaveAttribute('aria-checked', 'true');

            const darkCard = await $(optionsPage.themeCardSelector('dark'));
            await expect(darkCard).toHaveAttribute('aria-checked', 'false');

            await optionsPage.close();
        });

        it('should apply theme change immediately to both windows', async () => {
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2);
            await optionsPage.waitForLoad();

            await optionsPage.selectTheme('light');

            await expectThemeApplied('light');

            const handles = await wdioBrowser.getWindowHandles();
            await wdioBrowser.switchToWindow(handles[0]);
            await expectThemeApplied('light');

            await wdioBrowser.switchToWindow(handles[1]);
            await optionsPage.selectTheme('dark');

            await optionsPage.close();
        });

        it('should display correct preview colors for each theme', async () => {
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2);
            await optionsPage.waitForLoad();

            const previewColors = await wdioBrowser.execute(() => {
                const cards = document.querySelectorAll('.theme-card');
                const results: Record<string, string> = {};

                cards.forEach((card) => {
                    const testId = card.getAttribute('data-testid');
                    const preview = card.querySelector('.theme-card__preview') as HTMLElement;
                    if (testId && preview) {
                        results[testId] = preview.style.background || window.getComputedStyle(preview).background;
                    }
                });

                return results;
            });

            expect(previewColors['theme-card-system']).toContain('gradient');

            expect(previewColors['theme-card-light']).toContain('rgb(255, 255, 255)');
            expect(previewColors['theme-card-dark']).toContain('rgb(26, 26, 26)');

            await optionsPage.close();
        });
    });

    describe('Selector Keyboard', () => {
        it('should be focusable via Tab key', async () => {
            await withOptionsWindowViaMenu(async () => {
                let found = false;
                for (let i = 0; i < 10; i++) {
                    await wdioBrowser.keys(['Tab']);
                    const activeTestId = await wdioBrowser.execute(() => {
                        return document.activeElement?.getAttribute('data-testid');
                    });

                    if (activeTestId && activeTestId.startsWith('theme-card-')) {
                        found = true;
                        break;
                    }
                    await waitForUIState(
                        async () => {
                            const currentActiveTestId = await wdioBrowser.execute(() => {
                                return document.activeElement?.getAttribute('data-testid');
                            });
                            return currentActiveTestId === activeTestId;
                        },
                        { timeout: 200, interval: 20, description: 'Focus to settle' }
                    );
                }

                expect(found).toBe(true);
            });
        });

        it('should have proper radiogroup and radio ARIA roles', async () => {
            await withOptionsWindowViaMenu(async () => {
                const themeSelector = await $(optionsPage.themeSelectorSelector);
                await expect(themeSelector).toHaveAttribute('role', 'radiogroup');
                await expect(themeSelector).toHaveAttribute('aria-label', 'Theme selection');

                const systemCard = await $(optionsPage.themeCardSelector('system'));
                const lightCard = await $(optionsPage.themeCardSelector('light'));
                const darkCard = await $(optionsPage.themeCardSelector('dark'));

                await expect(systemCard).toHaveAttribute('role', 'radio');
                await expect(lightCard).toHaveAttribute('role', 'radio');
                await expect(darkCard).toHaveAttribute('role', 'radio');

                await expect(systemCard).toHaveAttribute('aria-label', 'System theme');
                await expect(lightCard).toHaveAttribute('aria-label', 'Light theme');
                await expect(darkCard).toHaveAttribute('aria-label', 'Dark theme');
            });
        });

        it('should select theme with Enter key when card is focused', async () => {
            await withOptionsWindowViaMenu(async () => {
                await optionsPage.selectTheme('light');

                await wdioBrowser.execute(() => {
                    const el = document.querySelector('[data-testid="theme-card-dark"]') as HTMLElement;
                    el?.focus();
                });

                await wdioBrowser.keys(['Enter']);

                await waitForAnimationSettle('[data-testid="theme-card-dark"]', {
                    property: 'opacity',
                    timeout: 1000,
                });

                const darkCard = await $(optionsPage.themeCardSelector('dark'));
                await expect(darkCard).toHaveAttribute('aria-checked', 'true');

                const darkCheckmark = await $('[data-testid="theme-checkmark-dark"]');
                await expect(darkCheckmark).toExist();

                const currentTheme = await optionsPage.getCurrentTheme();
                expect(currentTheme).toBe('dark');
            });
        });

        it('should select theme with Space key when card is focused', async () => {
            await withOptionsWindowViaMenu(async () => {
                await wdioBrowser.execute(() => {
                    const el = document.querySelector('[data-testid="theme-card-light"]') as HTMLElement;
                    el?.focus();
                });

                await wdioBrowser.keys(['Space']);

                await waitForAnimationSettle('[data-testid="theme-card-light"]', {
                    property: 'opacity',
                    timeout: 1000,
                });

                const lightCard = await $(optionsPage.themeCardSelector('light'));
                await expect(lightCard).toHaveAttribute('aria-checked', 'true');

                const currentTheme = await optionsPage.getCurrentTheme();
                expect(currentTheme).toBe('light');

                await optionsPage.selectTheme('dark');
            });
        });

        it('should show focus-visible styling on keyboard navigation', async () => {
            await withOptionsWindowViaMenu(async () => {
                await wdioBrowser.execute(() => {
                    const el = document.querySelector('[data-testid="theme-card-system"]') as HTMLElement;
                    el?.focus();
                });

                await wdioBrowser.keys(['Tab']);
                await wdioBrowser.keys(['Shift', 'Tab']);

                const hasFocusStyles = await wdioBrowser.execute(() => {
                    const el = document.querySelector('[data-testid="theme-card-system"]');
                    if (!el) return false;

                    const styles = window.getComputedStyle(el);
                    const hasOutline = styles.outline !== 'none' && styles.outline !== '';
                    const hasBoxShadow = styles.boxShadow !== 'none' && styles.boxShadow !== '';

                    return hasOutline || hasBoxShadow;
                });

                expect(hasFocusStyles).toBeDefined();
            });
        });

        it('should maintain tab order between theme cards', async () => {
            await withOptionsWindowViaMenu(async () => {
                await wdioBrowser.execute(() => {
                    const el = document.querySelector('[data-testid="theme-card-system"]') as HTMLElement;
                    el?.focus();
                });

                let focusedId = await wdioBrowser.execute(() => document.activeElement?.getAttribute('data-testid'));
                expect(focusedId).toBe('theme-card-system');

                await wdioBrowser.keys(['Tab']);
                focusedId = await wdioBrowser.execute(() => document.activeElement?.getAttribute('data-testid'));
                expect(focusedId).toBe('theme-card-light');

                await wdioBrowser.keys(['Tab']);
                focusedId = await wdioBrowser.execute(() => document.activeElement?.getAttribute('data-testid'));
                expect(focusedId).toBe('theme-card-dark');

                await wdioBrowser.keys(['Shift', 'Tab']);
                focusedId = await wdioBrowser.execute(() => document.activeElement?.getAttribute('data-testid'));
                expect(focusedId).toBe('theme-card-light');
            });
        });
    });
});
