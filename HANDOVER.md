# Handover — exact next steps

Written 2026-11-21, replacing the 2026-07-28 handover (its HEAD `779ae1a`,
"merge the 12 additions" and "Task 8 not started" were all out of date).
Written on branch `claude/pensive-lovelace-iebz3v`, on top of `main` at
`3cc333d`.

**Ground yourself in `git status` / `git log`, not in this file or a chat
transcript.** A stale checkout has fooled a session before (§6.5).

---

## 0. Verify the baseline

```bash
git status
git log --oneline -3
npx tsc --noEmit && npm run lint && npm test && npm run build
```

Expect 395 passing tests and a build that warns, but does not fail, because
nothing is scheduled for today (§1).

---

## 1. The Daily schedule — covered to 13 Dec 2026

`data/daily-sets.json` ran out on 26 Aug 2026, so production had no Daily from
27 Aug (issue #76). PR #77 made the app handle an empty schedule. PR #78 added
21 sets, **23 Nov – 13 Dec 2026** (105 daily-only questions written by Claude,
each checked against the cited page), and its seed was applied to production
on 21 Nov 2026: 53 sets, 265 links, 105 questions reserved, 0 played questions
re-reserved.

Next batch: schedule from 14 Dec, at least 21 days ahead. Question Lab is the
normal route (`docs/QUESTION_PIPELINE.md`). Then `npm run validate:data`,
`npm run build:daily-sql`, apply `supabase/seed-daily.sql` (data, so `db
query` is correct, §6.2), merge. Re-running the seed is safe: it leaves
`is_daily` alone on existing rows and reserves only questions dated today or
later. Without the seed, `submit_daily_round` rejects signed-in submissions.

The repo is **public**: anything committed in `data/daily-sets.json` can be
read before its date. Issue #21 tracks the real fix, which is blocked on a
product decision (§4).

---

## 2. Migrations — production matches the repo

On 21 Nov 2026 `20260806010120_add_dinosaurs_questions` and
`20260806011021_add_movies-space_questions` (78 questions) were applied to
production with `schema_migrations` rows under their local versions, so
`supabase migration list` shows local and remote aligned (54 each).
`lib/questions.generated.ts` was regenerated from production afterwards (790
regular questions; `validate:question-sync` passes).

---

## 3. Nightly retirement job — fixed in PR #77

`.github/workflows/retire-expired-dailies.yml` decided whether to open its pull
request with `gh pr view "$branch"`. That also matches closed and merged pull
requests, so once #47 merged on 2 Aug the job logged "Existing pull request
updated." every night and never opened a new one. Its branch
`automation/retire-expired-dailies` kept being force-pushed with no PR.

PR #77:

- checks for an **open** pull request only;
- brings in the snapshot that job generated on 20 Nov (`9afec21`): 110 retired
  Daily questions added to `lib/questions.generated.ts` (602 → 712), none
  changed or removed. This is the generator's own output, not a hand edit.

After merge, the next nightly run that finds a changed bank opens a fresh PR.
The stale `automation/retire-expired-dailies` branch is force-pushed by that
job, so it needs no cleanup.

---

## 4. Task 9 (shared Daily deep links) — still blocked on a decision

`?daily=YYYY-MM-DD` deep links and spoiler-free sharing sit awkwardly against
§1's public schedule. Decide first (#21): fetch the day's set from Postgres at
runtime (RLS already gates `daily_sets` by `puzzle_date <= current_date`; only
the bundled JSON leaks), or accept public-but-obscure. That decision changes
whether `lib/daily.ts` imports JSON or fetches.

Task 8 (Daily-first home) is done: `src/DailyHero.tsx`, plus "Practice replay"
and "Today's Daily · Question N of 5" during play.

---

## 5. Open issues worth knowing before database work

- #22 — `game_rounds` / `round_answers` still carry `using (true)` SELECT
  policies from `20260725144052_create_profiles_and_leaderboard.sql`. Any fix
  has to keep the security-invoker leaderboard views (#74) working, and needs
  a real database to test against.
- #20 — leaderboards are server-scored but not server-dealt.
- #28 — leaked-password protection is a Supabase dashboard setting.

---

## 6. Gotchas (don't relearn these)

**6.1 `apply_migration` (the Supabase MCP tool) stamps its own timestamp as
the migration version.** After applying, run `list_migrations` and rename the
local file to match, or `supabase db push` will try to re-apply it.

**6.2 `supabase db query --linked -f file.sql` does not record anything in
`schema_migrations`.** Use it for data (seeds) only, never for schema.

**6.3 Line endings.** `core.autocrlf=true` with no `.gitattributes` shows
`i/lf w/crlf` on every file in `git ls-files --eol`. That is normal; the index
column (`i/`) is the one that matters.

**6.4 Testing a `security definer` RPC that reads `auth.uid()` from the SQL
editor:** fake the claim inside a transaction that rolls back:

```sql
do $$ begin
  perform set_config('request.jwt.claim.sub', v_player_uuid::text, true);
  -- ... call the function, raise exception 'RESULT %', result_var;
end $$;
```

**6.5 The container/session boundary is real.** If you're told work is
missing, check `git status` and `git log` in this checkout first.

**6.6 Tests and the real clock.** A test that needs a Daily must pin the
clock with `vi.useFakeTimers({ shouldAdvanceTime: true })` and
`vi.setSystemTime(...)` on a published set's date (see `onPublishedDay` in
`tests/Game.test.tsx`), and call `vi.useRealTimers()` afterwards. Tests that
relied on the real date are what turned an empty schedule into 22 failures
and a blocked deploy.

---

## 7. Commands reference

```bash
npm run validate:data       # category bank + daily schedule
npm test                    # does NOT type-check — run tsc separately
npx tsc --noEmit
npm run build               # validate + tsc + vite build
npm run lint
npm run daily:runway        # days of Daily left
npm run build:daily-sql     # data/daily-sets.json -> supabase/seed-daily.sql
npm run generate:questions  # Postgres -> lib/questions.generated.ts (excludes is_daily)
```

On Windows use `npm.cmd` / `npx.cmd` (see `AGENTS.md`).
