# Adding questions to category banks

This guide covers questions used in normal category and Mixed rounds. Daily questions follow a separate process and belong in `data/daily-sets.json`.

## Source of truth

Category questions originate in the project’s Postgres database.

Do not edit `lib/questions.generated.ts` manually. It is generated from the database and will be overwritten the next time the question generator runs.

The normal workflow is:

```text
Research → Add database record → Generate TypeScript → Validate → Test
```

## How daily questions reach the category bank

A question written for the daily is not locked away forever. It moves through
four states:

```text
reserved → scheduled → played → retired
```

- **Reserved.** `is_daily` is true and the question has no `daily_set_questions`
  row. It is excluded from category, Mixed, Survival and challenge play, and
  from the generated offline bank. This is the pool a daily is built from.
- **Scheduled.** A `daily_set_questions` row places it on a date. Still
  excluded, and a future date stays sealed by row-level security.
- **Played.** On its date it is the daily. Still excluded from everything else,
  because the round is still being scored.
- **Retired.** Once every date it is scheduled for is in the past,
  `public.retire_expired_daily_questions()` clears `is_daily` and the question
  becomes an ordinary category question.

Retirement is what the scheduled refresh performs; it also regenerates the
offline bank in the same run, so the flag and the bundled bank never disagree.
Because the game deals rounds from that committed bank rather than from
Postgres, a retired question only reaches players once the refresh has landed.

This is why `npm run validate:data` only rejects a daily question that also
sits in the category bank when its date is still ahead. After the date passes,
appearing in both `data/daily-sets.json` and the bank is the intended result:
past dailies stay replayable from the JSON while the same record is dealt in
category rounds.

## 1. Choose the category

Use one of the existing category identifiers:

- `population`
- `history`
- `geography`
- `science`
- `animals`
- `space`
- `technology`
- `movies`
- `dinosaurs`
- `games`

The canonical list, display metadata, rank titles and launch state live in
`lib/categories.ts`. Do not create a second category list. Mixed, Survival,
progression, leaderboards and challenges use the registry's currently playable
categories; Mixed does not have its own question records. All ten categories
are currently `live`.

A new category launches as `incubating`: it needs at least five regular
questions for local testing and at least 20 before it can be changed to
`live`. Set `VITE_ENABLE_INCUBATING_CATEGORIES=true` in development to test an
incubating bank. Production ignores the override.

Before adding several questions, check the existing distribution. Prefer categories with smaller banks unless the new questions are especially strong.

## 2. Research the answer

Every question needs a reliable source.

Prefer:

- Government and intergovernmental organisations
- Universities and museums
- Scientific organisations
- Official company or product documentation
- Reputable primary datasets
- Original box-office or industry databases where appropriate

Avoid search-result snippets, unsourced list articles, social posts, and pages that merely repeat another source.

Confirm:

- The source directly supports the answer.
- The source uses the same unit as the question.
- The answer has not changed since the source was published.
- Any relevant date, geography, definition or measurement method is clear.
- The source URL points to the supporting page, not a homepage or search result.

## 3. Write the question

A good question should have one defensible numeric answer.

Keep the prompt:

- Understandable without specialist knowledge
- Specific about place, date and measurement
- Free of clues that reveal the approximate answer
- Short enough to scan during play
- Distinct from existing questions

Avoid ambiguous wording such as:

- “How big is…?” without specifying area, height, length or mass
- “How many people live…?” without specifying the relevant year
- “How much did it make?” without specifying worldwide or domestic gross
- Measurements whose definition varies substantially between sources

Use the project’s established unit and formatting conventions. Copy a comparable existing database record as the structural template.

## 4. Choose the playable range

The slider range should make the question challenging but fair.

The correct answer must fall inside the configured range. The endpoints should:

- Represent plausible guesses
- Avoid making the answer obvious
- Leave useful space on both sides of the answer
- Use the appropriate linear, logarithmic or other supported scale
- Match the question’s unit exactly

Test unusually large, small, negative or fractional values carefully.

## 5. Add the database record

Create an additive SQL migration for the question rows using a comparable
existing record as a template. If a new category needs enum labels, put only
the enum additions in one migration and put content in a later migration so
PostgreSQL commits the enum values before they are used.

Ensure that:

- The ID is unique and stable.
- The category is valid.
- The prompt is unique.
- The numeric answer is stored in the expected unit.
- The slider bounds and scale are valid.
- The explanation is concise and useful.
- The source title identifies the publisher clearly.
- The source URL directly supports the answer.

Do not reuse an ID from a removed question. IDs may be referenced by local question-history data.

## 6. Regenerate the bundled question bank

With the required database environment variables configured, run:

```bash
npm run generate:questions
```

This regenerates:

```text
lib/questions.generated.ts
```

Review the generated diff. It should contain the intended questions and no unexpected removals or unrelated data changes.

Never tidy or correct the generated file manually. Correct the database record and regenerate it instead.

## 7. Validate the data

Run:

```bash
npm run validate:data
```

Validation should reject problems such as invalid categories, duplicate identifiers, malformed records, invalid ranges and conflicts with the daily-question bank.

Fix validation failures in the database, regenerate, and run validation again.

After the migration is applied to the target database, also run:

```bash
npm run validate:question-sync
```

This must pass before activation. It prevents a bundled question from reaching
a player before Supabase knows its ID, which would make round submission fail
with `every guess must reference a known question`.

## 8. Test the questions in play

Start the development server:

```bash
npm run dev
```

Play the affected category and check:

- The prompt reads naturally.
- The unit and slider labels are correct.
- The answer appears at the expected position.
- The valid range feels fair.
- The verdict and explanation make sense.
- The source link opens the intended supporting page.
- Mobile-width text does not overflow.
- The question also behaves correctly when selected by Mixed mode.

Because selection is random and avoids recently seen questions, temporarily targeted automated coverage may be easier than repeatedly refreshing to find one new question.

## 9. Run the complete checks

Before committing:

```bash
npm run lint
npm test
npm run build
```

All three must pass.

## Final checklist

- [ ] Existing category identifier used
- [ ] Enum migration committed before any migration that uses a new category
- [ ] Unique, stable question ID
- [ ] Unique and unambiguous prompt
- [ ] Answer verified against a primary or authoritative source
- [ ] Date, geography and measurement definition are explicit
- [ ] Answer and slider use the same unit
- [ ] Answer falls inside the configured range
- [ ] Range is challenging but fair
- [ ] Explanation adds useful context
- [ ] Direct source URL included
- [ ] Generated file updated through the generator
- [ ] Generated diff reviewed
- [ ] Data validation passes
- [ ] Bundled and Supabase regular-question IDs match
- [ ] Question checked in its category and Mixed mode
- [ ] Lint, tests and production build pass
