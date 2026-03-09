# GitHub Copilot Instructions

Welcome! You are an AI assistant helping with the `gemini-desktop` project.

## Core Directives

1. **Think Step-by-Step:** ALWAYS formulate a brief implementation plan and outline your structural approach before generating code.
2. **Read the Rules:** Please read focusing on `AGENTS.md` (located in the repository root) for comprehensive technical rules, project structure, and architectural conventions.
3. **Respect Constraints:** Ensure you adhere strictly to project constraints, such as no telemetry, Google-only remote connections, and keeping Node.js APIs strictly out of the renderer process.
4. **Fresh Worktrees Need Setup:** If you create or switch to a new git worktree, run `npm install` in that worktree before any `npm run` command. `node_modules` and the Electron binary are local to each worktree.

## Where to find more context

- **Repository Guidelines:** `AGENTS.md` (Root)
- **Architecture & Design:** `docs/ARCHITECTURE.md`
- **Specific Anti-Patterns:** See the "Anti-Patterns & Deprecated Practices" section at the bottom of `AGENTS.md`.
