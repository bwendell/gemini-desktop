---
description: Implement an approved OpenSpec change and keep tasks in sync.
---

<!-- OPENSPEC:START -->

**Guardrails**

- Favor straightforward, minimal implementations first and add complexity only when it is requested or clearly required.
- Keep changes tightly scoped to the requested outcome.
- Refer to `openspec/AGENTS.md` (located inside the `openspec/` directory—run `ls openspec` or `openspec update` if you don't see it) if you need additional OpenSpec conventions or clarifications.

**Usage**
`/openspec-apply <change-id>` — work through all tasks
`/openspec-apply <change-id> task X.X` — implement a specific task

**Steps**
Track these steps as TODOs and complete them one by one.

1. Read `changes/<id>/proposal.md`, `design.md` (if present), and `tasks.md` to confirm scope.
2. If a specific task is provided (e.g., "task 1.1"), focus only on that task and its subtasks.
3. Each task in `tasks.md` is self-contained with:
   - **Files**: What to create/modify/delete
   - **Context**: References to review
   - **Acceptance Criteria**: What must be true when done
   - **Verification**: Commands to run
4. Implement the task, keeping edits minimal and focused.
5. Run the verification commands specified in the task.
6. **REQUIRED**: After completing implementation, mark the task and all subtasks as `[x]` in `tasks.md`.
7. Reference `openspec list` or `openspec show <item>` when additional context is required.

**Reference**

- Use `openspec show <id> --json --deltas-only` if you need additional context from the proposal while implementing.
<!-- OPENSPEC:END -->
