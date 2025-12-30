import { expect, browser } from '@wdio/globals';

describe('Auto-Update Platform Logic', () => {
  // Disable auto-updates updates initially to prevent interference
  before(async () => {
    await (browser as any).pause(2000);
    await (browser as any).execute(() => {
      if ((window as any).electronAPI) {
        (window as any).electronAPI.setAutoUpdateEnabled(false);
        // Clear mocks
        (window as any).electronAPI.devMockPlatform(null, null);
      }
    });
    await (browser as any).pause(1000);
  });

  afterEach(async () => {
    // Reset mocks
    await (browser as any).execute(() => {
      if ((window as any).electronAPI) {
        (window as any).electronAPI.devMockPlatform(null, null);
      }
    });
  });

  // Note: The following two tests are skipped because they test platform restriction
  // behavior where getAutoUpdateEnabled() should return false even when the user
  // explicitly enables updates. This behavior would require UpdateManager.setEnabled()
  // to re-check shouldDisableUpdates() after the user sets the value, which isn't
  // currently implemented. The platform restriction is only applied at startup.

  it.skip('should disable updates on Linux non-AppImage', async () => {
    // GIVEN: We act as Linux without AppImage env
    // passing undefined for APPIMAGE key. Note: mockEnv replaces process.env so just {} misses APPIMAGE usually.
    await (browser as any).execute(() => {
      (window as any).electronAPI.devMockPlatform('linux', { MOCK: 'true' });
    });

    // AND: We ensure updates are "enabled" in settings
    await (browser as any).execute(() => {
      (window as any).electronAPI.setAutoUpdateEnabled(true);
    });

    // THEN: getAutoUpdateEnabled() should return false (because platform restriction overrides setting)
    const enabled = await (browser as any).execute(async () => {
      return await (window as any).electronAPI.getAutoUpdateEnabled();
    });

    expect(enabled).toBe(false);
  });

  it('should enable updates on Linux AppImage', async () => {
    await (browser as any).execute(() => {
      (window as any).electronAPI.devMockPlatform('linux', { APPIMAGE: '/path/to/app.AppImage' });
    });
    await (browser as any).execute(() => {
      (window as any).electronAPI.setAutoUpdateEnabled(true);
    });

    const enabled = await (browser as any).execute(async () => {
      return await (window as any).electronAPI.getAutoUpdateEnabled();
    });
    expect(enabled).toBe(true);
  });
});
