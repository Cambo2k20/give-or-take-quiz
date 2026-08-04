# Give or Take

[![CI](https://github.com/Cambo2k20/give-or-take-quiz/actions/workflows/ci.yml/badge.svg)](https://github.com/Cambo2k20/give-or-take-quiz/actions/workflows/ci.yml)
[![Deploy](https://github.com/Cambo2k20/give-or-take-quiz/actions/workflows/deploy.yml/badge.svg)](https://github.com/Cambo2k20/give-or-take-quiz/actions/workflows/deploy.yml)

**Give or Take** is a source-backed estimation quiz built around one simple interaction: move the slider, submit your estimate, and see how close you were.

Every question includes a verified answer, a short explanation and a link to its source. Large numeric ranges can use logarithmic sliders, while dates, percentages and compact ranges use linear scales.

**Play at [giveortakequiz.com](https://giveortakequiz.com/)**

## Features

- Slider-based numeric estimation gameplay designed for mouse, keyboard and touch.
- Daily, Classic and Survival game modes.
- Ten live subject categories plus Mixed rounds.
- Source-backed questions with answer explanations.
- Deterministic slider starting positions to discourage untouched guesses.
- Responsive category selection with custom theme-aware category artwork.
- Animated dog mascot that reacts to slider movement and game events.
- Optional background music and mascot sound effects with persistent volume settings.
- Light mode, dark mode and unlockable animated profile backgrounds.
- Local play without an account.
- Supabase authentication, leaderboards, progression, achievements and cosmetics.
- Friends, asynchronous challenges and head-to-head statistics.
- Offline question snapshot for reliable play when Supabase is unavailable.

## Game modes

### Daily

Everyone receives the same five questions for a given date. Past puzzles remain available through the Daily archive, and Daily scores use their own leaderboard.

### Classic

Play five questions from one subject or choose **Mixed** for a five-subject round. Each question awards up to 1,000 points, giving a maximum score of 5,000.

### Survival

Keep answering until your first miss. The acceptable distance starts at ±0.12 of the slider and narrows by 0.01 every three questions until reaching a floor of ±0.04. The number of questions survived is the score.

## Subjects

| Subject | Coverage |
| --- | --- |
| Population | Countries, cities and online populations |
| History | Events, dates and historical money |
| Geography | Oceans, deserts, mountains and land |
| Science | Physics, chemistry and the human body |
| Animals | Size, speed, behaviour and lifespans |
| Space | Planets, missions, spacecraft and astronomy |
| Technology | Machines, infrastructure and inventions |
| Movies | Release dates, productions and box office |
| Dinosaurs | Dinosaurs, fossils, trackways and the Mesozoic |
| Games | Video, board, card, tabletop and competitive games |

The category catalogue lives in [`lib/categories.ts`](lib/categories.ts). A future subject can be added as an incubating category before it becomes available in production.

For local testing, an incubating subject with at least five regular questions can be enabled with:

```dotenv
VITE_ENABLE_INCUBATING_CATEGORIES=true
```

This override only works in development builds.

## Scoring

The submitted guess and correct answer are converted into positions between `0` and `1` on the active slider scale.

If `d` is the absolute distance between those positions, Classic and Daily award:

```text
round(1000 × (1 − d)²)
```

| Points | Result |
| ---: | --- |
| 980–1,000 | Bullseye! |
| 850–979 | So close! |
| 600–849 | Not bad. |
| 300–599 | Off the mark. |
| Below 300 | Way off. |

## Question system

Postgres is the source of truth for the regular question bank. The app also commits an offline snapshot at [`lib/questions.generated.ts`](lib/questions.generated.ts), allowing ordinary gameplay to continue without a live database connection.

Daily content is authored separately in [`data/daily-sets.json`](data/daily-sets.json). Daily-only questions are excluded from Classic, Mixed, Survival and challenge draws while reserved or scheduled.

A Daily question moves through this lifecycle:

```text
reserved → scheduled → played → retired
```

The scheduled workflow at [`.github/workflows/retire-expired-dailies.yml`](.github/workflows/retire-expired-dailies.yml) retires expired Daily questions and opens a pull request containing the refreshed regular snapshot.

See [`docs/ADDING_CategoryQuestions.md`](docs/ADDING_CategoryQuestions.md) for the complete authoring, validation, migration and retirement process.

### Question commands

| Command | Purpose |
| --- | --- |
| `npm run validate:data` | Validate regular questions and the Daily schedule |
| `npm run validate:question-sync` | Verify bundled and Supabase regular-question IDs match |
| `npm run generate:questions` | Regenerate the offline question snapshot from Supabase |
| `npm run build:daily-sql` | Regenerate `supabase/seed-daily.sql` from the Daily JSON |
| `npm run questions:import -- <pack.json>` | Convert a reviewed question pack into an additive migration |
| `npm run questions:retire` | Retire expired Daily questions through the Supabase RPC |
| `npm run daily:runway` | Check how much scheduled Daily content remains |
| `npm run questions:verify` | Run generation, sync, validation, tests, lint and build checks |

`npm run validate:data` checks IDs, data shapes, slider bounds, scales, units, source URLs, category coverage and collisions between Daily and regular content. It performs no network requests and runs before every production build.

## Mascot and audio

The interface includes a reusable animated dog mascot that responds to the warm-up slider and other game states. Its movement is driven by request-animation-frame updates and shared mascot state rather than pre-rendered video.

The audio system includes:

- optional looping background music;
- persistent mute and volume preferences;
- mascot reactions and howl effects;
- browser-safe playback handling for environments that restrict autoplay.

Audio remains optional and can be controlled from the home header.

## Accounts and progression

An account is not required for ordinary play. Local Classic bests, Daily progress, Survival bests and visual preferences are stored on the device.

A confirmed Supabase account adds:

- public Classic, Daily and Survival leaderboards;
- a unique display name and selectable avatar;
- subject XP, ranks and titles;
- six collectible rank badges per subject, unlocked at ranks 5, 10, 15, 20, 25 and 30;
- server-tracked achievements;
- built-in avatars and earned badge avatars;
- rank-gated animated backgrounds;
- friends, challenges and head-to-head records.

The animated backgrounds currently include **Deep Space**, **City Pulse**, **Front Row** and **Aurora Drift**. They use their own artwork and UI palettes while remaining separate from the standard light/dark preference.

See [`docs/ADDING_THEMES.md`](docs/ADDING_THEMES.md) for the theme contract, artwork pairing, unlock gates and testing requirements.

## Friends and asynchronous challenges

Confirmed players can search for one another by exact display name and exchange friend requests.

Friends can challenge one another without both being online at the same time:

- Classic challenges use a selected subject or Mixed.
- Survival challenges use the same Survival rules for both players.
- Both players receive the same immutable, server-generated question order.
- The challenger completes the game before the invitation becomes active.
- The recipient has seven days to play.
- The challenger’s result remains hidden until the recipient finishes.
- Challenge rounds still count toward XP, achievements and public leaderboards.
- Head-to-head history records wins, losses, draws and streaks.

Challenge links use the following format:

```text
?challenge=<uuid>
```

Signed-out visitors can authenticate without losing the target challenge, and only the intended participant can open it.

## Privacy and security

Supabase Auth stores account email addresses. Public game surfaces expose only a player’s chosen display name, avatar and qualifying leaderboard results.

Friendships, friend requests, challenge decks and head-to-head history are restricted to their participants. Local unsigned progress and visual preferences are stored in versioned `localStorage` entries and can be removed by clearing the site’s data.

The frontend uses only a Supabase publishable key. It must never contain a database password, secret key or `service_role` key. Exposed tables use row-level security, and sensitive writes are performed through narrowly granted database functions.

The database schema is versioned in [`supabase/migrations`](supabase/migrations). Role grants and row-level security policies are separate controls and must both be configured for any newly exposed table.

## Technology

- React 19
- TypeScript 5
- Vite 8
- Supabase
- Vitest and Testing Library
- ESLint
- GitHub Actions
- GitHub Pages with a custom domain

## Local development

### Requirements

- Node.js 22.13.0 or newer
- npm
- A Supabase project only when testing account-backed features or regenerating question data

### Setup

```bash
git clone https://github.com/Cambo2k20/give-or-take-quiz.git
cd give-or-take-quiz
npm ci
npm run dev
```

The default Vite base path is `/give-or-take-quiz/`, so local development normally opens at:

```text
http://localhost:5173/give-or-take-quiz/
```

### Environment variables

Copy `.env.example` to `.env`:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxx
```

Without these values, offline gameplay still works. Authentication, shared leaderboards, progression, friends and challenges remain unavailable.

### Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run lint` | Run ESLint |
| `npm run validate:data` | Validate all question data |
| `npm run build` | Validate, type-check and build into `dist/` |
| `npm run preview` | Serve the production build locally |

Tests cover question selection and scoring, Daily state, Classic and Survival playthroughs, authentication, leaderboards, progression, avatars, themes, mascot and audio behaviour, friend requests, challenge links, hidden results, expiry and match-history comparisons.

## Database migrations

Git and Supabase deploy separately. Merging a migration file does **not** apply it to the hosted database, and the website deployment workflow does not run `supabase db push`.

For a linked Supabase project, review local and remote migration histories before pushing:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase migration list
npx supabase db push
```

Daily content is generated into `supabase/seed-daily.sql` and must also be applied when the Daily schedule changes.

Never store a database password, secret key or service-role key in `.env`, source control or a frontend build.

## Deployment

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) validates, tests, builds and publishes `dist/` to GitHub Pages when changes reach `main`.

The production workflow sets `BASE_PATH=/` because the custom domain serves the app from its root.

The repository requires these GitHub Actions variables under **Settings → Secrets and variables → Actions → Variables**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

These values are intended for browser use and depend on database grants and row-level security for protection. They are not replacements for secret or service-role keys.

The frontend workflow does not deploy Supabase migrations. Database changes must be applied and verified separately before the deployed client relies on them.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/` | React screens, components, mascot artwork, audio and global styling |
| `lib/` | Game rules, question data, Supabase clients and domain types |
| `data/` | Hand-authored Daily schedules |
| `supabase/` | Database migrations and generated Daily seed SQL |
| `scripts/` | Question generation, import and validation utilities |
| `tests/` | Unit, integration and component tests |
| `docs/` | Maintainer and content-authoring guides |
| `.github/workflows/` | CI, deployment and Daily retirement automation |

## License

Licensed under the [MIT License](LICENSE).
