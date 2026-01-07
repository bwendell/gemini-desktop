/**
 * Quick Chat IPC Handler.
 *
 * Handles IPC channels for Quick Chat operations:
 * - quick-chat:submit - Submits text from Quick Chat to main window
 * - quick-chat:hide - Hides the Quick Chat window
 * - quick-chat:cancel - Cancels and hides Quick Chat
 * - gemini:ready - Triggers text injection into Gemini iframe
 *
 * @module ipc/QuickChatIpcHandler
 */

import { ipcMain } from 'electron';
import { BaseIpcHandler } from './BaseIpcHandler';
import { IPC_CHANNELS, isGeminiDomain } from '../../utils/constants';
import { GEMINI_APP_URL } from '../../../shared/constants/index';
import { InjectionScriptBuilder, InjectionResult } from '../../utils/injectionScript';

/**
 * Handler for Quick Chat related IPC channels.
 *
 * Manages the Quick Chat submission flow including:
 * - Hiding Quick Chat window
 * - Focusing main window
 * - Navigating to Gemini and injecting text
 */
export class QuickChatIpcHandler extends BaseIpcHandler {
    /**
     * Register Quick Chat IPC handlers with ipcMain.
     */
    register(): void {
        // Submit quick chat text - triggers iframe navigation in renderer
        ipcMain.on(IPC_CHANNELS.QUICK_CHAT_SUBMIT, (_event, text: string) => {
            this._handleSubmit(text);
        });

        // Gemini iframe ready - renderer signals after iframe loads, triggers injection
        ipcMain.on(IPC_CHANNELS.GEMINI_READY, async (_event, text: string) => {
            await this._handleGeminiReady(text);
        });

        // Hide Quick Chat window
        ipcMain.on(IPC_CHANNELS.QUICK_CHAT_HIDE, () => {
            this._handleHide();
        });

        // Cancel Quick Chat (hide without action)
        ipcMain.on(IPC_CHANNELS.QUICK_CHAT_CANCEL, () => {
            this._handleCancel();
        });
    }

    /**
     * Handle quick-chat:submit request.
     * @param text - Text to submit
     */
    private _handleSubmit(text: string): void {
        try {
            this.logger.log('Quick Chat submit received:', text.substring(0, 50));

            // Hide the Quick Chat window
            this.deps.windowManager.hideQuickChat();

            // Focus the main window
            this.deps.windowManager.focusMainWindow();

            // Send navigation request to renderer (React app will reload iframe)
            const mainWindow = this.deps.windowManager.getMainWindow();
            if (mainWindow) {
                this.logger.log('Sending gemini:navigate to renderer');
                mainWindow.webContents.send(IPC_CHANNELS.GEMINI_NAVIGATE, {
                    url: GEMINI_APP_URL,
                    text: text,
                });
            } else {
                this.logger.error('Cannot navigate: main window not found');
            }
        } catch (error) {
            this.handleError('handling quick chat submit', error);
        }
    }

    /**
     * Handle gemini:ready request.
     * Injects text into the Gemini iframe.
     * @param text - Text to inject
     */
    private async _handleGeminiReady(text: string): Promise<void> {
        try {
            this.logger.log('Gemini ready signal received, injecting text');
            await this._injectTextIntoGeminiIframe(text);
        } catch (error) {
            this.handleError('handling gemini ready', error);
        }
    }

    /**
     * Handle quick-chat:hide request.
     */
    private _handleHide(): void {
        try {
            this.deps.windowManager.hideQuickChat();
        } catch (error) {
            this.handleError('hiding quick chat', error);
        }
    }

    /**
     * Handle quick-chat:cancel request.
     */
    private _handleCancel(): void {
        try {
            this.deps.windowManager.hideQuickChat();
            this.logger.log('Quick Chat cancelled');
        } catch (error) {
            this.handleError('cancelling quick chat', error);
        }
    }

    /**
     * Inject text into the Gemini iframe (child frame of React shell).
     * This is called after renderer signals that iframe has loaded.
     *
     * @param text - Text to inject into Gemini editor
     */
    private async _injectTextIntoGeminiIframe(text: string): Promise<void> {
        const mainWindow = this.deps.windowManager.getMainWindow();
        if (!mainWindow) {
            this.logger.error('Cannot inject text: main window not found');
            return;
        }

        const webContents = mainWindow.webContents;
        const mainFrame = webContents.mainFrame;
        const frames = mainFrame.frames;

        this.logger.log('Looking for Gemini iframe in', frames.length, 'child frames');

        // Find the Gemini iframe in child frames (React shell architecture)
        const geminiFrame = frames.find((frame) => {
            try {
                return isGeminiDomain(frame.url);
            } catch {
                return false;
            }
        });

        if (!geminiFrame) {
            this.logger.error('Cannot inject text: Gemini iframe not found in child frames');
            return;
        }

        this.logger.log('Found Gemini iframe:', geminiFrame.url);

        // Check if we should disable auto-submit (for E2E testing)
        // E2E tests pass --e2e-disable-auto-submit flag to prevent actual Gemini submissions
        const isE2EMode = process.argv.includes('--e2e-disable-auto-submit');

        const shouldAutoSubmit = !isE2EMode;

        if (!shouldAutoSubmit) {
            this.logger.log('E2E mode: auto-submit disabled, will inject text only');
        }

        // Build and execute the injection script
        const injectionScript = new InjectionScriptBuilder().withText(text).withAutoSubmit(shouldAutoSubmit).build();

        try {
            const result = (await geminiFrame.executeJavaScript(injectionScript)) as InjectionResult;

            if (result?.success) {
                this.logger.log('Text injected into Gemini successfully');
            } else {
                this.logger.error('Injection script returned failure:', result?.error);
            }
        } catch (error) {
            this.logger.error('Failed to inject text into Gemini:', error);
        }
    }
}
