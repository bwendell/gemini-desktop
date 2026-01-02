import { browser, expect } from '@wdio/globals';

/**
 * Update Notification Integration Tests
 *
 * Tests the migration of update toasts to the new generic toast system.
 * Verifies that existing update IPC events, download progress, update actions,
 * and dev mode helpers continue to function correctly.
 */
describe('Update Notification Integration', () => {
  before(async () => {
    // Wait for app ready
    await browser.waitUntil(async () => (await browser.getWindowHandles()).length > 0, {
      timeout: 10000,
      timeoutMsg: 'App did not load in time',
    });

    // Ensure renderer is ready
    await browser.execute(async () => {
      return await new Promise<void>((resolve) => {
        if (document.readyState === 'complete') return resolve();
        window.addEventListener('load', () => resolve());
      });
    });

    // Enable updates for testing
    await browser.execute(() => {
      window.electronAPI.devMockPlatform('win32', { TEST_AUTO_UPDATE: 'true' });
    });
  });

  afterEach(async () => {
    // Clean up any visible toasts after each test
    await browser.execute(() => {
      if ((window as any).__testUpdateToast) {
        (window as any).__testUpdateToast.hide();
      }
    });
    // Wait for animation to complete
    await browser.pause(300);
  });

  // Helper to find a toast by ID or just the first one
  const getToastInfo = async (toastId?: string) => {
    return await browser.execute((id) => {
      const selector = id ? `[data-toast-id="${id}"]` : '[data-testid="toast"]';
      const toast = document.querySelector(selector);
      if (!toast) return null;

      const title = toast.querySelector('[data-testid="toast-title"]')?.textContent || null;
      const message = toast.querySelector('[data-testid="toast-message"]')?.textContent || null;
      const buttons = Array.from(toast.querySelectorAll('.toast__button')).map(
        (b) => b.textContent?.trim() || ''
      );

      return {
        exists: true,
        type: Array.from(toast.classList)
          .find((c) => c.startsWith('toast--'))
          ?.replace('toast--', ''),
        title,
        message,
        buttons,
        textContent: toast.textContent,
      };
    }, toastId);
  };

  describe('7.5.4.1 - IPC Events Trigger Toasts', () => {
    it('should display toast when update-available IPC event is received', async () => {
      // 1. Setup listener for update-available event
      await browser.execute(() => {
        (window as any)._updateAvailableReceived = false;
        (window as any).electronAPI.onUpdateAvailable(() => {
          (window as any)._updateAvailableReceived = true;
        });
      });

      // 2. Trigger update-available via Dev IPC
      await browser.execute(() => {
        window.electronAPI.devEmitUpdateEvent('update-available', { version: '2.0.0' });
      });

      // 3. Wait for toast to appear
      await browser.waitUntil(
        async () => {
          const info = await getToastInfo();
          return info !== null;
        },
        { timeout: 3000, timeoutMsg: 'Toast did not appear after update-available event' }
      );

      // 4. Verify the update-available event was received
      const received = await browser.execute(() => (window as any)._updateAvailableReceived);
      expect(received).toBe(true);

      // 5. Verify toast content
      const info = await getToastInfo('update-notification');
      expect(info).not.toBeNull();
      expect(info?.type).toBe('info');
      expect(info?.title).toBe('Update Available');
      expect(info?.message).toContain('2.0.0');
    });

    it('should display toast when update-downloaded IPC event is received', async () => {
      // 1. Setup listener
      await browser.execute(() => {
        (window as any)._updateDownloadedReceived = false;
        (window as any).electronAPI.onUpdateDownloaded(() => {
          (window as any)._updateDownloadedReceived = true;
        });
      });

      // 2. Trigger update-downloaded via Dev IPC
      await browser.execute(() => {
        window.electronAPI.devEmitUpdateEvent('update-downloaded', { version: '2.0.0' });
      });

      // 3. Wait for toast to appear
      await browser.waitUntil(
        async () => {
          const info = await getToastInfo('update-notification');
          return info !== null;
        },
        { timeout: 3000, timeoutMsg: 'Toast did not appear after update-downloaded event' }
      );

      // 4. Verify the event was received
      const received = await browser.execute(() => (window as any)._updateDownloadedReceived);
      expect(received).toBe(true);

      // 5. Verify toast is visible with success type styling
      const info = await getToastInfo('update-notification');
      expect(info?.type).toBe('success');
      expect(info?.title).toBe('Update Ready');
      expect(info?.message).toContain('2.0.0');
    });

    it('should display error toast when update-error IPC event is received', async () => {
      // 1. Setup listener
      await browser.execute(() => {
        (window as any)._updateErrorReceived = false;
        (window as any).electronAPI.onUpdateError(() => {
          (window as any)._updateErrorReceived = true;
        });
      });

      // 2. Trigger error via Dev IPC
      await browser.execute(() => {
        window.electronAPI.devEmitUpdateEvent('error', new Error('Test error'));
      });

      // 3. Wait for toast to appear
      await browser.waitUntil(
        async () => {
          const info = await getToastInfo('update-notification');
          return info !== null;
        },
        { timeout: 3000, timeoutMsg: 'Error toast did not appear' }
      );

      // 4. Verify the error event was received
      const received = await browser.execute(() => (window as any)._updateErrorReceived);
      expect(received).toBe(true);

      // 5. Verify error toast content
      const info = await getToastInfo('update-notification');
      expect(info?.type).toBe('error');
      expect(info?.title).toBe('Update Error');
    });
  });

  describe('7.5.4.2 - Download Progress Updates', () => {
    it('should update toast with download progress', async () => {
      // 1. Trigger download progress event
      await browser.execute(() => {
        window.electronAPI.devEmitUpdateEvent('download-progress', {
          percent: 25,
          bytesPerSecond: 100000,
          transferred: 2500000,
          total: 10000000,
        });
      });

      // 2. Wait for toast to appear
      await browser.waitUntil(
        async () => {
          const info = await getToastInfo('update-notification');
          return info !== null;
        },
        { timeout: 3000 }
      );

      // 3. Verify progress toast info
      const info = await getToastInfo('update-notification');
      expect(info?.type).toBe('progress');
      expect(info?.title).toBe('Downloading Update');
      expect(info?.message).toContain('25%');
    });

    it('should update progress percentage in toast', async () => {
      // 1. Trigger initial progress
      await browser.execute(() => {
        window.electronAPI.devEmitUpdateEvent('download-progress', {
          percent: 30,
        } as any);
      });

      await browser.waitUntil(
        async () => {
          const info = await getToastInfo('update-notification');
          return info?.message?.includes('30%');
        },
        { timeout: 3000 }
      );

      // 2. Trigger updated progress
      await browser.execute(() => {
        window.electronAPI.devEmitUpdateEvent('download-progress', {
          percent: 80,
        } as any);
      });

      await browser.waitUntil(
        async () => {
          const info = await getToastInfo('update-notification');
          return info?.message?.includes('80%');
        },
        { timeout: 3000 }
      );

      const info = await getToastInfo('update-notification');
      expect(info?.message).toContain('80%');
    });
  });

  describe('7.5.4.3 - Update Actions (Install Now, Later)', () => {
    it('should display action buttons when update is downloaded', async () => {
      // 1. Trigger update-downloaded
      await browser.execute(() => {
        window.electronAPI.devEmitUpdateEvent('update-downloaded', { version: '2.0.0' });
      });

      await browser.waitUntil(
        async () => {
          const info = await getToastInfo('update-notification');
          return info !== null && info.buttons.length >= 2;
        },
        { timeout: 3000 }
      );

      // 2. Verify action buttons
      const info = await getToastInfo('update-notification');
      expect(info?.buttons).toContain('Restart Now');
      expect(info?.buttons).toContain('Later');
    });

    it('should dismiss toast when Later button is clicked', async () => {
      // 1. Trigger update-downloaded to show toast
      await browser.execute(() => {
        window.electronAPI.devEmitUpdateEvent('update-downloaded', { version: '2.0.0' });
      });

      await browser.waitUntil(
        async () => {
          const info = await getToastInfo('update-notification');
          return info !== null;
        },
        { timeout: 3000 }
      );

      // 2. Click the Later button
      await browser.execute(() => {
        const toast = document.querySelector('[data-toast-id="update-notification"]');
        const buttons = Array.from(toast?.querySelectorAll('.toast__button') || []);
        const laterButton = buttons.find((btn) => btn.textContent?.includes('Later'));
        (laterButton as HTMLButtonElement)?.click();
      });

      // 3. Verify toast is dismissed
      await browser.waitUntil(
        async () => {
          const info = await getToastInfo('update-notification');
          return info === null;
        },
        { timeout: 3000, timeoutMsg: 'Toast was not dismissed after clicking Later' }
      );
    });

    it('should call installUpdate when Restart Now button is clicked', async () => {
      // 1. Trigger update-downloaded to show toast
      await browser.execute(() => {
        window.electronAPI.devEmitUpdateEvent('update-downloaded', { version: '2.0.0' });
      });

      await browser.waitUntil(
        async () => {
          const info = await getToastInfo('update-notification');
          return info !== null;
        },
        { timeout: 3000 }
      );

      // 2. Click the Restart Now button
      await browser.execute(() => {
        const toast = document.querySelector('[data-toast-id="update-notification"]');
        const buttons = Array.from(toast?.querySelectorAll('.toast__button') || []);
        const restartButton = buttons.find((btn) => btn.textContent?.includes('Restart'));
        (restartButton as HTMLButtonElement)?.click();
      });

      // 3. Verify toast is dismissed after clicking
      await browser.waitUntil(
        async () => {
          const info = await getToastInfo('update-notification');
          return info === null;
        },
        { timeout: 3000, timeoutMsg: 'Toast was not dismissed after clicking Restart Now' }
      );
    });
  });

  describe('7.5.4.4 - Dev Mode Helpers', () => {
    it('should have __testUpdateToast helper available in dev mode', async () => {
      const helperExists = await browser.execute(() => {
        return typeof (window as any).__testUpdateToast === 'object';
      });
      expect(helperExists).toBe(true);
    });

    it('should show available toast via __testUpdateToast.showAvailable()', async () => {
      await browser.execute(() => {
        (window as any).__testUpdateToast.showAvailable('3.0.0');
      });

      await browser.waitUntil(
        async () => {
          const info = await getToastInfo('update-notification');
          return info !== null && info.message?.includes('3.0.0');
        },
        { timeout: 3000 }
      );

      const info = await getToastInfo('update-notification');
      expect(info?.type).toBe('info');
    });

    it('should show downloaded toast via __testUpdateToast.showDownloaded()', async () => {
      await browser.execute(() => {
        (window as any).__testUpdateToast.showDownloaded('3.0.0');
      });

      await browser.waitUntil(
        async () => {
          const info = await getToastInfo('update-notification');
          return info !== null && info.type === 'success';
        },
        { timeout: 3000 }
      );

      const info = await getToastInfo('update-notification');
      expect(info?.message).toContain('3.0.0');
    });

    it('should show error toast via __testUpdateToast.showError()', async () => {
      await browser.execute(() => {
        (window as any).__testUpdateToast.showError('Custom test error');
      });

      await browser.waitUntil(
        async () => {
          const info = await getToastInfo('update-notification');
          return info !== null && info.type === 'error';
        },
        { timeout: 3000 }
      );

      const info = await getToastInfo('update-notification');
      expect(info?.message).toContain('Custom test error');
    });

    it('should show progress toast via __testUpdateToast.showProgress()', async () => {
      await browser.execute(() => {
        (window as any).__testUpdateToast.showProgress(60);
      });

      await browser.waitUntil(
        async () => {
          const info = await getToastInfo('update-notification');
          return info !== null && info.message?.includes('60%');
        },
        { timeout: 3000 }
      );

      const info = await getToastInfo('update-notification');
      expect(info?.type).toBe('progress');
    });

    it('should hide toast via __testUpdateToast.hide()', async () => {
      await browser.execute(() => {
        (window as any).__testUpdateToast.showDownloaded('3.0.0');
      });

      await browser.waitUntil(
        async () => {
          return (await getToastInfo('update-notification')) !== null;
        },
        { timeout: 3000 }
      );

      await browser.execute(() => {
        (window as any).__testUpdateToast.hide();
      });

      await browser.waitUntil(
        async () => {
          return (await getToastInfo('update-notification')) === null;
        },
        { timeout: 3000 }
      );
    });

    it('should show not-available toast via __testUpdateToast.showNotAvailable()', async () => {
      await browser.execute(() => {
        (window as any).__testUpdateToast.showNotAvailable('1.0.0');
      });

      await browser.waitUntil(
        async () => {
          const info = await getToastInfo('update-notification');
          return info !== null && info.message?.includes('up to date');
        },
        { timeout: 3000 }
      );

      const info = await getToastInfo('update-notification');
      expect(info?.type).toBe('info');
    });
  });
});
