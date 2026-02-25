/**
 * Unit tests for Microphone Activation Utility.
 *
 * Tests the activateMicrophoneInFrame function which injects and executes
 * a microphone button click into the Gemini iframe.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebFrameMain } from 'electron';

import { activateMicrophoneInFrame, type MicActivationResult } from '../../../src/main/utils/micActivation';
import { GEMINI_MICROPHONE_BUTTON_SELECTORS } from '../../../src/main/utils/geminiSelectors';

describe('micActivation', () => {
    let mockFrame: any;

    beforeEach(() => {
        mockFrame = {
            executeJavaScript: vi.fn(),
        } as unknown as WebFrameMain;
    });

    describe('activateMicrophoneInFrame', () => {
        it('should return success when microphone button is found and clicked', async () => {
            const expectedResult: MicActivationResult = { success: true };
            mockFrame.executeJavaScript.mockResolvedValue(expectedResult);

            const result = await activateMicrophoneInFrame(mockFrame);

            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
            expect(mockFrame.executeJavaScript).toHaveBeenCalledOnce();
        });

        it('should return error when microphone button not found', async () => {
            const expectedResult: MicActivationResult = {
                success: false,
                error: 'microphone_button_not_found',
            };
            mockFrame.executeJavaScript.mockResolvedValue(expectedResult);

            const result = await activateMicrophoneInFrame(mockFrame);

            expect(result.success).toBe(false);
            expect(result.error).toBe('microphone_button_not_found');
        });

        it('should execute JavaScript with userGesture=true as second parameter', async () => {
            mockFrame.executeJavaScript.mockResolvedValue({ success: true });

            await activateMicrophoneInFrame(mockFrame);

            const callArgs = mockFrame.executeJavaScript.mock.calls[0];
            expect(callArgs[1]).toBe(true); // userGesture param
        });

        it('should use correct selector chain from GEMINI_MICROPHONE_BUTTON_SELECTORS', async () => {
            mockFrame.executeJavaScript.mockResolvedValue({ success: true });

            await activateMicrophoneInFrame(mockFrame);

            const script = mockFrame.executeJavaScript.mock.calls[0][0];
            const selectorsJson = JSON.stringify(GEMINI_MICROPHONE_BUTTON_SELECTORS);
            expect(script).toContain(selectorsJson);
        });

        it('should return error message when executeJavaScript throws', async () => {
            const errorMessage = 'Frame is detached';
            mockFrame.executeJavaScript.mockRejectedValue(new Error(errorMessage));

            const result = await activateMicrophoneInFrame(mockFrame);

            expect(result.success).toBe(false);
            expect(result.error).toBe(errorMessage);
        });

        it('should handle non-Error objects thrown by executeJavaScript', async () => {
            mockFrame.executeJavaScript.mockRejectedValue('string error');

            const result = await activateMicrophoneInFrame(mockFrame);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unknown error');
        });

        it('should handle click failure gracefully', async () => {
            const expectedResult: MicActivationResult = {
                success: false,
                error: 'click_failed',
            };
            mockFrame.executeJavaScript.mockResolvedValue(expectedResult);

            const result = await activateMicrophoneInFrame(mockFrame);

            expect(result.success).toBe(false);
            expect(result.error).toBe('click_failed');
        });

        it('injected script should contain safeQuerySelector utility', async () => {
            mockFrame.executeJavaScript.mockResolvedValue({ success: true });

            await activateMicrophoneInFrame(mockFrame);

            const script = mockFrame.executeJavaScript.mock.calls[0][0];
            expect(script).toContain('function safeQuerySelector');
        });

        it('injected script should contain safeClick utility', async () => {
            mockFrame.executeJavaScript.mockResolvedValue({ success: true });

            await activateMicrophoneInFrame(mockFrame);

            const script = mockFrame.executeJavaScript.mock.calls[0][0];
            expect(script).toContain('function safeClick');
        });

        it('should pass script as first argument to executeJavaScript', async () => {
            mockFrame.executeJavaScript.mockResolvedValue({ success: true });

            await activateMicrophoneInFrame(mockFrame);

            const callArgs = mockFrame.executeJavaScript.mock.calls[0];
            expect(typeof callArgs[0]).toBe('string');
            expect(callArgs[0]).toContain('function() {');
        });

        it('should return structured result with success and optional error', async () => {
            mockFrame.executeJavaScript.mockResolvedValue({ success: false, error: 'test_error' });

            const result = await activateMicrophoneInFrame(mockFrame);

            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('error');
            expect(typeof result.success).toBe('boolean');
        });
    });
});
