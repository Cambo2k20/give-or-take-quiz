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

Git state (updated — read this over section 10's own git notes, which are
now stale):

- **Everything through Survival and the home-page reorder is merged to
  `main`.** PR [#8](https://github.com/Cambo2k20/give-or-take-quiz/pull/8)
  ("fixes" — hero, daily, slider start), [#9](https://github.com/Cambo2k20/give-or-take-quiz/pull/9)
  ("leaderboard redesign" — all of section 10, Survival) and [#11](https://github.com/Cambo2k20/give-or-take-quiz/pull/11)
  ("fix" — the daily-strip reorder and the README rewrite) are all merged.
  `origin/main` is at `232e1e1`, a direct merge of `6467612`. None of this was
  committed through me — the user committed and merged it locally between
  sessions, which is why earlier revisions of this file called it
  uncommitted. Section 10's "Still open" list item about deciding whether to
  stack on PR #8 is resolved; ignore it.
- **Section 11 (category progression) is the only uncommitted work**, added
  in this session on top of the merged history above. `git status` shows 3
  modified files and 7 untracked. Nothing from it has been pushed.

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
npm test                   # 135 tests — does NOT type-check
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

---

## 10. Survival (uncommitted — added after PR #8 was opened)

A second play format alongside Classic: answer until a guess lands outside a
tightening window. No fixed length, ranked by questions survived rather than
points, with its own server board. This came out of a design discussion about
where new formats should live — see the reasoning below, since it explains
several choices that would otherwise look arbitrary.

### Why it looks the way it does

**Format is not a `GameMode`.** Exactly the daily's pattern: subjects, best
scores, question history and the category leaderboard stay untouched. The
client carries a separate `PlayFormat` (`"classic" | "survival"`), and the
server has its own `submit_survival_run` RPC, mirroring `submit_daily_round`.
Mixing formats into the subject grid was rejected early — categories answer
"what is this about", formats answer "how do I play", and folding one axis
into the other is what made the *old* leaderboard (ten flat tabs) unmanageable
in the first place.

**Classic's hero stays a consequence-free warm-up, on purpose.** Two pills sit
above the hero question (Classic · Survival). Picking Survival is an act of
intent — it opens a real run, and question 1 of that run is the hero itself.
Classic is left exactly as it was: `HeroDemo`, unscored, nothing banked. The
alternative — every pill tap committing to a real round — was considered and
rejected, because it turns the single lowest-commitment interaction in the app
(dragging a slider out of curiosity) into its highest-commitment one.

**The window is drawn as goalposts, not a band.** Early mockups drew the
survival window as a filled band behind the slider thumb — and at the actual
rail width (~300px), the thumb (30px) covers nearly all of even the *starting*
±12% window, and almost the entire ±4% window it tightens to. The tightening
is the whole point of the mode, so hiding it defeats the mode. Goalposts drawn
*above* the rail (`.survival-window`, `.survival-post` in `globals.css`) fix
this: two solid ticks either side of the thumb that the thumb cannot cover.
Verified in the browser — visible and legible even on question 1's widest
window.

**The window travels with the guess, not the answer.** Centring it on the
answer would show the answer before locking. `survivalVerdict()` in
`lib/formats.ts` checks `|guessPosition − answerPosition| ≤ window`, and the
window is drawn around the *thumb*.

**Higher-or-lower was scoped out.** It was in the original three-format plan,
but a count of every same-family pair in the real 197-question bank showed 79%
of "close" pairs (ratio ≤ 3×) are populations or percentages — those two
families cluster by nature. Length, mass, time and temperature between them
offer only ~28 close pairs from a 197-question bank authored to *span* wild
magnitudes on purpose, which is exactly what makes them bad pairing stock. The
"Right — by 61 m" mockup used an invented question that does not exist in the
bank. Shipping it today would mean "populations and percentages: higher or
lower", which breaks the "every mode draws from all nine subjects" promise and
would feel stale within a week. Left for a future `data/pairs.json` — same
pattern as the daily — if the mode is still wanted once that content exists.

**Boards are a separate axis on the leaderboard screen too.** `BoardScreen.tsx`
segments Classic | Survival first, then a scope row underneath (a subject/day
picker for Classic, static "All subjects" for Survival, since there is only
one board today). The picker sheet doubles as a status screen — every row
shows the player's rank on that board — built cheaply because the `leaderboard`
view already holds one row per player per mode, so a signed-in player's entire
category standing is one query.

### What's live in production (`zwovdyyuacuipfhtycxw`)

Two more migrations, applied and verified same as the daily's were:

| Version | Name | Why |
| --- | --- | --- |
| `20260726060215` | `add_survival_game_mode` | Adds `'survival'` to the enum, alone in its own file — same Postgres restriction as `'daily'` |
| `20260726060545` | `add_survival_runs` | Three-arm `question_count` check, `submit_survival_run`, `survival_leaderboard` view, extends `submit_round`'s guard |

**The trust model matches the category and daily boards, not more, not less.**
`submit_survival_run` re-judges every guess server-side against its own copy of
the window schedule and rejects any run that does not end at its first miss —
verified live with three fabricated runs (an honest death, a run that kept
playing after dying, and an all-correct run that hadn't cleared the bank); all
three were judged correctly. What it does **not** defend against is a player
reading answers out of the JS bundle — true of every mode today, since all 297
answers ship in `dist/assets/*.js` in plaintext. Fixing that means dealing
questions from the server instead of the bundle, which is a prerequisite for
*competitive* multiplayer survival, not this (async, single-player) version,
and was deliberately left alone here.

**The window schedule is duplicated by necessity, and verified to match
exactly.** `SURVIVAL_*` in `lib/formats.ts` and the inline arithmetic in
`submit_survival_run` (`greatest(0.04, 0.12 - 0.01 * ((n-1)/3))`) must agree, or
the server will kill a run the client thought was still alive. Checked by
generating both schedules out to 30 questions and diffing — they matched
exactly — and `tests/formats.test.ts` pins the same 15-question sequence so a
future change to one side without the other fails a test instead of shipping.
**If you change the schedule, change both, in the same commit** — this is
exactly the population-prompt-rule mistake from section 5.3, and the fix is
the same discipline.

### Files

- `lib/formats.ts` — window schedule, live/die verdict (rail space, so it means
  the same thing on a log question as a linear one), a no-repeat shuffled deck
  over the whole non-daily bank, and a versioned `localStorage` best-run record
  (the hero's "Best run 17" tag before anyone signs in).
- `src/EstimatePanel.tsx` — new optional `windowHalfWidth` prop draws the
  goalposts; omitted, the panel renders byte-identical to before this session.
- `src/Survival.tsx` — `SurvivalRound` (in-round: a question counter instead of
  progress dots, since a run has no known length) and `SurvivalOver` (death
  screen: the question that ended it, run vs. best, the board callout).
- `src/BoardScreen.tsx` — extracted from `Game.tsx` rather than grown inside it;
  the format/scope picker described above.
- `lib/leaderboard.ts` / `src/useLeaderboard.ts` — `submitSurvivalRun`,
  `fetchSurvivalLeaderboard`, `fetchMyStandings` (three queries: category view
  filtered by player, one daily row, one survival row), `rowAbove` (for the
  standing card's gap line); `publishSurvival` / `loadSurvivalBoard` reuse the
  same shared `record()` / `showBoard()` helpers the daily work introduced.
- `src/Game.tsx` — `heroFormat` state, `PlayFormat` type, `startSurvival()` /
  `lockSurvivalGuess()` / `continueSurvival()`, a `boardScope: BoardScope`
  replacing the old `boardDate: string | null`, publish-on-death routing
  alongside the existing daily/category guard (extended again, not replaced).

### Tests and verification

`tests/formats.test.ts` (window schedule incl. the SQL cross-check, verdict on
linear *and* log-scale questions, boundary-survives, deck uniqueness and
daily-exclusion, records round-trip). `tests/SurvivalFlow.test.tsx` (a full run
to death with a mocked deck, asserting `publishSurvival` receives every guess
in order including the fatal one and that `publish`/`publishDaily` are never
called; Classic's hero stays unscored; the board-screen routing goes to
`loadSurvivalBoard` not `loadBoard`). 119/119 tests pass, `tsc`, lint and build
all clean by exit code.

Browser-verified at 375px, both themes: goalposts visible on question 1's
widest window (the thing the band-based mockup failed at), a full run to the
death screen with the correct epitaph and signed-out board copy, the
Classic/Survival board segments, and the "Which board?" picker showing a rank
per row. One copy bug caught this way and fixed: the board footnote said "ten
questions drawn from this subject" even for Mixed, which draws from every
subject — `BoardScreen.tsx` now special-cases it.

**Not verified:** an authenticated submission end-to-end (needs a signed-in
confirmed account, same limitation as the daily) and the actual production
migrations under concurrent load. The three fabricated-run SQL checks above
were run directly against `zwovdyyuacuipfhtycxw`, not through the app.

### Still open

Item 1 below (committing) is **resolved** — this section shipped in PR #9,
merged. The rest were never about git state and are still genuinely open:

1. **Higher-or-lower** needs an authored `data/pairs.json` before it's worth
   building — see above.
2. **Live/competitive survival** (a shared room, same question at the same
   moment) needs the answer-bundling problem fixed first, plus something to
   own the clock (Edge Function + scheduled tick, or a Postgres state
   machine) since there is no game server today. The async, same-puzzle
   version built here was chosen deliberately over this for the first pass.
3. **The fixed-drag exploit (section 6a) is still open** — a player who drags
   to the same rail position on every question still beats survival's early
   windows exactly as they would a classic round, since the window is centred
   on the *guess*. Only a scoring-curve change fixes this, same conclusion as
   section 6a reached for classic play. The wordmark wrap at 375px is also
   still just cosmetic and unaddressed.

---

## 11. Category progression: ranks, achievements, unlocks groundwork (uncommitted)

The user asked for unlockable themes. That surfaced two things that needed
building first — a progression system to hang unlocks off, and (once ranks
went per-category) an account screen that could no longer fit everything on
one page. Both landed in this session; the themes themselves did not.

### Why it looks the way it does

**The server owns every definition; the client only renders.** The population
prompt rule and the survival window schedule have both already drifted between
two copies of themselves (sections 5.3 and 10). Achievements would have been
the worst case of that pattern, so here there is exactly one: `player_stats`
pivots derived facts into `(stat_key, value)` rows, `achievements` is a
catalogue table, and `player_achievements` joins the two generically. **Adding
an achievement is an `INSERT`, not a migration and not a code change**, and
every one back-fills over rounds already recorded — verified live, two
achievements were already earned from history that predates this feature.

**XP is credited per question, to that question's own category** — not per
round to the round's mode. `round_answers` already joins to `questions.category`
for every mode, so Mixed spreads across all eight subjects automatically, a
Mixed round's Space question feeds the Space rank, a daily question feeds
whichever subject it's about, and a survival run credits whatever it dealt.
No mode is a dead end, and nothing new is tracked.

**The curve is two SQL functions, not a table of thresholds.**
`xp_for_rank(rank) = ceil(450 * (rank - 1)^1.5)`, chosen so rank 5 lands at
about five rounds of a subject (the user's explicit ask) and rank 30 at about
a hundred. The exponent carries the shape rather than the coefficient, so
slowing the early game didn't drag the whole ladder out with it. **Caught
before shipping:** the first draft used `round()` instead of `ceil()`, which
let `xp_for_rank(4)` return a value one XP short of what `rank_for_xp` needed
to award rank 4 — ranks 4, 15 and 30 were all silently unreachable at their
advertised threshold. Found by round-tripping all 60 ranks against each other
in SQL before applying anything; `ceil()` fixed every boundary exactly.

**Titles are per-category and per-rank-floor, falling through to `Newcomer`.**
`rank_titles` holds one row per `(category, rank_floor)`; a player's title is
whichever floor is highest at or below their rank, and every category seeds a
floor-1 row of `Newcomer` so ranks 1-4 always resolve to something. The user
was explicit that `Newcomer` should never appear on the home page — the home
mode cards show a title only once `hasEarnedTitle()` is true (i.e. not
`Newcomer`), so an unplayed or barely-played subject looks exactly as it did
before this feature.

**The account screen got a hard course-correction mid-build.** The first pass
put a full rank grid and a full achievements grid directly on the account
screen, under the existing sign-in details. The user's next message was "far
too much on the account screen. need a button for ranks and a button for
achievements and button for unlocks" — so `RankPanel`, `AchievementPanel` and
`UnlocksPanel` were split into three destinations (`ranks` / `achievements` /
`unlocks` phases), reached from three short nav buttons on the account screen
itself, each with a one-line summary and nothing else. `tests/Progress.test.tsx`
pins this shape directly — one test asserts the account screen has the three
buttons and *none* of `RankPanel`'s or `AchievementPanel`'s content, which is
exactly the regression that prompted the split.

**Unlocks is an honest placeholder, not a fake gallery.** No theme palettes
exist yet. Rather than mock up swatches that promise something the app can't
deliver, the screen says plainly that nothing is unlockable yet, that themes
will be tied to ranks and achievements, and (the one thing it *can* honestly
show) how many subject titles are already held toward whatever gates get
chosen. This is a deliberate half-step: the door exists so the account nav
isn't lying about having three things behind it, but nothing behind that
particular door is invented.

### What's live in production (`zwovdyyuacuipfhtycxw`)

Two more migrations, same discipline as the daily's and survival's — applied,
then the local file renamed to the server-assigned version:

| Version | Name | Why |
| --- | --- | --- |
| `20260726111833` | `add_category_progression` | `xp_for_rank`/`rank_for_xp`, `rank_titles` (48 titles + 8 `Newcomer` rows), `player_category_xp`, `player_progress` |
| `20260726112719` | `add_achievements` | `player_stats` (incl. a gaps-and-islands streak query), `achievements` catalogue (15 seeded), `player_achievements` |

**The daily streak is now server-truth, not just a `localStorage` number.**
`player_stats.longest_daily_streak` numbers each player's distinct
`puzzle_date`s and groups by `date - row_number()`, which gives every date in
a consecutive run the same anchor. The real account only has one daily played,
which can't distinguish a working query from a broken one, so it was proven
on synthetic dates instead: three runs of 3, 5 and 2 separated by gaps
returned exactly `[5, 3, 2]`, longest 5.

Both views are `security_invoker`, matching the pattern `harden_security_definer_exposure`
established; the security advisor shows no new findings, only the pre-existing
leaked-password-protection warning that predates this work.

### Files

- `supabase/migrations/20260726111833_add_category_progression.sql`,
  `20260726112719_add_achievements.sql` — the two migrations above.
- `lib/progress.ts` — `fetchProgress(playerId)` (two parallel reads: the
  per-category view and the achievements view, since joining them server-side
  would mean a row per subject per achievement), `diffProgress(before, after)`
  for the reveal ribbon. Read-only by design: submitting a round *is* the
  write, so there is no client-side XP to keep in sync.
- `src/useProgress.ts` — keyed by account like `useLeaderboard`. The pre-round
  snapshot lives in a `ref`, not state, so a round finishing can't race a
  re-render into diffing a snapshot against itself. **Lint caught a real bug
  here**: the first draft called `setState` synchronously in an effect body
  on the signed-out path. Fixed by deriving `change` from `(playerId, change)`
  the same way `loaded` is already derived, which needed no clearing at all.
- `src/Progress.tsx` — `RankPanel`, `AchievementPanel`, `UnlocksPanel`,
  `ProgressRibbon` (silent when nothing moved, so it never becomes
  furniture), `hasEarnedTitle()`.
- `src/Game.tsx` — `useProgress` wired alongside `useLeaderboard`; a
  `categoryLabels` map borrowed from `MODES` so `Progress.tsx` never
  disagrees with the mode chooser on a subject's name or icon; progress
  refreshes only after a publish call actually returns a recorded round, not
  unconditionally; three new phases (`ranks` / `achievements` / `unlocks`)
  plus the account-screen nav buttons that open them; home mode cards now
  show `Best 8,240 - Census Scout`, title suppressed while `Newcomer`.
- `src/Survival.tsx` — `progressRibbon` prop alongside the existing
  `boardCallout`, rendered on the death screen.

### Tests and verification

`tests/progress.test.ts` - `fetchProgress` (chooser-order output including
subjects never played, XP summed correctly, the rank-bar fraction computed
and clamped, achievement mapping, a read failure surfacing rather than
returning partial data) and `diffProgress` (nothing reported with no prior
snapshot, nothing reported when nothing moved, a rank-up caught, XP gained
within a rank *not* miscounted as a rank-up, a newly earned achievement
caught without re-announcing an old one). `tests/Progress.test.tsx` - the
three-doors shape itself: the account screen shows only the nav and none of
the panel content, each door opens its own screen, achievements show
progress, `Newcomer` never appears on the home cards. 135/135 tests pass,
`tsc`, lint and build all clean by exit code.

Browser-verified signed-out (the only state reachable without entering
credentials): no console errors, the sign-in screen renders with no progress
UI leaking through and no crash from the hook having no player, home mode
cards show no badge at all when neither a best score nor a title exists, and
zero network requests to `player_progress` or `player_achievements` while
signed out — confirming the hook correctly does nothing without a profile.
The signed-in screens (ranks, achievements, unlocks, and the reveal ribbons)
are verified only by `tests/Progress.test.tsx`'s fixture data, the same
limitation as the daily and survival sections before it.

### Still open

1. **Nothing in this section is committed.** It sits on top of the merged
   history described in section 1 - decide whether it becomes its own PR.
2. **Themes themselves do not exist.** This section is the foundation the
   user asked to be built first; no palette, no picker, no unlock-gate
   decisions have been made. The `UnlocksPanel` placeholder is deliberately
   uncommitted to any specific gating scheme.
3. **`best_subject_rank` and the three rank-keyed achievements (`Titled`,
   `Distinguished`, `Legendary`) assume the rank ladder never changes.** If
   the curve constants in `xp_for_rank`/`rank_for_xp` are retuned later, these
   thresholds (5 / 15 / 30) stay meaningful because they're expressed in
   ranks, not XP - but worth rechecking that assumption if the ladder length
   itself ever changes.
4. **No signed-in verification of any progression screen.** Same limitation
   noted for the daily and survival sections: needs a real confirmed account,
   which stays the user's step.
