# Handover — Give or Take: playable hero + daily challenge

Written 2026-07-26. This file is working notes for whoever picks the work up; it
is not project documentation. Delete it before merging.

---

## 1. Where the work is

| | |
| --- | --- |
| Repo | `give-or-take-quiz` — a slider-based estimation quiz (React + Vite + Supabase) |
| Worktree | `C:\Users\Cambo\Documents\GitHub\give-or-take-quiz\.claude\worktrees\silly-diffie-7ed850` |
| Branch | `feature/playable-hero-slider` (branched off `main` at `40d537c`) |
| Supabase | project `give-or-take-quiz`, ref `zwovdyyuacuipfhtycxw`, region eu-north-1 |

**Run everything from that worktree.** There is a second, stale worktree at
`.claude/worktrees/home-page-ideas-cfa94c` sitting 8 commits behind — ignore it.

Git state:

- `89f857c "hero"` — the hero-slider feature, **committed** (by the user, not me).
- Everything else is **uncommitted**. `git status` shows ~10 modified files and
  ~9 untracked. Nothing has been pushed.

---

## 2. What was built

### Feature 1 — playable hero slider (committed)

The home page was a wall of category cards that never showed the slider, which
is the whole game. Now a real question sits in the hero: drag, "Check my guess",
full reveal, then "Play a full round" / "Try another". Nothing is banked — no
best score, no leaderboard, no question history.

- `src/HeroDemo.tsx` — the demo.
- `src/EstimatePanel.tsx` — the estimate readout + slider, **shared** by the hero
  and the real game. Extracted rather than copied so the two cannot drift; this
  is why `Game.tsx` shrank by ~160 lines instead of growing.
- `src/questionText.ts` — formatting helpers both screens need (`verdictDetail`,
  `subtypeLabel`, `useCountUp`, …), moved out of `Game.tsx`.
- `pickDemoQuestion()` in `lib/game.ts`.

### Feature 2 — daily challenge (uncommitted)

Everyone gets the same **five** questions on a given day. Streak, per-date
scores, and a playable archive of past days.

- `data/daily-sets.json` — **the source of truth for the daily.** Note this is
  the opposite of the category bank, where Postgres is the source of truth and
  `lib/questions.generated.ts` is generated from it.
- `data/daily-sets.example.json` — a two-day template, not loaded by the app.
- `lib/daily.ts` — date resolution, archive listing, streak/progress storage.
- `src/Daily.tsx` — `DailyCard` (home page) and `DailyArchive`.
- `src/Game.tsx` — `dailyDate` state, `startDaily()`, `beginRound()`, a
  `daily-archive` phase.
- `scripts/build-daily-sql.ts` → `npm run build:daily-sql` → `supabase/seed-daily.sql`.

Current content: **100 questions, 20 sets, 2026-07-26 → 2026-08-14.**

---

## 3. Design decisions and why

**Daily is 5 questions, category rounds are 10.** This is not just a UI number —
`game_rounds` had `check (question_count = 10)` and a hardcoded `0..10000` score
range, both of which had to become mode-aware. The client derives the ceiling as
`gameQuestions.length * 1000`; do not reintroduce a hardcoded 10,000.

**Daily is deliberately NOT a `GameMode` on the client.** Making it one would
have forced changes to `BestScores`, `QuestionHistory`, `MODE_LABELS` and the
mode chooser. Instead the client carries `dailyDate: string | null`, and the
server has a separate `submit_daily_round(date, guesses)` RPC. `'daily'` exists
in the Postgres `game_mode` enum only because `game_rounds.mode` needs it.

**The board is per-day, never all-time.** Two dailies are different puzzles, so a
single all-time daily ranking would just reward whoever caught an easy day. The
`daily_leaderboard` view partitions by `puzzle_date`.

**Only today's puzzle moves the streak.** Replaying the archive records the score
for that date but cannot extend a streak — otherwise you could grind old days.
Replaying *today* keeps your best score and does not double-count.

**Daily questions live in the `questions` table behind an `is_daily` flag**, not
in a table of their own, so scoring, bounds, sources and constraints stay in one
place. Two things keep them out of normal play: `generate-questions.ts` filters
`.eq("is_daily", false)`, and `submit_round` rejects any guess whose question is
`is_daily` (without that, a caller could binary-search a daily answer through a
category round).

**Future sets are sealed by RLS**, so the schedule can be committed well ahead.
Verified: querying as `anon` returns only today's set.

---

## 4. Production database state

Five migrations were applied to `zwovdyyuacuipfhtycxw` **during these sessions**,
plus the seed data. The remote was in exact sync with the repo beforehand, and
is in sync again now: 17 local files, 17 remote versions.

| Version | Name | Why |
| --- | --- | --- |
| `20260726003939` | `add_daily_game_mode` | Adds `'daily'` to the enum, **alone in its own file** |
| `20260726004039` | `add_daily_challenge` | Tables, `puzzle_date`, `submit_daily_round`, per-day view |
| `20260726004359` | `scope_daily_policies_to_app_roles` | Policy role scoping |
| `20260726015822` | `accept_named_census_as_population_definition` | Widened a check constraint |
| `20260726032025` | `allow_daily_submission_a_day_ahead_of_utc` | Local midnight runs ahead of UTC; see 7 |

