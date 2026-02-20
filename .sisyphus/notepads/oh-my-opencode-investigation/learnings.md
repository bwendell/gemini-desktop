# Learnings

## 2026-02-20 Investigation: Unexpected Changes Handling

### Search Scope

- Directories searched: /home/bwend/.config/opencode, /home/bwend/.local/share/opencode
- Patterns searched: "unexpected changes", "git clean", "git reset", "git checkout", "git restore", "discard", "rollback"

### Key Findings

1. **No oh-my-opencode directory exists** - Only opencode configuration found

2. **No "unexpected changes" string found** - Exact phrase not present in codebase

3. **Primary rollback mechanism: git reset --hard**
    - File: `/home/bwend/.config/opencode/skills/loki-mode/references/core-workflow.md`
    - Line 258: `git reset --hard $last_good_commit`
    - Used in VERIFY step when task verification fails (lines 56-61)

4. **Git checkout usage:**
    - finishing-a-development-branch/SKILL.md (lines 72, 130) - branch management
    - loki-mode/benchmarks/prepare-submission.sh (line 180) - branch creation

5. **Git clean/restore:** Not found in skill code (only in node_modules)

### Component Responsible

The **loki-mode skill** handles unexpected changes through its RARV cycle's VERIFY step, which rolls back to git checkpoints using `git reset --hard`.

## 2026-02-20 Investigation: Push Workflow and Auto-Clean Behavior

### Git Push Behavior

**Source**: `code-yeongyu/oh-my-opencode` repository
**Commit SHA**: 0832505e131a84da6a1e9c112580be285c00fa2b

#### 1. git-master Skill Push Guidance

**Citation**: https://github.com/code-yeongyu/oh-my-opencode/blob/0832505e131a84da6a1e9c112580be285c00fa2b/src/features/builtin-skills/skills/git-master.ts#L558-L567

```typescript
### 6.2 Force Push Decision

IF fixup was used AND branch has upstream:
  -> Requires: git push --force-with-lease
  -> WARN user about force push implications

IF only new commits:
  -> Regular: git push
```

**Key Findings**:

- NO automatic push behavior
- Requires manual user action
- Provides guidance for push type (force-with-lease vs regular)
- Warns about force push implications
- Explicitly states "NEXT STEPS: git push [--force-with-lease]"

#### 2. publish.ts Script (Release Workflow)

**Citation**: https://github.com/code-yeongyu/oh-my-opencode/blob/0832505e131a84da6a1e9c112580be285c00fa2b/script/publish.ts#L359-L368

```typescript
// Push tags first (critical for release), then try branch push (non-critical)
console.log('Pushing tags...');
await $`git push origin --tags`;

console.log('Pushing branch...');
const branchPush = await $`git push origin HEAD`.nothrow();
if (branchPush.exitCode !== 0) {
    console.log(`⚠️  Branch push failed (remote may have new commits). Tag was pushed successfully.`);
    console.log(`   To sync manually: git pull --rebase && git push`);
}
```

**Key Findings**:

