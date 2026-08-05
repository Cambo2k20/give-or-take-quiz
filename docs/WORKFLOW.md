# Give or Take Working Workflow

Use this document as the practical checklist for working on Give or Take.
`AGENTS.md` remains the authoritative instruction file for Codex.

## Golden rules

1. Never make feature changes directly on `main`.
2. Confirm the repository, worktree, branch and status before editing.
3. Treat editing, validation, staging, committing, pushing, opening a pull
   request, database migration and deployment as separate permissions.
4. Preserve unrelated or untracked files until their owner confirms they can
   be removed.
5. A passing build is not proof that a visual or interactive change works.
6. Never pull, merge or delete a branch merely because GitHub Desktop suggests
   it.

## Repository locations

Find the current checkout root with:

```powershell
git rev-parse --show-toplevel
```

Codex worktrees normally appear beneath the repository root at:

```text
.claude\worktrees
```

The main checkout and every linked worktree share Git history, but each has its
own checked-out branch and working files.

## 1. Start a task

Before editing, establish the task in concrete terms:

```md
Outcome:
[What should be different when the task is finished?]

Allowed changes:
- [Files, folders or behavior in scope]

Preserve:
- [Accepted behavior or design that must not change]

Acceptance criteria:
- [Measurable result]

Permission:
Implement and validate locally. Do not stage, commit or push.
```

Useful permission phrases:

```text
Inspect only. Do not modify files.
```

```text
Implement and validate locally. Do not stage, commit or push.
```

```text
Commit the validated changes. Do not push.
```

```text
Push the current feature branch and open a pull request. Do not merge.
```

```text
Apply this migration locally only. Do not push it to Supabase.
```

## 2. Run the preflight checks

Run these commands from the intended checkout:

```powershell
Get-Location
git rev-parse --show-toplevel
git branch --show-current
git status --short --branch
git worktree list
```

Confirm:

- The Git root is `give-or-take-quiz`.
- The branch belongs to the current task.
- Existing modified and untracked files are understood.
- The checkout is not an old ZIP extraction or abandoned worktree.
- The local server, if running, serves this exact checkout.

Stop if the repository, branch or worktree is not the one expected.

## 3. Create a proper feature branch

From a clean main checkout:

```powershell
git switch main
git pull --ff-only
git switch -c codex/short-description
```

Examples:

```text
codex/fix-mobile-header
codex/first-light-starlight
codex/add-history-questions
```

Do not configure a feature branch to track `origin/main`. Its upstream should
be the same-named branch created by the first push.

## 4. Implement narrowly

- Inspect the relevant component, styles, tests and shared utilities first.
- Reuse existing components, hooks, tokens and data structures.
- Preserve Classic, Survival and Daily behavior unless the task changes them.
- Keep React rendering deterministic.
- Do not call `Math.random()` during rendering.
- Do not edit generated question files manually.
- Keep persistent animation primarily to `transform` and `opacity`.
- Preserve accessibility and `prefers-reduced-motion` behavior.
- Do not alter unrelated files to make the diff look cleaner.

## 5. Validate while working

Start with the smallest relevant checks:

```powershell
npm.cmd test -- tests/RelevantFeature.test.tsx
npm.cmd run lint
git diff --check
```

For a completed application change, run the applicable full gates:

```powershell
npm.cmd run validate:data
npm.cmd test
npm.cmd run lint
npm.cmd run build
git diff --check
```

Do not hide failures. Separate new failures, existing failures and non-blocking
warnings in the handoff.

## 6. Verify frontend changes in the browser

Automated checks do not prove visual or interactive correctness.

For meaningful frontend work, verify the affected flow in the actual local
application. Depending on scope, check:

1. Home or Daily screen
2. Mode selection
3. Category selection
4. Question interaction
5. Answer reveal
6. Final score
7. Account or authentication
8. Theme selection and persistence

Responsive sizes:

```text
Desktop: 1440 x 810
Square:   600 x 600
Phone:    390 x 844
4K art:   3840 x 2160
```

At each relevant size check:

