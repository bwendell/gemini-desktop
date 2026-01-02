---
description: Template for writing self-contained OpenSpec tasks
---

# Task Format Template

When creating or updating `tasks.md` files, each task should be self-contained so any agent can execute it without additional context.

## Required Elements Per Task

````markdown
- [ ] X.X Task Title

  **Files:**
  - [NEW] `path/to/new/file.ts` - Brief description
  - [MODIFY] `path/to/existing/file.ts` - What changes
  - [DELETE] `path/to/remove.ts` - Why removing

  **Context:**
  - Review `path/to/reference.ts` for patterns to follow
  - See `design.md` Section X for architecture decisions

  **Acceptance Criteria:**
  - Specific, testable outcomes
  - What must be true when done

  **Verification:**

  ```bash
  npm run test -- TestName
  npm run build
  ```
````

````

## Guidelines

1. **Files section**: List ALL files that will be created, modified, or deleted
2. **Context section**: Reference existing code/docs only when patterns aren't obvious
3. **Acceptance criteria**: Be specific - "works correctly" is not acceptable
4. **Verification**: Include exact commands to run

## Subtasks

For complex tasks, nest subtasks but keep the parent task's context:

```markdown
- [ ] 1.1 Create Toast component

  **Files:**
  - [NEW] `src/renderer/components/toast/Toast.tsx`
  - [NEW] `src/renderer/components/toast/Toast.css`

  **Subtasks:**
  - [ ] 1.1.1 Define ToastProps interface
  - [ ] 1.1.2 Implement base component
  - [ ] 1.1.3 Add variant styling

  **Acceptance Criteria:**
  - All 5 toast types render correctly
  - Styling matches existing design language

  **Verification:**
  ```bash
  npm run test -- Toast
````

```

## Anti-patterns to Avoid

- ❌ "Create the component" (no files specified)
- ❌ "Make it work" (no acceptance criteria)
- ❌ "Test it" (no specific commands)
- ❌ Assuming agent knows the codebase structure
```
