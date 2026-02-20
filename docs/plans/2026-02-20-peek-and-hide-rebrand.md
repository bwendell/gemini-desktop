# Peek and Hide Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebrand the legacy hide/minimize hotkey feature to “Peek and Hide” everywhere so no legacy name remains in code, tests, docs, or assets.

**Architecture:** This is a repo-wide rename that touches shared hotkey types, settings persistence keys, IPC handlers, renderer UI labels, and test suites. It also updates documentation and assets, and includes a small migration to preserve user settings.

**Tech Stack:** Electron (main/preload), React (renderer), TypeScript, Vitest, WebdriverIO, Markdown/HTML docs.

---

## Naming & Mapping (authoritative)

Use the following new identifiers and labels:

- **User-facing label:** `Peek and Hide`
- **Hotkey ID:** `peekAndHide`
- **Store keys:** `hotkeyPeekAndHide`, `acceleratorPeekAndHide`
- **Test IDs:** `hotkey-toggle-peekAndHide`, `hotkey-row-peekAndHide`
- **E2E logger tag:** `peek-and-hide`
- **Spec filenames:** `peek-and-hide.spec.ts`, `peek-and-hide.integration.test.ts`
- **Docs asset:** `feature-peek-and-hide.png`

For legacy identifiers/labels, **do not re-introduce them** in code or docs. Locate them via repo search and replace with the mapping above.

---

## Task 1: Update shared hotkey types and defaults

**Files:**

- Modify: `src/shared/types/hotkeys.ts`
- Test: `tests/unit/shared/hotkeys.test.ts`

**Step 1: Write the failing test**

Update unit tests to expect the new hotkey ID and defaults in hotkey types and default accelerators.

**Step 2: Run test to verify it fails**

Run: `npx vitest tests/unit/shared/hotkeys.test.ts`
Expected: FAIL (hotkey ID and defaults still use legacy names)

**Step 3: Write minimal implementation**

Rename the hotkey ID in `HotkeyId`, `HOTKEY_IDS`, `GLOBAL_HOTKEY_IDS`, `HOTKEY_SCOPE_MAP`, `IndividualHotkeySettings`, `HotkeySettings`, and `DEFAULT_ACCELERATORS`. Ensure the new ID is consistent everywhere.

**Step 4: Run test to verify it passes**

Run: `npx vitest tests/unit/shared/hotkeys.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/shared/types/hotkeys.ts tests/unit/shared/hotkeys.test.ts
git commit -m "refactor: rename hide hotkey id to peek and hide"
```

---

## Task 2: Migrate persistence keys in main process

**Files:**

- Modify: `src/main/managers/ipc/types.ts`
- Modify: `src/main/managers/ipcManager.ts`
- Modify: `src/main/managers/ipc/HotkeyIpcHandler.ts`
- Test: `tests/unit/main/ipcManager.test.ts`
- Test: `tests/unit/main/ipc/HotkeyIpcHandler.test.ts`

**Step 1: Write the failing test**

Add tests that validate:

- New store keys are used for enabled state and accelerator.
- A migration path reads legacy keys if present and writes new keys (without leaving legacy keys used in runtime).

**Step 2: Run test to verify it fails**

Run: `npx vitest tests/unit/main/ipcManager.test.ts tests/unit/main/ipc/HotkeyIpcHandler.test.ts`
Expected: FAIL (new keys/migration not yet implemented)

**Step 3: Write minimal implementation**

Update store key names in main IPC types and manager defaults to the new keys. Implement a migration in `HotkeyIpcHandler` (or store initialization) that:

- If new keys are missing but legacy keys exist, read the legacy values and write them to the new keys.
- Use new keys for reads/writes thereafter.
- Do not surface legacy names in runtime APIs.

**Step 4: Run test to verify it passes**

Run: `npx vitest tests/unit/main/ipcManager.test.ts tests/unit/main/ipc/HotkeyIpcHandler.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/main/managers/ipc/types.ts src/main/managers/ipcManager.ts src/main/managers/ipc/HotkeyIpcHandler.ts \
  tests/unit/main/ipcManager.test.ts tests/unit/main/ipc/HotkeyIpcHandler.test.ts
git commit -m "refactor: migrate peek and hide hotkey store keys"
```

---

## Task 3: Update hotkey manager logic and tests

**Files:**

- Modify: `src/main/managers/hotkeyManager.ts`
- Test: `tests/unit/main/hotkeyManager.test.ts`
- Test: `tests/unit/main/utils/dbusFallback.test.ts`

**Step 1: Write the failing test**

Update unit tests to use the new hotkey ID. Ensure any test names or assertions reflect the new label.