- no horizontal overflow
- no clipped controls
- readable text and practical touch targets
- decorative artwork does not crowd the UI
- animation and reduced motion both produce complete frames
- no new browser-console errors

Leave the final verified preview open.

## 7. Review before staging

```powershell
git status --short
git diff --stat
git diff --check
git diff
```

Confirm:

- Only intended files changed.
- No secrets, tokens or machine-specific paths were added.
- Generated changes came from the correct source and command.
- Unrelated dirty files remain untouched.
- Tests and screenshots match the requested outcome.

## 8. Commit, push and open a pull request

Only do these after explicit approval.

Stage exact files rather than everything:

```powershell
git add path/to/file-one path/to/file-two
git diff --cached --stat
git diff --cached
```

Commit:

```powershell
git commit -m "Describe the completed outcome"
```

Publish the feature branch:

```powershell
git push -u origin HEAD
```

The pull request must compare:

```text
base: main
compare: codex/short-description
```

If GitHub shows `main` against `main`, there is no feature branch difference.
Do not create or merge the pull request until the diff and CI checks are
understood.

## 9. After the pull request is merged

Return the main checkout to current `main`:

```powershell
git switch main
git pull --ff-only
git branch -d codex/short-description
git fetch --prune origin
```

Delete a linked worktree only after:

- its Codex task is archived
- its working tree is clean
- its commits are merged or intentionally preserved elsewhere
- no server is running from that directory

Never remove a worktree merely to make a branch list shorter.

## 10. Daily-question automation

GitHub Actions owns this remote branch:

```text
origin/automation/retire-expired-dailies
```

The workflow recreates and force-pushes it when expired Daily questions return
to the category pool. It then opens or updates a pull request into `main`.

Rules:

- Do not do feature work on the automation branch.
- Do not pull a stale local copy when GitHub Desktop shows divergence.
- Keep the remote automation branch unless the workflow is deliberately
  retired.
- Review and merge the automation pull request like any other data change.

## 11. Question and Supabase changes

- Postgres is the source of truth for the category bank.
- `lib/questions.generated.ts` is generated and must not be hand-edited.
- `data/daily-sets.json` is the source of truth for Daily sets.
- Use additive migrations; do not rewrite migrations that may be deployed.
- Local validation does not authorize a linked Supabase push.
- Check RLS, grants and `SECURITY DEFINER` functions for affected tables.
- Never print or commit credentials or complete environment files.

## 12. Common failure recovery

### Pull request button is disabled

Check that GitHub is not comparing `main` with `main`. Confirm the feature
branch has a commit and was pushed with:

```powershell
git push -u origin HEAD
```

### GitHub Desktop shows many commits to pull

Do not pull automatically. Check the current branch and its divergence first:

```powershell
git status --short --branch
git log --oneline --decorate --graph --all -25
```

### Codex says it cannot find a repository

Do not clone again immediately. Check whether the task's worktree path was
removed. Restore the exact path or reconnect the task before deleting anything
else.

### Deleted GitHub branches remain visible locally

```powershell
git fetch --prune origin
```

### Git reports dubious ownership

Use the repository-specific safe-directory option rather than changing broad
global trust settings:

```powershell
git -c safe.directory=C:/path/to/give-or-take-quiz status
```

## 13. Final handoff checklist

Report:

```md
Outcome:
[What changed and now works.]

Changed:
- [Files and purpose.]

Validated:
- Focused tests: [result]
- Full tests: [result or not run]
- Data validation: [result or not applicable]
- Lint: [result]
- Build: [result]
- Diff check: [result]

Browser:
- Desktop: [result or not applicable]
- Square: [result or not applicable]
- Phone: [result or not applicable]
- Reduced motion: [result or not applicable]
- Console errors: [result]

Git:
- Modified: [files]
- Staged: [yes/no]
- Committed: [yes/no]
- Pushed: [yes/no]
- Pull request: [URL or not created]
- Deployed: [yes/no]

Remaining:
- [Known limitation, warning or next decision.]
```

Never use "everything works" as a substitute for evidence.