**Why the enum is alone in its own migration:** Postgres will not let a new enum
value be *referenced* in the transaction that adds it, and the constraints, view
and function that follow all name `'daily'` directly. Do not merge these two
files.

Seed applied with:

```bash
npx supabase db query --linked -f supabase/seed-daily.sql
```

Live state, verified after seeding: 100 daily questions, 197 category questions
(untouched), 20 sets of exactly 5, no orphans, 2 pre-existing game rounds intact.

---

## 5. Gotchas — read this section

These cost me time or caused real mistakes. They will bite again.

**5.1 `data/` is untracked by git.** There is no history for
`data/daily-sets.json`. I overwrote the user's authored slider bounds with a bad
automated pass and could only recover them because `supabase/seed-daily.sql` had
been generated from the previous state. **Back the file up before any bulk edit,
and `git add data/` at the first opportunity.**

**5.2 `npm test` does not type-check.** Vitest transpiles without checking types.
I shipped a type error in `tests/game.test.ts` that 88 passing tests happily hid,
and `npm run build` was failing for two rounds of work before I noticed —
because I was grepping the build output for `built in`, and a failing `tsc` just
makes that line absent. **Check the exit code; do not grep for success.**

```bash
npx tsc --noEmit && npm test && npm run build
```

**5.3 The population prompt rule lives in two places and has already drifted.**
`scripts/validate-data.ts` and the Postgres check constraint
`questions_measure_population_prompt_states_definition` both enforce it. I
widened the validator to accept a named census, the JSON validated locally, and
the *database* then rejected the insert. They are back in sync as of
`20260726015822`. If you change one, change the other.

**5.4 The preview/dev-server tool is pinned to the session's launch directory,**
which is the *stale* worktree — `preview_start` will silently serve the wrong
code even after switching worktrees. Workaround used throughout: run Vite via
Bash on a spare port and point the browser at it.

```bash
npx vite --port 5178 --strictPort   # then browse http://localhost:5178/give-or-take-quiz/
```

Ports 5174–5177 are squatted by stale Vite processes left over from earlier
sessions; pick a free one with `--strictPort` so a clash fails loudly instead
of silently serving another worktree.

**5.5 `lib/questions.generated.ts` shows a line-ending-only diff** after running
`npm run generate:questions` (LF → CRLF on Windows). Check with
`git diff --ignore-all-space` before assuming the data changed; `git checkout --`
it if the diff is only whitespace.

**5.6 Migration versions are assigned by the server, not by your filename.**
`apply_migration` stamps its own timestamp. Local files were renamed to match the
remote versions so the repo and database agree — keep doing that.

**5.7 The slider only ever emits integers.** `positionToValue` rounds. A stored
answer of `6.5` used to display as "7 m", contradicting the score. Fixed in
`formatQuestionValue`: small fractional values keep one decimal. The category
bank has zero fractional answers; the daily has several.

---

## 6. The slider-exploit problem (half fixed — read 6a)

Scoring is `1000 × (1 − d)²` where `d` is distance in *position* space. A guess
at the midpoint is never more than 0.5 away, so **an untouched slider floors at
250 points per question** no matter where the answer sits. Bounds alone cannot
fix this.

The authored bounds originally put **59 of 60 answers above centre**, 55 in the
0.6–0.8 band — dragging right to ~70% beat the midpoint nearly every time. Two
passes fixed most of it:

1. Retuned bounds, choosing direction per question. Pushing an answer *low*
   needs a huge ceiling, which is only believable for quantities whose ceiling
   nobody can intuit (genome base pairs, body cells, neurons, transistor counts,
   blood-vessel length). Everything else goes high via a lowered floor, which is
   the harmless direction.
2. Added 40 questions that are *naturally* below centre: ancient events (the
   bank had nothing before 1066 CE), small percentages (bounds are locked to
   0–100, so a small answer just *is* a low position), and cold temperatures.

| | Original | Now |
| --- | --- | --- |
| Best fixed slider strategy | ~4,700 / 5,000 | **2,886** (parking at 0.80) |
| Leaving it at the midpoint | ~3,160 | **2,429** |
| Answers below centre | 1 / 60 | **47 / 100** |
| Idle spread across days | 1,575–3,490 | **2,422–2,436** |

**~2,500 is the theoretical floor** for the best fixed strategy given that
scoring curve, even with absurd bounds. So 2,886 is close to what bounds can
buy.

### 6a. What the per-question start position actually bought (2026-07-26)

`startPosition(question)` in `lib/game.ts` now opens the slider somewhere in
`[0.1, 0.9]`, chosen by an FNV-1a hash of the question id — deterministic, so a
daily opens identically for every player — and forced at least **0.2** away from
that question's own answer, so no question can quietly pay out to a player who
never touches it. Used by `beginRound`, `goToNextQuestion` and `HeroDemo`.

Measured against the real banks:

