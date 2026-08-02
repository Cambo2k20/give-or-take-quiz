# Give or Take

[![CI](https://github.com/Cambo2k20/give-or-take-quiz/actions/workflows/ci.yml/badge.svg)](https://github.com/Cambo2k20/give-or-take-quiz/actions/workflows/ci.yml)
[![Deploy](https://github.com/Cambo2k20/give-or-take-quiz/actions/workflows/deploy.yml/badge.svg)](https://github.com/Cambo2k20/give-or-take-quiz/actions/workflows/deploy.yml)

A source-backed numeric estimation game. Move one slider, trust your instincts,
and find out how close you were.

**Play at <https://giveortakequiz.com/>**

## Game modes

- **Daily** — the same five questions for everyone on a given day, with an
  archive of past puzzles and a dedicated leaderboard.
- **Classic** — a five-question round from one subject or a five-subject Mixed
  draw. Scores can reach 5,000 points.
- **Survival** — keep answering until the first miss. The acceptable range
  narrows every three questions, and the number survived is the score.

Classic currently covers eight subjects:

| Subject | What it covers | Regular questions |
| --- | --- | ---: |
| Population | Countries, cities and online populations | 35 |
| History | Events, dates and historical money | 42 |
| Geography | Oceans, deserts, mountains and land | 54 |
| Science | Physics, chemistry and the human body | 50 |
| Animals | Size, speed, behaviour and lifespans | 56 |
| Space | Planets, missions, spacecraft and astronomy | 55 |
| Technology | Machines, infrastructure and inventions | 50 |
| Movies | Release dates, productions and box office | 30 |

Every question includes a source and explanation. The slider starts away from
its midpoint at a deterministic position, so leaving it untouched is not a
reliable strategy.

## Scoring

The guess and answer are converted to positions from `0` to `1` on the
question's slider. Population-scale values and other large ranges can use a
logarithmic scale; years, percentages and compact ranges use a linear scale.

If `d` is the absolute distance between the two positions, Classic and Daily
award:

```text
round(1000 × (1 − d)²)
```

| Points | Verdict |
| --- | --- |
| 980–1,000 | Bullseye! |
| 850–979 | So close! |
| 600–849 | Not bad. |
| 300–599 | Off the mark. |
| Below 300 | Way off. |

Survival has no point total. A guess survives when its distance is within the
current window, which starts at ±0.12 of the slider and tightens by 0.01 every
three questions to a floor of ±0.04.

## Daily puzzles and question data

The current build contains **372 regular questions**. Postgres is the source of
truth for these records, and [`lib/questions.generated.ts`](lib/questions.generated.ts)
is the committed offline snapshot used during play. Regenerate it with
`npm run generate:questions` after changing the database.

The Daily schedule is authored separately in
[`data/daily-sets.json`](data/daily-sets.json). It currently contains **32
sets and 160 Daily-only questions**. Daily questions never enter Classic or
Survival draws. [`data/daily-sets.example.json`](data/daily-sets.example.json)
is a small template for authoring new dates.

`npm run validate:data` checks both collections for valid IDs, shapes, slider
bounds, units, scales, source URLs, category coverage and collisions between
Daily and regular questions. It makes no network requests and runs before every
production build.

| Command | Purpose |
| --- | --- |
| `npm run validate:data` | Validate the regular bank and Daily schedule |
| `npm run generate:questions` | Regenerate the regular offline snapshot from Supabase |
| `npm run build:daily-sql` | Regenerate `supabase/seed-daily.sql` from the Daily JSON |

## Accounts, progression and cosmetics

An account is not required for ordinary play. Local Classic bests, Daily
progress, Survival bests and visual preferences are stored on the device.

A confirmed Supabase account adds:

- public Classic, Daily and Survival leaderboards;
- a unique leaderboard display name and selectable profile avatar;
- subject XP, ranks and titles calculated from recorded rounds;
- six collectible rank badges per subject, unlocked at ranks 5, 10, 15, 20,
  25 and 30;
- 65 server-tracked achievements;
- nine built-in avatars plus earned rank badges that can be used as avatars;
- rank-gated animated backgrounds.

The current animated backgrounds are **Deep Space**, **City Pulse**, **Front
Row** and **Aurora Drift**. They are dark-mode themes with their own artwork and
UI palettes. The ordinary light/dark preference remains separate from the
selected background. See [Adding a custom theme](docs/ADDING_THEMES.md) for the
theme contract, artwork pairing, unlock gates and test requirements.

## Friends and asynchronous challenges

Confirmed players can find each other by exact display name and exchange mutual
friend requests. Friends can challenge one another to Classic or Survival
without both being online at the same time.

- Classic challenges select a subject or Mixed; Survival needs no subject.
- Both players receive the same immutable, server-generated question order.
- The challenger completes the game before the invitation becomes active.
- The recipient then has seven days to play.
- The challenger's result stays hidden until the recipient finishes.
- Challenge rounds count normally toward XP, achievements and public boards;
  winning adds no bonus XP.
- Each friend has a head-to-head history showing wins, losses, draws, current
  win streak and best win streak.

Challenge links use `?challenge=<uuid>`. Signed-out visitors can authenticate
without losing the target challenge, and only its intended participant can
open it.

## Privacy

Supabase Auth stores account email addresses. The public game surfaces expose
only the chosen display name, avatar and qualifying leaderboard results—not an
email address. Friendships, requests, challenge decks and head-to-head history
are restricted to their participants.

Unsigned local progress and visual preferences live in versioned
`localStorage` entries and can be removed by clearing the site's data. Sharing
uses the device's native share sheet when available and otherwise copies text
to the clipboard. Opening a question source leaves the app for the source's
website.

## Backend and security

Supabase provides authentication, the question bank, server-validated round
submission, leaderboards, progression and social play.

The client uses only a publishable key. It never contains a database password,
secret key or `service_role` key. Exposed tables use row-level security, and
sensitive writes go through narrowly granted database functions. Social rows
are participant-only, and a pending recipient cannot read the challenger's
result.

The schema is versioned in [`supabase/migrations`](supabase/migrations). New
exposed tables must include explicit role grants as well as RLS policies; these
are separate controls.

## Development

Requires Node.js 22.13.0 or newer.

```bash
git clone https://github.com/Cambo2k20/give-or-take-quiz.git
cd give-or-take-quiz
npm ci
npm run dev
```

The default Vite base path is `/give-or-take-quiz/`, so the local URL normally
looks like <http://localhost:5173/give-or-take-quiz/>.

Copy `.env.example` to `.env` to enable Supabase-backed features locally:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxx
```

Without those values, the offline game still works but accounts, shared
leaderboards, progression and friends are unavailable.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run validate:data` | Validate all question data |
| `npm run generate:questions` | Regenerate the regular question snapshot (requires `.env`) |
| `npm run build:daily-sql` | Regenerate Daily seed SQL |
| `npm run lint` | Run ESLint |
| `npm run build` | Validate, type-check and build to `dist/` |
| `npm run preview` | Serve the production build locally |

Tests cover question selection and scoring, Daily state, Classic and Survival
playthroughs, authentication, leaderboards, progression, avatars, themes,
friend requests, challenge links, hidden results, expiry and match-history
comparisons.

## Database migrations

Git and Supabase deploy separately. Merging a migration file does **not** apply
it to the hosted database, and the website deployment workflow does not run
`supabase db push`.

For a linked Supabase project, review the local and remote migration histories
before pushing:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase migration list
npx supabase db push
```

Daily content is generated into `supabase/seed-daily.sql` and must also be
applied when the Daily schedule changes. Never put a database password or
secret key in `.env`, source control or a frontend build.

## Deployment

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) tests, builds and
publishes `dist/` to GitHub Pages on pushes to `main`. The production workflow
sets `BASE_PATH=/` because the custom domain serves the application from its
root.

The repository must define these GitHub Actions variables under **Settings →
Secrets and variables → Actions → Variables**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Both values are designed for browser use and rely on database grants and RLS
for protection. They are not substitutes for secret or service-role keys.

The frontend workflow does not deploy Supabase migrations. Apply and verify
database changes separately before relying on them in the newly deployed
client.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/` | React screens, components, artwork and global styling |
| `lib/` | Game rules, question data, Supabase clients and domain types |
| `data/` | Hand-authored Daily schedules |
| `supabase/` | Migrations and generated Daily seed SQL |
| `scripts/` | Question generation and validation utilities |
| `tests/` | Unit, integration and component tests |
| `docs/` | Maintainer guides |

## License

Licensed under the [MIT License](LICENSE).