**Step 2: Run test to verify it fails**

Run: `npx vitest tests/unit/main/hotkeyManager.test.ts tests/unit/main/utils/dbusFallback.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Replace the legacy hotkey ID with `peekAndHide`. Update comments/log text to “Peek and Hide”.

**Step 4: Run test to verify it passes**

Run: `npx vitest tests/unit/main/hotkeyManager.test.ts tests/unit/main/utils/dbusFallback.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/main/managers/hotkeyManager.ts tests/unit/main/hotkeyManager.test.ts tests/unit/main/utils/dbusFallback.test.ts
git commit -m "refactor: rename hide hotkey in hotkey manager"
```

---

## Task 4: Update preload bridge and renderer hotkey context

**Files:**

- Modify: `src/preload/preload.ts`
- Modify: `src/renderer/context/IndividualHotkeysContext.tsx`
- Test: `tests/unit/renderer/test/setup.ts`
- Test: `tests/unit/renderer/components/LinuxHotkeyNotice.test.tsx`

**Step 1: Write the failing test**

Update renderer tests to reference `peekAndHide` and updated labels.

**Step 2: Run test to verify it fails**

Run: `npx vitest tests/unit/renderer/components/LinuxHotkeyNotice.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

Update preload type signatures and renderer context keys to the new hotkey ID. Ensure default state includes `peekAndHide`.

**Step 4: Run test to verify it passes**

Run: `npx vitest tests/unit/renderer/components/LinuxHotkeyNotice.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/preload/preload.ts src/renderer/context/IndividualHotkeysContext.tsx \
  tests/unit/renderer/test/setup.ts tests/unit/renderer/components/LinuxHotkeyNotice.test.tsx
git commit -m "refactor: update renderer hotkey id to peek and hide"
```

---

## Task 5: Update renderer UI labels and toggle IDs

**Files:**

- Modify: `src/renderer/components/options/IndividualHotkeyToggles.tsx`
- Test: `tests/e2e/hotkey-toggle.spec.ts`

**Step 1: Write the failing test**

Update E2E toggle labels and test IDs to new label and ID.

**Step 2: Run test to verify it fails**

Run: `npx wdio run config/wdio/wdio.conf.js --spec tests/e2e/hotkey-toggle.spec.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Update the toggle config to use `peekAndHide` and the label “Peek and Hide”. Update test IDs to the new names.

**Step 4: Run test to verify it passes**

Run: `npx wdio run config/wdio/wdio.conf.js --spec tests/e2e/hotkey-toggle.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/components/options/IndividualHotkeyToggles.tsx tests/e2e/hotkey-toggle.spec.ts
git commit -m "refactor: update peek and hide hotkey toggle labels"
```

---

## Task 6: Rename E2E/integration spec files and update references

**Files:**

- Rename: `tests/e2e/peek-and-hide.spec.ts`
- Rename: `tests/integration/peek-and-hide.integration.test.ts`
- Modify: `config/wdio/wdio.conf.js`
- Modify: `config/wdio/wdio.group.window.conf.js`

**Step 1: Write the failing test**

Update config specs to point at the new filenames.

**Step 2: Run test to verify it fails**

Run: `npx wdio run config/wdio/wdio.group.window.conf.js --spec tests/e2e/peek-and-hide.spec.ts`
Expected: FAIL (until files are renamed)

**Step 3: Write minimal implementation**

Rename the legacy spec files to the new filenames, update imports and tags inside the files, and update WDIO configs to reference the new names. Ensure any logger tags and test titles reflect “Peek and Hide”.

**Step 4: Run test to verify it passes**

Run: `npx wdio run config/wdio/wdio.group.window.conf.js --spec tests/e2e/peek-and-hide.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/e2e/peek-and-hide.spec.ts tests/integration/peek-and-hide.integration.test.ts \
  config/wdio/wdio.conf.js config/wdio/wdio.group.window.conf.js
git commit -m "refactor: rename peek and hide specs"
```

---

## Task 7: Update remaining tests and coordinated specs

**Files:**

- Modify: `tests/coordinated/hotkey-coordination.coordinated.test.ts`
- Modify: `tests/coordinated/wayland-hotkey-coordination.coordinated.test.ts`
- Modify: `tests/coordinated/window-tray-menu-coordination.coordinated.test.ts`
- Modify: `tests/coordinated/ipc/HotkeyIpcHandler.coordinated.test.ts`
- Modify: `tests/e2e/settings-persistence.spec.ts`
- Modify: `tests/e2e/release/hotkey-release.spec.ts`
- Modify: `tests/e2e/helpers/hotkeyHelpers.ts`
- Modify: `tests/e2e/pages/OptionsPage.ts`
- Modify: `tests/integration/persistence.integration.test.ts`
- Modify: `tests/helpers/mocks/main/managers.ts`

**Step 1: Write the failing test**

Update references in tests to use the new hotkey ID and label. Ensure any test names/strings reflect “Peek and Hide”.

**Step 2: Run test to verify it fails**

Run: `npx vitest tests/coordinated/hotkey-coordination.coordinated.test.ts tests/coordinated/wayland-hotkey-coordination.coordinated.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Update all references to the legacy hotkey ID/label in the listed tests and helpers.

