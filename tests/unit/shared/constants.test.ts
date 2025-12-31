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

    describe('Print to PDF channels', () => {
      it('should define PRINT_TO_PDF_TRIGGER channel', () => {
        expect(IPC_CHANNELS.PRINT_TO_PDF_TRIGGER).toBeDefined();
        expect(IPC_CHANNELS.PRINT_TO_PDF_TRIGGER).toBe('print-to-pdf:trigger');
      });

      it('should define PRINT_TO_PDF_SUCCESS channel', () => {
        expect(IPC_CHANNELS.PRINT_TO_PDF_SUCCESS).toBeDefined();
        expect(IPC_CHANNELS.PRINT_TO_PDF_SUCCESS).toBe('print-to-pdf:success');
      });

      it('should define PRINT_TO_PDF_ERROR channel', () => {
        expect(IPC_CHANNELS.PRINT_TO_PDF_ERROR).toBeDefined();
        expect(IPC_CHANNELS.PRINT_TO_PDF_ERROR).toBe('print-to-pdf:error');
      });

      it('should follow the print-to-pdf: namespace pattern', () => {
        expect(IPC_CHANNELS.PRINT_TO_PDF_TRIGGER).toMatch(/^print-to-pdf:/);
        expect(IPC_CHANNELS.PRINT_TO_PDF_SUCCESS).toMatch(/^print-to-pdf:/);
        expect(IPC_CHANNELS.PRINT_TO_PDF_ERROR).toMatch(/^print-to-pdf:/);
      });
    });
  });
});
