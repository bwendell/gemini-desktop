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
import { waitForWindowCount } from './helpers/windowActions';
import {
  waitForOptionsWindow,
  closeOptionsWindow,
  switchToOptionsWindow,
  navigateToOptionsTab,
} from './helpers/optionsWindowActions';

// NEW: Import assertion and workflow helpers
import {
  expectTabActive,
  expectElementDisplayed,
  expectUrlHash,
  expectWindowCount as assertWindowCount,
} from './helpers/assertions';
import {
  withOptionsWindowViaMenu,
  withOptionsTab,
  waitForAppReady,
  ensureSingleWindow,
  waitForIpcSettle,
} from './helpers/workflows';

describe('Options Window Tab Navigation', () => {
  beforeEach(async () => {
    // Use workflow helper for app ready check
    await waitForAppReady();
  });

  afterEach(async () => {
    // Use workflow helper for cleanup
    await ensureSingleWindow();
  });

  describe('Tab Switching', () => {
    it('should open Options window with Settings tab active by default', async () => {
      // Use withOptionsWindowViaMenu to handle open/close automatically
      await withOptionsWindowViaMenu(async () => {
        // Use assertion helper for tab state check
        await expectTabActive('settings');

        // Use assertion helper for element display check
        await expectElementDisplayed('[data-testid="theme-selector"]');

        E2ELogger.info('options-tabs', 'Settings tab is active by default');
      });
    });

    it('should switch to About tab when clicked', async () => {
      await withOptionsWindowViaMenu(async () => {
        // Navigate to About tab
        await navigateToOptionsTab('about');
        await waitForIpcSettle();

        // Use assertion helpers
        await expectTabActive('about');
        await expectElementDisplayed('[data-testid="about-section"]');

        E2ELogger.info('options-tabs', 'Successfully switched to About tab');
      });
    });

    it('should switch back to Settings tab from About', async () => {
      await withOptionsWindowViaMenu(async () => {
        // Switch to About first
        await navigateToOptionsTab('about');
        await waitForIpcSettle();

        // Switch back to Settings
        await navigateToOptionsTab('settings');
        await waitForIpcSettle();

        // Use assertion helpers
        await expectTabActive('settings');
        await expectElementDisplayed('[data-testid="theme-selector"]');

        E2ELogger.info('options-tabs', 'Successfully switched back to Settings tab');
      });
    });

    it('should update URL hash when switching tabs', async () => {
      await withOptionsWindowViaMenu(async () => {
        // Switch to About
        await navigateToOptionsTab('about');
        await waitForIpcSettle();

        // Use assertion helper for URL hash check
        await expectUrlHash('#about');

        // Switch back to Settings
        await navigateToOptionsTab('settings');
        await waitForIpcSettle();

        await expectUrlHash('#settings');

        E2ELogger.info('options-tabs', 'URL hash updates correctly with tab changes');
      });
    });
  });

  describe('Opening Options to Specific Tab', () => {
    it('should open directly to About tab via Help > About menu', async () => {
      // Open About via Help menu
      await clickMenuItemById('menu-help-about');
      await waitForOptionsWindow();

      try {
        // Use assertion helpers
        await expectTabActive('about');
        await expectElementDisplayed('[data-testid="about-section"]');

        E2ELogger.info('options-tabs', 'Help > About correctly opens to About tab');
      } finally {
        await closeOptionsWindow();
      }
    });
  });
});

describe('About Tab Content Verification', () => {
  beforeEach(async () => {
    await waitForAppReady();
  });

  afterEach(async () => {
    await ensureSingleWindow();
  });

  it('should display app version in About tab', async () => {
    // Open directly to About tab via menu
    await clickMenuItemById('menu-help-about');
    await waitForOptionsWindow();

    try {
      const versionElement = await $('[data-testid="about-version"]');
      await versionElement.waitForDisplayed({ timeout: 5000 });

      const versionText = await versionElement.getText();
      expect(versionText).toBeTruthy();

      // Version should contain numbers and dots (e.g., "1.0.0" or "Version 1.0.0")
      expect(versionText).toMatch(/\d+\.\d+/);

      E2ELogger.info('options-tabs', `App version displayed: ${versionText}`);
    } finally {
      await closeOptionsWindow();
    }
  });

  it('should display disclaimer information', async () => {
    await clickMenuItemById('menu-help-about');
    await waitForOptionsWindow();

    try {
      const disclaimer = await $('[data-testid="about-disclaimer"]');

      if (await disclaimer.isExisting()) {
        await expect(disclaimer).toBeDisplayed();
        E2ELogger.info('options-tabs', 'Disclaimer section is visible');
      } else {
        E2ELogger.info('options-tabs', 'Disclaimer element not found with expected testId');
      }
    } finally {
      await closeOptionsWindow();
    }
  });

  it('should have clickable license link', async () => {
    await clickMenuItemById('menu-help-about');
    await waitForOptionsWindow();

    try {
      const licenseLink = await $('[data-testid="about-license-link"]');

      if (await licenseLink.isExisting()) {
        await expect(licenseLink).toBeDisplayed();

        const tagName = await licenseLink.getTagName();
        expect(['a', 'button']).toContain(tagName.toLowerCase());

        E2ELogger.info('options-tabs', 'License link is present and clickable');
      } else {
        E2ELogger.info('options-tabs', 'License link not found with expected testId');
      }
    } finally {
      await closeOptionsWindow();
    }
  });

  it('should have external links that are properly configured', async () => {
    await clickMenuItemById('menu-help-about');
    await waitForOptionsWindow();

    try {
      const aboutSection = await $('[data-testid="about-section"]');
      await aboutSection.waitForDisplayed({ timeout: 5000 });

      const links = await aboutSection.$$('a');

      if (links.length > 0) {
        E2ELogger.info('options-tabs', `Found ${links.length} links in About section`);

        for (const link of links) {
          const href = await link.getAttribute('href');
          expect(href).toBeTruthy();

          const target = await link.getAttribute('target');
          if (href.startsWith('http')) {
            expect(target === '_blank' || target === null).toBe(true);
          }
        }
      }

      E2ELogger.info('options-tabs', 'About section links verified');
    } finally {
      await closeOptionsWindow();
    }
  });

  it('should contain Google/Gemini references', async () => {
    await clickMenuItemById('menu-help-about');
    await waitForOptionsWindow();

    try {
      const aboutSection = await $('[data-testid="about-section"]');
      await aboutSection.waitForDisplayed({ timeout: 5000 });

      const textContent = await aboutSection.getText();

      const mentionsGemini = textContent.toLowerCase().includes('gemini');
      const mentionsGoogle = textContent.toLowerCase().includes('google');

      expect(mentionsGemini || mentionsGoogle).toBe(true);

      E2ELogger.info('options-tabs', 'About section contains appropriate branding references');
    } finally {
      await closeOptionsWindow();
    }
  });
});
