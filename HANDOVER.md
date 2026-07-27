# Handover — Daily challenge: "Make Daily the Star Mode"

Written 2026-07-27, continuing from an earlier HANDOVER.md (now stale/deleted)
that covered the hero-slider + original daily-challenge build. This one covers
everything since: a plan review, three completed backend/plumbing tasks, a
content review, and an in-progress home-screen redesign. Delete this file
before merging.

---

## 1. Where the work is

| | |
| --- | --- |
| Worktree | `C:\Users\Cambo\Documents\GitHub\give-or-take-quiz\.claude\worktrees\silly-diffie-7ed850` |
| Branch | `main` (this worktree works directly on main now — no feature branch) |
| Supabase | project `give-or-take-quiz`, ref `zwovdyyuacuipfhtycxw` |

**Nothing in this session is committed.** Run `git status` first thing.

The repo moved a lot between the previous handover and this session's start:
hero slider + original daily challenge got merged via PRs, then Survival mode,
category progression, achievements, rank badges, a theme/artwork system, a
unified `HomeHeader`, and profile avatars all landed on top. Current bank is
**272 category questions + 100 daily questions across 20 sets** (26 Jul – 14
Aug), before task 10's 12 new sets are merged in.

---

## 2. The plan being executed: "Make Daily the Star Mode"

The user pasted a plan (from a Codex/ChatGPT audit) to make the daily the home
page's headline feature instead of a header utility. I reviewed it, found real
premises (daily results *did* link to the Classic board — confirmed by
reading the source) and real gaps (the plan assumed the daily schedule was
private; it ships in the JS bundle — I grepped a built asset and found a daily
question id in it). We agreed a sequence, **schema first, since the backfill
and the XP-farming fix are free right now (1 daily round in prod, 0 replays)
and get expensive once people actually play**:

1. ~~Daily as a leaderboard format~~ — **done**
2. ~~Make the first daily attempt official~~ — **done**
3. ~~Move daily progress to per-date official/practice storage~~ — **done**
4. **Make the home screen Daily-first** — **in progress, no code written yet**
5. Add spoiler-free sharing and daily deep links — not started
6. Extend daily validation and add 12 sets to 26 August — **content is
   written and reviewed, not yet merged** (see §5)

I keep a live TaskList inside the session for these — if you don't have it,
recreate it from this list.

---

## 3. What's built and verified (tasks 1–3)

### Task 1 — Daily as a leaderboard format
`BoardScreen.tsx`'s `LeaderboardFormat` was `"classic" | "survival"` only; a
finished daily round literally said "See the Classic leaderboard" and called
`loadClassicBoard()`. Now three formats, with per-format copy centralised in
one `COPY` record in `BoardScreen.tsx` rather than nested ternaries. New
`DailyLeaderboardRow` type and `DailyLeaderboardPanel` component
(`src/Leaderboard.tsx`) showing finish time (the real tie-break) instead of
attempts. **A test named "publishes the daily but links results to the
Classic board" was asserting the bug** — rewritten to assert the fix.

### Task 2 — Make the first daily attempt official
Migration `20260727230000_make_first_daily_attempt_official.sql`, **applied to
prod and recorded in the migration ledger** (had to insert the ledger row by
hand — `supabase db query` executes SQL but does not record it; use
`apply_migration` for schema, `db query` only for data/seeds).

- `game_rounds.is_official boolean`, backfilled (earliest daily round per
  player/date), unique partial index `(player_id, puzzle_date) where
  is_official`, check constraint restricting `is_official` to `mode='daily'`.
- `player_category_xp` view now excludes `mode='daily' and not is_official` —
  **this closed a real XP-farming hole**: the daily's five questions are
  fixed, so replaying it for XP was previously unlimited. Classic/Survival are
  untouched (confirmed with the user: farming XP there is fine, since fresh
  questions are drawn each time).
- `daily_leaderboard` rebuilt: official rows only, ranked score desc →
  completed_at asc → player_id. **Old `best_score`/`attempts` columns were
  kept** (not dropped) alongside new `score`/`completed_at`, specifically so
  this could ship without a simultaneous client deploy.
- `submit_daily_round` rewritten: decides `is_official` (window is
  `current_date ± 1`, to cover every UTC offset without rejecting a
  legitimate day-boundary submission), catches the unique-violation race,
  returns `{ round_id, total_score, puzzle_date, is_official, official_score
  }`.