| | Centred start | Per-question start |
| --- | --- | --- |
| Daily, untouched slider | 2,428 (range 2,422–2,436) | **1,540** (range 812–2,507) |
| Category round, untouched | 5,923 / 10,000 | **3,691 / 10,000** |
| Daily, best *fixed drag* at 0.81 | 2,897 | **2,897 — unchanged** |

**This fixes the idle exploit, not the fixed-drag one.** Where the slider
*starts* is irrelevant to a player who drags to 0.81 every question, so that
2,897 is untouched and is still the number to beat. Note the idle score is now
*below* what a uniformly random guess would earn (~2,500), which is intended:
the enforced 0.2 gap means doing nothing is actively worse than guessing.

Killing the fixed-drag strategy needs the **scoring curve** to change, not the
bounds and not the start — e.g. `1000 × max(0, 1 − 2d)²`, which pays zero once
the guess is more than half the rail away, so parking mid-rail scores nothing on
a question whose answer sits near either end. That reshapes every score in the
game and both leaderboards, so it was not attempted.

---

## 7. Outstanding work

Items 1 and 2 of the original list landed on 2026-07-26 (second session): the
client now routes a finished daily to `submit_daily_round` (shared submit state
in `useLeaderboard`, guard in `Game.tsx` extended, never removed), reads the
per-day board from `daily_leaderboard` (a Daily tab on the leaderboard screen +
"See the day's board" from daily results), and the results/replay copy was
corrected. New tests: `tests/leaderboard.test.ts`, `tests/DailyPublish.test.tsx`
(95 total). `data/` is now **staged** but not committed.

Also done in that session, on the user's instruction:

- **Slider start position** — see 6a above.
- **Box-office `referenceYear`** — Frozen II now `2019`, Barbie and Super Mario
  Bros `2023`; Top Gun: Maverick stays `2026` because its prompt says "by 2026".
  `data/daily-sets.json` edited, `supabase/seed-daily.sql` regenerated, and the
  seed re-applied (it upserts, so re-running it is the intended path). Verified
  live afterwards: 100 daily, 197 category, 20 sets, 0 orphans, 2 rounds intact.
- **Timezone gap** — migration `20260726032025_allow_daily_submission_a_day_ahead_of_utc`
  widens the `submit_daily_round` publication check to `current_date + 1`,
  applied to production. The function is otherwise byte-identical (diffed), and
  `create or replace` kept the grants: `authenticated` may execute, `anon` may
  not, in both schemas. The RLS seal on `daily_sets` was deliberately **not**
  widened — the function is `security definer` so it sees tomorrow's set anyway,
  and there is no reason to expose it to direct reads.

Still open:

1. **Commit everything** (user's call; nothing is committed beyond `89f857c`).
   `data/` is staged only.
2. **The fixed-drag strategy still scores 2,897 / 5,000.** Only a scoring-curve
   change closes it — see the end of 6a.
3. Cosmetic, pre-existing: the wordmark wraps to three lines at 375px now that
   Leaderboard and Sign in share the header.

---

## 8. Commands

```bash
npm run validate:data      # category bank + daily schedule
npm test                   # 100 tests — does NOT type-check
npx tsc --noEmit           # type check
npm run build              # validate + tsc + vite build
npm run lint
npm run build:daily-sql    # data/daily-sets.json -> supabase/seed-daily.sql
npm run generate:questions # Postgres -> lib/questions.generated.ts (excludes is_daily)
```

Applying SQL to the linked project without retyping it:

```bash
npx supabase db query --linked -f supabase/seed-daily.sql
```

---

## 9. Authoring daily questions

`data/daily-sets.json` holds `{ version: 1, sets: [{ date, questions: [...] }] }`
with **exactly 5** questions per set. `npm run validate:data` enforces: ISO
unique dates, exactly five per set, ids unique across all dates, and no daily
question sharing an id *or prompt* with the 197-question category bank. Every
per-question rule from the main bank applies too.

`subtype` silently fixes both `measure` and `unit` — this is the easiest thing to
get wrong:

```
length      size      metre | kilometre
area        size      square-kilometre
mass        size      kilogram | tonne
event       history   year          (integer, scale MUST be linear)
count       quantity  count
percentage  quantity  percent       (min 0, max 100 exactly)
money       quantity  usd           (needs referenceYear)
duration    physics   second | minute | hour | day | duration-year
speed       physics   kph
temperature physics   celsius       (scale MUST be linear)
country     population people       (needs referenceYear; prompt must contain the
                                     year AND either "country-total" or a census)
city        population people       (needs referenceYear; prompt must say "city proper")
```

`referenceYear` is a **string** (`"2022"`, not `2022`). The validator now
type-checks every field before reading it, so a mistyped value is reported rather
than throwing.

After editing: `npm run validate:data`, then `npm run build:daily-sql`, then
apply `supabase/seed-daily.sql` — the server rescores daily rounds against its
own copy, so the database must match the JSON.

**Source URLs:** the validator checks syntax, not reachability. All 100 were
checked with real requests; 35 return 403 to scripted requests (Britannica, the
Smithsonian, the British Museum, NIH, OECD) but load fine in a browser — that is
bot-blocking, not rot. One genuine 404 was found and replaced.
