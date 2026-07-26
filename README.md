# Give or Take

[![CI](https://github.com/Cambo2k20/give-or-take-quiz/actions/workflows/ci.yml/badge.svg)](https://github.com/Cambo2k20/give-or-take-quiz/actions/workflows/ci.yml)
[![Deploy](https://github.com/Cambo2k20/give-or-take-quiz/actions/workflows/deploy.yml/badge.svg)](https://github.com/Cambo2k20/give-or-take-quiz/actions/workflows/deploy.yml)

A quick, source-backed slider game about the scale of things: how many people
live somewhere, how big something is, when something happened. Drag the
slider to your estimate, lock it in, and see how close you were.

**Play it at <https://cambo2k20.github.io/give-or-take-quiz/>**

## How to play

The home page opens with one real, playable question — try it before choosing
anything. From there:

- **Classic** — a ten-question round from one of eight subjects, or **Mixed**,
  which draws from all of them:

  | Subject | About |
  | --- | --- |
  | Population | How many people live in a country, a city, or online |
  | History | Turning points on the timeline, and the price of the past |
  | Geography | Oceans, deserts, mountains and the shape of the land |
  | Science | Physics, chemistry and the workings of the human body |
  | Animals | What they weigh, how fast they run, how long they carry |
  | Space | Orbits, planets and the machines sent up there |
  | Technology | The tallest, heaviest and fastest things built |
  | Movies | When films landed, and what they took at the box office |

- **Daily challenge** — five questions, the same ones for everyone on a given
  day. See [below](#the-daily-challenge).
- **Survival** — no fixed length. Answer until a guess lands outside a window
  around your estimate, which narrows every three questions. The run ends at
  your first miss; how many questions you survived is the score.

Every question opens the slider away from its midpoint, at a position fixed
by the question itself — the same one for everyone playing that question, so
an untouched slider is never a reliable strategy. Locking a guess shades the
distance between your guess and the answer, reveals the verdict, the
explanation and the source, and (outside Survival) awards points. A finished
Classic or Daily round shows the full breakdown and a shareable result.

## Scoring

Both the guess and answer are converted to positions from `0` to `1` on that
question's slider — logarithmically for a question like population, linearly
for one like a historic year. If `d` is the absolute distance between those
positions, a Classic or Daily question scores:

```text
round(1000 × (1 − d)²)
```

An exact answer earns 1,000 points; a ten-question round is worth up to
**10,000**, a five-question daily up to **5,000**. Each question's score also
picks the verdict shown on its reveal:

| Points | Verdict |
| --- | --- |
| 980 and above | Bullseye! |
| 850–979 | So close! |
| 600–849 | Not bad. |
| 300–599 | Off the mark. |
| Below 300 | Way off. |

**Survival** scores differently: there is no per-question point total. A
guess survives if its distance `d` from the answer is within that question's
window, which starts at ±0.12 of the slider and tightens by 0.01 every three
questions, to a floor of ±0.04. The run ends at the first guess outside its
window; the number of questions answered before that one is the score, ranked
on its own leaderboard.

## The question bank

**Postgres is the source of truth.** [`lib/questions.generated.ts`](lib/questions.generated.ts)
is a committed, offline snapshot of it — regenerated with
`npm run generate:questions` — so a round can be dealt with no network call
and no live dependency on the database. [`lib/questions.ts`](lib/questions.ts)
re-exports that snapshot for the rest of the app.

Run `npm run validate:data` for the current, authoritative counts. As of this
writing the bank holds 197 category questions —

| Subtype | Count | Subtype | Count |
| --- | --- | --- | --- |
| Country population | 15 | Count | 13 |
| City population | 15 | Percentage | 11 |
| Historic event | 46 | Money | 24 |
| Length | 14 | Duration | 16 |
| Area | 10 | Speed | 11 |
| Mass | 11 | Temperature | 11 |

— plus a further 100 questions reserved for the daily challenge (below), kept
out of Classic play by an `is_daily` flag.

Every record carries its answer, slider bounds, scale, an explanation, and a
source title and URL. Two rules keep the data honest:

- **Money questions are historical.** Each is the figure in the dollars of
  its day, carrying a `referenceYear`, so no current price ever needs
  re-checking.
- **Temperature questions are records or constants**, not a live reading, and
  always use a linear scale — a logarithmic slider cannot represent the
  negative values several of them need.

`npm run validate:data` checks IDs, record shape, slider bounds, source URLs,
population definitions, and category coverage, and runs automatically before
every production build. It makes no network requests; regenerating the bank
from Postgres does (see [Development](#development)).

## The daily challenge

Everyone who opens the app on a given day gets the same five questions, in
the same order — what makes a daily score worth comparing. Daily questions
are written for the daily and never appear in Classic or Survival play.

The schedule is authored by hand in
[`data/daily-sets.json`](data/daily-sets.json), which is the source of truth
for the daily — the opposite of the category bank, where Postgres is.
[`data/daily-sets.example.json`](data/daily-sets.example.json) is a worked
two-day template to copy from.

```json
{
  "version": 1,
  "sets": [
    { "date": "2026-08-01", "questions": [ /* exactly 5 question records */ ] }
  ]
}
```

A question record obeys the same rules as one in the category bank, plus a
few of its own that `npm run validate:data` checks: every set is dated
`YYYY-MM-DD` with no date repeated; every set holds exactly five questions;
no question id is reused across dates; and no daily question shares an id or
a prompt with the category bank.

A set dated in the future stays hidden until its day arrives — enforced by
row-level security, not just the client — so the schedule can be committed
well ahead of time. Streaks and per-date scores live in the browser's
`localStorage`; only today's puzzle moves a streak, so replaying the archive
cannot be used to top one up.

| Command | Purpose |
| --- | --- |
| `npm run validate:data` | Check the category bank and the daily schedule |
| `npm run build:daily-sql` | Regenerate `supabase/seed-daily.sql` from the JSON |

Playing the daily works offline with no database. Its leaderboard needs the
daily migrations applied and `supabase/seed-daily.sql` run, so the server can
rescore a submitted round against that date's actual questions.

## Accounts and leaderboards

**No account is ever required to play.** Classic, Daily and Survival all work
fully offline, and a personal best is kept on the device for each. Signing in
only adds one thing: a score on a shared leaderboard.

Signing in takes an email address and password; Supabase requires the address
be confirmed before the account can publish anything, which is enforced on
the server, not just suggested by the UI. Confirmed players then pick a
display name — no other profile information is collected — and every
finished round is rescored on the server before being recorded, so a client
cannot simply submit an inflated total. Category rounds, the daily and
Survival each rank on their own board; a Survival run cannot appear on a
points board and vice versa.

Leaderboard features are additive and gated by configuration. Without
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` set, the app runs
with every leaderboard and sign-in affordance simply absent — useful for
local development or a fork with no Supabase project of its own. The hosted
build at the play link above always has both set.

## Privacy

Nothing is sent anywhere until a player chooses to sign in. Fonts are
self-hosted, so an unconfigured build makes no third-party requests at all;
a configured build talks only to its own Supabase project, and only for
authentication and the leaderboard calls described above.

Local device state lives in a handful of versioned `localStorage` keys —
best scores per category, the daily's streak and per-date scores, Survival's
best run, and the light/dark preference — clearing site data removes all of
it. None of it, nor the question dataset, contains other players' data.

Sharing happens only after selecting **Share result**. The game uses the
device's native share sheet when available and otherwise copies the result
to the clipboard. Opening a source link leaves the app, so that destination's
own privacy terms apply.

## Development

Requires Node.js 22.13.0 or newer.

```bash
git clone https://github.com/Cambo2k20/give-or-take-quiz.git
cd give-or-take-quiz
npm ci
npm run dev
```

The dev server prints a local address. Because the site is built for a
project Pages path, that address includes the repo name — for example
<http://localhost:5173/give-or-take-quiz/>.

Leaderboard and sign-in features need a Supabase project: copy `.env.example`
to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
Without it the app still runs, just without those features.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm test` | Run the Vitest test suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run validate:data` | Validate the category bank and daily schedule |
| `npm run generate:questions` | Regenerate `lib/questions.generated.ts` from Postgres (needs `.env`) |
| `npm run build:daily-sql` | Regenerate `supabase/seed-daily.sql` from `data/daily-sets.json` |
| `npm run lint` | Run ESLint |
| `npm run build` | Validate data, type-check, and build to `dist/` |
| `npm run preview` | Serve the built `dist/` locally |

Tests cover scale conversion and scoring, question selection, Survival's
window schedule and verdicts, the daily schedule and streak logic, auth and
leaderboard calls, and full playthroughs of Classic, Daily and Survival
rounds including publish behaviour. CI runs `npm ci`, `npm run lint`,
`npm test`, and `npm run build` for every push and pull request.

## Deploying to GitHub Pages

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) tests, builds,
and publishes `dist/` on every push to `main`. It requires the repository
variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to be set
(**Settings → Secrets and variables → Actions → Variables**) and fails the
build if either is missing, so the deployed site always has leaderboard
features enabled.

One-time setup: in the repository, open **Settings → Pages** and set
**Source** to **GitHub Actions**.

`vite.config.ts` sets `base` to `/give-or-take-quiz/`, which is the path a
project Pages site is served from. If you move the app to a custom domain or
any host that serves it from the root, build with `BASE_PATH=/` instead:

```bash
BASE_PATH=/ npm run build
```

## License

Licensed under the [MIT License](LICENSE).