**Step 4: Run test to verify it passes**

Run: `npx vitest tests/coordinated/hotkey-coordination.coordinated.test.ts tests/coordinated/wayland-hotkey-coordination.coordinated.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/coordinated/hotkey-coordination.coordinated.test.ts \
  tests/coordinated/wayland-hotkey-coordination.coordinated.test.ts \
  tests/coordinated/window-tray-menu-coordination.coordinated.test.ts \
  tests/coordinated/ipc/HotkeyIpcHandler.coordinated.test.ts \
  tests/e2e/settings-persistence.spec.ts \
  tests/e2e/release/hotkey-release.spec.ts \
  tests/e2e/helpers/hotkeyHelpers.ts \
  tests/e2e/pages/OptionsPage.ts \
  tests/integration/persistence.integration.test.ts \
  tests/helpers/mocks/main/managers.ts
git commit -m "test: update peek and hide references"
```

---

## Task 8: Update documentation and assets

**Files:**

- Modify: `README.md`
- Modify: `docs/index.html`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/WAYLAND_MANUAL_TESTING.md`
- Modify: `docs/TEST_PLAN_WAYLAND_HOTKEY_P0_P1.md`
- Modify: `openspec/project.md`
- Modify: `openspec/changes/archive/2025-12-31-fix-failing-e2e-tests/tasks.md`
- Modify: `openspec/changes/archive/2026-01-02-add-print-to-pdf/tasks.md`
- Rename: `docs/assets/feature-peek-and-hide.png`

**Step 1: Write the failing test**

Not applicable (docs).

**Step 2: Run doc lint (optional)**

Run: `npm run lint` (optional) to ensure no markdown linting or build checks fail.

**Step 3: Write minimal implementation**

Replace legacy naming and “Stealth” label text with “Peek and Hide”. Update the roadmap entry and any feature descriptions. Update the docs asset reference and rename the asset file to `feature-peek-and-hide.png`.

**Step 4: Verification**

Run a repo-wide search for the legacy label and legacy hotkey ID to confirm zero matches remain.

**Step 5: Commit**

```bash
git add README.md docs/index.html docs/ARCHITECTURE.md docs/WAYLAND_MANUAL_TESTING.md \
  docs/TEST_PLAN_WAYLAND_HOTKEY_P0_P1.md openspec/project.md \
  openspec/changes/archive/2025-12-31-fix-failing-e2e-tests/tasks.md \
  openspec/changes/archive/2026-01-02-add-print-to-pdf/tasks.md \
  docs/assets/feature-peek-and-hide.png
git commit -m "docs: rename hide hotkey to peek and hide"
```

---

## Task 9: End-to-end verification sweep

**Files:**

- Modify: None (verification only)

**Step 1: Typecheck/build**

Run: `npm run build`
Expected: PASS

**Step 2: Run unit tests**

Run: `npm run test`
Expected: PASS

**Step 3: Run coordinated tests**

Run: `npm run test:coordinated`
Expected: PASS (or document pre-existing failures)

**Step 4: Run E2E tests (targeted)**

Run:

```
npx wdio run config/wdio/wdio.conf.js --spec tests/e2e/peek-and-hide.spec.ts
npx wdio run config/wdio/wdio.conf.js --spec tests/e2e/hotkey-toggle.spec.ts
```

Expected: PASS

**Step 5: Final validation**

Run a repo-wide search for legacy terms/identifiers to confirm zero matches remain. If any appear in build artifacts, remove/rebuild them as needed.

---

## Notes & Risks

- **Settings migration:** Ensure the migration is one-way and does not re-surface legacy names in runtime APIs.
- **Build artifacts:** If generated output is committed, ensure it is rebuilt so legacy strings do not persist.
- **External references:** Update any CI or release scripts if they reference renamed spec filenames.

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-02-20-peek-and-hide-rebrand.md`. Two execution options:

1. **Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Parallel Session (separate)** — Open new session with executing-plans, batch execution with checkpoints.

Which approach?
