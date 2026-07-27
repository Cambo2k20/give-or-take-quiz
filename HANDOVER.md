# Handover — exact next steps

Written 2026-07-28, replacing the previous HANDOVER.md (deleted, superseded).
Repo state as of commit `779ae1a` on `main`, pushed. Delete this file before
merging the branch you do this work on.

**Before doing anything else: run `git log --oneline -3` and confirm you see
`779ae1a` at HEAD.** A prior session in a different, stale checkout believed
committed work was lost when it wasn't — it was reading the wrong copy of the
repo. Ground yourself in `git status` / `git log`, not in anything a chat
transcript claims.

---

## 0. Verify the baseline before touching anything

```bash
git status                    # expect: clean
git log --oneline -3          # expect: 779ae1a at HEAD
npx tsc --noEmit && npm run lint && npm test && npm run build
```

All four should pass clean (221 tests). If any of them don't, stop and
figure out why before starting new work — don't build on top of a red
baseline.

---

## 1. The repo is PUBLIC — this changes what "backup" means here

`Cambo2k20/give-or-take-quiz` is a **public** GitHub repo. `data/daily-sets.json`
is tracked and committed, so all 20 currently-scheduled daily puzzles
(26 Jul – 14 Aug) are already readable by anyone on GitHub, and separately
also ship inside the built JS bundle (confirmed by grepping a `dist/` asset
for a daily question id).

**Do not commit unmerged daily-set content further than necessary, and do not
"back up" future daily content into the repo as a safety measure** — the
user was explicit about this (session correction, this session). If a file
needs backing up, copy it somewhere outside the repo, or ask the user where.

`data/daily-sets.additions.json` (12 sets, task 10 content) is already
committed at `779ae1a` — that one's fine, it was an explicit user decision
after being told about the exposure. Don't treat that as license to commit
more without asking.

---

## 2. Immediate next step: merge the 12 additions into the schedule

`data/daily-sets.additions.json` has 12 reviewed, validated sets (15–26 Aug,
5 questions each, all distinct categories per set) sitting separately from
`data/daily-sets.json` (the live 20 sets, 26 Jul – 14 Aug). They are **not
yet merged**. Steps, in order:

1. **Rebalance below/above-centre split across all 32 sets combined.**
   The 12 additions independently landed near a 2-below/3-above split per
   set (checked with the real `valueToPosition`/`scoreGuess` functions from
   `lib/game.ts`, not a reimplementation) with idle scores 970–1917/5000 per
   set. That's an acceptable spread but not tight — do a pass that deals
   below/above-centre questions across all 32 sets by remainder, then a swap
   pass minimizing repeated categories per set (this technique was used
   earlier this session on the first 60-question batch; script wasn't saved,
   rewrite it — it's ~40 lines using `lib/game.ts`'s exported functions).
2. Optionally retune ~9 questions that use `linear` scale across wide ranges
   (e.g. tooth count 1–160, Earth's age 100M–5B years) to `log` — not
   errors, just not ideal. Low priority.
3. Merge: `data/daily-sets.additions.json`'s 12 sets → append into
   `data/daily-sets.json`'s `sets` array → 32 sets total, 100 → 160 daily
   questions.
4. `npm run validate:data` — must show `Validated 32 daily set(s) holding
   160 daily-only questions.` with zero errors.
5. `npm run build:daily-sql` → regenerates `supabase/seed-daily.sql`.
6. Apply the seed to prod: `npx supabase db query --linked -f
   supabase/seed-daily.sql`. This is **data**, not schema — `db query` is
   correct here (unlike migrations, see §4).
7. Delete `data/daily-sets.additions.json` once merged (its content now
   lives in `data/daily-sets.json`).
8. `git add data/daily-sets.json && git rm data/daily-sets.additions.json`,
   commit, push.

---

## 3. Task 8: Daily-first home screen (not started — zero code written)

This was investigated but never coded. Full context, the exact plan spec,
and a suggested approach are in the git history — `git show 012bf45
HANDOVER.md` has the long version if you want it verbatim; short version:

**Current home screen** (`src/Game.tsx`, `category` phase — search for
`activePhase === "category"`): `.hero-copy` → `.hero-formats` (Classic/
Survival pill) → `<HeroDemo>` warm-up or Survival teaser → `<h2>All
categories</h2>` → `.mode-grid` → `.category-footer`.

**What's needed:** a new, large "Today's Daily" hero above all of that,
with two states:
- **Unplayed:** date, streak, "5 questions · ~2 min · 5 subjects", one
  primary "Play today's Daily" button.
- **Result hub** (after playing): official score, five per-question accuracy
  blocks, streak, Daily rank, Share result, "Today's board", quieter
  "Replay for practice".

Then wrap the *existing* hero-formats/HeroDemo/mode-grid block under a new
`<h2>Keep playing</h2>` heading.

Also: during play, show `"Today's Daily · Question 1 of 5"` when playing the
official date, and a prominent `"Practice replay"` label when `dailyDate` is
set but isn't today's date (archive replay). `Game.tsx`'s `playing` phase
currently shows neither.

**Data already available, no new plumbing needed** — task 7 built all of it:
- `dailyProgress.dates[today]` → `{ officialScore, practiceBest,
  attemptCount }` (`lib/daily.ts`).
- `streak = activeStreak(dailyProgress)`, already computed in `Game.tsx`.
- `todaysDaily = todaysDailySet()`, already computed.
- Rank: `leaderboard.loadDailyBoard(today)` then find the player's row (or
  add a lighter single-row fetch if a full board load feels wasteful —
  `fetchDailyLeaderboard` in `lib/leaderboard.ts` is the existing pattern to
  follow).