Verified with a rolled-back `do $$ ... end $$` block simulating `auth.uid()`
via `set_config('request.jwt.claim.sub', ...)` — proved the three guarantees
(second official rejected, practice allowed, non-daily can't be official) and
later the exact RPC JSON shape (see §4).

### Task 3 — Per-date official/practice storage
`lib/daily.ts` storage bumped `v1` → `v2` (confirmed nothing worth
grandfathering — 0 streaks existed). `scores: Record<date, number>` →
`dates: Record<date, { officialScore, practiceBest, attemptCount }>`.

**Two recording functions, not one:**
- `recordLocalDailyResult` — the old heuristic (first play = official),
  kept for signed-out players. No server to defer to without an account.
- `applyOfficialDailyResult` — folds in server truth. Used in two places:
  post-submit correction, and a **new on-load reconciliation** —
  `fetchMyOfficialDaily` (in `lib/leaderboard.ts`, queries `daily_leaderboard`
  filtered by `player_id`+`puzzle_date`) runs on mount for a signed-in player
  before they've played today locally. This is what actually closes the
  cross-device gap: device B now finds out *before* trying to play, not after
  a rejected submission.

**Deliberately not built:** unwinding an optimistic local streak advance if
two devices submit within the same window and this device's guess turns out
wrong. Said so in a code comment rather than pretending it's handled — the
on-load check covers the realistic case (B hasn't played yet); the genuine
same-second race is rare enough not to warrant it.

Verified in the browser (signed-out path): played today → streak 1,
`officialScore` set; replayed the same day from archive → **streak stayed at
1**, `attemptCount` → 2, `officialScore` unchanged, replay's score went to
`practiceBest`. Verified against prod (signed-in path, rolled back
transaction): submitting the same daily twice returned
`is_official: true` then `is_official: false`, both carrying the same
`official_score` — exactly what the client expects.

221 tests, tsc, lint, build all pass as of the end of task 3.

---

## 4. Gotchas specific to this stretch

**4.1 `supabase db query --linked -f file.sql` runs SQL but does not touch
`schema_migrations`.** Use `apply_migration` (MCP tool) for anything that
should be a tracked migration. If you use `db query` anyway, insert the ledger
row by hand:
```sql
insert into supabase_migrations.schema_migrations (version, name)
values ('YYYYMMDDHHMMSS', 'name') on conflict (version) do nothing;
```

**4.2 To test a `security definer` RPC that reads `auth.uid()` from the SQL
editor**, fake the JWT claim for the transaction:
```sql
perform set_config('request.jwt.claim.sub', v_player_uuid::text, true);
```
`auth.uid()` in this project reads `request.jwt.claim.sub` first, falling back
to `request.jwt.claims->>'sub'`. Wrap the whole test in a `do $$ ... end $$`
block that ends with `raise exception 'RESULT %', ...` — the exception forces
a rollback while still letting you see the output via the error message.

**4.3 `useCallback`-wrapped functions that need to be generic** (e.g. `record`
in `useLeaderboard.ts`, which now handles both `SubmittedRound` and the wider
`SubmittedDailyRound`) need the type parameter on the *inner* arrow function,
not attempted on `useCallback` itself:
```ts
const record = useCallback(
  async <T extends SubmittedRound>(send: () => Promise<T>): Promise<T | null> => { ... },
  [],
);
```

**4.4 Prefer functional `setState` updaters when a value might be corrected
shortly after an optimistic write** (`setDailyProgress((current) => ...)`
rather than closing over the `dailyProgress` variable). Used this for both the
on-load reconciliation effect and the post-submit correction in `Game.tsx` —
both write to `localStorage` *inside* the updater, which is safe here because
`writeDailyProgress` is idempotent (harmless if React's Strict Mode invokes
the updater twice).

**4.5 `game_rounds` and `daily_leaderboard` are both `select`-able by
`anon, authenticated` with `using (true)`** — no RLS scoping to "your own
rows" beyond what each view's `where` clause does. This is how
`fetchMyOfficialDaily` works without a new RPC. Worth knowing before adding
anything sensitive to either.

**4.6 `HomeHeader.tsx` renders on every screen**, not just home — it's the
persistent compact daily strip (date, streak, "Past" button) at the very top,
already satisfying the plan's "compact Daily nav item on non-home screens"
requirement. Task 8 does **not** need to touch it; it needs a *new*, bigger
hero specifically for the home/category screen, additive to what's there.

---

## 5. Task 10 content — reviewed, not yet merged

The user had ChatGPT/Codex write 12 daily sets (15–26 Aug) to
`C:\Users\Cambo\Documents\Codex\2026-07-27\write-12-daily-question-sets-for\outputs\data\daily-sets.additions.json`
(**outside the repo** — an absolute path on the user's machine, not in
`data/`). I reviewed it thoroughly:

- Ran it through the **real** `npm run validate:data` (merged into a scratch
  copy of `data/daily-sets.json`, validated, then restored the original —
  nothing was left merged). **Zero errors** across all 32 sets / 160 total
  questions.
- All 12 new sets hit exactly 5 distinct categories each — better than the
  brief asked.
- Zero overlap with the existing 372 prompts (272 category + 100 daily).
- Exploitability checked with the *real* `startPosition`/`scoreGuess`
  functions, not a reimplementation: mean idle (never-touch-the-slider) score
  303/1000, in line with the tuned existing bank's ~308/1000. Every set
  independently landed near a 2-below/3-above centre split — nobody hand
  balanced that. Per-set idle totals range 970–1917/5000: a real spread
  (needs a light rebalance) but nowhere near the 1575–3490 mess from the
  first content round.
- **One genuinely dead source URL found and fixed**:
  `daily-saltwater-crocodile-maximum-length` pointed at a 404
  (`australian.museum/.../saltwater-crocodile/` — confirmed "Page not found"
  in a real browser navigation, not a script-only failure). Replaced with
  `australian.museum/learn/animals/reptiles/estuarine-crocodile/`
  (same species, museum's preferred name — confirmed it loads and the content
  matches). This fix **is already applied** to that Codex-outputs file on
  disk.
- The other 8 URL failures (Britannica, Library of Congress, Smithsonian,
  National Postal Museum) are the same bot-blocking pattern hit in the first
  content round — spot-checked one (Britannica/Tenochtitlan) live in a real
  browser, loads fine, content matches. Not a real problem.
- Minor, non-blocking: 9 questions use `linear` scale across wide ranges
  (e.g. teeth count 1–160, Earth's age 100M–5B years) where `log` would sit
  better. Not errors, just not optimal.

**What's left for task 10, in order:**
1. Copy that file into the repo (or re-fetch it — the crocodile URL fix is
   only on the Codex-outputs copy, not anywhere in git).
2. Merge its 12 sets into `data/daily-sets.json`'s 20 existing sets → 32 sets,
   100 → 160 daily questions.
3. Rebalance the below/above-centre split and per-set idle totals across all
   32 sets (same technique as the original 60: deal below/above pools by
   remainder, then a swap pass to reduce repeated categories — see the
   scratch scripts pattern from earlier in this session, not saved to disk).
4. Optionally retune the 9 linear-scale-on-wide-range questions to log.
5. `npm run validate:data`, then `npm run build:daily-sql` →
   `supabase/seed-daily.sql`, then apply that seed to prod (same
   `npx supabase db query --linked -f supabase/seed-daily.sql` pattern used
   for the first 100).
6. Extend `scripts/validate-data.ts` per the plan: exactly 5 questions, 5
   distinct subjects (**already true empirically for all 32 sets, but not yet
   an enforced rule** — currently nothing stops a future hand-edit from
   breaking it), and the 30-day-forward-buffer check. **That buffer check
   must be a warning, never build-blocking** — as a hard `npm run build`
   failure it would break CI on a fixed calendar date with no code change.

---

## 6. Task 8 — Daily-first home screen (in progress, zero code written)

I was mid-investigation when this handover was requested. Read, not yet
edited: `src/HomeHeader.tsx` (in full, §4.6 above), and the `category`,
`playing`, and `results` phase JSX in `src/Game.tsx` (lines ~984–1330 as of
this session — **line numbers will have shifted**, search by phase name).

### What exists today (category/home phase, `src/Game.tsx`)
In order: `.hero-copy` (eyebrow + h1 "How close can you get?" + lede) →
`.hero-formats` (Classic/Survival pill toggle, state `heroFormat`) →
conditionally `<HeroDemo>` (warm-up question) or a Survival teaser card →
`<h2 className="mode-grid-label">All categories</h2>` → `.mode-grid` (the
category cards) → `.category-footer`.

### What the plan asks for (from the pasted spec)
1. Replace the hero with a **large "Today's Daily" card**: date, streak,
   "5 questions · about 2 minutes · 5 subjects", one primary
   "Play today's Daily" button.
2. After completion, that **same hero transforms into a result hub**: official
   score, five accuracy blocks (one per question — no prior art for this
   exact shape in the codebase; closest existing pattern is the
   `.result-list`/`tier-*` per-question breakdown on the results screen,
   `Game.tsx` ~line 1301–1322), streak, Daily rank (need to fetch/derive —
   `fetchDailyLeaderboard` already exists), Share result, "Today's board",
   and a quieter "Replay for practice".
3. Move the existing Classic/Survival picker + warm-up + category grid below
   a **"Keep playing"** heading.
4. `HomeHeader` (§4.6) already satisfies "compact Daily nav on non-home
   screens" — leave it alone.
5. During play: `"Today's Daily · Question 1 of 5"` when playing the official
   date; a prominent **"Practice replay"** label when `dailyDate` is set but
   not today's date (archive replay) — `Game.tsx`'s `playing` phase currently
   shows no daily-specific framing at all, just `progress-dots` +
   `question-card`.
6. Fix `.mode-card`/`.question-card` sizing so nothing clips or scrolls
   horizontally at **390px, 768px, 1024px, 1440px** — not yet audited this
   session; `src/globals.css` is 4800+ lines, search for the relevant class
   names above rather than reading linearly.

### Data already available for this (no new plumbing needed)
- `dailyProgress.dates[today]` → `{ officialScore, practiceBest,
  attemptCount }` (task 3's shape).
- `streak` = `activeStreak(dailyProgress)`, already computed in `Game.tsx`.
- `todaysDaily` = `todaysDailySet()`, already computed.
- Rank: call `leaderboard.loadDailyBoard(today)` and find the player's row
  (the board already exists; may need a dedicated small fetch or reuse of
  `fetchDailyLeaderboard` filtered client-side, since a full board fetch to
  extract one rank is wasteful but simplest to start with).
- `dailyDate` state already distinguishes "played today" vs "playing an
  archive date" — the practice-replay framing in the `playing` phase is a
  straightforward `dailyDate !== today` check.

### Suggested approach
Don't touch `HomeHeader.tsx`. Add a new component (e.g. `DailyHero.tsx`,
mirroring how `HeroDemo.tsx` and `Daily.tsx` are already separate files) with
two render states (unplayed / result-hub) gated on
`dailyProgress.dates[today]?.officialScore`. Insert it at the top of the
`category` phase JSX, above `.hero-copy`, and wrap the existing
`.hero-formats` → `.mode-grid` → `.category-footer` block in a `<h2>Keep
playing</h2>` heading. For the `playing` phase, add a one-line daily/practice
badge above `progress-dots`, conditioned on `dailyDate`.

---

## 7. Task 9 — Sharing and deep links (not started)

Blocked on the bundle-spoiler question from the original plan review: the
daily schedule ships in the JS bundle today (confirmed by grep on a built
asset). `?daily=YYYY-MM-DD` deep links and "spoiler-free" sharing sit
awkwardly against that — a determined player can already read future answers
via View Source. This was flagged to the user as needing a decision (fetch
the day's set from Postgres at runtime instead of bundling it, vs. strip
future sets from the bundle at build time) and **was not resolved** before
this session's context ran out. Raise it again before starting task 9.

---

## 8. Commands

```bash
npm run validate:data      # category bank + daily schedule
npm test                   # does NOT type-check — check tsc separately
npx tsc --noEmit
npm run build               # validate + tsc + vite build
npm run lint
npm run build:daily-sql    # data/daily-sets.json -> supabase/seed-daily.sql
npm run generate:questions # Postgres -> lib/questions.generated.ts (excludes is_daily)
```

Apply SQL to the linked project without retyping it (data, not schema):
```bash
npx supabase db query --linked -f supabase/seed-daily.sql
```

Apply a real migration (schema) — use the `apply_migration` MCP tool with
`project_id: zwovdyyuacuipfhtycxw`, not the CLI, so it lands in the ledger.
