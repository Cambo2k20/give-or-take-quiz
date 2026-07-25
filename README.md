# Give or Take

[![CI](https://github.com/Cambo2k20/give-or-take-quiz/actions/workflows/ci.yml/badge.svg)](https://github.com/Cambo2k20/give-or-take-quiz/actions/workflows/ci.yml)
[![Deploy](https://github.com/Cambo2k20/give-or-take-quiz/actions/workflows/deploy.yml/badge.svg)](https://github.com/Cambo2k20/give-or-take-quiz/actions/workflows/deploy.yml)

A quick, source-backed quiz about the scale of populations and the timing of
historic events. Move the slider, lock in a guess, and see how close you were.

**Play it at <https://cambo2k20.github.io/give-or-take-quiz/>**

## How to play

Choose one of three 10-question modes:

- **Population** — country totals and US city-proper populations on a
  logarithmic scale.
- **History** — historic events on a linear timeline.
- **Mixed** — five population questions and five history questions.

Each round draws unique questions from the local question bank. Move the
slider to your estimate and select **Lock in guess**. The slider then shades
the distance between your guess and the answer, and the round is scored with a
verdict, the explanation, the source, and the points. After question 10, the
game shows the full breakdown, updates the best score for that mode, and
offers a shareable result.

## Scoring

Both the guess and answer are converted to positions from `0` to `1` on that
question's slider. If `d` is the absolute distance between those positions,
the score is:

```text
round(1000 × (1 − d)²)
```

An exact answer earns 1,000 points. Larger misses lose points increasingly
quickly, and the farthest possible miss earns zero. A 10-question game is
worth up to **10,000 points**. Scoring uses the displayed scale, so population
answers are compared logarithmically while history answers are compared
linearly.

Each round's score also picks the verdict shown on the reveal:

| Points | Verdict |
| --- | --- |
| 980 and above | Bullseye! |
| 850–979 | So close! |
| 600–849 | Not bad. |
| 300–599 | Off the mark. |
| Below 300 | Way off. |

## Local, sourced data

The 60-question dataset lives in [`lib/questions.ts`](lib/questions.ts) and is
bundled with the application; gameplay does not depend on a live data API.
It contains:

- 15 country questions using fixed 2024 midyear population snapshots from the
  World Bank;
- 15 US city questions using 2020 US Census city-proper counts; and
- 30 historic events, each linked to an institutional or reference source.

Every record includes its answer, bounds, scale, explanation, and source title
and URL. Population prompts also state their reference year and whether the
figure is a country total or city proper. The source is shown after each guess.
These are frozen reference snapshots, so updates should be deliberate and
reviewed against the linked source.

Run `npm run validate:data` to check IDs, record shape, slider bounds, source
URLs, population definitions, and category coverage. This validation also
runs automatically before every production build and makes no network
requests.

## Privacy

The application has no account requirement, analytics, or gameplay backend.
It is a static site: questions ship with the app, and nothing you do is sent
anywhere. Best scores stay in the browser's `localStorage` under
`close-enough:v1`, and the light/dark preference under `give-or-take:theme`.
Clearing site data removes them. The question dataset contains no player or
other personal data.

Fonts are self-hosted, so the app makes no third-party requests at all.

Sharing happens only after the player selects **Share result**. The game uses
the device's native share sheet when available and otherwise copies the result
to the clipboard. Opening a source link leaves the app, so the destination
site's own privacy terms apply.

## Development

Requires Node.js 22.13.0 or newer.

```bash
git clone https://github.com/Cambo2k20/give-or-take-quiz.git
cd give-or-take-quiz
npm ci
npm run dev
```

The dev server prints a local address. Because the site is built for a project
Pages path, that address includes the repo name — for example
<http://localhost:5173/give-or-take-quiz/>.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm test` | Run the Vitest test suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run validate:data` | Validate the local question bank |
| `npm run lint` | Run ESLint |
| `npm run build` | Validate data, type-check, and build to `dist/` |
| `npm run preview` | Serve the built `dist/` locally |

Tests cover scale conversion, scoring, year formatting, question selection,
best-score storage, core game flow, results, persistence, and share fallback
behaviour. CI runs `npm ci`, `npm run lint`, `npm test`, and `npm run build`
for every push and pull request.

## Deploying to GitHub Pages

The app is a static single-page build with no server, database, or runtime
configuration. [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
tests, builds, and publishes `dist/` on every push to `main`.

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
