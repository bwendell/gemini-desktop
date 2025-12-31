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
  DEFAULT_ACCELERATORS,
  type HotkeyId,
  type IndividualHotkeySettings,
  type HotkeySettings,
  type HotkeyConfig,
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
    });
  });

  // ==========================================================================
  // printToPdf Hotkey Specific Tests
  // ==========================================================================

  describe('printToPdf default accelerator', () => {
    it('should have default accelerator CommandOrControl+Shift+P', () => {
      expect(DEFAULT_ACCELERATORS.printToPdf).toBe('CommandOrControl+Shift+P');
    });

    it('should be a valid Electron accelerator format', () => {
      const accelerator = DEFAULT_ACCELERATORS.printToPdf;
      expect(accelerator).toMatch(/^(CommandOrControl|Ctrl|Command)\+/);
    });

    it('should use CommandOrControl modifier for cross-platform compatibility', () => {
      expect(DEFAULT_ACCELERATORS.printToPdf).toContain('CommandOrControl');
    });
  });

  describe('HotkeyId type', () => {
    it('should include printToPdf as a valid HotkeyId', () => {
      const validIds: HotkeyId[] = ['quickChat', 'bossKey', 'alwaysOnTop', 'printToPdf'];
      validIds.forEach((id) => {
        expect(HOTKEY_IDS).toContain(id);
      });
    });

    it('printToPdf should be assignable to HotkeyId type', () => {
      const id: HotkeyId = 'printToPdf';
      expect(id).toBe('printToPdf');
    });

    it('should have DEFAULT_ACCELERATORS entry for printToPdf', () => {
      const id: HotkeyId = 'printToPdf';
      expect(DEFAULT_ACCELERATORS[id]).toBeDefined();
      expect(typeof DEFAULT_ACCELERATORS[id]).toBe('string');
    });
  });

  describe('HOTKEY_IDS array', () => {
    it('should include printToPdf', () => {
      expect(HOTKEY_IDS).toContain('printToPdf');
    });

    it('should have exactly 4 hotkey IDs', () => {
      expect(HOTKEY_IDS).toHaveLength(4);
    });

    it('should include all expected hotkey IDs', () => {
      expect(HOTKEY_IDS).toEqual(
        expect.arrayContaining(['quickChat', 'bossKey', 'alwaysOnTop', 'printToPdf'])
      );
    });

    it('should have printToPdf at a consistent position', () => {
      const index = HOTKEY_IDS.indexOf('printToPdf');
      expect(index).toBeGreaterThanOrEqual(0);
    });
  });

  describe('printToPdf hotkey scope', () => {
    it('should be classified as an application hotkey', () => {
      expect(isApplicationHotkey('printToPdf')).toBe(true);
    });

    it('should NOT be classified as a global hotkey', () => {
      expect(isGlobalHotkey('printToPdf')).toBe(false);
    });

    it('should return application scope from getHotkeyScope', () => {
      expect(getHotkeyScope('printToPdf')).toBe('application');
    });

    it('should be in APPLICATION_HOTKEY_IDS array', () => {
      expect(APPLICATION_HOTKEY_IDS).toContain('printToPdf');
    });

    it('should NOT be in GLOBAL_HOTKEY_IDS array', () => {
      expect(GLOBAL_HOTKEY_IDS).not.toContain('printToPdf');
    });

    it('should have correct scope in HOTKEY_SCOPE_MAP', () => {
      expect(HOTKEY_SCOPE_MAP.printToPdf).toBe('application');
    });
  });

  describe('IndividualHotkeySettings for printToPdf', () => {
    it('should accept printToPdf with enabled true', () => {
      const settings: IndividualHotkeySettings = {
        quickChat: true,
        bossKey: true,
        alwaysOnTop: true,
        printToPdf: true,
      };
      expect(settings.printToPdf).toBe(true);
    });

    it('should accept printToPdf with enabled false', () => {
      const settings: IndividualHotkeySettings = {
        quickChat: true,
        bossKey: true,
        alwaysOnTop: true,
        printToPdf: false,
      };
      expect(settings.printToPdf).toBe(false);
    });

    it('should require printToPdf property (type-level check)', () => {
      // This verifies that the interface requires printToPdf
      const settings: IndividualHotkeySettings = {
        quickChat: false,
        bossKey: false,
        alwaysOnTop: false,
        printToPdf: true,
      };
      expect(Object.keys(settings)).toContain('printToPdf');
    });
  });

  describe('HotkeySettings for printToPdf accelerator', () => {
    it('should accept HotkeyConfig for printToPdf', () => {
      const config: HotkeyConfig = {
        enabled: true,
        accelerator: 'CommandOrControl+Shift+P',
      };
      const settings: HotkeySettings = {
        quickChat: config,
        bossKey: config,
        alwaysOnTop: config,
        printToPdf: config,
      };
      expect(settings.printToPdf.accelerator).toBe('CommandOrControl+Shift+P');
      expect(settings.printToPdf.enabled).toBe(true);
    });

    it('should accept custom accelerator for printToPdf', () => {
      const settings: HotkeySettings = {
        quickChat: { enabled: true, accelerator: 'CommandOrControl+Shift+Space' },
        bossKey: { enabled: true, accelerator: 'CommandOrControl+Alt+E' },
        alwaysOnTop: { enabled: true, accelerator: 'CommandOrControl+Shift+T' },
        printToPdf: { enabled: true, accelerator: 'CommandOrControl+Alt+P' },
      };
      expect(settings.printToPdf.accelerator).toBe('CommandOrControl+Alt+P');
    });

    it('should accept default accelerator for printToPdf', () => {
      const settings: HotkeySettings = {
        quickChat: { enabled: true, accelerator: DEFAULT_ACCELERATORS.quickChat },
        bossKey: { enabled: true, accelerator: DEFAULT_ACCELERATORS.bossKey },
        alwaysOnTop: { enabled: true, accelerator: DEFAULT_ACCELERATORS.alwaysOnTop },
        printToPdf: { enabled: true, accelerator: DEFAULT_ACCELERATORS.printToPdf },
      };
      expect(settings.printToPdf.accelerator).toBe('CommandOrControl+Shift+P');
    });

    it('should reflect disabled state in HotkeyConfig', () => {
      const settings: HotkeySettings = {
        quickChat: { enabled: true, accelerator: DEFAULT_ACCELERATORS.quickChat },
        bossKey: { enabled: true, accelerator: DEFAULT_ACCELERATORS.bossKey },
        alwaysOnTop: { enabled: true, accelerator: DEFAULT_ACCELERATORS.alwaysOnTop },
        printToPdf: { enabled: false, accelerator: DEFAULT_ACCELERATORS.printToPdf },
      };
      expect(settings.printToPdf.enabled).toBe(false);
      expect(settings.printToPdf.accelerator).toBe('CommandOrControl+Shift+P');
    });
  });

  describe('printToPdf edge cases', () => {
    it('should handle printToPdf in exhaustive switch statements', () => {
      // If there's a switch over HotkeyId, ensure printToPdf case exists
      const handleHotkey = (id: HotkeyId): string => {
        switch (id) {
          case 'quickChat':
            return 'quick';
          case 'bossKey':
            return 'boss';
          case 'alwaysOnTop':
            return 'aot';
          case 'printToPdf':
            return 'print';
        }
      };
      expect(handleHotkey('printToPdf')).toBe('print');
    });

    it('should be iterable with other hotkeys', () => {
      const results = HOTKEY_IDS.map((id) => id.toUpperCase());
      expect(results).toContain('PRINTTOPDF');
    });

    it('should work in filter operations', () => {
      const appHotkeys = HOTKEY_IDS.filter((id) => isApplicationHotkey(id));
      expect(appHotkeys).toContain('printToPdf');
    });

    it('should work in reduce operations', () => {
      const acceleratorMap = HOTKEY_IDS.reduce(
        (acc, id) => {
          acc[id] = DEFAULT_ACCELERATORS[id];
          return acc;
        },
        {} as Record<HotkeyId, string>
      );
      expect(acceleratorMap.printToPdf).toBe('CommandOrControl+Shift+P');
    });

    it('should have unique default accelerator', () => {
      const printPdfAccel = DEFAULT_ACCELERATORS.printToPdf;
      const otherAccelerators = Object.entries(DEFAULT_ACCELERATORS)
        .filter(([key]) => key !== 'printToPdf')
        .map(([, value]) => value);
      expect(otherAccelerators).not.toContain(printPdfAccel);
    });
  });
});
