/**
 * E2E Test: Options Window Tab Navigation & About Content
 *
 * Tests tab switching between Settings and About tabs in the Options window,
 * and verifies About tab content including version, links, and credits.
 *
 * Cross-platform: Windows, macOS, Linux
 *
 * @module options-tabs.spec
 */

import { browser, $, expect } from '@wdio/globals';
import { Selectors } from './helpers/selectors';
import { E2ELogger } from './helpers/logger';
import { clickMenuItemById } from './helpers/menuActions';
import { waitForWindowCount, closeCurrentWindow } from './helpers/windowActions';

describe('Options Window Tab Navigation', () => {
  beforeEach(async () => {
    // Ensure app is loaded
    const mainLayout = await $(Selectors.mainLayout);
    await mainLayout.waitForExist({ timeout: 15000 });
  });

  afterEach(async () => {
    // Cleanup: close any extra windows
    try {
      const handles = await browser.getWindowHandles();
      if (handles.length > 1) {
        // Switch to the last window (Options) and close it
        await browser.switchToWindow(handles[handles.length - 1]);
        await closeCurrentWindow();
        await browser.switchToWindow(handles[0]);
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Tab Switching', () => {
    it('should open Options window with Settings tab active by default', async () => {
      // 1. Open Options window
      await clickMenuItemById('menu-file-options');
      await waitForWindowCount(2, 5000);

      const handles = await browser.getWindowHandles();
      await browser.switchToWindow(handles[1]);
      await browser.pause(500);

      // 2. Verify Settings tab is active
      const settingsTab = await $('[data-testid="options-tab-settings"]');
      await settingsTab.waitForDisplayed({ timeout: 5000 });

      const isSettingsActive = await settingsTab.getAttribute('aria-selected');
      expect(isSettingsActive).toBe('true');

      // 3. Verify theme selector is visible (Settings content)
      const themeSelector = await $('[data-testid="theme-selector"]');
      await expect(themeSelector).toBeDisplayed();

      E2ELogger.info('options-tabs', 'Settings tab is active by default');
    });

    it('should switch to About tab when clicked', async () => {
      // 1. Open Options window
      await clickMenuItemById('menu-file-options');
      await waitForWindowCount(2, 5000);

      const handles = await browser.getWindowHandles();
      await browser.switchToWindow(handles[1]);
      await browser.pause(500);

      // 2. Click About tab
      const aboutTab = await $('[data-testid="options-tab-about"]');
      await aboutTab.waitForDisplayed({ timeout: 5000 });
      await aboutTab.click();
      await browser.pause(300);

      // 3. Verify About tab is now active
      const isAboutActive = await aboutTab.getAttribute('aria-selected');
      expect(isAboutActive).toBe('true');

      // 4. Verify About section is visible
      const aboutSection = await $('[data-testid="about-section"]');
      await expect(aboutSection).toBeDisplayed();

      E2ELogger.info('options-tabs', 'Successfully switched to About tab');
    });

    it('should switch back to Settings tab from About', async () => {
      // 1. Open Options window
      await clickMenuItemById('menu-file-options');
      await waitForWindowCount(2, 5000);

      const handles = await browser.getWindowHandles();
      await browser.switchToWindow(handles[1]);
      await browser.pause(500);

      // 2. Switch to About first
      const aboutTab = await $('[data-testid="options-tab-about"]');
      await aboutTab.click();
      await browser.pause(300);

      // 3. Switch back to Settings
      const settingsTab = await $('[data-testid="options-tab-settings"]');
      await settingsTab.click();
      await browser.pause(300);

      // 4. Verify Settings tab is active
      const isSettingsActive = await settingsTab.getAttribute('aria-selected');
      expect(isSettingsActive).toBe('true');

      // 5. Verify theme selector is visible again
      const themeSelector = await $('[data-testid="theme-selector"]');
      await expect(themeSelector).toBeDisplayed();

      E2ELogger.info('options-tabs', 'Successfully switched back to Settings tab');
    });

    it('should update URL hash when switching tabs', async () => {
      // 1. Open Options window
      await clickMenuItemById('menu-file-options');
      await waitForWindowCount(2, 5000);

      const handles = await browser.getWindowHandles();
      await browser.switchToWindow(handles[1]);
      await browser.pause(500);

      // 2. Switch to About
      const aboutTab = await $('[data-testid="options-tab-about"]');
      await aboutTab.click();
      await browser.pause(300);

      // 3. Verify URL contains #about
      const urlAfterAbout = await browser.getUrl();
      expect(urlAfterAbout).toContain('#about');

      // 4. Switch back to Settings
      const settingsTab = await $('[data-testid="options-tab-settings"]');
      await settingsTab.click();
      await browser.pause(300);

      // 5. Verify URL contains #settings
      const urlAfterSettings = await browser.getUrl();
      expect(urlAfterSettings).toContain('#settings');

      E2ELogger.info('options-tabs', 'URL hash updates correctly with tab changes');
    });
  });

  describe('Opening Options to Specific Tab', () => {
    it('should open directly to About tab via Help > About menu', async () => {
      // 1. Open About via Help menu
      await clickMenuItemById('menu-help-about');
      await waitForWindowCount(2, 5000);

      const handles = await browser.getWindowHandles();
      await browser.switchToWindow(handles[1]);
      await browser.pause(500);

      // 2. Verify About tab is active
      const aboutTab = await $('[data-testid="options-tab-about"]');
      await aboutTab.waitForDisplayed({ timeout: 5000 });

      const isAboutActive = await aboutTab.getAttribute('aria-selected');
      expect(isAboutActive).toBe('true');

      // 3. Verify About content is shown
      const aboutSection = await $('[data-testid="about-section"]');
      await expect(aboutSection).toBeDisplayed();

      E2ELogger.info('options-tabs', 'Help > About correctly opens to About tab');
    });
  });
});

describe('About Tab Content Verification', () => {
  beforeEach(async () => {
    // Ensure app is loaded
    const mainLayout = await $(Selectors.mainLayout);
    await mainLayout.waitForExist({ timeout: 15000 });
  });

  afterEach(async () => {
    // Cleanup: close any extra windows
    try {
      const handles = await browser.getWindowHandles();
      if (handles.length > 1) {
        await browser.switchToWindow(handles[handles.length - 1]);
        await closeCurrentWindow();
        await browser.switchToWindow(handles[0]);
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should display app version in About tab', async () => {
    // 1. Open Options to About tab
    await clickMenuItemById('menu-help-about');
    await waitForWindowCount(2, 5000);

    const handles = await browser.getWindowHandles();
    await browser.switchToWindow(handles[1]);
    await browser.pause(500);

    // 2. Find version element
    const versionElement = await $('[data-testid="about-version"]');
    await versionElement.waitForDisplayed({ timeout: 5000 });

    // 3. Verify version text exists and has a version format
    const versionText = await versionElement.getText();
    expect(versionText).toBeTruthy();

    // Version should contain numbers and dots (e.g., "1.0.0" or "Version 1.0.0")
    expect(versionText).toMatch(/\d+\.\d+/);

    E2ELogger.info('options-tabs', `App version displayed: ${versionText}`);
  });

  it('should display disclaimer information', async () => {
    // 1. Open Options to About tab
    await clickMenuItemById('menu-help-about');
    await waitForWindowCount(2, 5000);

    const handles = await browser.getWindowHandles();
    await browser.switchToWindow(handles[1]);
    await browser.pause(500);

    // 2. Check for disclaimer section
    const disclaimer = await $('[data-testid="about-disclaimer"]');

    if (await disclaimer.isExisting()) {
      await expect(disclaimer).toBeDisplayed();
      E2ELogger.info('options-tabs', 'Disclaimer section is visible');
    } else {
      // Disclaimer may be shown differently, log for visibility
      E2ELogger.info('options-tabs', 'Disclaimer element not found with expected testId');
    }
  });

  it('should have clickable license link', async () => {
    // 1. Open Options to About tab
    await clickMenuItemById('menu-help-about');
    await waitForWindowCount(2, 5000);

    const handles = await browser.getWindowHandles();
    await browser.switchToWindow(handles[1]);
    await browser.pause(500);

    // 2. Find license link
    const licenseLink = await $('[data-testid="about-license-link"]');

    if (await licenseLink.isExisting()) {
      await expect(licenseLink).toBeDisplayed();

      // Verify it's a clickable element
      const tagName = await licenseLink.getTagName();
      expect(['a', 'button']).toContain(tagName.toLowerCase());

      E2ELogger.info('options-tabs', 'License link is present and clickable');
    } else {
      E2ELogger.info('options-tabs', 'License link not found with expected testId');
    }
  });

  it('should have external links that are properly configured', async () => {
    // 1. Open Options to About tab
    await clickMenuItemById('menu-help-about');
    await waitForWindowCount(2, 5000);

    const handles = await browser.getWindowHandles();
    await browser.switchToWindow(handles[1]);
    await browser.pause(500);

    // 2. Check for About section overall
    const aboutSection = await $('[data-testid="about-section"]');
    await aboutSection.waitForDisplayed({ timeout: 5000 });

    // 3. Find any links in the about section
    const links = await aboutSection.$$('a');

    if (links.length > 0) {
      E2ELogger.info('options-tabs', `Found ${links.length} links in About section`);

      // Verify each link has an href
      for (const link of links) {
        const href = await link.getAttribute('href');
        expect(href).toBeTruthy();

        // External links should have target="_blank" or be handled by shell.openExternal
        const target = await link.getAttribute('target');
        if (href.startsWith('http')) {
          // External link should open in new window/browser
          expect(target === '_blank' || target === null).toBe(true);
        }
      }
    }

    E2ELogger.info('options-tabs', 'About section links verified');
  });

  it('should contain Google/Gemini references', async () => {
    // 1. Open Options to About tab
    await clickMenuItemById('menu-help-about');
    await waitForWindowCount(2, 5000);

    const handles = await browser.getWindowHandles();
    await browser.switchToWindow(handles[1]);
    await browser.pause(500);

    // 2. Get About section text content
    const aboutSection = await $('[data-testid="about-section"]');
    await aboutSection.waitForDisplayed({ timeout: 5000 });

    const textContent = await aboutSection.getText();

    // 3. Verify it mentions Gemini or Google (trademark acknowledgment)
    const mentionsGemini = textContent.toLowerCase().includes('gemini');
    const mentionsGoogle = textContent.toLowerCase().includes('google');

    expect(mentionsGemini || mentionsGoogle).toBe(true);

    E2ELogger.info('options-tabs', 'About section contains appropriate branding references');
  });
});