**Don't touch `src/HomeHeader.tsx`.** It's the compact daily strip that
already renders on *every* screen (date/streak/Past button) — it already
satisfies the plan's "compact Daily nav on non-home screens" requirement.
The new hero is additive, home-screen-only.

**Suggested shape:** new file `src/DailyHero.tsx` (same pattern as
`src/HeroDemo.tsx`/`src/Daily.tsx` — small, focused components), two render
branches gated on `dailyProgress.dates[today]?.officialScore != null`.

**Responsive:** audit `.mode-card`/`.question-card`/new hero classes for
clipping/horizontal scroll at 390px, 768px, 1024px, 1440px. Not yet checked
this session. `src/globals.css` is 4800+ lines — search by class name,
don't read linearly.

---

## 4. Task 9: Sharing and daily deep links — BLOCKED, needs a decision first

`?daily=YYYY-MM-DD` deep links and "spoiler-free" sharing sit awkwardly
against §1 (the schedule ships in the public repo and the JS bundle today).
Raise this with the user again before starting: does it matter enough to do
the real fix (fetch the day's set from Postgres at runtime — DB-side RLS
already gates `daily_sets` correctly by `puzzle_date <= current_date`, only
the bundled JSON leaks it), or is public-but-obscure acceptable for now? Not
resolved as of this handover. Don't start task 9 without an answer — it
changes the architecture (`lib/daily.ts` importing JSON vs. fetching).

---

## 5. Gotchas from this session (don't relearn these)

**5.1 `apply_migration` (the Supabase MCP tool) stamps its own timestamp as
the migration version** — it does not preserve your local filename's
timestamp. After applying, always `list_migrations` and rename your local
file to match, or `supabase db push` will try to re-apply an
already-live migration under a different name. This bit avatar migrations
twice — fixed at `779ae1a`, but the pattern will recur with any future
`apply_migration` call.

**5.2 `supabase db query --linked -f file.sql` runs SQL but does NOT record
anything in `schema_migrations`.** Use it only for data (seeds), never for
schema. Use `apply_migration` for schema, always, even if `db query` would
technically work.

**5.3 `git show HEAD:path` and `cat`-like tools apply the smudge filter,
making committed LF content display as if it might be CRLF.** The
authoritative check is `git ls-files --eol path` — look at the `i/` (index)
column specifically, not `w/` (working tree). A prior session nearly raised a
false alarm about CRLF corruption in committed files; `i/lf` on every file
confirmed the repo content was always clean. `core.autocrlf=true` + no
`.gitattributes` produces `i/lf w/crlf` on *every* file including ones
committed weeks ago — that pairing is normal, not a sign of new damage.

**5.4 To test a `security definer` RPC that reads `auth.uid()` from the SQL
editor**, fake the JWT claim inside a rolled-back transaction:
```sql
do $$ begin
  perform set_config('request.jwt.claim.sub', v_player_uuid::text, true);
  -- ... call the function, raise exception 'RESULT %', result_var;
end $$;
```
The `raise exception` at the end forces a rollback while still surfacing the
result in the error message.

**5.5 The container/session boundary is real.** If you're told "the last
session's work is missing," check `git status` and `git log` in *this*
checkout before believing it — a different session may have been looking at
a different, stale container. This exact false alarm happened this session.

---

## 6. Commands reference

```bash
npm run validate:data       # category bank + daily schedule
npm test                    # does NOT type-check — check tsc separately
npx tsc --noEmit
npm run build                # validate + tsc + vite build
npm run lint
npm run build:daily-sql     # data/daily-sets.json -> supabase/seed-daily.sql
npm run generate:questions  # Postgres -> lib/questions.generated.ts (excludes is_daily)
```

Apply SQL **data** to the linked project without retyping it:
```bash
npx supabase db query --linked -f supabase/seed-daily.sql
```

Apply a real **migration** (schema) — use the `apply_migration` MCP tool
with `project_id: zwovdyyuacuipfhtycxw`, then immediately `list_migrations`
and rename your local file to match what got stamped (§5.1).