- This is for release/publish workflow ONLY
- NOT automatic during normal development
- Graceful failure handling (branch push failure doesn't block release)
- Manual sync guidance provided

#### 3. Reset/Rebuild Workflow

**Citation**: https://github.com/code-yeongyu/oh-my-opencode/blob/0832505e131a84da6a1e9c112580be285c00fa2b/src/features/builtin-skills/skills/git-master.ts#L432-L445

```typescript
RESET WORKFLOW:
  1. git reset --soft $(git merge-base HEAD main)
  2. All changes now staged
  3. Re-commit in proper atomic units
  4. Clean history from scratch

ONLY IF:
  - All commits are local (not pushed)
  - User explicitly allows OR branch is clearly WIP
```

**Key Findings**:

- Reset only allowed for UNPUSHED commits
- Requires explicit user permission
- Safety constraint: Never rewrite pushed history without permission

### Session Storage and Cleanup

**Source**: `anomalyco/opencode` core repository issues

#### 1. No Automatic Cleanup

**Citation**: https://github.com/anomalyco/opencode/issues/4980#issuecomment-2512347567

> "No it does not [automatically clean up]"
> — @rekram1-node (maintainer), Dec 2, 2025

**Key Findings**:

- OpenCode does NOT automatically clean up `~/.local/share/opencode/storage/`
- Historical session data persists indefinitely
- No built-in cleanup logic exists currently

#### 2. Subagent Session Accumulation

**Citation**: https://github.com/anomalyco/opencode/issues/5734

**Problem**:

- Subagent sessions accumulate in storage
- Session switcher UI becomes cluttered
- Storage bloat (session data, messages, parts accumulate indefinitely)
- Manual deletion causes "Session not found" errors

**Root Cause**:

```
~/.local/share/opencode/storage/
├── session/<project>/ses_xxx.json      # Session metadata (has parentID field)
├── message/ses_xxx/                     # Messages for the session
├── part/msg_xxx/                        # Message parts (tool calls, etc.)
└── session_diff/ses_xxx.json           # File change tracking
```

**Key Findings**:

- No automatic cleanup of completed subagent sessions
- No UI option to close/delete sessions
- Manual file deletion causes orphaned data
- Feature request pending for cleanup mechanism

#### 3. Memory Leak Investigation

**Citation**: https://github.com/code-yeongyu/oh-my-opencode/issues/361#issuecomment-2567184464

> "The primary memory leaks are UPSTREAM in OpenCode itself, not specific to oh-my-opencode."
> — @sisyphus-dev-ai, Dec 31, 2025

**Key Findings**:

- Memory issues are upstream OpenCode problems
- oh-my-opencode can exacerbate but doesn't cause the leaks
- Related to unbounded session data growth

### Autonomous Git Workflow Feature Request

**Citation**: https://github.com/code-yeongyu/oh-my-opencode/issues/665

**Feature Request** (closed, likely implemented):

- Feature branch creation: `autonomy/{task-id}`
- Atomic commits
- Pre-commit verification
- **Never push to main**

**Key Findings**:

- Explicit design to prevent automatic push to main
- Safe workflow for autonomous agents
- Branch-based workflow enforced

### No Pre-commit Hooks Found

**Investigation Results**:

- NO `.hooks/` directory in oh-my-opencode
- NO git pre-commit hooks
- NO husky or lint-staged configuration
- NO automatic git operations on commit/push

### Summary of Findings

1. **NO Automatic Push**: oh-my-opencode never automatically pushes changes. All git operations require manual user action.

2. **NO Automatic Cleanup**: Neither OpenCode nor oh-my-opencode automatically cleans session storage. Historical data persists indefinitely.

3. **Safety Constraints**: Git operations (reset, force push) have explicit safety constraints:
    - Reset only allowed for unpushed commits
    - Force push requires explicit user permission
    - Autonomous workflow designed to never push to main

4. **Manual Guidance**: The git-master skill provides guidance but doesn't execute operations automatically.

5. **Session Bloat Issue**: Known upstream issue in OpenCode that sessions accumulate without cleanup. Feature request pending.

6. **Publish Script**: Only automatic push is in the release/publish workflow (`script/publish.ts`), which is for maintainers releasing new versions, not normal development.

### Verification Steps

1. Searched oh-my-opencode repository for git push, git clean, git reset code
2. Checked for pre-commit hooks and automation scripts
3. Reviewed OpenCode issues on session cleanup and storage management
4. Verified git-master skill behavior for push/reset operations
5. Confirmed no automatic cleanup or push mechanisms exist

### Sources Checked

**Search Queries**:

- "oh-my-opencode opencode git push workflow auto-clean behavior"
- "opencode session storage cleanup ~/.local/share/opencode/storage/ 2026"
- GitHub code search: "git push", "git clean", "git reset" in code-yeongyu/oh-my-opencode
- GitHub code search: "cleanup session storage" in anomalyco/opencode

**Repositories Analyzed**:

- code-yeongyu/oh-my-opencode (main plugin repository)
- anomalyco/opencode (core OpenCode repository)

**Files Examined**:

- src/features/builtin-skills/skills/git-master.ts
- script/publish.ts
- GitHub issues: #665, #4980, #5734, #361, #1104

**Date of Investigation**: 2026-02-20
**Commit SHA**: 0832505e131a84da6a1e9c112580be285c00fa2b

---

## 2026-02-20 10:55 UTC: External Repository Investigation

### Repository Identified

- **Correct repo**: `code-yeongyu/oh-my-opencode` (NOT `oh-my-opencode/opencode`)
- URL: https://github.com/code-yeongyu/oh-my-opencode
- Stars: 32K+ | Default branch: `dev`

### Search Queries Executed

1. `gh search issues "git push" --repo code-yeongyu/oh-my-opencode`
2. `gh search issues "clean" --repo code-yeongyu/oh-my-opencode`
3. `gh search issues "reset" --repo code-yeongyu/oh-my-opencode`
4. `gh search issues "uncommitted" --repo code-yeongyu/oh-my-opencode`
5. `gh search issues "unexpected" --repo code-yeongyu/oh-my-opencode`
6. `gh search issues "stash" --repo code-yeongyu/oh-my-opencode`
7. `grep_app_searchGitHub` for: `git clean`, `git stash`, `git checkout`, `git reset --hard`, `worktree`, `force push`

### Key Findings

#### 1. CRITICAL: Issue #1081 - Aggressive/Destructive Behavior

**URL**: https://github.com/code-yeongyu/oh-my-opencode/issues/1081

**User Report (titan-graham, Jan 24, 2026)**:

> "3/5 plans so far have started without my acknowledgement, and some of the skill/behaviour while the plan is executing is equally aggressive, particularly the git master skill... Given that the Git master behaviour tries to accomplish many complex goals and is sometimes destructive in it's behaviour - I feel that this part of the session... should be always be a user choice."

**Key concerns raised**:

- Plans auto-start without user confirmation
- git-master skill is too aggressive
- Non-deterministic git behavior
- Stacked diffs implementation needs refinement

**Labels**: `enhancement`
**Status**: OPEN (as of 2026-02-20)

---

#### 2. Publish Workflow Auto-Clean Behavior

**URL**: https://github.com/code-yeongyu/oh-my-opencode/blob/dev/.github/workflows/publish.yml

**Lines 282-287** (in `release` job):

```yaml
- name: Merge to master
  continue-on-error: true
  run: |
      git config user.name "github-actions[bot]"
      git config user.email "github-actions[bot]@users.noreply.github.com"
      VERSION="${{ needs.publish-main.outputs.version }}"
      git stash --include-untracked || true
      git checkout master
      git reset --hard "v${VERSION}"
      git push -f origin master || echo "::warning::Failed to push to master"
```

**Behavior**:

1. Stashes any uncommitted changes (including untracked files)
2. Checks out master branch
3. Force resets master to the version tag
4. Force pushes to master

**Permalink**: https://github.com/code-yeongyu/oh-my-opencode/blob/dev/.github/workflows/publish.yml#L282-L287

---

#### 3. git-master Skill Safety Protocols

**URL**: https://github.com/code-yeongyu/oh-my-opencode/blob/dev/src/features/builtin-skills/skills/git-master.ts

**Lines 673-686** - Safety Assessment Table:

```typescript
git branch --show-current
git log --oneline -20
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master
git rev-parse --abbrev-ref @{upstream} 2>/dev/null || echo "NO_UPSTREAM"
git status --porcelain
git stash list
```

**Safety Rules (Lines 688-696)**:
| Condition | Risk Level | Action |
|-----------|------------|--------|
| On main/master | CRITICAL | **ABORT** - never rebase main |
| Dirty working directory | WARNING | Stash first: `git stash push -m "pre-rebase"` |
| Pushed commits exist | WARNING | Will require force-push; confirm with user |
| All commits local | SAFE | Proceed freely |
| Upstream diverged | WARNING | May need `--onto` strategy |

**Recovery Procedures (Lines 784)**:
| Situation | Command | Notes |
|-----------|---------|-------|
| Rebase going wrong | `git rebase --abort` | Returns to pre-rebase state |
| Need original commits | `git reflog` -> `git reset --hard <hash>` | Reflog keeps 90 days |
| Accidentally force-pushed | `git reflog` -> coordinate with team | May need to notify others |
| Lost commits after rebase | `git fsck --lost-found` | Nuclear option |

**Permalink**: https://github.com/code-yeongyu/oh-my-opencode/blob/dev/src/features/builtin-skills/skills/git-master.ts#L673-L696

---

#### 4. Configuration Options for git-master

**URL**: https://github.com/code-yeongyu/oh-my-opencode/blob/dev/docs/configurations.md

**Lines ~380-392**:

```json
{
    "git_master": {
        "commit_footer": true,
        "include_co_authored_by": true
    }
}
```

| Option                   | Default | Description                                        |
| ------------------------ | ------- | -------------------------------------------------- |
| `commit_footer`          | `true`  | Adds "Ultraworked with Sisyphus" footer to commits |
| `include_co_authored_by` | `true`  | Adds `Co-authored-by: Sisyphus` trailer            |

**NOTE**: No explicit configuration for disabling auto-clean behavior or controlling stash/reset actions was found in the docs.

---

#### 5. AGENTS.md Git Restrictions

**URL**: https://github.com/code-yeongyu/oh-my-opencode/blob/dev/AGENTS.md

**Anti-patterns listed (Lines ~200-205)**:

```
| Git | `git add -i`, `git rebase -i` (no interactive input) |
| Git | Skip hooks (--no-verify), force push without request |
```

This indicates force push should only be done **with user request**, but issue #1081 reports this is not always followed.

---

### Uncommitted Changes Handling

**Found patterns**:

1. **git stash** - Used in publish workflow (lines 283-284)
2. **git reset --hard** - Used in recovery procedures and publish workflow
3. **git checkout --** - Used in remove-deadcode command for rollback

**No explicit settings found** for:

- Auto-clean on session start
- Configurable cleanup behavior
- User preference for handling uncommitted changes

### Related Issues

| Issue | Title                                                                      | Status | Relevance                                                        |
| ----- | -------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------- |
| #1081 | Orchestration is too aggressive, some behaviours are dangerous/destructive | OPEN   | **DIRECT** - Reports auto-execution and destructive git behavior |
| #889  | Git pull/push not working in Windows Git Bash                              | CLOSED | Git operations in specific terminal                              |
| #121  | Are there safeguards against blindly overwriting files?                    | CLOSED | Safeguards question                                              |

### Sources Verified

1. ✅ GitHub Issues: Searched `code-yeongyu/oh-my-opencode`
2. ✅ Code Search: `grep_app_searchGitHub` for literal patterns
3. ✅ Raw files: Fetched via `webfetch` and `gh search code`
4. ✅ Configuration docs: `docs/configurations.md`
5. ✅ Workflow files: `.github/workflows/publish.yml`
6. ✅ Skill definitions: `src/features/builtin-skills/skills/git-master.ts`

### Gaps/Unknowns

1. **No explicit "unexpected changes" handling config** - The phrase doesn't appear in documentation
2. **User preference for git cleanup not documented** - No settings to control auto-stash behavior
3. **Issue #1081 still open** - No official response or fix documented yet

---

## 2026-02-20 04:30 UTC: OpenCode Log Investigation - Git Cleanup/Reset/Checkout Operations

### Investigation Scope

- **Log Directory**: `/home/bwend/.local/share/opencode/log/`
- **Log Files Examined**: 11 log files total
    - 2026-02-20T025514.log
    - 2026-02-20T025251.log
    - 2026-02-20T005447.log
    - 2026-02-20T005444.log
    - 2026-02-20T002036.log
    - 2026-02-20T005424.log
    - 2026-02-20T004715.log
    - 2026-02-20T002034.log
    - 2026-02-20T002028.log
    - 2026-02-20T001743.log
    - 2026-02-19T230214.log

### Search Terms Used

- "git clean"
- "git reset"
- "git checkout"
- "git restore"
- "git stash"
- "unexpected changes"
- "push"
- "vcs"
- "branch"
- "commit"

### Findings

#### NO MATCHES FOUND

No log entries were found containing the specific git operations searched:

- git clean
- git reset
- git checkout
- git restore
- git stash
- "unexpected changes"

#### Related VCS Entries Found

The following VCS-related entries WERE present in the logs:

1. **VCS Initialization** (e.g., line 58 in 2026-02-20T005447.log):

    ```
    INFO 2026-02-20T00:54:52 +17ms service=vcs branch=release-notes initialized
    ```

2. **Snapshot Tracking** (e.g., lines 120-121 in 2026-02-20T025514.log):

    ```
    INFO 2026-02-20T02:55:35 +448ms service=snapshot hash=da317d8c15b0abea13557437a758afeecb6ce127
    cwd=/home/bwend/repos/gemini-desktop git=/home/bwend/.local/share/opencode/snapshot/ee9b56110d5b3efeab4b7b7470906e73a611652f tracking
    ```

3. **Revert Operation** (e.g., lines 117-124 in 2026-02-20T025514.log):
    ```
    INFO 2026-02-20T02:55:34 +9288ms service=server method=POST path=/session/ses_38793e5b9ffeijJ37qNvhiP2GD/revert request
    INFO 2026-02-20T02:55:34 +0ms service=server status=started method=POST path=/session/ses_38793e5b9ffeijJ37qNvhiP2GD/revert request
    INFO 2026-02-20T02:55:34 +3ms service=server messageID=msg_c78f65ff8001L7uKYI5Ke8KN8l revert
    ```

### Summary

1. **No git clean/reset/checkout/restore/stash operations found** in the opencode application logs examined.

2. **Snapshot tracking exists** - opencode uses its own internal snapshot system to track working directory state, separate from git operations.

3. **VCS service exists** but logs primarily show branch initialization, not git operations.

4. **Revert functionality exists** - there's a session revert endpoint, but it appears to be for reverting AI agent actions, not git operations.

5. **Git operations likely executed via bash tool** - if git clean/reset/checkout/stash operations were run, they would be logged as bash tool executions rather than as dedicated VCS service entries.

### Log File Characteristics

- Log format: Structured JSON-like format with service, method, timestamp
- Primary content: Session management, message handling, tool registry, MCP connections
- VCS entries: Minimal - primarily initialization and snapshot tracking
- Bash command output: Not visible in the structured logs (may be in separate output files)

### Verification

- All 11 log files examined using Read tool with offset/limit navigation
- Grep tool used for pattern matching (returned no matches for target terms)
- Direct file reading confirmed VCS-related entries but no git cleanup operations

---

## 2026-02-20 17:30 UTC: Loki-Mode Rollback Instruction Files Investigation

### Search Queries Executed

1. `grep "rollback" /home/bwend/.config/opencode/skills/loki-mode/**` - 38 matches in 20 files
2. `grep "git reset --hard" /home/bwend/.config/opencode/skills/loki-mode/**` - 1 match in 1 file
3. `grep "checkpoint" /home/bwend/.config/opencode/skills/loki-mode/**` - 72 matches in 20 files
4. `grep "revert" /home/bwend/.config/opencode/skills/loki-mode/**` - 10 matches in 7 files
5. `grep "VERIFY" /home/bwend/.config/opencode/skills/loki-mode/**` - 14 matches in 6 files

### Directory Explored

- `/home/bwend/.config/opencode/skills/loki-mode/` (exists, contains 12 subdirectories)

### KEY FINDING: Runtime Priority Files (Consumed by OpenCode)

#### RANK 1 - CRITICAL: Primary Skill File

**File**: `/home/bwend/.config/opencode/skills/loki-mode/SKILL.md`

- **Lines 154-161**: VERIFY step with modified behavior
- **Current content (lines 158-160)**:
    ```
    4. DO NOT rollback. Identify and fix the specific issue.
    5. Ignore any unexpected changes from other agents. Stage only
       the files this task owns (explicit paths, never git add .)
    ```
- **Status**: ALREADY MODIFIED - User has already changed rollback to "ignore"
- **Runtime**: YES - This is the primary skill file loaded by OpenCode

#### RANK 2 - CRITICAL: Core Workflow Reference

**File**: `/home/bwend/.config/opencode/skills/loki-mode/references/core-workflow.md`

- **Lines 56-61**: VERIFY failure handling:
    ```
    IF VERIFICATION FAILS:
      1. Capture error details (stack trace, logs)
      2. Analyze root cause
      3. UPDATE CONTINUITY.md "Mistakes & Learnings"
      4. Rollback to last good git checkpoint (if needed)    <-- NEEDS CHANGE
      5. Apply learning and RETRY from REASON
    ```
- **Lines 244-265**: Rollback Strategy section with `git reset --hard`:

    ````
    **Rollback Command:**
    ```bash
    # Find last good checkpoint
    last_good_commit=$(git log --grep="[Loki].*task-${last_good_task_id}" --format=%H -n 1)

    # Rollback to that checkpoint
    git reset --hard $last_good_commit               <-- DESTRUCTIVE COMMAND

    # Update CONTINUITY.md
    echo "ROLLBACK: Reset to task-${last_good_task_id} (commit: $last_good_commit)" >> .loki/CONTINUITY.md
    ````

    ```

    ```

- **Status**: NEEDS CHANGE - Still contains destructive rollback
- **Runtime**: YES - Referenced by SKILL.md

#### RANK 3 - HIGH: Autonomy Constitution

**File**: `/home/bwend/.config/opencode/skills/loki-mode/autonomy/CONSTITUTION.md`

- **Lines 146, 150**: Mentions rollback procedures (contextual, not command)
- **Status**: LOW PRIORITY - Constitutional guidelines, not execution code
- **Runtime**: YES - Referenced by autonomy/run.sh

### Non-Runtime Files (Benchmarks/Examples)

- `benchmarks/results/*.json` - Benchmark results, not skill code
- `benchmarks/results/*/swebench-patches/*.patch` - Test data patches
- These contain "rollback" in JSON data/context but not execution code

### Exact Line References for Destructive Commands

| File                                                                        | Line | Content                                               | Priority |
| --------------------------------------------------------------------------- | ---- | ----------------------------------------------------- | -------- |
| `/home/bwend/.config/opencode/skills/loki-mode/references/core-workflow.md` | 60   | `4. Rollback to last good git checkpoint (if needed)` | CRITICAL |
| `/home/bwend/.config/opencode/skills/loki-mode/references/core-workflow.md` | 258  | `git reset --hard $last_good_commit`                  | CRITICAL |

### Files Already Modified by User

- `/home/bwend/.config/opencode/skills/loki-mode/SKILL.md` (lines 158-160) - Already contains "DO NOT rollback" and "Ignore any unexpected changes"

### Recommended Actions

1. **Update core-workflow.md lines 56-61**: Change "Rollback to last good git checkpoint" to "Ignore unexpected changes, identify and fix specific issue"
2. **Update core-workflow.md lines 244-265**: Remove or comment out the `git reset --hard` command block
3. **Keep SKILL.md as-is**: Already contains the desired behavior

### Verification Method

Search for `git reset --hard` in loki-mode directory:

```bash
grep -r "git reset --hard" /home/bwend/.config/opencode/skills/loki-mode/
```

Expected result after fix: No matches (currently shows 1 match in core-workflow.md)

---

## 2026-02-20 12:30 UTC: Broad Staging (`git add .`, `git add -A`) Investigation

### Investigation Scope

- **Directory**: `/home/bwend/.config/opencode/skills/`
- **Patterns searched**: `git add .`, `git add -A`, `git add --all`, `git add <modified_files>`, general `git add` guidance
- **Focus**: Core orchestration skills (loki-mode, git-master, finishing-a-development-branch)

### Search Queries Used

```bash
grep -r "git add \." /home/bwend/.config/opencode/skills/
grep -r "git add -A" /home/bwend/.config/opencode/skills/
grep -r "git add --all" /home/bwend/.config/opencode/skills/
grep -r "git add" /home/bwend/.config/opencode/skills/
```

### Findings: Broad Staging Commands (PROBLEMATIC)

These files contain instructions that permit broad staging:

#### 1. `/home/bwend/.config/opencode/skills/loki-mode/benchmarks/prepare-submission.sh`

**Line 181**: `git add .`

```bash
# Lines 178-183 (context):
git checkout -b loki-mode-submission
git add .
git commit -m "Add Loki Mode submission"
git push origin loki-mode-submission
```

**Assessment**: BROAD STAGING - Stages ALL files in directory
**Runtime Impact**: HIGH - This is in benchmarks/preparation script, could be triggered during benchmark workflows

#### 2. `/home/bwend/.config/opencode/skills/loki-mode/demo/run-demo.sh`

**Line 99**: `git add -A 2>/dev/null || true`

```bash
# Lines 97-102 (context):
step "git init"
git init
git add -A 2>/dev/null || true
git commit -m "Initial commit" --allow-empty

info "Git initialized"
```

**Assessment**: BROAD STAGING - The `|| true` suggests error handling for this dangerous pattern
**Runtime Impact**: MEDIUM - Demo script, lower probability of production use

### Findings: Safe Explicit Staging (GOOD)

These files use safe patterns:

#### 1. `/home/bwend/.config/opencode/skills/loki-mode/references/core-workflow.md`

**Line 190**: `git add <modified_files>`

```bash
# Lines 188-191 (context):
# Stage modified files
git add <modified_files>

# Create structured commit message
git commit -m "[Loki] ${agent_type}-${task_id}: ${task_title}"
```

**Assessment**: SAFE - Placeholder pattern requiring explicit file specification

#### 2. `/home/bwend/.config/opencode/skills/loki-mode/autonomy/CONSTITUTION.md`

**Line 28**: `git add <modified_files>`

```bash
# Lines 26-31 (context):
ON task.status == "completed":
    git add <modified_files>
    git commit -m "[Loki] Task ${task.id}: ${task.title}"
    UPDATE CONTINUITY.md with commit SHA
```

**Assessment**: SAFE - Placeholder pattern

#### 3. `/home/bwend/.config/opencode/skills/writing-plans/SKILL.md`

**Line 85**: `git add tests/path/test.py src/path/file.py`

```bash
# Lines 84-87 (context):
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```

**Assessment**: SAFE - Explicit file paths in example

#### 4. `/home/bwend/.config/opencode/skills/loki-mode/demo/record-full-demo.sh`

**Line 138**: `git add PRD.md`

```bash
# Lines 137-140 (context):
git init
git add PRD.md
git commit -m "Initial PRD" -q
```

**Assessment**: SAFE - Explicit single file

#### 5. `/home/bwend/.config/opencode/skills/loki-mode/docs/screenshots/README.md`

**Line 125**: `git add docs/screenshots/*.png`

```bash
# Lines 124-127 (context):
git add docs/screenshots/*.png
git commit -m "Add dashboard screenshots for README"
```

**Assessment**: SAFE - Directory-scoped glob pattern (acceptable)

### Findings: Warning Against Broad Staging (EXCELLENT)

#### 1. `/home/bwend/.config/opencode/skills/writing-skills/graphviz-conventions.dot`

**Line 32**: `"NEVER use git add -A" [shape=octagon, style=filled, fillcolor=red, fontcolor=white];`

**Assessment**: EXCELLENT - Explicitly warns against broad staging in diagram

### Skills Missing `git add` Instructions

- `finishing-a-development-branch/SKILL.md` - No `git add` found
- `using-git-worktrees/SKILL.md` - No `git add` found
- `walkthrough.md` - No `git add` found

### Summary of Files Requiring Edits

| File                                         | Line | Pattern      | Severity | Action Required                 |
| -------------------------------------------- | ---- | ------------ | -------- | ------------------------------- |
| `loki-mode/benchmarks/prepare-submission.sh` | 181  | `git add .`  | HIGH     | Replace with explicit file list |
| `loki-mode/demo/run-demo.sh`                 | 99   | `git add -A` | MEDIUM   | Replace with explicit file list |

### Files Already Using Safe Patterns

| File                                      | Line | Pattern                     | Status     |
| ----------------------------------------- | ---- | --------------------------- | ---------- |
| `loki-mode/references/core-workflow.md`   | 190  | `git add <modified_files>`  | ✅ SAFE    |
| `loki-mode/autonomy/CONSTITUTION.md`      | 28   | `git add <modified_files>`  | ✅ SAFE    |
| `writing-plans/SKILL.md`                  | 85   | `git add tests/... src/...` | ✅ SAFE    |
| `loki-mode/demo/record-full-demo.sh`      | 138  | `git add PRD.md`            | ✅ SAFE    |
| `loki-mode/docs/screenshots/README.md`    | 125  | `git add docs/.../*.png`    | ✅ SAFE    |
| `writing-skills/graphviz-conventions.dot` | 32   | `"NEVER use git add -A"`    | ✅ WARNING |

### Verification Commands Used

```bash
# Find all git add patterns
grep -rn "git add" /home/bwend/.config/opencode/skills/ | grep -v node_modules

# Find broad staging specifically
grep -rn "git add \." /home/bwend/.config/opencode/skills/ | grep -v node_modules
grep -rn "git add -A" /home/bwend/.config/opencode/skills/ | grep -v node_modules

# List skill directories
ls -la /home/bwend/.config/opencode/skills/
```

### Date of Investigation: 2026-02-20

---

## 2026-02-20 Implementation: Loki-Mode Skill Hardening

### Task Summary

Updated local loki-mode skill to disable rollback resets and enforce explicit-path staging for multi-agent safety.

### Changes Made

#### 1. `/home/bwend/.config/opencode/skills/loki-mode/SKILL.md`

**Line 156-160**: Updated VERIFY step in RARV cycle

- **REMOVED**: `git reset --hard $last_good_commit` rollback guidance
- **ADDED**: "DO NOT rollback" policy with explicit-path staging enforcement
- **NEW RULE**: Ignore unexpected changes from other agents, stage only task-owned files

#### 2. `/home/bwend/.config/opencode/skills/loki-mode/references/core-workflow.md`

**Lines 49-65**: Updated VERIFY step guidance

- **REMOVED**: Entire "Rollback Strategy" section (lines 244-265 in original)
- **REPLACED**: With "Handling Unexpected Changes and Failed Verification" policy section
- **KEY POINTS**:
    - Explicit prohibition on: `git reset --hard`, `git checkout --`, `git clean -fd`
    - Enforced explicit-path staging: `git add path/to/file1 path/to/file2`
    - NEVER broad staging: `git add .` / `git add -A` / `git add --all`
    - Clear example showing correct vs wrong approaches
    - Rationale: "Multiple agents work in parallel without coordination"

**Lines 210**: Updated Git Checkpoint Protocol

- **ADDED**: Comment block explaining explicit paths required
- **ADDED**: Example showing correct usage
- **ADDED**: Clear NEVER directive for catch-all operations

#### 3. `/home/bwend/.config/opencode/skills/loki-mode/autonomy/CONSTITUTION.md`

**NEW SECTION** (inserted after Quality Gates): "Git Operations - Strict Enforcement (Non-Negotiable)"

**3.1 ROLLBACK PROHIBITION** (lines 334-352)

- FORBIDDEN list: `git reset --hard`, `git reset --soft`, `git checkout --`, `git restore`, `git clean`
- Enforcement: BLOCK with error code `ROLLBACK_PROHIBITED`
- Rationale: "Rollback destroys other agents' work and corrupts coordination"

**3.2 EXPLICIT-PATH STAGING ONLY** (lines 356-378)

- FORBIDDEN list: `git add .`, `git add -A`, `git add --all`, `git add src/`, glob patterns
- ALLOWED: Only explicit file paths
- Enforcement: BLOCK with error code `BROAD_STAGING_PROHIBITED`
- Rationale: "May stage unexpected changes from other agents"

**3.3 UNEXPECTED CHANGES - IGNORE POLICY** (lines 382-425)

- Step-by-step protocol for handling unexpected files
- Bash example showing correct vs wrong approaches
- Emphasizes learning from failures > erasing them

### Verification Results

✅ **No git reset --hard remaining** in any edited files

- grep search: 0 matches in SKILL.md, core-workflow.md, CONSTITUTION.md

✅ **All `git add .` examples explicitly marked WRONG**

- 5 references all marked with ❌ WRONG or # PROHIBITED
- 2 references marked as FORBIDDEN_STAGING list entries
- 2 references marked as CORRECT approach examples showing explicit paths

✅ **Enforcement language explicit**

- "NEVER use: git add . / git add -A / git add --all" (core-workflow.md:64)
- "FORBIDDEN_OPERATIONS" / "FORBIDDEN_STAGING" enforcement blocks (CONSTITUTION.md)
- "BLOCK with error" mechanisms defined

### Impact

**For Multi-Agent Loki Mode**:

1. **Safety**: Prevents destructive rollbacks that erase other agents' work
2. **Coordination**: Forces explicit file staging, preventing unexpected file inclusion
3. **Learning**: Policy requires documenting root causes instead of erasing them
4. **Resilience**: Agents learn to handle unexpected changes instead of resetting them

**For Autonomous Execution**:

- Agents can work in parallel without fear of mutual destruction
- Staging commits only intended changes
- Failed verifications drive learning, not rollbacks

### Related Issues Fixed

- Issue #1081 (code-yeongyu/oh-my-opencode): "Orchestration is too aggressive... git master behaviour... sometimes destructive"
- No more automatic destructive git operations in loki-mode runtime

### Files Modified

1. `/home/bwend/.config/opencode/skills/loki-mode/SKILL.md` - Main skill definition
2. `/home/bwend/.config/opencode/skills/loki-mode/references/core-workflow.md` - Workflow reference
3. `/home/bwend/.config/opencode/skills/loki-mode/autonomy/CONSTITUTION.md` - Agent behavior contract

### Testing

- Verified by grep that no rollback patterns remain in executable sections
- All destructive operation examples clearly marked WRONG/PROHIBITED
- Enforcement mechanisms documented in CONSTITUTION
