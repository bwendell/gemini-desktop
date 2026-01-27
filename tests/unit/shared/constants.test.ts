import { describe, it, expect } from 'vitest';
import { IPC_CHANNELS } from '../../../src/shared/constants/ipc-channels';

describe('Shared Constants', () => {
    describe('IPC_CHANNELS', () => {
        it('should have unique values for all channels', () => {
            const values = Object.values(IPC_CHANNELS);
            const uniqueValues = new Set(values);
            expect(uniqueValues.size).toBe(values.length);
        });

        it('should define critical window channels', () => {
            expect(IPC_CHANNELS.WINDOW_MINIMIZE).toBeDefined();
            expect(IPC_CHANNELS.WINDOW_MAXIMIZE).toBeDefined();
            expect(IPC_CHANNELS.WINDOW_CLOSE).toBeDefined();
        });

        describe('Export channels', () => {
            it('should define EXPORT_CHAT_PDF channel', () => {
                expect(IPC_CHANNELS.EXPORT_CHAT_PDF).toBeDefined();
                expect(IPC_CHANNELS.EXPORT_CHAT_PDF).toBe('export-chat:pdf');
            });

            it('should define EXPORT_CHAT_MARKDOWN channel', () => {
                expect(IPC_CHANNELS.EXPORT_CHAT_MARKDOWN).toBeDefined();
                expect(IPC_CHANNELS.EXPORT_CHAT_MARKDOWN).toBe('export-chat:markdown');
            });

            it('should follow the export-chat: namespace pattern', () => {
                expect(IPC_CHANNELS.EXPORT_CHAT_PDF).toMatch(/^export-chat:/);
                expect(IPC_CHANNELS.EXPORT_CHAT_MARKDOWN).toMatch(/^export-chat:/);
            });
        });
    });
});
