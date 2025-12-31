import { describe, it, expect } from 'vitest';
import {
  HotkeyScope,
  GLOBAL_HOTKEY_IDS,
  APPLICATION_HOTKEY_IDS,
  HOTKEY_SCOPE_MAP,
  getHotkeyScope,
  isGlobalHotkey,
  isApplicationHotkey,
  HOTKEY_IDS,
} from '../../../src/shared/types/hotkeys';

describe('Hotkey Types', () => {
  describe('hotkey scope types', () => {
    describe('GLOBAL_HOTKEY_IDS', () => {
      it('should contain quickChat and bossKey', () => {
        expect(GLOBAL_HOTKEY_IDS).toContain('quickChat');
        expect(GLOBAL_HOTKEY_IDS).toContain('bossKey');
      });

      it('should not contain application hotkeys', () => {
        expect(GLOBAL_HOTKEY_IDS).not.toContain('alwaysOnTop');
        expect(GLOBAL_HOTKEY_IDS).not.toContain('printToPdf');
      });
    });

    describe('APPLICATION_HOTKEY_IDS', () => {
      it('should contain alwaysOnTop and printToPdf', () => {
        expect(APPLICATION_HOTKEY_IDS).toContain('alwaysOnTop');
        expect(APPLICATION_HOTKEY_IDS).toContain('printToPdf');
      });

      it('should not contain global hotkeys', () => {
        expect(APPLICATION_HOTKEY_IDS).not.toContain('quickChat');
        expect(APPLICATION_HOTKEY_IDS).not.toContain('bossKey');
      });
    });

    describe('HOTKEY_SCOPE_MAP', () => {
      it('should be exported and have entries for all hotkeys', () => {
        expect(HOTKEY_SCOPE_MAP).toBeDefined();
        expect(Object.keys(HOTKEY_SCOPE_MAP).length).toBe(HOTKEY_IDS.length);
      });

      it('should map global hotkeys to "global"', () => {
        expect(HOTKEY_SCOPE_MAP.quickChat).toBe('global');
        expect(HOTKEY_SCOPE_MAP.bossKey).toBe('global');
      });

      it('should map application hotkeys to "application"', () => {
        expect(HOTKEY_SCOPE_MAP.alwaysOnTop).toBe('application');
        expect(HOTKEY_SCOPE_MAP.printToPdf).toBe('application');
      });
    });
  });

  describe('getHotkeyScope', () => {
    it('should return global for quickChat', () => {
      expect(getHotkeyScope('quickChat')).toBe('global');
    });

    it('should return global for bossKey', () => {
      expect(getHotkeyScope('bossKey')).toBe('global');
    });

    it('should return application for alwaysOnTop', () => {
      expect(getHotkeyScope('alwaysOnTop')).toBe('application');
    });

    it('should return application for printToPdf', () => {
      expect(getHotkeyScope('printToPdf')).toBe('application');
    });
  });

  describe('isGlobalHotkey', () => {
    it.each(['quickChat', 'bossKey'] as const)('should return true for %s', (id) => {
      expect(isGlobalHotkey(id)).toBe(true);
    });

    it.each(['alwaysOnTop', 'printToPdf'] as const)('should return false for %s', (id) => {
      expect(isGlobalHotkey(id)).toBe(false);
    });
  });

  describe('isApplicationHotkey', () => {
    it.each(['alwaysOnTop', 'printToPdf'] as const)('should return true for %s', (id) => {
      expect(isApplicationHotkey(id)).toBe(true);
    });

    it.each(['quickChat', 'bossKey'] as const)('should return false for %s', (id) => {
      expect(isApplicationHotkey(id)).toBe(false);
    });
  });

  describe('scope array completeness', () => {
    it('should have all hotkey IDs covered by exactly one scope', () => {
      const allScopeIds = [...GLOBAL_HOTKEY_IDS, ...APPLICATION_HOTKEY_IDS];
      expect(allScopeIds.length).toBe(HOTKEY_IDS.length);

      // Verify no duplicates
      const uniqueIds = new Set(allScopeIds);
      expect(uniqueIds.size).toBe(HOTKEY_IDS.length);
    });

    it('should have every HOTKEY_ID in exactly one scope array', () => {
      for (const id of HOTKEY_IDS) {
        const inGlobal = GLOBAL_HOTKEY_IDS.includes(id);
        const inApplication = APPLICATION_HOTKEY_IDS.includes(id);
        expect(inGlobal !== inApplication).toBe(true); // XOR - exactly one
      }
    });

    it('should have GLOBAL_HOTKEY_IDS + APPLICATION_HOTKEY_IDS length equal to HOTKEY_IDS length', () => {
      expect(GLOBAL_HOTKEY_IDS.length + APPLICATION_HOTKEY_IDS.length).toBe(HOTKEY_IDS.length);
    });
  });

  describe('type exports', () => {
    it('should export HotkeyScope type (type-level check via usage)', () => {
      // This test verifies the type is exported by using it
      const globalScope: HotkeyScope = 'global';
      const applicationScope: HotkeyScope = 'application';
      expect(globalScope).toBe('global');
      expect(applicationScope).toBe('application');
    });
  });
});
