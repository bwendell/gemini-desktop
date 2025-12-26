
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
  });
});
